import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { fetchGoogleEvents } from "@/features/agenda/lib/google-calendar.functions";
import { getValidGoogleToken } from "@/features/agenda/lib/google-auth.functions";

function startOfWeek(d = new Date()) {
  const day = d.getDay(); // 0 = sun
  const diff = day === 0 ? -6 : 1 - day; // start on Monday
  const s = new Date(d);
  s.setDate(d.getDate() + diff);
  s.setHours(0, 0, 0, 0);
  return s;
}

export function getWeekRange(offset: number): { weekStart: Date; weekEnd: Date } {
  const base = startOfWeek();
  base.setDate(base.getDate() + offset * 7);
  const weekEnd = new Date(base);
  weekEnd.setDate(base.getDate() + 7);
  return { weekStart: base, weekEnd };
}

export const getWeekDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ weekOffset: z.number().int().default(0) }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { weekStart, weekEnd } = getWeekRange(data.weekOffset);
    const now = new Date();
    const isCurrentWeek = data.weekOffset === 0;

    const [events, tasks, clients, leads, overdueRes] = await Promise.all([
      context.supabase
        .from("calendar_events")
        .select("*, clients(id,name,type)")
        .gte("start_at", weekStart.toISOString())
        .lt("start_at", weekEnd.toISOString())
        .order("start_at"),
      context.supabase
        .from("tasks")
        .select("*, clients(id,name)")
        .in("status", ["pendente"])
        .gte("due_at", weekStart.toISOString())
        .lt("due_at", weekEnd.toISOString())
        .order("due_at"),
      context.supabase.from("clients").select("id", { count: "exact", head: true }).eq("status", "ativo"),
      context.supabase.from("clients").select("id", { count: "exact", head: true }).eq("status", "lead"),
      context.supabase
        .from("tasks")
        .select("id,title,due_at,clients(id,name)")
        .lt("due_at", now.toISOString())
        .eq("status", "pendente")
        .order("due_at"),
    ]);

    // Fetch Google Calendar events (if connected)
    const localEvents = events.data ?? [];
    const googleToken = await getValidGoogleToken(context.userId);
    let googleOnlyEvents: {
      id: null;
      google_event_id: string;
      title: string;
      start_at: string;
      end_at: string;
      clients: null;
      from_google: true;
    }[] = [];

    if (googleToken) {
      try {
        const googleEvents = await fetchGoogleEvents(
          context.userId,
          weekStart.toISOString(),
          weekEnd.toISOString(),
        );
        const localGoogleIds = new Set(
          localEvents.map((e) => e.google_event_id).filter(Boolean),
        );
        googleOnlyEvents = googleEvents
          .filter((e) => !localGoogleIds.has(e.google_event_id))
          .map((e) => ({
            id: null,
            google_event_id: e.google_event_id,
            title: e.title,
            start_at: e.start_at,
            end_at: e.end_at,
            clients: null,
            from_google: true as const,
          }));
      } catch {
        // não bloqueia se Google falhar
      }
    }

    const allEvents = [...localEvents, ...googleOnlyEvents].sort(
      (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
    );

    // Unique clients scheduled this week
    const clientIds = new Set<string>();
    localEvents.forEach((e) => e.client_id && clientIds.add(e.client_id));
    (tasks.data ?? []).forEach((t) => t.client_id && clientIds.add(t.client_id));

    return {
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      isCurrentWeek,
      weekOffset: data.weekOffset,
      events: allEvents,
      tasks: tasks.data ?? [],
      overdueTasks: isCurrentWeek ? (overdueRes.data ?? []) : [],
      counts: {
        activeClients: clients.count ?? 0,
        leads: leads.count ?? 0,
        clientsThisWeek: clientIds.size,
        eventsThisWeek: allEvents.length,
        tasksThisWeek: (tasks.data ?? []).length,
        overdue: isCurrentWeek ? (overdueRes.data ?? []).length : 0,
      },
    };
  });
