import { createFileRoute } from "@tanstack/react-router";
import { fetchGoogleEvents } from "@/features/agenda/lib/google-calendar.functions";
import { getValidGoogleToken } from "@/features/agenda/lib/google-auth.functions";
import { callAI, getCallableAiConfig } from "@/features/ai/lib/call-ai";
import { DONNA_SYSTEM_PROMPT } from "@/features/briefing/lib/donna-system-prompt";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toLocalDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysUntilNextOccurrence(month: number, day: number, today: Date): number | null {
  const base = new Date(today);
  base.setHours(0, 0, 0, 0);
  const yr = base.getFullYear();
  for (const y of [yr, yr + 1]) {
    const ev = new Date(y, month - 1, day);
    ev.setHours(0, 0, 0, 0);
    const diff = Math.floor((ev.getTime() - base.getTime()) / 86_400_000);
    if (diff >= 0 && diff <= 7) return diff;
  }
  return null;
}

// ─── Core generation (supabaseAdmin + explicit userId) ────────────────────────

async function generateForUser(
  sb: Awaited<ReturnType<typeof import("@/integrations/supabase/client.server")>>["supabaseAdmin"],
  userId: string,
): Promise<string> {
  const today = new Date();
  const todayStr = toLocalDate(today);
  const dayStart = new Date(`${todayStr}T00:00:00`).toISOString();
  const dayEnd = new Date(`${todayStr}T23:59:59`).toISOString();

  // 1. Reuniões do dia
  const { data: localEvents } = await sb
    .from("calendar_events")
    .select("id, title, start_at, end_at, google_event_id, client_id, clients(id,name,type)")
    .eq("user_id", userId)
    .gte("start_at", dayStart)
    .lte("start_at", dayEnd)
    .order("start_at");

  let googleEvents: import("@/features/agenda/lib/google-calendar.functions").GoogleEventItem[] = [];
  const googleToken = await getValidGoogleToken(userId);
  if (googleToken) {
    try { googleEvents = await fetchGoogleEvents(userId, dayStart, dayEnd); } catch { /* ignore */ }
  }

  const localGoogleIds = new Set((localEvents ?? []).map((e) => e.google_event_id).filter(Boolean));

  type MeetingInfo = {
    title: string;
    startAt: string;
    clientId: string | null;
    clientName: string | null;
    clientType: string | null;
    fromGoogle: boolean;
  };

  const meetings: MeetingInfo[] = [
    ...(localEvents ?? []).map((e) => ({
      title: e.title,
      startAt: e.start_at,
      clientId: (e.clients as any)?.id ?? null,
      clientName: (e.clients as any)?.name ?? null,
      clientType: (e.clients as any)?.type ?? null,
      fromGoogle: false,
    })),
    ...googleEvents
      .filter((ge) => !localGoogleIds.has(ge.google_event_id))
      .map((ge) => ({
        title: ge.title ?? "Sem título",
        startAt: ge.start_at,
        clientId: null,
        clientName: null,
        clientType: null,
        fromGoogle: true,
      })),
  ].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

  // 2. Dados dos clientes com reunião
  const clientIds = [...new Set(meetings.map((m) => m.clientId).filter(Boolean))] as string[];

  const [notesRes, docsRes, tasksRes] = await Promise.all([
    clientIds.length > 0
      ? sb
          .from("notes")
          .select("client_id, kind, content, created_at")
          .in("client_id", clientIds)
          .order("created_at", { ascending: false })
      : { data: [] },
    clientIds.length > 0
      ? sb
          .from("documents")
          .select("client_id, name, extracted_text, created_at")
          .in("client_id", clientIds)
          .not("extracted_text", "is", null)
          .order("created_at", { ascending: false })
      : { data: [] },
    sb
      .from("tasks")
      .select("client_id, title, due_at, status")
      .eq("user_id", userId)
      .neq("status", "feito")
      .neq("status", "cancelado"),
  ]);

  const notesByClient = new Map<string, { kind: string; content: string; created_at: string }[]>();
  for (const n of notesRes.data ?? []) {
    if (!n.client_id) continue;
    if (!notesByClient.has(n.client_id)) notesByClient.set(n.client_id, []);
    notesByClient.get(n.client_id)!.push(n as any);
  }

  const docsByClient = new Map<string, { name: string; extracted_text: string | null; created_at: string }[]>();
  for (const d of docsRes.data ?? []) {
    if (!d.client_id) continue;
    if (!docsByClient.has(d.client_id)) docsByClient.set(d.client_id, []);
    docsByClient.get(d.client_id)!.push(d as any);
  }

  const now = new Date().toISOString();
  const allTasks = tasksRes.data ?? [];
  const tasksByClient = new Map<string, typeof allTasks>();
  for (const t of allTasks) {
    if (!t.client_id) continue;
    if (!tasksByClient.has(t.client_id)) tasksByClient.set(t.client_id, []);
    tasksByClient.get(t.client_id)!.push(t);
  }

  // 3. Clientes sem reunião hoje (14+ dias sem sessão)
  const clientIdsWithMeeting = new Set(meetings.map((m) => m.clientId).filter(Boolean));
  const { data: allClients } = await sb
    .from("clients")
    .select("id, name, type, birthday, important_dates, last_contact_at, created_at")
    .eq("user_id", userId)
    .neq("status", "arquivado");

  const { data: lastEvents } = await sb
    .from("calendar_events")
    .select("client_id, start_at")
    .eq("user_id", userId)
    .lt("start_at", dayStart)
    .order("start_at", { ascending: false });

  const lastEventByClient = new Map<string, string>();
  for (const ev of lastEvents ?? []) {
    if (ev.client_id && !lastEventByClient.has(ev.client_id)) {
      lastEventByClient.set(ev.client_id, ev.start_at);
    }
  }

  const clientsWithoutMeeting = (allClients ?? [])
    .filter((c) => !clientIdsWithMeeting.has(c.id))
    .map((c) => {
      const lastEv = lastEventByClient.get(c.id);
      const days = lastEv ? Math.floor((Date.now() - new Date(lastEv).getTime()) / 86_400_000) : null;
      return { id: c.id, name: c.name, type: c.type, daysSince: days };
    })
    .filter((c) => c.daysSince === null || c.daysSince >= 14)
    .sort((a, b) => (b.daysSince ?? 999) - (a.daysSince ?? 999));

  // 4. Datas especiais próximos 7 dias
  const dateAlerts: { clientName: string; label: string; daysUntil: number }[] = [];
  for (const c of allClients ?? []) {
    if (c.birthday) {
      const bd = new Date(`${c.birthday}T12:00:00`);
      const d = daysUntilNextOccurrence(bd.getMonth() + 1, bd.getDate(), today);
      if (d !== null) dateAlerts.push({ clientName: c.name, label: "Aniversário", daysUntil: d });
    }
    for (const imp of (c.important_dates as { label: string; month: number; day: number; year: number | null }[] | null) ?? []) {
      if (imp.year !== null && imp.year !== today.getFullYear()) continue;
      const d = imp.year !== null
        ? (() => {
            const ev = new Date(imp.year, imp.month - 1, imp.day);
            ev.setHours(0, 0, 0, 0);
            const base = new Date(today);
            base.setHours(0, 0, 0, 0);
            const diff = Math.floor((ev.getTime() - base.getTime()) / 86_400_000);
            return diff >= 0 && diff <= 7 ? diff : null;
          })()
        : daysUntilNextOccurrence(imp.month, imp.day, today);
      if (d !== null) dateAlerts.push({ clientName: c.name, label: imp.label, daysUntil: d });
    }
  }
  dateAlerts.sort((a, b) => a.daysUntil - b.daysUntil);

  // 5. Radar de ativação
  const { data: rules } = await sb
    .from("activation_rules")
    .select("name, applies_to_status, trigger_days_no_contact")
    .eq("user_id", userId)
    .eq("active", true);

  type RuleAlert = { ruleName: string; clients: { name: string; days: number }[] };
  const ruleAlerts: RuleAlert[] = [];

  for (const rule of rules ?? []) {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - rule.trigger_days_no_contact);
    const { data: triggered } = await sb
      .from("clients")
      .select("id, name, last_contact_at, created_at")
      .eq("user_id", userId)
      .eq("status", rule.applies_to_status)
      .or(`last_contact_at.lt.${threshold.toISOString()},last_contact_at.is.null`);

    if (triggered && triggered.length > 0) {
      ruleAlerts.push({
        ruleName: rule.name,
        clients: triggered.map((c) => {
          const ref = c.last_contact_at ?? c.created_at;
          return { name: c.name, days: ref ? Math.floor((Date.now() - new Date(ref).getTime()) / 86_400_000) : 99 };
        }),
      });
    }
  }

  // 6. Novos leads (últimas 24h)
  const since24h = new Date(Date.now() - 86_400_000).toISOString();
  const { data: newLeads } = await sb
    .from("clients")
    .select("id, name, email, phone, source, utm_source, utm_campaign, created_at, client_diagnostics(stage_label, score, max_score)")
    .eq("user_id", userId)
    .eq("status", "lead")
    .gte("created_at", since24h)
    .order("created_at", { ascending: false });

  // 7. Arquivos do Google Drive + config de IA
  const { readDriveFolder } = await import("@/features/agenda/lib/google-drive-reader");
  const [driveFiles, aiConfig] = await Promise.all([
    readDriveFolder(userId),
    getCallableAiConfig(userId),
  ]);

  // 8. Montar userMessage
  const dateLabel = today.toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });

  const lines: string[] = [
    "Donna, briefing de hoje.",
    "",
    `DATA: ${dateLabel}`,
    "",
    "─── REUNIÕES DO DIA ───",
    "",
  ];

  if (meetings.length === 0) {
    lines.push("(nenhuma reunião hoje)");
    lines.push("");
  }

  for (const m of meetings) {
    const hora = new Date(m.startAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    lines.push(`${hora} — ${m.title}${m.clientType ? ` (${m.clientType})` : ""}${m.fromGoogle ? " [Google]" : ""}`);

    if (!m.clientId) {
      lines.push("(cliente não vinculado no sistema)");
    } else {
      const notes = notesByClient.get(m.clientId) ?? [];
      const ctxNote = notes.find((n) => n.kind === "contexto");
      const sessionNotes = notes.filter((n) => n.kind === "nota").slice(0, 3);
      const docs = (docsByClient.get(m.clientId) ?? []).slice(0, 2);
      const clientTasks = tasksByClient.get(m.clientId) ?? [];
      const overdue = clientTasks.filter((t) => t.due_at && t.due_at < now);
      const open = clientTasks.filter((t) => !t.due_at || t.due_at >= now);

      if (ctxNote) {
        lines.push(`Contexto comportamental (${new Date(ctxNote.created_at).toLocaleDateString("pt-BR")}):`);
        lines.push('"""');
        lines.push(ctxNote.content.slice(0, 1500));
        lines.push('"""');
      } else {
        lines.push("(sem contexto comportamental registrado)");
      }

      if (sessionNotes.length > 0) {
        lines.push("Últimas notas de sessão:");
        for (const n of sessionNotes) {
          lines.push(`- [${new Date(n.created_at).toLocaleDateString("pt-BR")}] ${n.content.slice(0, 300)}`);
        }
      }

      if (docs.length > 0) {
        lines.push("Documentos indexados:");
        for (const d of docs) {
          lines.push(`- [${d.name}] ${(d.extracted_text ?? "").slice(0, 500)}`);
        }
      }

      lines.push(`Tarefas atrasadas: ${overdue.length > 0 ? overdue.map((t) => `${t.title} (vencia ${t.due_at ? new Date(t.due_at).toLocaleDateString("pt-BR") : "?"})`).join("; ") : "nenhuma"}`);
      lines.push(`Tarefas em aberto: ${open.length > 0 ? open.map((t) => t.title).join("; ") : "nenhuma"}`);
    }

    lines.push("");
    lines.push("───");
    lines.push("");
  }

  lines.push("─── CLIENTES SEM REUNIÃO MARCADA (há 14+ dias) ───");
  if (clientsWithoutMeeting.length === 0) {
    lines.push("(todos os clientes têm sessão recente)");
  } else {
    for (const c of clientsWithoutMeeting) {
      const lastEv = lastEventByClient.get(c.id);
      lines.push(`- ${c.name} (${c.type}) — ${c.daysSince !== null ? `${c.daysSince} dias sem sessão` : "sem histórico"}`);
      if (lastEv) lines.push(`  última sessão: ${new Date(lastEv).toLocaleDateString("pt-BR")}`);
    }
  }

  lines.push("");
  lines.push("─── DATAS ESPECIAIS (próximos 7 dias) ───");
  if (dateAlerts.length === 0) {
    lines.push("(nenhuma)");
  } else {
    for (const a of dateAlerts) {
      const when = a.daysUntil === 0 ? "hoje" : a.daysUntil === 1 ? "amanhã" : `em ${a.daysUntil} dias`;
      lines.push(`- ${a.label} de ${a.clientName}: ${when}`);
    }
  }

  lines.push("");
  lines.push("─── RADAR DE ATIVAÇÃO ───");
  if (ruleAlerts.length === 0) {
    lines.push("(nenhuma regra disparada)");
  } else {
    for (const r of ruleAlerts) {
      lines.push(`Regra "${r.ruleName}": ${r.clients.length} cliente(s) — ${r.clients.map((c) => `${c.name} (${c.days}d)`).join(", ")}`);
    }
  }

  lines.push("");
  lines.push("─── NOVOS LEADS (últimas 24h) ───");
  if (!newLeads || newLeads.length === 0) {
    lines.push("(nenhum novo lead)");
  } else {
    for (const lead of newLeads) {
      const hora = new Date(lead.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      const canal = lead.source === "instagram" ? "Instagram" : lead.source === "google_ads" ? "Google Ads" : "Landing Page";
      lines.push(`${hora} · ${lead.name} — ${canal}${lead.utm_campaign ? ` (campanha: ${lead.utm_campaign})` : ""}`);
      if (lead.email) lines.push(`  Email: ${lead.email}`);
      if (lead.phone) lines.push(`  Telefone: ${lead.phone}`);
      const diag = (lead as any).client_diagnostics?.[0];
      if (diag) {
        lines.push(`  Diagnóstico: ${diag.stage_label} (${diag.score}/${diag.max_score} pts)`);
      } else {
        lines.push("  Diagnóstico: sem diagnóstico");
      }
      lines.push("");
    }
  }

  lines.push("");
  lines.push("─── ARQUIVOS DO GOOGLE DRIVE ───");
  if (driveFiles.length === 0) {
    lines.push("(nenhuma pasta configurada ou sem arquivos)");
  } else {
    for (const f of driveFiles) {
      const modDate = new Date(f.modifiedTime).toLocaleDateString("pt-BR");
      lines.push(`[${f.name}] (atualizado em ${modDate})`);
      lines.push(f.content);
      lines.push("");
    }
  }

  const userMessage = lines.join("\n");
  return callAI(DONNA_SYSTEM_PROMPT, userMessage, aiConfig);
}

// ─── Route handler ────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Route = (createFileRoute as any)("/api/cron/donna-briefing")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        // Validate Vercel cron secret
        const cronSecret = process.env.CRON_SECRET;
        const authHeader = request.headers.get("Authorization");
        if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const today = toLocalDate(new Date());

        // Get all user IDs
        const { data: profiles, error: profilesErr } = await supabaseAdmin
          .from("profiles")
          .select("id");

        if (profilesErr) {
          return Response.json({ error: profilesErr.message }, { status: 500 });
        }

        const userIds = (profiles ?? []).map((p) => p.id);
        let processed = 0;
        let skipped = 0;
        let errors = 0;

        for (const userId of userIds) {
          try {
            // Check if briefing already exists for today
            const { data: existing } = await supabaseAdmin
              .from("donna_briefings" as any)
              .select("id")
              .eq("user_id", userId)
              .eq("briefing_date", today)
              .limit(1)
              .maybeSingle();

            if (existing) {
              skipped++;
              continue;
            }

            // Generate and persist
            const content = await generateForUser(supabaseAdmin, userId);

            await supabaseAdmin
              .from("donna_briefings" as any)
              .insert({ user_id: userId, briefing_date: today, content });

            processed++;
          } catch (err) {
            console.error(`[cron/donna-briefing] error for user ${userId}:`, err);
            errors++;
          }
        }

        return Response.json({ ok: true, processed, skipped, errors });
      },
    },
  },
});
