import { createLazyFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createEvent, deleteEvent, listEvents } from "@/features/agenda/lib/calendar.server";
import { getGoogleConnectionStatus } from "@/features/agenda/lib/google-auth.functions";
import { listClients } from "@/features/clients/lib/clients.server";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Switch } from "@/shared/components/ui/switch";
import { CalendarClock, CheckCircle2, Clock, ExternalLink, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { parseError } from "@/lib/parse-error";

export const Route = (createLazyFileRoute as unknown as (p: string) => any)(
  "/_authenticated/agenda",
)({ component: AgendaPage });

// ─── Helpers ────────────────────────────────────────────────────────────────

function startOfWeekIso() {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/** Rótulo-eyebrow: caixa alta, espaçado, pequeno */
function Eyebrow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`text-[11px] font-semibold uppercase tracking-[0.06em] font-[var(--font-jakarta)] ${className}`}>
      {children}
    </p>
  );
}

/** Label de campo do formulário */
function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9E968B] mb-1.5 font-[var(--font-jakarta)]"
    >
      {children}
    </label>
  );
}

/** Input com estilo editorial */
function EditorialInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return (
    <input
      {...rest}
      className={`w-full h-9 rounded border border-[#E9E3D8] bg-white px-3 text-[14px] text-[#1C1A17] placeholder:text-[#CDC5BC] focus:outline-none focus:border-[#8C6A43] transition-colors font-[var(--font-jakarta)] ${className}`}
    />
  );
}

/** Textarea com estilo editorial */
function EditorialTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = "", ...rest } = props;
  return (
    <textarea
      {...rest}
      className={`w-full rounded border border-[#E9E3D8] bg-white px-3 py-2 text-[14px] text-[#1C1A17] placeholder:text-[#CDC5BC] focus:outline-none focus:border-[#8C6A43] transition-colors resize-none font-[var(--font-jakarta)] ${className}`}
    />
  );
}

