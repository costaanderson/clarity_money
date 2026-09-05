import { createLazyFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  getDailyBriefing,
  getEngagementRadar,
  type BriefingMeeting,
  type ClientWithoutMeeting,
  type RadarRule,
} from "@/features/briefing/lib/briefing.functions";
import {
  createRule,
  deleteRule,
  runActivationRules,
  updateRule,
} from "@/features/activation-rules/lib/rules.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/shared/components/ui/sheet";
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
  Play,
  Plus,
  Trash2,
  Bell,
  UserCheck,
  UserX,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

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

const STATUS_LABELS: Record<string, string> = {
  lead: "Lead",
  ativo: "Ativo",
  arquivado: "Arquivado",
};

const ACTION_LABELS: Record<string, string> = {
  task: "Criar tarefa",
  email: "Rascunho de e-mail",
  ambos: "Tarefa + e-mail",
};

const BLANK_FORM = {
  name: "",
  active: true,
  applies_to_status: "lead" as "lead" | "ativo" | "arquivado",
  trigger_days_no_contact: 14,
  action: "task" as "task" | "email" | "ambos",
  email_subject: "",
  email_body_template: "",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

function BriefingPage() {
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const isToday = selectedDate === todayStr();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);
  const qc = useQueryClient();

  const briefingQ = useQuery({
    queryKey: ["briefing", selectedDate],
    queryFn: () => getDailyBriefing({ data: { date: selectedDate } }),
    staleTime: 60_000,
  });

  const radarQ = useQuery({
    queryKey: ["engagement-radar"],
    queryFn: () => getEngagementRadar(),
    staleTime: 60_000,
  });

  const addRule = useMutation({
    mutationFn: () => createRule({ data: form }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["engagement-radar"] });
      setForm(BLANK_FORM);
      setSheetOpen(false);
      toast.success("Regra criada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleRule = useMutation({
    mutationFn: (v: { id: string; active: boolean }) => updateRule({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["engagement-radar"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const delRule = useMutation({
    mutationFn: (id: string) => deleteRule({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["engagement-radar"] });
      toast.success("Regra removida");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const runRules = useMutation({
    mutationFn: () => runActivationRules(),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["engagement-radar"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(`${r.created} tarefa(s) de ativação criada(s).`);
    },
    onError: (e: Error) => toast.error(e.message),
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
            <p className="text-xs text-muted-foreground">{capitalize(formatFullDate(selectedDate))}</p>
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
        action={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              onClick={() => runRules.mutate()}
              disabled={runRules.isPending}
            >
              <Play className="h-3 w-3" />
              Rodar agora
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              onClick={() => { setForm(BLANK_FORM); setSheetOpen(true); }}
            >
              <Plus className="h-3 w-3" />
              Nova regra
            </Button>
          </div>
        }
      >
        <EngagementRadar
          radarQ={radarQ}
          onToggle={(id, active) => toggleRule.mutate({ id, active })}
          onDelete={(id) => delRule.mutate(id)}
        />
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

      {/* Sheet — Nova regra */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-serif">Nova regra de ativação</SheetTitle>
          </SheetHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label>Nome da regra</Label>
              <Input
                placeholder="Ex.: Reativação lead 14 dias"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Aplica em clientes com status</Label>
              <Select
                value={form.applies_to_status}
                onValueChange={(v) =>
                  setForm({ ...form, applies_to_status: v as typeof form.applies_to_status })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="arquivado">Arquivado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Dias sem contato para disparar</Label>
              <Input
                type="number"
                min={1}
                max={365}
                value={form.trigger_days_no_contact}
                onChange={(e) =>
                  setForm({ ...form, trigger_days_no_contact: Number(e.target.value) })
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label>Ação ao disparar</Label>
              <Select
                value={form.action}
                onValueChange={(v) =>
                  setForm({ ...form, action: v as typeof form.action })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="task">Criar tarefa</SelectItem>
                  <SelectItem value="email">Rascunho de e-mail</SelectItem>
                  <SelectItem value="ambos">Tarefa + e-mail</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={form.active}
                onCheckedChange={(v) => setForm({ ...form, active: v })}
              />
              <Label>Ativar imediatamente</Label>
            </div>
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={() => setSheetOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!form.name.trim() || addRule.isPending}
              onClick={() => addRule.mutate()}
            >
              Criar regra
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ─── EngagementRadar ──────────────────────────────────────────────────────────

function EngagementRadar({
  radarQ,
  onToggle,
  onDelete,
}: {
  radarQ: ReturnType<typeof useQuery<RadarRule[]>>;
  onToggle: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
}) {
  if (radarQ.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  const rules = radarQ.data ?? [];

  if (rules.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center space-y-2">
        <Bell className="h-6 w-6 mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Nenhuma regra criada ainda. Use "Nova regra" para começar.
        </p>
      </div>
    );
  }

  const totalTriggered = rules.reduce((acc, r) => acc + r.triggeredClients.length, 0);

  return (
    <div className="space-y-3">
      {totalTriggered > 0 && (
        <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
          <span className="text-xs text-amber-700">
            <strong>{totalTriggered}</strong> cliente(s) precisam de atenção hoje.
            Use "Rodar agora" para criar as tarefas.
          </span>
        </div>
      )}

      {rules.map((rule) => (
        <RuleCard key={rule.id} rule={rule} onToggle={onToggle} onDelete={onDelete} />
      ))}
    </div>
  );
}

// ─── RuleCard ─────────────────────────────────────────────────────────────────

function RuleCard({
  rule,
  onToggle,
  onDelete,
}: {
  rule: RadarRule;
  onToggle: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const triggered = rule.triggeredClients.length;

  return (
    <div className="rounded-lg border overflow-hidden">
      {/* Cabeçalho da regra */}
      <div className="flex items-center gap-3 px-4 py-3">
        <Switch
          checked={rule.active}
          onCheckedChange={(v) => onToggle(rule.id, v)}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{rule.name}</p>
          <p className="text-xs text-muted-foreground">
            {STATUS_LABELS[rule.applies_to_status] ?? rule.applies_to_status}
            {" · "}
            {rule.trigger_days_no_contact}d sem contato
            {" · "}
            {ACTION_LABELS[rule.action] ?? rule.action}
          </p>
        </div>

        {rule.active && triggered > 0 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 hover:bg-amber-100 transition-colors shrink-0"
          >
            <AlertTriangle className="h-3 w-3" />
            {triggered}
          </button>
        )}

        {rule.active && triggered === 0 && (
          <span className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded px-2 py-1 shrink-0">
            Em dia
          </span>
        )}

        {!rule.active && (
          <span className="text-xs text-muted-foreground bg-muted rounded px-2 py-1 shrink-0">
            Pausada
          </span>
        )}

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(rule.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Lista de clientes disparados (expansível) */}
      {expanded && triggered > 0 && (
        <div className="border-t bg-muted/30 divide-y">
          {rule.triggeredClients.map((c) => (
            <div key={c.id} className="flex items-center gap-3 px-4 py-2.5">
              {c.hasOpenTask ? (
                <UserCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              ) : (
                <UserX className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              )}
              <Link
                to="/clientes/$id"
                params={{ id: c.id }}
                className="flex-1 text-sm hover:underline text-primary truncate"
              >
                {c.name}
              </Link>
              <div className="flex items-center gap-2 shrink-0">
                {c.hasOpenTask && (
                  <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-700">
                    Tarefa aberta
                  </Badge>
                )}
                {c.daysSinceContact !== null && (
                  <span className="text-xs text-muted-foreground">
                    {c.daysSinceContact}d
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
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
  action,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  badge?: string;
  badgeVariant?: "outline" | "secondary";
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base font-serif flex items-center gap-2">
            {icon}
            {title}
            {badge && (
              <Badge variant={badgeVariant} className="text-[10px] ml-1">
                {badge}
              </Badge>
            )}
          </CardTitle>
          {action && <div>{action}</div>}
        </div>
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
