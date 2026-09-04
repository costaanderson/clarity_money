import { createLazyFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import { getWeekDashboard } from "@/features/week-panel/lib/dashboard.functions";
import { createTask, setTaskStatus } from "@/features/tasks/lib/tasks.functions";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Users, CalendarDays, CheckSquare, AlertTriangle,
  ChevronLeft, ChevronRight, Clock, RefreshCw,
  CheckCheck, Lightbulb, ListChecks, Check, Sparkles,
} from "lucide-react";
import { toast } from "sonner";

export const Route = (createLazyFileRoute as unknown as (p: string) => any)("/_authenticated/")({
  component: DashboardPage,
});

// ─── Editorial Clarity — Material You tokens ──────────────────────────────────
const C = {
  // Surfaces
  surface:           "#fff8f2",
  container:         "#f6ede1",
  containerLow:      "#fcf2e7",
  containerBase:     "#ffffff",   // surface-container-lowest
  containerHigh:     "#f0e7db",
  containerTop:      "#eae1d6",   // surface-container-highest
  // Text
  text:              "#1f1b14",   // on-surface
  textMuted:         "#4b463f",   // on-surface-variant
  // Brand / secondary (warm leather)
  brand:             "#785833",
  brandContainer:    "#fed2a3",   // secondary-container
  brandFixed:        "#ffddb9",   // secondary-fixed
  brandFixedDim:     "#e9bf91",   // secondary-fixed-dim
  brandFixedText:    "#2b1700",   // on-secondary-fixed
  brandContText:     "#795933",   // on-secondary-container
  // Tertiary (botanical green)
  green:             "#c6ebd9",   // tertiary-fixed
  greenDim:          "#abcebe",   // tertiary-fixed-dim
  greenDark:         "#002116",   // tertiary-container / on-tertiary-fixed
  // Primary = jet black
  primary:           "#000000",
  onPrimary:         "#ffffff",
  // Outline
  outline:           "#7c766e",
  outlineVariant:    "#cdc5bc",
  // Error / alert
  error:             "#ba1a1a",
  errorContainer:    "#ffdad6",
  // Inverse
  inverseOnSurf:     "#f9efe4",
} as const;

const serif: React.CSSProperties = { fontFamily: "Newsreader, ui-serif, Georgia, serif" };
const sans: React.CSSProperties  = { fontFamily: '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif' };
const shadow = "0 1px 4px rgba(0,0,0,0.05)";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(d: string) {
  return new Date(d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
function formatDay(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
}
function formatWeekLabel(weekStart: string, weekEnd: string) {
  const start = new Date(weekStart);
  const end   = new Date(new Date(weekEnd).getTime() - 1);
  const opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" };
  const endOpts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" };
  return `${start.toLocaleDateString("pt-BR", opts)} — ${end.toLocaleDateString("pt-BR", endOpts)}`;
}
function getWeekNumber(dateStr: string) {
  const d = new Date(dateStr);
  const onejan = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d.getTime() - onejan.getTime()) / 86400000) + onejan.getDay() + 1) / 7);
}
function getCoachingText(counts?: { eventsThisWeek?: number; overdue?: number; tasksThisWeek?: number }) {
  if (!counts) return "Reserve tempo para reflexão semanal — ela transforma dados em direção.";
  if ((counts.overdue ?? 0) > 0)
    return "Atenção: há tarefas em atraso. Priorize-as antes de novos compromissos para manter o ritmo.";
  if ((counts.eventsThisWeek ?? 0) > 10)
    return "Semana densa de compromissos. Identifique pausas estratégicas para garantir presença total em cada encontro.";
  if ((counts.eventsThisWeek ?? 0) === 0)
    return "Semana com agenda livre — ótimo momento para planejamento estratégico com seus clientes.";
  return "A clareza antecede o ritmo sereno. Mantenha espaços de reflexão entre os compromissos para aprofundar cada orientação.";
}

