import { createLazyFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getWeekDashboard } from "@/lib/dashboard.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, CalendarClock, CheckSquare, AlertTriangle, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = (createLazyFileRoute as unknown as (p: string) => any)("/_authenticated/")({
  component: DashboardPage,
});

function formatDay(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
}
function formatTime(d: string) {
  return new Date(d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatWeekLabel(weekStart: string, weekEnd: string) {
  const start = new Date(weekStart);
  const end = new Date(new Date(weekEnd).getTime() - 1);
  const opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" };
  const endOpts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" };
  return `${start.toLocaleDateString("pt-BR", opts)} a ${end.toLocaleDateString("pt-BR", endOpts)}`;
}

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
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 md:space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Sua semana na Bússola</p>
          <h1 className="text-3xl font-serif">Painel da semana</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {weekOffset !== 0 && (
            <Button variant="outline" size="sm" onClick={() => setWeekOffset(0)}>
              Hoje
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => setWeekOffset((o) => o - 1)} aria-label="Semana anterior">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground min-w-[140px] sm:min-w-[180px] text-center">
            {data ? formatWeekLabel(data.weekStart, data.weekEnd) : <Skeleton className="h-4 w-36" />}
          </span>
          <Button variant="ghost" size="icon" onClick={() => setWeekOffset((o) => o + 1)} aria-label="Próxima semana">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Clientes esta semana" value={counts?.clientsThisWeek} icon={Users} accent="primary" loading={isLoading} />
        <StatCard label="Compromissos" value={counts?.eventsThisWeek} icon={CalendarClock} loading={isLoading} />
        <StatCard label="Tarefas na semana" value={counts?.tasksThisWeek} icon={CheckSquare} loading={isLoading} />
        <StatCard label="Atrasadas" value={counts?.overdue} icon={AlertTriangle} accent="danger" loading={isLoading} />
      </div>

      {hasNoData && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center text-muted-foreground">
            <p className="font-medium">
              {weekOffset < 0
                ? "Nenhuma atividade registrada nesta semana."
                : weekOffset > 0
                  ? "Nenhuma atividade planejada para esta semana."
                  : "Nada por aqui ainda. ✨"}
            </p>
          </CardContent>
        </Card>
      )}

      {!hasNoData && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-serif">
                <CalendarClock className="h-4 w-4" /> Compromissos da semana
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading && <Skeleton className="h-24" />}
              {data && data.events.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum compromisso agendado.</p>
              )}
              {data?.events.map((e) => (
                <div key={e.id} className="flex items-start justify-between gap-3 border-b pb-3 last:border-0">
                  <div>
                    <p className="font-medium">{e.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDay(e.start_at)} · {formatTime(e.start_at)}–{formatTime(e.end_at)}
                      {e.clients?.name ? ` · ${e.clients.name}` : ""}
                    </p>
                  </div>
                  {e.clients?.id && (
                    <Link to="/clientes/$id" params={{ id: e.clients.id }} className="text-xs text-primary underline">
                      abrir
                    </Link>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-serif">
                <CheckSquare className="h-4 w-4" /> Tarefas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading && <Skeleton className="h-24" />}
              {data && data.tasks.length === 0 && data.overdueTasks.length === 0 && (
                <p className="text-sm text-muted-foreground">Nada pendente. ✨</p>
              )}
              {data?.overdueTasks.map((t) => (
                <div key={t.id} className="flex items-start justify-between gap-3 border-b pb-3 last:border-0">
                  <div>
                    <p className="font-medium">{t.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.due_at ? `Venceu em ${formatDay(t.due_at)}` : "Sem data"}
                      {t.clients?.name ? ` · ${t.clients.name}` : ""}
                    </p>
                  </div>
                  <Badge variant="destructive">Atrasada</Badge>
                </div>
              ))}
              {data?.tasks.map((t) => (
                <div key={t.id} className="flex items-start justify-between gap-3 border-b pb-3 last:border-0">
                  <div>
                    <p className="font-medium">{t.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.due_at ? formatDay(t.due_at) : "Sem data"}
                      {t.clients?.name ? ` · ${t.clients.name}` : ""}
                    </p>
                  </div>
                  <Badge variant="secondary">Semana</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="bg-secondary/40">
        <CardContent className="p-6 flex items-center gap-4">
          <Sparkles className="h-6 w-6 text-primary" />
          <div className="flex-1">
            <p className="font-medium">Dica comportamental</p>
            <p className="text-sm text-muted-foreground">
              Reserve 15 minutos no fim do dia para registrar contextos dos clientes atendidos.
              A memória fria vira dado — e a IA da Bússola transforma dado em insight.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  loading,
}: {
  label: string;
  value?: number;
  icon: React.ComponentType<{ className?: string }>;
  accent?: "primary" | "danger";
  loading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <Icon
            className={
              accent === "primary"
                ? "h-4 w-4 text-primary"
                : accent === "danger"
                  ? "h-4 w-4 text-destructive"
                  : "h-4 w-4 text-muted-foreground"
            }
          />
        </div>
        {loading ? (
          <Skeleton className="h-8 w-16 mt-2" />
        ) : (
          <p className="text-3xl font-serif mt-2">{value ?? 0}</p>
        )}
      </CardContent>
    </Card>
  );
}
