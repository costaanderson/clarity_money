import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { fetchGoogleEvents } from "@/features/agenda/lib/google-calendar.functions";
import { getValidGoogleToken } from "@/features/agenda/lib/google-auth.functions";

// ─── Engagement Radar Types ───────────────────────────────────────────────────

export type RadarClient = {
  id: string;
  name: string;
  daysSinceContact: number | null;
  hasOpenTask: boolean;
};

export type RadarRule = {
  id: string;
  name: string;
  active: boolean;
  applies_to_status: string;
  trigger_days_no_contact: number;
  action: string;
  triggeredClients: RadarClient[];
};

// ─── Types ───────────────────────────────────────────────────────────────────

export type BriefingMeeting = {
  id: string | null;
  title: string;
  start_at: string;
  end_at: string;
  from_google: boolean;
  client: { id: string; name: string; type: string } | null;
  overdueTasks: { id: string; title: string; due_at: string | null }[];
};

export type BriefingTask = {
  id: string;
  title: string;
  due_at: string | null;
  client: { id: string; name: string } | null;
};

export type ClientWithoutMeeting = {
  id: string;
  name: string;
  type: string;
  daysSinceLastMeeting: number | null;
};

export type DailyBriefing = {
  date: string;
  meetings: BriefingMeeting[];
  overdueTasks: BriefingTask[];
  pendingCount: number;
  meetingCount: number;
  pjCount: number;
  loadScore: number; // meetings PF*1 + PJ*2
  clientsWithoutMeeting: ClientWithoutMeeting[];
};

// ─── Server function ──────────────────────────────────────────────────────────

export const getDailyBriefing = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { date: string } | undefined) =>
    z.object({ date: z.string() }).parse(input ?? { date: new Date().toISOString().slice(0, 10) }),
  )
  .handler(async ({ data, context }): Promise<DailyBriefing> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // ── Calcular range do dia ──────────────────────────────────────────────
    const dayStart = new Date(`${data.date}T00:00:00`).toISOString();
    const dayEnd = new Date(`${data.date}T23:59:59`).toISOString();

    // ── 1. Buscar eventos locais do dia ────────────────────────────────────
    const { data: localEvents, error: eventsError } = await context.supabase
      .from("calendar_events")
      .select("id, title, start_at, end_at, google_event_id, client_id, clients(id,name,type)")
      .gte("start_at", dayStart)
      .lte("start_at", dayEnd)
      .order("start_at");
    if (eventsError) throw new Error(eventsError.message);

    // ── 2. Buscar eventos do Google Calendar (se conectado) ────────────────
    const googleToken = await getValidGoogleToken(context.userId);
    let googleEvents: import("@/features/agenda/lib/google-calendar.functions").GoogleEventItem[] = [];
    if (googleToken) {
      try {
        googleEvents = await fetchGoogleEvents(context.userId, dayStart, dayEnd);
      } catch {
        // não bloqueia se Google falhar
      }
    }

    // ── 3. Buscar todos os clientes ativos ─────────────────────────────────
    const { data: allClients } = await context.supabase
      .from("clients")
      .select("id, name, type")
      .eq("status", "ativo");
    const clients = allClients ?? [];

    // ── 4. Buscar tarefas atrasadas e pendentes ────────────────────────────
    const now = new Date().toISOString();
    const { data: allPendingTasks } = await context.supabase
      .from("tasks")
      .select("id, title, due_at, status, client_id, clients(id,name)")
      .neq("status", "feito")
      .neq("status", "cancelado");
    const pendingTasks = allPendingTasks ?? [];
    const overdueTasks = pendingTasks.filter((t) => t.due_at && t.due_at < now);

    // ── 5. Deduplicar Google events (já sincronizados localmente) ──────────
    const localGoogleIds = new Set(
      (localEvents ?? []).map((e) => e.google_event_id).filter(Boolean),
    );

    // ── 6. Montar mapa de nome → cliente para casamento ────────────────────
    const clientByName = new Map<string, typeof clients[0]>();
    for (const c of clients) {
      clientByName.set(c.name.toLowerCase().trim(), c);
    }

    // ── 7. Construir lista de meetings unificada ───────────────────────────
    const meetings: BriefingMeeting[] = [];

    // Eventos locais
    for (const e of localEvents ?? []) {
      const client = (e.clients as { id: string; name: string; type: string } | null) ?? null;
      const clientOverdue = overdueTasks.filter((t) => t.client_id === client?.id);
      meetings.push({
        id: e.id,
        title: e.title,
        start_at: e.start_at,
        end_at: e.end_at,
        from_google: false,
        client,
        overdueTasks: clientOverdue.map((t) => ({
          id: t.id,
          title: t.title,
          due_at: t.due_at,
        })),
      });
    }

    // Eventos só do Google (não sincronizados localmente)
    for (const ge of googleEvents) {
      if (localGoogleIds.has(ge.google_event_id)) continue;
      const startAt = ge.start_at;
      const endAt = ge.end_at;
      // Tentar casar pelo título
      const matchedClient = clientByName.get((ge.title ?? "").toLowerCase().trim()) ?? null;
      const clientOverdue = matchedClient
        ? overdueTasks.filter((t) => t.client_id === matchedClient.id)
        : [];
      meetings.push({
        id: null,
        title: ge.title ?? "Sem título",
        start_at: startAt,
        end_at: endAt,
        from_google: true,
        client: matchedClient,
        overdueTasks: clientOverdue.map((t) => ({
          id: t.id,
          title: t.title,
          due_at: t.due_at,
        })),
      });
    }

    // Ordenar por horário
    meetings.sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());

    // ── 8. Clientes sem reunião hoje ───────────────────────────────────────
    const clientIdsWithMeeting = new Set(
      meetings.map((m) => m.client?.id).filter(Boolean),
    );

    // Buscar último evento por cliente para calcular dias sem sessão
    const { data: lastEvents } = await supabaseAdmin
      .from("calendar_events")
      .select("client_id, start_at")
      .eq("user_id", context.userId)
      .lt("start_at", dayStart)
      .order("start_at", { ascending: false });

    const lastEventByClient = new Map<string, string>();
    for (const ev of lastEvents ?? []) {
      if (ev.client_id && !lastEventByClient.has(ev.client_id)) {
        lastEventByClient.set(ev.client_id, ev.start_at);
      }
    }

    const clientsWithoutMeeting: ClientWithoutMeeting[] = clients
      .filter((c) => !clientIdsWithMeeting.has(c.id))
      .map((c) => {
        const lastEv = lastEventByClient.get(c.id);
        const daysSince = lastEv
          ? Math.floor((Date.now() - new Date(lastEv).getTime()) / 86_400_000)
          : null;
        return { id: c.id, name: c.name, type: c.type, daysSinceLastMeeting: daysSince };
      })
      .filter((c) => c.daysSinceLastMeeting === null || c.daysSinceLastMeeting >= 14)
      .sort((a, b) => (b.daysSinceLastMeeting ?? 999) - (a.daysSinceLastMeeting ?? 999));

    // ── 9. Calcular carga do dia ───────────────────────────────────────────
    const pjCount = meetings.filter((m) => m.client?.type === "PJ").length;
    const pfCount = meetings.length - pjCount;
    const loadScore = pfCount + pjCount * 2;

    return {
      date: data.date,
      meetings,
      overdueTasks: overdueTasks.map((t) => ({
        id: t.id,
        title: t.title,
        due_at: t.due_at,
        client: (t.clients as { id: string; name: string } | null) ?? null,
      })),
      pendingCount: pendingTasks.length,
      meetingCount: meetings.length,
      pjCount,
      loadScore,
      clientsWithoutMeeting,
    };
  });