// ─── Page ─────────────────────────────────────────────────────────────────────
function DashboardPage() {
  const [weekOffset, setWeekOffset]     = useState(0);
  const [openDays, setOpenDays]         = useState<Set<string>>(() => new Set([new Date().toDateString()]));
  const [newTask, setNewTask]           = useState("");
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", "week", weekOffset],
    queryFn: () => getWeekDashboard({ data: { weekOffset } }),
  });

  // Reset local completed state when week changes
  useEffect(() => { setCompletedIds(new Set()); }, [weekOffset]);

  // Compute 7-day strip from weekStart
  const weekDays = useMemo(() => {
    if (!data?.weekStart) return [];
    const start = new Date(data.weekStart);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [data?.weekStart]);

  // Group events by day key
  const eventsByDay = useMemo(() => {
    const map = new Map<string, typeof allEvents>();
    const allEvents = data?.events ?? [];
    allEvents.forEach((e) => {
      const key = new Date(e.start_at).toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });
    return map;
  }, [data?.events]);

  // Combined task list: overdue first, then week tasks
  const allTasks = useMemo(() => {
    const overdues = (data?.overdueTasks ?? []).map((t) => ({ ...t, isOverdue: true as const }));
    const week     = (data?.tasks ?? []).map((t) => ({ ...t, isOverdue: false as const }));
    return [...overdues, ...week];
  }, [data?.overdueTasks, data?.tasks]);

  const toggleDay = (key: string) =>
    setOpenDays((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const addTask = useMutation({
    mutationFn: () =>
      createTask({ data: { title: newTask.trim(), description: null, due_at: null, client_id: null } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      setNewTask("");
      toast.success("Tarefa adicionada");
    },
    onError: () => toast.error("Erro ao adicionar tarefa"),
  });

  const toggleTask = useMutation({
    mutationFn: (v: { id: string; status: "pendente" | "feito" }) => setTaskStatus({ data: v }),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      if (v.status === "feito") {
        toast.success("Tarefa concluída", {
          action: {
            label: "Desfazer",
            onClick: () => {
              setCompletedIds((prev) => { const n = new Set(prev); n.delete(v.id); return n; });
              toggleTask.mutate({ id: v.id, status: "pendente" });
            },
          },
        });
      }
    },
  });

  const counts  = data?.counts;
  const today   = new Date().toDateString();
  const weekNum = data?.weekStart ? getWeekNumber(data.weekStart) : null;

  return (
    <div style={{ ...sans, background: C.surface, minHeight: "100vh" }}>
      <div className="max-w-[1240px] mx-auto px-4 lg:px-6 py-6 lg:py-8 flex flex-col gap-6">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: C.brand }}>
                Sua semana na Bússola
              </span>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: "6px",
                padding: "2px 10px", borderRadius: "9999px",
                background: C.green, color: C.greenDark,
                fontSize: "11px", fontWeight: 500,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.greenDark, opacity: 0.5 }} />
                {(counts?.overdue ?? 0) === 0 ? "Em dia" : "Atenção necessária"}
              </span>
            </div>
            <h1 style={{ ...serif, fontSize: "clamp(28px,4vw,38px)", fontWeight: 400, lineHeight: 1.2, letterSpacing: "-0.02em", color: C.text, margin: 0 }}>
              Painel da semana
            </h1>
          </div>

          {/* Date navigator */}
          <div style={{
            display: "flex", alignItems: "center", gap: "0.75rem",
            background: C.containerLow, padding: "0.5rem 1rem",
            borderRadius: "9999px", boxShadow: shadow, alignSelf: "flex-start",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <NavBtn onClick={() => setWeekOffset((o) => o - 1)} aria-label="Semana anterior">
                <ChevronLeft style={{ width: 18, height: 18 }} />
              </NavBtn>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "0 8px" }}>
                <CalendarDays style={{ width: 16, height: 16, color: C.brand }} />
                <span style={{ fontSize: "15px", fontWeight: 600, color: C.text, whiteSpace: "nowrap" }}>
                  {isLoading
                    ? <Skeleton className="h-4 w-44 inline-block align-middle" />
                    : data ? formatWeekLabel(data.weekStart, data.weekEnd) : ""}
                </span>
              </div>
              <NavBtn onClick={() => setWeekOffset((o) => o + 1)} aria-label="Próxima semana">
                <ChevronRight style={{ width: 18, height: 18 }} />
              </NavBtn>
            </div>
            <div style={{ width: 1, height: 16, background: C.outlineVariant, flexShrink: 0 }} />
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {weekNum && (
                <span style={{ fontSize: "11px", fontWeight: 500, background: C.containerTop, color: C.textMuted, padding: "2px 8px", borderRadius: "6px" }}>
                  Sem. {weekNum}
                </span>
              )}
              {weekOffset !== 0 && (
                <button
                  onClick={() => setWeekOffset(0)}
                  style={{ ...sans, fontSize: "12.5px", fontWeight: 500, color: C.text, background: "none", border: "none", cursor: "pointer", padding: "2px 8px", borderRadius: "6px" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = C.container; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; }}
                >
                  Hoje
                </button>
              )}
            </div>
          </div>
        </header>

        {/* ── Week Strip ───────────────────────────────────────────────────── */}
        <div style={{ background: C.containerLow, borderRadius: "0.75rem", padding: "8px", boxShadow: shadow, overflowX: "auto" }}>
          <div className="grid grid-cols-7 min-w-[560px] gap-1 text-center">
            {isLoading
              ? Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0.75rem 0.25rem" }}>
                    <Skeleton className="h-3 w-8 mb-2" />
                    <Skeleton className="h-6 w-8 mb-2" />
                  </div>
                ))
              : weekDays.map((day) => {
                  const key       = day.toDateString();
                  const isToday   = key === today;
                  const dayEvents = eventsByDay.get(key) ?? [];
                  const dayLabel  = day.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "").toUpperCase();
                  const dayNum    = day.getDate().toString().padStart(2, "0");
                  return (
                    <button
                      key={key}
                      type="button"
                      style={{
                        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                        padding: "0.75rem 0.25rem", borderRadius: "0.5rem", border: "none", cursor: "pointer",
                        background: isToday ? C.primary : "transparent",
                        boxShadow: isToday ? "0 2px 8px rgba(0,0,0,0.2)" : "none",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => { if (!isToday) (e.currentTarget as HTMLElement).style.background = C.container; }}
                      onMouseLeave={(e) => { if (!isToday) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    >
                      <span style={{ ...sans, fontSize: "11px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: isToday ? "rgba(255,255,255,0.65)" : C.textMuted }}>
                        {dayLabel}
                      </span>
                      <span style={{ ...serif, fontSize: "22px", lineHeight: 1.2, marginTop: "4px", color: isToday ? C.onPrimary : C.text, fontWeight: isToday ? 500 : 400 }}>
                        {dayNum}
                      </span>
                      <div style={{ display: "flex", gap: "4px", marginTop: "6px", height: "6px", alignItems: "center" }}>
                        {dayEvents.length >= 1 && <span style={{ width: 6, height: 6, borderRadius: "50%", background: isToday ? "rgba(255,255,255,0.55)" : C.brand }} />}
                        {dayEvents.length >= 2 && <span style={{ width: 6, height: 6, borderRadius: "50%", background: isToday ? "rgba(255,255,255,0.55)" : C.green }} />}
                        {dayEvents.length >= 3 && <span style={{ width: 6, height: 6, borderRadius: "50%", background: isToday ? "rgba(255,255,255,0.55)" : C.greenDim }} />}
                      </div>
                    </button>
                  );
                })}
          </div>
        </div>

        {/* ── KPI Stat Bar ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Clientes esta semana"
            value={counts?.clientsThisWeek}
            sub={counts?.clientsThisWeek === 0 ? "nenhum agendado" : `de ${counts?.activeClients ?? 0} ativos`}
            icon={<Users style={{ width: 19, height: 19, color: C.textMuted }} />}
            loading={isLoading}
          />
          <KpiCard
            label="Compromissos"
            value={counts?.eventsThisWeek}
            sub={counts?.eventsThisWeek ? "nos 7 dias" : "sem compromissos"}
            icon={<CalendarDays style={{ width: 19, height: 19, color: C.brand }} />}
            loading={isLoading}
          />
          <KpiCard
            label="Tarefas na semana"
            value={counts?.tasksThisWeek}
            sub={counts?.tasksThisWeek ? `${counts.tasksThisWeek} pendente${counts.tasksThisWeek > 1 ? "s" : ""}` : "em dia"}
            subStyle={counts?.tasksThisWeek ? { background: C.brandFixed, color: C.brandFixedText } : undefined}
            icon={<CheckSquare style={{ width: 19, height: 19, color: C.textMuted }} />}
            loading={isLoading}
          />
          <KpiCard
            label="Atrasadas"
            value={counts?.overdue}
            sub={counts?.overdue === 0 ? "Em dia" : `${counts?.overdue} em atraso`}
            subStyle={counts?.overdue ? { background: C.errorContainer, color: C.error } : { background: C.green, color: C.greenDark }}
            icon={counts?.overdue
              ? <AlertTriangle style={{ width: 19, height: 19, color: C.error }} />
              : <CheckCheck style={{ width: 19, height: 19, color: C.greenDark }} />}
            loading={isLoading}
          />
        </div>

        {/* ── Main 2-column body ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* LEFT: Accordion Compromissos (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-3">

            {/* Section bar */}
            <div style={{ background: C.containerBase, borderRadius: "0.75rem", padding: "1rem", boxShadow: shadow, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <CalendarDays style={{ width: 20, height: 20, color: C.brand }} />
                <h2 style={{ ...serif, fontSize: "19px", fontWeight: 600, letterSpacing: "-0.01em", color: C.text, margin: 0 }}>
                  Compromissos da semana
                </h2>
                <span style={{ fontSize: "11px", fontWeight: 600, background: C.containerTop, color: C.textMuted, padding: "2px 10px", borderRadius: "9999px" }}>
                  {counts?.eventsThisWeek ?? 0}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <LinkBtn onClick={() => setOpenDays(new Set(weekDays.map((d) => d.toDateString())))}>Expandir todos</LinkBtn>
                <span style={{ color: C.outlineVariant }}>·</span>
                <LinkBtn onClick={() => setOpenDays(new Set())}>Recolher</LinkBtn>
              </div>
            </div>

            {/* Accordion items */}
            {isLoading
              ? <Skeleton className="h-48 rounded-xl" />
              : weekDays.map((day) => {
                  const key        = day.toDateString();
                  const isOpen     = openDays.has(key);
                  const isToday    = key === today;
                  const dayEvents  = eventsByDay.get(key) ?? [];
                  const fullLabel  = day.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "short" });
                  const label      = fullLabel.charAt(0).toUpperCase() + fullLabel.slice(1);

                  return (
                    <div key={key} style={{
                      background: C.containerBase,
                      borderRadius: "0.75rem",
                      boxShadow: isToday
                        ? `0 0 0 1.5px ${C.brand}55, ${shadow}`
                        : shadow,
                      overflow: "hidden",
                      transition: "box-shadow 0.15s",
                    }}>
                      <button
                        type="button"
                        onClick={() => toggleDay(key)}
                        style={{
                          ...sans, width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "0.75rem 1rem", border: "none", cursor: "pointer", textAlign: "left",
                          background: isOpen ? C.containerLow : "transparent", transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) => { if (!isOpen) (e.currentTarget as HTMLElement).style.background = C.containerLow; }}
                        onMouseLeave={(e) => { if (!isOpen) (e.currentTarget as HTMLElement).style.background = isOpen ? C.containerLow : "transparent"; }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <ChevronRight style={{ width: 18, height: 18, color: isOpen ? C.text : C.textMuted, transform: isOpen ? "rotate(90deg)" : "rotate(0)", transition: "transform 0.2s", flexShrink: 0 }} />
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "15px", fontWeight: isToday ? 700 : 600, color: C.text }}>
                              {label}
                            </span>
                            {isToday && (
                              <span style={{ fontSize: "11px", fontWeight: 500, background: C.primary, color: C.onPrimary, padding: "1px 8px", borderRadius: "9999px" }}>
                                Hoje
                              </span>
                            )}
                          </div>
                        </div>
                        <span style={{ fontSize: "12.5px", color: C.textMuted, background: C.containerTop, padding: "2px 10px", borderRadius: "9999px", whiteSpace: "nowrap" }}>
                          {dayEvents.length} compromisso{dayEvents.length !== 1 ? "s" : ""}
                        </span>
                      </button>

                      {isOpen && (
                        <div style={{ padding: "0 1rem 1rem", paddingTop: "8px", display: "flex", flexDirection: "column", gap: "8px" }}>
                          {dayEvents.length === 0 ? (
                            <p style={{ fontSize: "14px", color: C.textMuted, padding: "4px 0" }}>Sem compromissos neste dia.</p>
                          ) : dayEvents.map((e, i) => {
                            const isGoogle = (e as any).from_google === true;
                            return (
                              <div
                                key={e.id ?? `g-${i}`}
                                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem", borderRadius: "0.5rem", background: C.containerLow, transition: "background 0.15s", gap: "0.75rem" }}
                                onMouseEnter={(el) => { (el.currentTarget as HTMLElement).style.background = C.containerHigh; }}
                                onMouseLeave={(el) => { (el.currentTarget as HTMLElement).style.background = C.containerLow; }}
                              >
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "4px" }}>
                                    <span style={{ fontSize: "15px", fontWeight: 600, color: C.text }}>{e.title}</span>
                                    {isGoogle && (
                                      <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", fontSize: "10px", fontWeight: 500, background: C.containerTop, color: C.textMuted, padding: "1px 8px", borderRadius: "4px" }}>
                                        <RefreshCw style={{ width: 11, height: 11 }} /> Google
                                      </span>
                                    )}
                                  </div>
                                  <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12.5px", color: C.textMuted }}>
                                    <Clock style={{ width: 13, height: 13 }} />
                                    {formatTime(e.start_at)} — {formatTime(e.end_at)}
                                    {e.clients?.name ? ` · ${e.clients.name}` : ""}
                                  </span>
                                </div>
                                {e.clients?.id && (
                                  <Link
                                    to="/clientes/$id"
                                    params={{ id: e.clients.id }}
                                    style={{ fontSize: "12px", fontWeight: 500, color: C.brand, textDecoration: "underline", whiteSpace: "nowrap", flexShrink: 0 }}
                                  >
                                    abrir
                                  </Link>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

            {!isLoading && (data?.events ?? []).length === 0 && (
              <div style={{ background: C.containerBase, borderRadius: "0.75rem", padding: "2.5rem", textAlign: "center", color: C.textMuted, fontSize: "14px", boxShadow: shadow }}>
                Nenhum compromisso agendado para esta semana.
              </div>
            )}
          </div>

          {/* RIGHT: Tarefas + Coaching (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4">

            {/* ── Task Card ─────────────────────────────────────────────────── */}
            <div style={{ background: C.containerBase, borderRadius: "0.75rem", padding: "1rem", boxShadow: shadow, display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <ListChecks style={{ width: 20, height: 20, color: C.primary }} />
                  <h2 style={{ ...serif, fontSize: "19px", fontWeight: 600, letterSpacing: "-0.01em", color: C.text, margin: 0 }}>
                    Tarefas
                  </h2>
                </div>
                <span style={{ fontSize: "12.5px", fontWeight: 500, color: C.textMuted }}>
                  {completedIds.size} de {allTasks.length} concluída{allTasks.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Task items */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {isLoading && <Skeleton className="h-24 rounded-lg" />}
                {!isLoading && allTasks.length === 0 && (
                  <p style={{ fontSize: "14px", color: C.textMuted }}>Nada pendente esta semana.</p>
                )}
                {allTasks.map((t) => {
                  const done = completedIds.has(t.id);
                  return (
                    <div
                      key={t.id}
                      style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.75rem", padding: "0.75rem", borderRadius: "0.5rem", background: C.containerLow, transition: "background 0.15s" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = C.container; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = C.containerLow; }}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", minWidth: 0, flex: 1 }}>
                        <button
                          type="button"
                          aria-label="Marcar como concluída"
                          onClick={() => {
                            if (done) {
                              setCompletedIds((prev) => { const n = new Set(prev); n.delete(t.id); return n; });
                              toggleTask.mutate({ id: t.id, status: "pendente" });
                            } else {
                              setCompletedIds((prev) => new Set([...prev, t.id]));
                              toggleTask.mutate({ id: t.id, status: "feito" });
                            }
                          }}
                          style={{
                            marginTop: "2px", width: 18, height: 18, borderRadius: "5px", flexShrink: 0,
                            background: done ? C.primary : C.containerBase,
                            border: `1.5px solid ${done ? C.primary : C.outlineVariant}`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            cursor: "pointer", transition: "all 0.15s", padding: 0,
                          }}
                        >
                          {done && <Check style={{ width: 11, height: 11, color: C.onPrimary, strokeWidth: 3 }} />}
                        </button>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <span style={{ fontSize: "15px", fontWeight: 600, color: done ? C.textMuted : C.text, textDecoration: done ? "line-through" : "none", transition: "all 0.2s" }}>
                            {t.title}
                          </span>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px", flexWrap: "wrap" }}>
                            {t.due_at && (
                              <span style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "12.5px", color: C.textMuted }}>
                                <Clock style={{ width: 12, height: 12 }} />
                                {t.isOverdue ? `Venceu ${formatDay(t.due_at)}` : formatDay(t.due_at)}
                              </span>
                            )}
                            {t.clients?.name && (
                              <span style={{ fontSize: "12.5px", color: C.textMuted }}>· {t.clients.name}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <span style={{
                        fontSize: "11px", fontWeight: 500, whiteSpace: "nowrap", flexShrink: 0,
                        padding: "2px 10px", borderRadius: "9999px",
                        background: t.isOverdue ? C.errorContainer : C.containerTop,
                        color: t.isOverdue ? C.error : C.textMuted,
                      }}>
                        {t.isOverdue ? "Atrasada" : "Semana"}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Quick-add form */}
              <form
                onSubmit={(e) => { e.preventDefault(); if (newTask.trim()) addTask.mutate(); }}
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <input
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  placeholder="Adicionar tarefa rápida para esta semana..."
                  style={{
                    ...sans, flex: 1, background: C.containerLow, border: "none", outline: "none",
                    fontSize: "12.5px", color: C.text, padding: "0.5rem 0.75rem", borderRadius: "0.5rem",
                    transition: "background 0.15s",
                  }}
                  onFocus={(e) => { (e.target as HTMLInputElement).style.background = C.container; }}
                  onBlur={(e) => { (e.target as HTMLInputElement).style.background = C.containerLow; }}
                />
                <button
                  type="submit"
                  disabled={!newTask.trim() || addTask.isPending}
                  style={{
                    ...sans, display: "flex", alignItems: "center", gap: "4px",
                    background: C.primary, color: C.onPrimary, border: "none",
                    fontSize: "12.5px", fontWeight: 500, padding: "0.5rem 0.75rem",
                    borderRadius: "0.5rem", cursor: "pointer",
                    opacity: !newTask.trim() || addTask.isPending ? 0.45 : 1,
                    transition: "opacity 0.15s",
                  }}
                >
                  Salvar
                </button>
              </form>
            </div>

            {/* ── Coaching Card ─────────────────────────────────────────────── */}
            <div style={{
              background: `${C.brandFixed}50`,
              borderRadius: "0.75rem", padding: "1rem", boxShadow: shadow,
              display: "flex", flexDirection: "column", gap: "0.75rem",
              position: "relative", overflow: "hidden",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: C.brand }}>
                  <Lightbulb style={{ width: 18, height: 18 }} />
                  <span style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    Orientação da semana
                  </span>
                </div>
                <span style={{ fontSize: "10px", fontWeight: 500, background: `${C.brandContainer}60`, color: C.brandContText, padding: "2px 10px", borderRadius: "9999px" }}>
                  Metodologia Bússola
                </span>
              </div>
              <blockquote style={{ ...serif, fontSize: "17px", fontWeight: 400, color: C.text, fontStyle: "italic", lineHeight: 1.65, margin: 0 }}>
                "{getCoachingText(counts)}"
              </blockquote>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: C.textMuted, fontSize: "12.5px", marginTop: "2px" }}>
                <Sparkles style={{ width: 14, height: 14, color: C.brand, flexShrink: 0 }} />
                <span>Reflexão gerada a partir dos seus {counts?.eventsThisWeek ?? 0} compromissos.</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({
  label, value, sub, subStyle, icon, loading,
}: {
  label: string;
  value?: number;
  sub?: string;
  subStyle?: React.CSSProperties;
  icon: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <div style={{ background: C.containerBase, borderRadius: "0.75rem", padding: "1rem", boxShadow: shadow, display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: "110px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <span style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: C.textMuted, lineHeight: 1.3, paddingRight: "8px" }}>
          {label}
        </span>
        {icon}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: "0.75rem", gap: "8px" }}>
        {loading
          ? <Skeleton className="h-10 w-16" />
          : <span style={{ fontFamily: "Newsreader, ui-serif, Georgia, serif", fontSize: "42px", fontWeight: 300, lineHeight: "44px", letterSpacing: "-0.03em", color: C.text }}>
              {value ?? 0}
            </span>}
        {sub && !loading && (
          <span style={{ fontSize: "11px", fontWeight: 500, whiteSpace: "nowrap", flexShrink: 0, padding: "2px 8px", borderRadius: "9999px", background: C.containerLow, color: C.textMuted, ...subStyle }}>
            {sub}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Nav Button ───────────────────────────────────────────────────────────────
function NavBtn({ children, onClick, "aria-label": al }: { children: React.ReactNode; onClick: () => void; "aria-label": string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={al}
      style={{ width: 28, height: 28, borderRadius: "9999px", border: "none", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.textMuted, transition: "background 0.15s", padding: 0 }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = C.containerTop; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
    >
      {children}
    </button>
  );
}

// ─── Link Button ──────────────────────────────────────────────────────────────
function LinkBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ fontFamily: '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif', fontSize: "12.5px", color: C.textMuted, background: "none", border: "none", cursor: "pointer", padding: "4px 8px", borderRadius: "6px", transition: "background 0.15s" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = C.containerLow; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; }}
    >
      {children}
    </button>
  );
}
