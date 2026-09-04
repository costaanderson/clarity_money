import { createLazyFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getWeekDashboard } from "@/features/week-panel/lib/dashboard.functions";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Users, CalendarClock, CheckSquare, AlertTriangle, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";

export const Route = (createLazyFileRoute as unknown as (p: string) => any)("/_authenticated/")({
  component: DashboardPage,
});

// ─── Design tokens — Editorial Clarity ────────────────────────────────────────
const C = {
  canvas:       "#FBF9F5",
  card:         "#FFFFFF",
  border:       "#E9E3D8",
  divider:      "#F0EAE1",
  subtle:       "#F3EFE6",
  inkPrimary:   "#1C1A17",
  inkSecondary: "#6E685F",
  inkTertiary:  "#9E968B",
  brand:        "#8C6A43",
  alert:        "#C1382A",
  alertBg:      "#FCF0EE",
  googleBg:     "#EBF1F6",
  googleText:   "#36587A",
  weekBadgeBg:  "#F4EFE6",
  weekBadgeText:"#856133",
} as const;

const cardShadow = "0 2px 10px -2px rgba(45,38,27,0.04), 0 1px 3px 0 rgba(45,38,27,0.02)";
const serif: React.CSSProperties = { fontFamily: "Newsreader, ui-serif, Georgia, serif" };
const sans: React.CSSProperties  = { fontFamily: '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif' };

