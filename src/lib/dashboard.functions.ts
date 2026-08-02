import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function startOfWeek(d = new Date()) {
  const day = d.getDay(); // 0 = sun
  const diff = day === 0 ? -6 : 1 - day; // start on Monday
  const s = new Date(d);
  s.setDate(d.getDate() + diff);
  s.setHours(0, 0, 0, 0);
  return s;
}

export const getWeekDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const weekStart = startOfWeek();
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const now = new Date();

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

    // Unique clients scheduled this week
    const clientIds = new Set<string>();
    (events.data ?? []).forEach((e) => e.client_id && clientIds.add(e.client_id));
    (tasks.data ?? []).forEach((t) => t.client_id && clientIds.add(t.client_id));

    return {
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      events: events.data ?? [],
      tasks: tasks.data ?? [],
      overdueTasks: overdueRes.data ?? [],
      counts: {
        activeClients: clients.count ?? 0,
        leads: leads.count ?? 0,
        clientsThisWeek: clientIds.size,
        eventsThisWeek: (events.data ?? []).length,
        tasksThisWeek: (tasks.data ?? []).length,
        overdue: (overdueRes.data ?? []).length,
      },
    };
  });
