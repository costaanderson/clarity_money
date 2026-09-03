import { createLazyFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getDailyBriefing, type BriefingMeeting, type ClientWithoutMeeting } from "@/features/briefing/lib/briefing.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Button } from "@/shared/components/ui/button";
import {
  Newspaper,
  CalendarClock,
  MessageCircle,
  BatteryMedium,
  AlertTriangle,
  Clock,
  Users,
  CheckSquare,
  ChevronRight,
  ChevronLeft,
  Sparkles,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = (createLazyFileRoute as unknown as (p: string) => any)(
  "/_authenticated/briefing",
)({ component: BriefingPage });

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toLocalDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function todayStr() {
  return toLocalDateStr(new Date());
}

function offsetDate(base: string, days: number) {
  const d = new Date(`${base}T12:00:00`);
  d.setDate(d.getDate() + days);
  return toLocalDateStr(d);
}

function formatDateLabel(dateStr: string) {
  const today = todayStr();
  const yesterday = offsetDate(today, -1);
  const tomorrow = offsetDate(today, 1);
  if (dateStr === today) return "Hoje";
  if (dateStr === yesterday) return "Ontem";
  if (dateStr === tomorrow) return "Amanhã";
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatFullDate(dateStr: string) {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function BriefingPage() {
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const isToday = selectedDate === todayStr();

  const briefingQ = useQuery({
    queryKey: ["briefing", selectedDate],
    queryFn: () => getDailyBriefing({ data: { date: selectedDate } }),
    staleTime: 60_000,
  });

  const b = briefingQ.data;
  const isLoading = briefingQ.isLoading;

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">

      {/* Cabeçalho + navegação de data */}
      <header className="space-y-3">
        <div className="flex items-center gap-2">
          <Newspaper className="h-5 w-5 text-primary" />
          <h1 className="text-3xl font-serif">Donna</h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSelectedDate((d) => offsetDate(d, -1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex-1 text-center">
            <p className="text-sm font-medium">{formatDateLabel(selectedDate)}</p>
            {!isToday && (
              <p className="text-xs text-muted-foreground">{capitalize(formatFullDate(selectedDate))}</p>
            )}
            {isToday && (
              <p className="text-xs text-muted-foreground">{capitalize(formatFullDate(selectedDate))}</p>
            )}
          </div>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSelectedDate((d) => offsetDate(d, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {!isToday && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => setSelectedDate(todayStr())}
            >
              Hoje
            </Button>
          )}
        </div>
      </header>

      {/* Resumo rápido */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard
          icon={<CalendarClock className="h-4 w-4 text-primary" />}
          label="Reuniões"
          value={isLoading ? null : (b?.meetingCount ?? 0)}
        />
        <SummaryCard
          icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
          label="Tarefas atrasadas"
          value={isLoading ? null : (b?.overdueTasks.length ?? 0)}
          alert={(b?.overdueTasks.length ?? 0) > 0}
        />
        <SummaryCard
          icon={<CheckSquare className="h-4 w-4 text-muted-foreground" />}
          label="Tarefas abertas"
          value={isLoading ? null : (b?.pendingCount ?? 0)}
        />
      </div>

      {/* SEÇÃO A — Engajamento */}
      <Section
        icon={<MessageCircle className="h-4 w-4" />}
        title="Seção A · Engajamento"
        badge="Em breve"
        badgeVariant="secondary"
      >
        <div className="rounded-lg border border-dashed p-4 flex gap-3">
          <Sparkles className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium">Radar de Relacionamento</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Aqui aparecerão sugestões de contato com clientes — aniversários,
              clientes sem reunião há mais de 15 dias e ganchos personalizados gerados por IA.
            </p>
          </div>
        </div>
      </Section>

      {/* SEÇÃO B — Reuniões */}
      <Section
        icon={<CalendarClock className="h-4 w-4" />}
        title="Seção B · Reuniões do dia"
      >
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (b?.meetings.length ?? 0) === 0 ? (
          <EmptyState message="Nenhuma reunião agendada para este dia." />
        ) : (
          <div className="space-y-3">
            {b!.meetings.map((m, i) => (
              <MeetingCard key={m.id ?? `google-${i}`} meeting={m} />
            ))}
          </div>
        )}

        {/* Clientes sem reunião */}
        {!isLoading && (b?.clientsWithoutMeeting.length ?? 0) > 0 && (
          <ClientsWithoutMeetingBlock clients={b!.clientsWithoutMeeting} />
        )}
        {!isLoading && (b?.clientsWithoutMeeting.length ?? 0) === 0 && (
          <div className="mt-4 rounded-lg border border-dashed p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Todos os clientes ativos têm sessão recente.
              </span>
            </div>
          </div>
        )}
      </Section>

      {/* SEÇÃO C — Energia */}
      <Section
        icon={<BatteryMedium className="h-4 w-4" />}
        title="Seção C · Energia e carga"
      >
        {isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Carga do dia</span>
              <CargaBadge score={b?.loadScore ?? 0} />
            </div>

            {b?.pjCount! > 0 && (
              <p className="text-xs text-muted-foreground">
                {b!.pjCount} reunião(ões) PJ — cada uma equivale a 2× no peso da agenda.
              </p>
            )}

            <p className="text-xs text-muted-foreground">
              {(b?.loadScore ?? 0) === 0
                ? "Sem reuniões. Boa oportunidade para prospecção ou conteúdo."
                : (b?.loadScore ?? 0) <= 3
                ? "Agenda equilibrada. Você tem espaço para engajamento entre as calls."
                : (b?.loadScore ?? 0) <= 6
                ? "Agenda moderada. Verifique se há intervalos suficientes."
                : "Agenda intensa. Considere mover alguma reunião para preservar energia."}
            </p>

            {(b?.overdueTasks.length ?? 0) > 0 && (
              <div className="pt-2 border-t flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                <span className="text-xs text-destructive">
                  {b!.overdueTasks.length} tarefa(s) atrasada(s) —{" "}
                </span>
                <Link to="/tarefas" className="text-xs text-primary hover:underline inline-flex items-center gap-0.5">
                  Ver tarefas <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            )}
          </div>
        )}
      </Section>

      <p className="text-xs text-muted-foreground text-center pb-4">
        Seções marcadas como <strong>Em breve</strong> serão preenchidas com IA
        após integração com transcrições de sessão.
      </p>
    </div>
  );
}

// ─── MeetingCard ──────────────────────────────────────────────────────────────

function MeetingCard({ meeting }: { meeting: BriefingMeeting }) {
  return (
    <div className="rounded-lg border p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium truncate">{meeting.title}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {meeting.from_google && (
            <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-300">
              Google
            </Badge>
          )}
          {meeting.client?.type && (
            <Badge variant="secondary" className="text-[10px]">
              {meeting.client.type}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">
            {formatTime(meeting.start_at)}
          </span>
        </div>
      </div>

      {/* Cliente vinculado */}
      {meeting.client ? (
        <Link
          to="/clientes/$id"
          params={{ id: meeting.client.id }}
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <Users className="h-3 w-3" />
          {meeting.client.name}
          <ChevronRight className="h-3 w-3" />
        </Link>
      ) : (
        <p className="text-xs text-muted-foreground italic">
          Cliente não vinculado — crie o evento no Bússola para associar.
        </p>
      )}

      {/* Tarefas atrasadas do cliente */}
      {meeting.overdueTasks.length > 0 && (
        <div className="rounded-md bg-destructive/8 border border-destructive/20 px-3 py-2 space-y-1">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="h-3 w-3 text-destructive" />
            <span className="text-xs font-medium text-destructive">
              {meeting.overdueTasks.length} tarefa(s) atrasada(s) para este cliente
            </span>
          </div>
          <ul className="space-y-0.5">
            {meeting.overdueTasks.map((t) => (
              <li key={t.id} className="text-xs text-muted-foreground flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-destructive/60 shrink-0" />
                {t.title}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Placeholder preparação (Fase 3) */}
      {meeting.client && meeting.overdueTasks.length === 0 && (
        <div className="rounded-md bg-muted/40 px-3 py-2">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground/60">Preparação: </span>
            Transcrição da última sessão disponível na Fase 3.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── ClientsWithoutMeetingBlock ───────────────────────────────────────────────

function ClientsWithoutMeetingBlock({ clients }: { clients: ClientWithoutMeeting[] }) {
  return (
    <div className="mt-4 rounded-lg border p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Clientes sem sessão recente</span>
      </div>
      <div className="space-y-2">
        {clients.map((c) => {
          const days = c.daysSinceLastMeeting;
          const urgent = days !== null && days >= 21;
          const warning = days !== null && days >= 14 && days < 21;
          return (
            <div key={c.id} className="flex items-center justify-between gap-2">
              <Link
                to="/clientes/$id"
                params={{ id: c.id }}
                className="text-sm hover:underline text-primary truncate"
              >
                {c.name}
              </Link>
              <div className="flex items-center gap-1.5 shrink-0">
                <Badge variant="secondary" className="text-[10px]">{c.type}</Badge>
                {days === null ? (
                  <Badge variant="outline" className="text-[10px] text-muted-foreground">
                    Sem histórico
                  </Badge>
                ) : urgent ? (
                  <Badge variant="outline" className="text-[10px] border-red-400 text-red-600">
                    {days}d sem sessão
                  </Badge>
                ) : warning ? (
                  <Badge variant="outline" className="text-[10px] border-yellow-400 text-yellow-600">
                    {days}d sem sessão
                  </Badge>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function SummaryCard({
  icon,
  label,
  value,
  alert = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | null;
  alert?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex flex-col gap-2">
        {icon}
        {value === null ? (
          <Skeleton className="h-7 w-10" />
        ) : (
          <span className={`text-2xl font-bold ${alert && value > 0 ? "text-destructive" : ""}`}>
            {value}
          </span>
        )}
        <span className="text-xs text-muted-foreground leading-snug">{label}</span>
      </CardContent>
    </Card>
  );
}

function Section({
  icon,
  title,
  badge,
  badgeVariant = "outline",
  children,
}: {
  icon: React.ReactNode;
  title: string;
  badge?: string;
  badgeVariant?: "outline" | "secondary";
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-serif flex items-center gap-2">
          {icon}
          {title}
          {badge && (
            <Badge variant={badgeVariant} className="text-[10px] ml-1">
              {badge}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p className="text-sm text-muted-foreground py-2">{message}</p>;
}

function CargaBadge({ score }: { score: number }) {
  if (score === 0) return <Badge variant="outline">Livre</Badge>;
  if (score <= 3) return <Badge variant="outline" className="border-emerald-400 text-emerald-700">Leve</Badge>;
  if (score <= 6) return <Badge variant="outline" className="border-yellow-400 text-yellow-700">Moderada</Badge>;
  return <Badge variant="outline" className="border-red-400 text-red-700">Intensa</Badge>;
}