// ─── Formatters ───────────────────────────────────────────────────────────────
function formatDay(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
}
function formatTime(d: string) {
  return new Date(d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
function formatWeekLabel(weekStart: string, weekEnd: string) {
  const start = new Date(weekStart);
  const end   = new Date(new Date(weekEnd).getTime() - 1);
  const opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" };
  const endOpts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" };
  return `${start.toLocaleDateString("pt-BR", opts)} – ${end.toLocaleDateString("pt-BR", endOpts)}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
function DashboardPage() {
  const [weekOffset, setWeekOffset] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", "week", weekOffset],
    queryFn: () => getWeekDashboard({ data: { weekOffset } }),
  });

  const counts = data?.counts;
  const hasNoData =
    !isLoading &&
    data &&
    data.events.length === 0 &&
    data.tasks.length === 0 &&
    data.overdueTasks.length === 0;

  return (
    <div style={{ background: C.canvas, minHeight: "100vh", ...sans }}>
      <div style={{ maxWidth: "1240px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <header style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "2rem",
        }}>
          <div>
            <p style={{
              ...sans,
              fontSize: "11px",
              fontWeight: 600,
              lineHeight: "14px",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: C.brand,
              marginBottom: "6px",
            }}>
              Painel da Semana
            </p>
            <h1 style={{
              ...serif,
              fontSize: "clamp(28px, 4vw, 38px)",
              fontWeight: 400,
              lineHeight: "1.2",
              letterSpacing: "-0.02em",
              color: C.inkPrimary,
              margin: 0,
            }}>
              Sua semana na Bússola
            </h1>
          </div>

          {/* Date navigator */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {weekOffset !== 0 && (
              <button
                onClick={() => setWeekOffset(0)}
                style={{
                  ...sans,
                  fontSize: "11px",
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  color: C.brand,
                  background: C.subtle,
                  border: "none",
                  borderRadius: "9999px",
                  padding: "5px 14px",
                  cursor: "pointer",
                  transition: "opacity 0.15s",
                }}
              >
                Hoje
              </button>
            )}
            <NavBtn onClick={() => setWeekOffset((o) => o - 1)} aria-label="Semana anterior">
              <ChevronLeft style={{ width: 16, height: 16 }} />
            </NavBtn>
            <span style={{
              ...sans,
              fontSize: "12.5px",
              color: C.inkSecondary,
              minWidth: "175px",
              textAlign: "center",
            }}>
              {isLoading ? <Skeleton className="h-4 w-36 inline-block" /> : data ? formatWeekLabel(data.weekStart, data.weekEnd) : ""}
            </span>
            <NavBtn onClick={() => setWeekOffset((o) => o + 1)} aria-label="Próxima semana">
              <ChevronRight style={{ width: 16, height: 16 }} />
            </NavBtn>
          </div>
        </header>

        {/* ── KPI Stat Bar ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4" style={{ marginBottom: "1.75rem" }}>
          <StatCard
            label="Clientes esta semana"
            value={counts?.clientsThisWeek}
            icon={Users}
            loading={isLoading}
          />
          <StatCard
            label="Compromissos"
            value={counts?.eventsThisWeek}
            icon={CalendarClock}
            loading={isLoading}
          />
          <StatCard
            label="Tarefas na semana"
            value={counts?.tasksThisWeek}
            icon={CheckSquare}
            loading={isLoading}
          />
          <StatCard
            label="Atrasadas"
            value={counts?.overdue}
            icon={AlertTriangle}
            alert
            loading={isLoading}
          />
        </div>

        {/* ── Empty state ──────────────────────────────────────────────────── */}
        {hasNoData && (
          <div style={{
            background: C.card,
            border: `1px dashed ${C.border}`,
            borderRadius: "1rem",
            padding: "3.5rem 2rem",
            textAlign: "center",
            marginBottom: "1.75rem",
          }}>
            <p style={{ ...sans, fontSize: "14px", color: C.inkTertiary }}>
              {weekOffset < 0
                ? "Nenhuma atividade registrada nesta semana."
                : weekOffset > 0
                  ? "Nenhuma atividade planejada para esta semana."
                  : "Nada por aqui ainda. Que tal registrar um compromisso ou tarefa?"}
            </p>
          </div>
        )}

        {/* ── Main body — 2 columns ────────────────────────────────────────── */}
        {!hasNoData && (
          <div className="grid md:grid-cols-[7fr_5fr] gap-5">

            {/* Agenda */}
            <SectionCard
              icon={<CalendarClock style={{ width: 16, height: 16, color: C.inkTertiary }} />}
              title="Compromissos"
            >
              {isLoading && <Skeleton className="h-32 w-full" />}
              {!isLoading && data && data.events.length === 0 && (
                <p style={{ ...sans, fontSize: "14px", color: C.inkTertiary, padding: "0.75rem 0" }}>
                  Nenhum compromisso agendado.
                </p>
              )}
              {data?.events.map((e, i) => {
                const isGoogle = (e as any).from_google === true;
                const key = e.id ?? `g-${(e as any).google_event_id ?? i}`;
                return (
                  <div
                    key={key}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: "0.75rem",
                      padding: "0.75rem 0",
                      borderBottom: `1px solid ${C.divider}`,
                    }}
                    className="last:border-0"
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "3px" }}>
                        <p style={{ ...sans, fontSize: "15px", fontWeight: 600, color: C.inkPrimary, margin: 0 }}>
                          {e.title}
                        </p>
                        {isGoogle && (
                          <span style={{
                            ...sans,
                            fontSize: "10px",
                            fontWeight: 500,
                            background: C.googleBg,
                            color: C.googleText,
                            padding: "1px 8px",
                            borderRadius: "9999px",
                            lineHeight: "18px",
                          }}>
                            Google
                          </span>
                        )}
                      </div>
                      <p style={{ ...sans, fontSize: "12.5px", color: C.inkSecondary, margin: 0 }}>
                        {formatDay(e.start_at)} · {formatTime(e.start_at)}–{formatTime(e.end_at)}
                        {e.clients?.name ? ` · ${e.clients.name}` : ""}
                      </p>
                    </div>
                    {e.clients?.id && (
                      <Link
                        to="/clientes/$id"
                        params={{ id: e.clients.id }}
                        style={{
                          ...sans,
                          fontSize: "12px",
                          fontWeight: 500,
                          color: C.brand,
                          textDecoration: "underline",
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                        }}
                      >
                        abrir
                      </Link>
                    )}
                  </div>
                );
              })}
            </SectionCard>

            {/* Tarefas */}
            <SectionCard
              icon={<CheckSquare style={{ width: 16, height: 16, color: C.inkTertiary }} />}
              title="Tarefas"
            >
              {isLoading && <Skeleton className="h-32 w-full" />}
              {!isLoading && data && data.tasks.length === 0 && data.overdueTasks.length === 0 && (
                <p style={{ ...sans, fontSize: "14px", color: C.inkTertiary, padding: "0.75rem 0" }}>
                  Nada pendente esta semana.
                </p>
              )}
              {data?.overdueTasks.map((t) => (
                <div
                  key={t.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: "0.75rem",
                    padding: "0.75rem 0",
                    borderBottom: `1px solid ${C.divider}`,
                  }}
                  className="last:border-0"
                >
                  <div style={{ minWidth: 0 }}>
                    <p style={{ ...sans, fontSize: "15px", fontWeight: 600, color: C.inkPrimary, margin: 0 }}>
                      {t.title}
                    </p>
                    <p style={{ ...sans, fontSize: "12.5px", color: C.inkSecondary, margin: "3px 0 0" }}>
                      {t.due_at ? `Venceu em ${formatDay(t.due_at)}` : "Sem data"}
                      {t.clients?.name ? ` · ${t.clients.name}` : ""}
                    </p>
                  </div>
                  <span style={{
                    ...sans,
                    fontSize: "11px",
                    fontWeight: 600,
                    letterSpacing: "0.02em",
                    background: C.alertBg,
                    color: C.alert,
                    padding: "3px 10px",
                    borderRadius: "9999px",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}>
                    Atrasada
                  </span>
                </div>
              ))}
              {data?.tasks.map((t) => (
                <div
                  key={t.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: "0.75rem",
                    padding: "0.75rem 0",
                    borderBottom: `1px solid ${C.divider}`,
                  }}
                  className="last:border-0"
                >
                  <div style={{ minWidth: 0 }}>
                    <p style={{ ...sans, fontSize: "15px", fontWeight: 600, color: C.inkPrimary, margin: 0 }}>
                      {t.title}
                    </p>
                    <p style={{ ...sans, fontSize: "12.5px", color: C.inkSecondary, margin: "3px 0 0" }}>
                      {t.due_at ? formatDay(t.due_at) : "Sem data"}
                      {t.clients?.name ? ` · ${t.clients.name}` : ""}
                    </p>
                  </div>
                  <span style={{
                    ...sans,
                    fontSize: "11px",
                    fontWeight: 500,
                    background: C.weekBadgeBg,
                    color: C.weekBadgeText,
                    padding: "3px 10px",
                    borderRadius: "9999px",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}>
                    Semana
                  </span>
                </div>
              ))}
            </SectionCard>
          </div>
        )}

        {/* ── Behavioral tip ───────────────────────────────────────────────── */}
        <div style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "1rem",
          background: C.subtle,
          border: `1px solid ${C.border}`,
          borderRadius: "1rem",
          padding: "1.25rem 1.5rem",
          marginTop: "1.75rem",
        }}>
          <Sparkles style={{ width: 20, height: 20, color: C.brand, flexShrink: 0, marginTop: 2 }} />
          <div>
            <p style={{ ...sans, fontSize: "14px", fontWeight: 600, color: C.inkPrimary, margin: "0 0 4px" }}>
              Dica comportamental
            </p>
            <p style={{ ...sans, fontSize: "14px", color: C.inkSecondary, margin: 0, lineHeight: "20px" }}>
              Reserve 15 minutos no fim do dia para registrar contextos dos clientes atendidos.
              A memória fria vira dado — e a IA da Bússola transforma dado em insight.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  icon: Icon,
  alert,
  loading,
}: {
  label: string;
  value?: number;
  icon: React.ComponentType<{ style?: React.CSSProperties }>;
  alert?: boolean;
  loading?: boolean;
}) {
  const hasAlert = alert && (value ?? 0) > 0;
  return (
    <div style={{
      background: C.card,
      border: `1px solid ${C.border}`,
      borderRadius: "0.875rem",
      padding: "1rem",
      boxShadow: cardShadow,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "8px" }}>
        <p style={{
          ...sans,
          fontSize: "11px",
          fontWeight: 600,
          lineHeight: "14px",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: C.inkSecondary,
          margin: 0,
          paddingRight: "8px",
        }}>
          {label}
        </p>
        <Icon style={{ width: 16, height: 16, flexShrink: 0, color: hasAlert ? C.alert : C.inkTertiary }} />
      </div>
      {loading ? (
        <Skeleton className="h-10 w-16 mt-1" />
      ) : (
        <p style={{
          ...serif,
          fontSize: "42px",
          fontWeight: 300,
          lineHeight: "44px",
          letterSpacing: "-0.03em",
          color: hasAlert ? C.alert : C.inkPrimary,
          margin: 0,
        }}>
          {value ?? 0}
        </p>
      )}
    </div>
  );
}

// ─── Section Card (Agenda / Tarefas) ─────────────────────────────────────────
function SectionCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: C.card,
      border: `1px solid ${C.border}`,
      borderRadius: "1rem",
      boxShadow: cardShadow,
      overflow: "hidden",
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.875rem 1.25rem",
        borderBottom: `1px solid ${C.divider}`,
      }}>
        {icon}
        <p style={{
          ...serif,
          fontSize: "19px",
          fontWeight: 600,
          lineHeight: "26px",
          letterSpacing: "-0.01em",
          color: C.inkPrimary,
          margin: 0,
        }}>
          {title}
        </p>
      </div>
      <div style={{ padding: "0 1.25rem" }}>
        {children}
      </div>
    </div>
  );
}

// ─── Nav Button ───────────────────────────────────────────────────────────────
function NavBtn({ children, onClick, "aria-label": ariaLabel }: {
  children: React.ReactNode;
  onClick: () => void;
  "aria-label": string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      style={{
        width: 32,
        height: 32,
        borderRadius: "9999px",
        border: "none",
        background: "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        color: C.inkSecondary,
        transition: "background 0.15s",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = C.subtle; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
    >
      {children}
    </button>
  );
}