/** Chip de status com variantes de cor */
type ChipVariant = "sage" | "steel" | "amber" | "terracotta";
const CHIP_STYLES: Record<ChipVariant, string> = {
  sage:       "bg-[#EBF4EE] text-[#2E6243]",
  steel:      "bg-[#EBF1F6] text-[#36587A]",
  amber:      "bg-[#F4EFE6] text-[#856133]",
  terracotta: "bg-[#F8EBEA] text-[#9B453B]",
};
function Chip({ variant, children }: { variant: ChipVariant; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium leading-none rounded-full px-2.5 py-1 font-[var(--font-jakarta)] ${CHIP_STYLES[variant]}`}>
      {children}
    </span>
  );
}

// ─── AgendaPage ─────────────────────────────────────────────────────────────

function AgendaPage() {
  const qc = useQueryClient();
  const from = startOfWeekIso();
  const to = new Date(new Date(from).getTime() + 30 * 24 * 3600 * 1000).toISOString();

  const googleStatusQ = useQuery({
    queryKey: ["google-calendar-status"],
    queryFn: () => getGoogleConnectionStatus(),
  });
  const googleConnected = googleStatusQ.data?.connected ?? false;

  const eventsQ = useQuery({
    queryKey: ["events", { from, to }],
    queryFn: () => listEvents({ data: { from, to } }),
  });
  const clientsQ = useQuery({
    queryKey: ["clients", "select"],
    queryFn: () => listClients({ data: { status: "all" } }),
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [meet, setMeet] = useState("");
  const [clientId, setClientId] = useState<string>("none");
  const [isPersonal, setIsPersonal] = useState(false);

  const add = useMutation({
    mutationFn: () =>
      createEvent({
        data: {
          title,
          description,
          meet_link: meet,
          start_at: new Date(start).toISOString(),
          end_at: new Date(end).toISOString(),
          client_id: clientId === "none" ? null : clientId,
          is_personal: isPersonal,
        },
      }),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["events"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setTitle(""); setDescription(""); setStart(""); setEnd(""); setMeet(""); setClientId("none"); setIsPersonal(false);
      if (googleConnected && !result.syncedToGoogle) {
        toast.warning("Compromisso criado, mas não foi possível sincronizar com o Google Agenda. Verifique a conexão em Configurações.");
      } else if (result.syncedToGoogle) {
        toast.success("Compromisso criado e adicionado ao Google Agenda.");
      } else {
        toast.success("Compromisso criado.");
      }
    },
    onError: (e: Error) => toast.error(parseError(e)),
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteEvent({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  });

  return (
    <div className="bg-[#FFF8F2] min-h-full">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 space-y-8">

        {/* ── Cabeçalho ── */}
        <header className="space-y-1">
          <Eyebrow className="text-[#8C6A43]">Compromissos</Eyebrow>
          <h1 className="font-[var(--font-editorial)] text-[38px] leading-[46px] tracking-[-0.02em] text-[#1C1A17]">
            Agenda
          </h1>
        </header>

        {/* ── Status Google Agenda ── */}
        <div
          className={`rounded-lg border px-5 py-4 flex items-start gap-3 ${
            googleConnected
              ? "bg-[#EBF4EE] border-[#2E6243]/20"
              : "bg-white border-[#E9E3D8] shadow-[0_2px_8px_-2px_rgba(140,106,67,0.04),0_1px_3px_0_rgba(28,26,23,0.02)]"
          }`}
        >
          <CalendarClock
            className={`h-4 w-4 mt-0.5 shrink-0 ${googleConnected ? "text-[#2E6243]" : "text-[#8C6A43]"}`}
          />
          <div className="flex-1 min-w-0">
            <p className={`text-[14px] font-semibold font-[var(--font-jakarta)] ${googleConnected ? "text-[#2E6243]" : "text-[#1C1A17]"}`}>
              Google Agenda
            </p>
            <p className={`text-[13px] mt-0.5 font-[var(--font-jakarta)] ${googleConnected ? "text-[#2E6243]/80" : "text-[#6E685F]"}`}>
              {googleConnected
                ? "Compromissos criados aqui serão adicionados ao seu Google Agenda automaticamente."
                : (
                  <>
                    A sincronização pode ser ativada em{" "}
                    <Link to="/configuracoes" className="underline text-[#8C6A43] hover:text-[#7a5c38] transition-colors">
                      Configurações
                    </Link>
                    . Você já pode agendar compromissos e vinculá-los a clientes.
                  </>
                )
              }
            </p>
          </div>
          {googleConnected && (
            <Chip variant="sage">
              <CheckCircle2 className="h-3 w-3" />
              Sincronizado
            </Chip>
          )}
        </div>

        {/* ── Formulário ── */}
        <div className="bg-white rounded-xl border border-[#E9E3D8] shadow-[0_2px_8px_-2px_rgba(140,106,67,0.04),0_1px_3px_0_rgba(28,26,23,0.02)] p-6 space-y-5">
          <Eyebrow className="text-[#6E685F]">Novo compromisso</Eyebrow>

          <div className="space-y-4">
            <div>
              <FieldLabel>Título</FieldLabel>
              <EditorialInput
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Sessão com…"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <FieldLabel>Início</FieldLabel>
                <EditorialInput
                  type="datetime-local"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
              </div>
              <div>
                <FieldLabel>Fim</FieldLabel>
                <EditorialInput
                  type="datetime-local"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <FieldLabel>Cliente</FieldLabel>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger className="h-9 border-[#E9E3D8] text-[14px] text-[#1C1A17] focus:ring-0 focus:border-[#8C6A43] bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem cliente</SelectItem>
                    {clientsQ.data?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <FieldLabel>Link (Meet / Zoom)</FieldLabel>
                <EditorialInput
                  value={meet}
                  onChange={(e) => setMeet(e.target.value)}
                  placeholder="https://…"
                />
              </div>
            </div>

            <div>
              <FieldLabel>Notas</FieldLabel>
              <EditorialTextarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Contexto ou pauta da reunião…"
              />
            </div>

            <div className="flex items-center gap-3 pt-1">
              <Switch
                id="is-personal"
                checked={isPersonal}
                onCheckedChange={setIsPersonal}
                className="data-[state=checked]:bg-[#8C6A43]"
              />
              <label
                htmlFor="is-personal"
                className="text-[13px] text-[#6E685F] cursor-pointer font-[var(--font-jakarta)]"
              >
                Evento pessoal (almoço, particular…)
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              disabled={!title.trim() || !start || !end || add.isPending}
              onClick={() => add.mutate()}
              className="bg-[#8C6A43] hover:bg-[#7a5c38] disabled:opacity-40 text-white text-[13px] font-semibold px-5 py-2 rounded transition-colors font-[var(--font-jakarta)]"
            >
              {add.isPending ? "Agendando…" : "Agendar"}
            </button>
          </div>
        </div>

        {/* ── Lista de eventos ── */}
        <EventsGrouped
          events={eventsQ.data ?? []}
          onDelete={(id) => del.mutate(id)}
        />
      </div>
    </div>
  );
}

// ─── EventsGrouped ─────────────────────────────────────────────────────────

type EventItem = Awaited<ReturnType<typeof listEvents>>[number];

function EventsGrouped({
  events,
  onDelete,
}: {
  events: EventItem[];
  onDelete: (id: string) => void;
}) {
  if (events.length === 0) {
    return (
      <div className="text-center py-16 text-[#9E968B] text-[14px] font-[var(--font-jakarta)]">
        Sem compromissos no período.
      </div>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const byDay = new Map<string, EventItem[]>();
  for (const e of events) {
    const d = new Date(e.start_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(e);
  }

  function dayMeta(key: string) {
    const d = new Date(`${key}T12:00:00`);
    const diff = Math.floor((d.getTime() - today.getTime()) / 86_400_000);
    const weekday = d.toLocaleDateString("pt-BR", { weekday: "long" });
    const dateStr = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
    const cap = weekday.charAt(0).toUpperCase() + weekday.slice(1);
    const relative = diff === 0 ? "Hoje" : diff === 1 ? "Amanhã" : diff === -1 ? "Ontem" : null;
    return { weekday: cap, dateStr, relative, isToday: diff === 0, isPast: diff < 0 };
  }

  return (
    <div className="space-y-8 pb-8">
      {[...byDay.entries()].map(([dayKey, dayEvents]) => {
        const { weekday, dateStr, relative, isToday, isPast } = dayMeta(dayKey);
        return (
          <div key={dayKey}>
            {/* Cabeçalho do dia */}
            <div className="flex items-baseline gap-3 mb-4">
              <div className="flex items-baseline gap-2 shrink-0">
                {relative ? (
                  <>
                    <span
                      className={`font-[var(--font-editorial)] text-[19px] font-semibold leading-none tracking-[-0.01em] ${
                        isToday ? "text-[#8C6A43]" : isPast ? "text-[#9E968B]" : "text-[#1C1A17]"
                      }`}
                    >
                      {relative}
                    </span>
                    <span className={`text-[11px] font-semibold uppercase tracking-[0.06em] font-[var(--font-jakarta)] ${isToday ? "text-[#8C6A43]" : "text-[#9E968B]"}`}>
                      · {weekday} · {dateStr}
                    </span>
                  </>
                ) : (
                  <span className={`text-[11px] font-semibold uppercase tracking-[0.06em] font-[var(--font-jakarta)] ${isPast ? "text-[#9E968B]" : "text-[#6E685F]"}`}>
                    {weekday} · {dateStr}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-medium text-[#9E968B] bg-[#F3EDE7] rounded-full px-2.5 py-0.5 font-[var(--font-jakarta)]">
                {dayEvents.length} reunião{dayEvents.length !== 1 ? "ões" : ""}
              </span>
              <div className="flex-1 border-t border-[#E9E3D8]" />
            </div>

            {/* Eventos do dia — linha lateral com cor cognac se hoje */}
            <div className={`space-y-2 pl-4 border-l-2 ml-1 ${isToday ? "border-[#8C6A43]" : "border-[#E9E3D8]"}`}>
              {dayEvents.map((e) => {
                const isGoogleOnly = e.from_google === true;
                const key = isGoogleOnly ? `g-${e.google_event_id}` : e.id;
                return (
                  <div
                    key={key}
                    className={`bg-white rounded-lg border border-[#E9E3D8] shadow-[0_2px_8px_-2px_rgba(140,106,67,0.04),0_1px_3px_0_rgba(28,26,23,0.02)] p-4 flex items-start gap-4 hover:border-[#CDC5BC] transition-colors ${
                      isGoogleOnly ? "opacity-75" : ""
                    }`}
                  >
                    {/* Horário em Newsreader */}
                    <div className="shrink-0 w-12 text-right pt-0.5">
                      <p className="font-[var(--font-editorial)] text-[17px] leading-none text-[#1C1A17] tracking-[-0.01em]">
                        {new Date(e.start_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                      <p className="text-[11px] text-[#9E968B] mt-1 flex items-center justify-end gap-0.5 font-[var(--font-jakarta)]">
                        <Clock className="h-2.5 w-2.5" />
                        {new Date(e.end_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>

                    {/* Divisor vertical */}
                    <div className="w-px self-stretch bg-[#E9E3D8] shrink-0" />

                    {/* Conteúdo */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-start gap-2 flex-wrap">
                        <p className="flex-1 text-[14px] font-semibold text-[#1C1A17] leading-snug font-[var(--font-jakarta)]">
                          {e.title}
                        </p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {isGoogleOnly && <Chip variant="steel">Google Agenda</Chip>}
                          {!isGoogleOnly && (e as any).is_personal && <Chip variant="amber">Pessoal</Chip>}
                        </div>
                      </div>

                      {!isGoogleOnly && e.clients?.name && (
                        <Link
                          to="/clientes/$id"
                          params={{ id: (e.clients as any).id }}
                          className="text-[12.5px] text-[#8C6A43] hover:text-[#7a5c38] underline underline-offset-2 transition-colors font-[var(--font-jakarta)]"
                        >
                          {(e.clients as any).name}
                        </Link>
                      )}

                      {!isGoogleOnly && e.meet_link && (
                        <a
                          href={e.meet_link}
                          target="_blank"
                          rel="noopener"
                          className="inline-flex items-center gap-1 text-[12.5px] text-[#36587A] hover:text-[#2a4a6a] underline underline-offset-2 transition-colors font-[var(--font-jakarta)]"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Abrir link
                        </a>
                      )}
                    </div>

                    {/* Botão deletar — só para eventos locais */}
                    {!isGoogleOnly && (
                      <button
                        onClick={() => onDelete(e.id!)}
                        title="Remover compromisso"
                        className="shrink-0 p-1.5 rounded text-[#CDC5BC] hover:text-[#9B453B] hover:bg-[#F8EBEA] transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