// ─── Engagement Radar ─────────────────────────────────────────────────────────

/**
 * Retorna todas as regras de ativação, cada uma com os clientes que
 * atualmente disparam o critério — sem criar tarefas (só leitura).
 */
export const getEngagementRadar = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RadarRule[]> => {
    const { data: rules } = await context.supabase
      .from("activation_rules")
      .select("*")
      .order("created_at", { ascending: false });

    if (!rules || rules.length === 0) return [];

    const result: RadarRule[] = [];

    for (const rule of rules) {
      if (!rule.active) {
        result.push({ ...rule, triggeredClients: [] });
        continue;
      }

      const threshold = new Date();
      threshold.setDate(threshold.getDate() - rule.trigger_days_no_contact);

      const { data: clients } = await context.supabase
        .from("clients")
        .select("id, name, last_contact_at, created_at")
        .eq("status", rule.applies_to_status)
        .or(`last_contact_at.lt.${threshold.toISOString()},last_contact_at.is.null`);

      const triggeredClients: RadarClient[] = [];

      for (const client of clients ?? []) {
        const ref = client.last_contact_at ?? client.created_at;
        const daysSinceContact = ref
          ? Math.floor((Date.now() - new Date(ref).getTime()) / 86_400_000)
          : null;

        const { data: existing } = await context.supabase
          .from("tasks")
          .select("id")
          .eq("client_id", client.id)
          .eq("source", "regra_ativacao")
          .eq("status", "pendente")
          .limit(1);

        triggeredClients.push({
          id: client.id,
          name: client.name,
          daysSinceContact,
          hasOpenTask: (existing?.length ?? 0) > 0,
        });
      }

      // Mais dias sem contato primeiro
      triggeredClients.sort(
        (a, b) => (b.daysSinceContact ?? 999) - (a.daysSinceContact ?? 999),
      );

      result.push({ ...rule, triggeredClients });
    }

    return result;
  });
