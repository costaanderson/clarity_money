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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import { Switch } from "@/shared/components/ui/switch";
import {
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  EyeOff,
  Plus,
  RefreshCw,
  Trash2,
  Video,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { parseError } from "@/lib/parse-error";

export const Route = (createLazyFileRoute as unknown as (p: string) => any)(
  "/_authenticated/agenda",
)({ component: AgendaPage });

// ─── Constantes da grade ─────────────────────────────────────────────────────
const HOUR_START = 8;
const HOUR_END = 18;
const HOUR_PX = 64; // px por hora
const GRID_HEIGHT = (HOUR_END - HOUR_START) * HOUR_PX; // 640px

// ─── Utilidades de data ───────────────────────────────────────────────────────
function getMondayOf(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function eventDayKey(startAt: string): string {
  return dayKey(new Date(startAt));
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatWeekLabel(monday: Date): string {
  const sunday = addDays(monday, 6);
  const mMonth = monday.toLocaleDateString("pt-BR", { month: "long" });
  const sMonth = sunday.toLocaleDateString("pt-BR", { month: "long" });
  if (mMonth === sMonth) {
    return `Semana de ${monday.getDate()} a ${sunday.getDate()} de ${capitalize(mMonth)}`;
  }
  return `Semana de ${monday.getDate()} de ${capitalize(mMonth)} a ${sunday.getDate()} de ${capitalize(sMonth)}`;
}

function minutesToPx(minutes: number): number {
  return (minutes - HOUR_START * 60) * HOUR_PX / 60;
}

function toMinutes(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

// ─── Tipos ───────────────────────────────────────────────────────────────────
type EventItem = Awaited<ReturnType<typeof listEvents>>[number];

// ─── Componentes editoriais ───────────────────────────────────────────────────
function Eyebrow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`text-[11px] font-semibold uppercase tracking-[0.06em] font-[var(--font-jakarta)] ${className}`}>
      {children}
    </p>
  );
}

function Chip({
  children,
  variant = "neutral",
  className = "",
}: {
  children: React.ReactNode;
  variant?: "sage" | "steel" | "amber" | "terracotta" | "neutral" | "cognac";
  className?: string;
}) {
  const styles = {
    sage:       "bg-[#EBF4EE] text-[#2E6243]",
    steel:      "bg-[#EBF1F6] text-[#36587A]",
    amber:      "bg-[#F4EFE6] text-[#856133]",
    terracotta: "bg-[#F8EBEA] text-[#9B453B]",
    neutral:    "bg-[#F3EDE7] text-[#6E685F]",
    cognac:     "bg-[#8C6A43] text-white",
  };
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold leading-none rounded-full px-2 py-0.5 font-[var(--font-jakarta)] ${styles[variant]} ${className}`}>
      {children}
    </span>
  );
}

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

function EditorialInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return (
    <input
      {...rest}
      className={`w-full h-9 rounded border border-[#E9E3D8] bg-white px-3 text-[13px] text-[#1C1A17] placeholder:text-[#CDC5BC] focus:outline-none focus:border-[#8C6A43] transition-colors font-[var(--font-jakarta)] ${className}`}
    />
  );
}

function EditorialTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = "", ...rest } = props;
  return (
    <textarea
      {...rest}
      className={`w-full rounded border border-[#E9E3D8] bg-white px-3 py-2 text-[13px] text-[#1C1A17] placeholder:text-[#CDC5BC] focus:outline-none focus:border-[#8C6A43] transition-colors resize-none font-[var(--font-jakarta)] ${className}`}
    />
  );
}

// ─── Cor do bloco de evento ───────────────────────────────────────────────────
function eventColors(e: EventItem) {
  if (e.is_personal) {
    return {
      bg: "bg-[#F4EFE6]",
      border: "border-[#D4B896]",
      title: "text-[#856133]",
      meta: "text-[#A07840]",
    };
  }
  if (e.from_google) {
    return {
      bg: "bg-[#EBF1F6]",
      border: "border-[#A8C4DC]",
      title: "text-[#36587A]",
      meta: "text-[#4A6F8F]",
    };
  }
  if (e.clients) {
    return {
      bg: "bg-[#EBF4EE]",
      border: "border-[#9FCDB0]",
      title: "text-[#2E6243]",
      meta: "text-[#3D7A54]",
    };
  }
  return {
    bg: "bg-[#F3EDE7]",
    border: "border-[#D4C4B4]",
    title: "text-[#6E685F]",
    meta: "text-[#8C7A6A]",
  };
}

// ─── Bloco de evento na grade ─────────────────────────────────────────────────
function EventBlock({
  event,
  onDelete,
}: {
  event: EventItem;
  onDelete: () => void;
}) {
  const start = new Date(event.start_at);
  const end = new Date(event.end_at);
  const startMin = Math.max(toMinutes(start), HOUR_START * 60);
  const endMin = Math.min(toMinutes(end), HOUR_END * 60);
  if (startMin >= HOUR_END * 60 || endMin <= HOUR_START * 60) return null;

  const top = minutesToPx(startMin);
  const height = Math.max((endMin - startMin) * HOUR_PX / 60, 28);
  const colors = eventColors(event);
  const isGoogleMeet = !!(event.meet_link && event.meet_link.includes("meet."));
  const isCompact = height < 56;

  return (
    <div
      className={`absolute left-1 right-1 rounded border ${colors.bg} ${colors.border} overflow-hidden group`}
      style={{ top, height }}
    >
      <div className="p-1.5 h-full flex flex-col justify-between">
        <div className="flex items-start justify-between gap-1">
          <div className="flex-1 min-w-0">
            <p className={`text-[11px] font-semibold leading-tight ${colors.title} font-[var(--font-jakarta)] truncate`}>
              {isCompact
                ? `${start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} ${event.title}`
                : event.title
              }
            </p>
            {!isCompact && (
              <p className={`text-[10px] mt-0.5 font-[var(--font-jakarta)] ${colors.meta}`}>
                {start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                {" – "}
                {end.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            {isGoogleMeet && (
              <span className={`text-[9px] font-bold rounded-sm px-1 py-0 font-[var(--font-jakarta)] ${colors.title} border ${colors.border}`}>
                G
              </span>
            )}
            {!event.from_google && (
              <button
                onClick={(ev) => { ev.stopPropagation(); onDelete(); }}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-[#F8EBEA] text-[#CDC5BC] hover:text-[#9B453B]"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {!isCompact && (
          <div className="flex items-center gap-1 flex-wrap">
            {event.clients?.name && (
              <span className={`text-[10px] rounded-full px-1.5 py-0 border font-[var(--font-jakarta)] ${colors.title} ${colors.border} bg-white/60 truncate max-w-[90px]`}>
                {event.clients.name}
              </span>
            )}
            {event.is_personal && <Chip variant="amber">Pessoal</Chip>}
            {event.from_google && !isGoogleMeet && <Chip variant="steel">Google</Chip>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sheet de novo evento ─────────────────────────────────────────────────────
function NewEventSheet({
  open,
  onOpenChange,
  clients,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clients: { id: string; name: string }[];
  onSubmit: (data: {
    title: string; description: string; meet_link: string;
    start_at: string; end_at: string; client_id: string | null; is_personal: boolean;
  }) => void;
  isPending: boolean;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [meet, setMeet] = useState("");
  const [clientId, setClientId] = useState("none");
  const [isPersonal, setIsPersonal] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      title,
      description,
      meet_link: meet,
      start_at: new Date(start).toISOString(),
      end_at: new Date(end).toISOString(),
      client_id: clientId === "none" ? null : clientId,
      is_personal: isPersonal,
    });
  }

  function reset() {
    setTitle(""); setDescription(""); setStart(""); setEnd("");
    setMeet(""); setClientId("none"); setIsPersonal(false);
  }

  useEffect(() => { if (!open) reset(); }, [open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[480px] bg-white border-l border-[#E9E3D8] shadow-[-4px_0_24px_-4px_rgba(28,26,23,0.06)] p-0 overflow-y-auto">
        <div className="p-6 border-b border-[#E9E3D8]">
          <SheetHeader>
            <Eyebrow className="text-[#8C6A43] mb-1">Calendário fiduciário</Eyebrow>
            <SheetTitle className="font-[var(--font-editorial)] text-[24px] leading-tight tracking-[-0.015em] text-[#1C1A17]">
              Novo evento
            </SheetTitle>
          </SheetHeader>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <FieldLabel>Título</FieldLabel>
            <EditorialInput
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Sessão com…"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Início</FieldLabel>
              <EditorialInput type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} required />
            </div>
            <div>
              <FieldLabel>Fim</FieldLabel>
              <EditorialInput type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} required />
            </div>
          </div>

          <div>
            <FieldLabel>Cliente</FieldLabel>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger className="h-9 border-[#E9E3D8] text-[13px] text-[#1C1A17] focus:ring-0 focus:border-[#8C6A43] bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem cliente</SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <FieldLabel>Link (Meet / Zoom)</FieldLabel>
            <EditorialInput value={meet} onChange={(e) => setMeet(e.target.value)} placeholder="https://…" />
          </div>

          <div>
            <FieldLabel>Notas</FieldLabel>
            <EditorialTextarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Contexto ou pauta…" />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <Switch
              id="is-personal-sheet"
              checked={isPersonal}
              onCheckedChange={setIsPersonal}
              className="data-[state=checked]:bg-[#8C6A43]"
            />
            <label htmlFor="is-personal-sheet" className="text-[13px] text-[#6E685F] cursor-pointer font-[var(--font-jakarta)]">
              Evento pessoal
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 text-[13px] text-[#6E685F] hover:text-[#1C1A17] rounded border border-[#E9E3D8] hover:bg-[#FCF2E7] font-[var(--font-jakarta)] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!title.trim() || !start || !end || isPending}
              className="px-5 py-2 text-[13px] font-semibold bg-[#8C6A43] hover:bg-[#7a5c38] disabled:opacity-40 text-white rounded font-[var(--font-jakarta)] transition-colors"
            >
              {isPending ? "Agendando…" : "Agendar"}
            </button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

// ─── AgendaPage ──────────────────────────────────────────────────────────────
function AgendaPage() {
  const qc = useQueryClient();
  const [weekOffset, setWeekOffset] = useState(0);
  const [filterPersonal, setFilterPersonal] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const monday = getMondayOf(addDays(new Date(), weekOffset * 7));
  const sunday = addDays(monday, 6);
  const from = monday.toISOString();
  const to = addDays(monday, 7).toISOString();
  const todayKey = dayKey(new Date());
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  const WEEKDAY_SHORT = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"];
  const WEEKDAY_SHORT_PT = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

  const googleStatusQ = useQuery({
    queryKey: ["google-calendar-status"],
    queryFn: () => getGoogleConnectionStatus(),
  });
  const googleConnected = googleStatusQ.data?.connected ?? false;
  const googleEmail = googleStatusQ.data?.email ?? null;

  const eventsQ = useQuery({
    queryKey: ["events", { from, to }],
    queryFn: () => listEvents({ data: { from, to } }),
  });

  const clientsQ = useQuery({
    queryKey: ["clients", "select"],
    queryFn: () => listClients({ data: { status: "all" } }),
  });

  const allEvents = eventsQ.data ?? [];
  const visibleEvents = filterPersonal
    ? allEvents.filter((e) => !e.is_personal)
    : allEvents;

  // Agrupar por dia
  const eventsByDay = new Map<string, EventItem[]>();
  for (const e of visibleEvents) {
    const k = eventDayKey(e.start_at);
    if (!eventsByDay.has(k)) eventsByDay.set(k, []);
    eventsByDay.get(k)!.push(e);
  }

  // Legenda
  const fiduciaryCount = allEvents.filter((e) => e.clients && !e.is_personal).length;
  const personalCount = allEvents.filter((e) => e.is_personal).length;
  const googleOnlyCount = allEvents.filter((e) => e.from_google).length;

  // Reunião crítica: primeiro evento com cliente hoje
  const todayEvents = allEvents
    .filter((e) => eventDayKey(e.start_at) === todayKey)
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
  const criticalMeeting = todayEvents.find((e) => e.clients);

  // Notas preparadas: eventos hoje com description
  const todayWithNotes = todayEvents.filter((e) => e.description).length;
  const todayTotal = todayEvents.length;

  // Indicador de hora atual
  const nowMinutes = toMinutes(now);
  const nowTop =
    nowMinutes >= HOUR_START * 60 && nowMinutes <= HOUR_END * 60
      ? minutesToPx(nowMinutes)
      : null;

  const add = useMutation({
    mutationFn: (data: Parameters<typeof createEvent>[0]["data"]) =>
      createEvent({ data }),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["events"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setSheetOpen(false);
      if (googleConnected && !result.syncedToGoogle) {
        toast.warning("Compromisso criado, mas não foi possível sincronizar com o Google Agenda.");
      } else {
        toast.success(result.syncedToGoogle ? "Compromisso criado e adicionado ao Google Agenda." : "Compromisso criado.");
      }
    },
    onError: (e: Error) => toast.error(parseError(e)),
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteEvent({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
    onError: (e: Error) => toast.error(parseError(e)),
  });

  const HOURS = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i);

  return (
    <div className="bg-[#FFF8F2] min-h-full flex flex-col">

      {/* ── Cabeçalho ──────────────────────────────────────────────────── */}
      <div className="px-6 pt-7 pb-4 border-b border-[#E9E3D8] bg-[#FFF8F2]">
        <Eyebrow className="text-[#8C6A43] mb-1">Calendário &amp; sincronização fiduciária</Eyebrow>

        <div className="flex items-end justify-between gap-4 flex-wrap">
          <h1 className="font-[var(--font-editorial)] text-[38px] leading-[46px] tracking-[-0.02em] text-[#1C1A17]">
            Agenda
          </h1>

          <div className="flex items-center gap-2 pb-1 flex-wrap">
            {/* Filtrar pessoais */}
            <button
              onClick={() => setFilterPersonal((v) => !v)}
              className={`flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded border font-[var(--font-jakarta)] transition-colors ${
                filterPersonal
                  ? "bg-[#F4EFE6] border-[#D4B896] text-[#856133]"
                  : "bg-white border-[#E9E3D8] text-[#6E685F] hover:bg-[#FCF2E7]"
              }`}
            >
              <EyeOff className="h-3.5 w-3.5" />
              Filtrar pessoais
            </button>

            {/* Status Google */}
            <div className={`flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded border font-[var(--font-jakarta)] ${
              googleConnected
                ? "bg-[#EBF4EE] border-[#9FCDB0] text-[#2E6243]"
                : "bg-white border-[#E9E3D8] text-[#9E968B]"
            }`}>
              {googleConnected ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Google Calendar Conectado
                  {googleEmail && <span className="text-[#2E6243]/70">({googleEmail})</span>}
                  <RefreshCw className="h-3 w-3 opacity-60" />
                </>
              ) : (
                <>
                  <CalendarClock className="h-3.5 w-3.5" />
                  Google Calendar não conectado
                </>
              )}
            </div>

            {/* Novo evento */}
            <button
              onClick={() => setSheetOpen(true)}
              className="flex items-center gap-1.5 text-[13px] font-semibold px-4 py-1.5 rounded bg-[#1C1A17] hover:bg-[#343028] text-white font-[var(--font-jakarta)] transition-colors"
            >
              <Plus className="h-4 w-4" />
              Novo evento
            </button>
          </div>
        </div>

        {/* Navegação de semana */}
        <div className="flex items-center gap-3 mt-4 flex-wrap">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setWeekOffset((o) => o - 1)}
              className="p-1.5 rounded border border-[#E9E3D8] bg-white text-[#6E685F] hover:bg-[#FCF2E7] transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setWeekOffset((o) => o + 1)}
              className="p-1.5 rounded border border-[#E9E3D8] bg-white text-[#6E685F] hover:bg-[#FCF2E7] transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <span className="font-[var(--font-editorial)] text-[17px] leading-none tracking-[-0.01em] text-[#1C1A17]">
            {formatWeekLabel(monday)}
          </span>

          {weekOffset !== 0 && (
            <button
              onClick={() => setWeekOffset(0)}
              className="text-[12px] font-medium px-3 py-1 rounded border border-[#E9E3D8] bg-white text-[#6E685F] hover:bg-[#FCF2E7] font-[var(--font-jakarta)] transition-colors"
            >
              Hoje
            </button>
          )}

          <div className="ml-auto flex items-center gap-3 text-[11px] font-medium font-[var(--font-jakarta)]">
            {fiduciaryCount > 0 && (
              <span className="flex items-center gap-1 text-[#2E6243]">
                <span className="h-2 w-2 rounded-full bg-[#2E6243] inline-block" />
                {fiduciaryCount} reunião{fiduciaryCount !== 1 ? "ões" : ""} fiduciária{fiduciaryCount !== 1 ? "s" : ""}
              </span>
            )}
            {googleOnlyCount > 0 && (
              <span className="flex items-center gap-1 text-[#36587A]">
                <span className="h-2 w-2 rounded-full bg-[#36587A] inline-block" />
                {googleOnlyCount} do Google
              </span>
            )}
            {personalCount > 0 && (
              <span className="flex items-center gap-1 text-[#856133]">
                <span className="h-2 w-2 rounded-full bg-[#856133] inline-block" />
                {personalCount} bloco{personalCount !== 1 ? "s" : ""} pessoal{personalCount !== 1 ? "is" : ""}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Grade semanal ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-[700px]">

          {/* Cabeçalhos dos dias */}
          <div className="flex border-b border-[#E9E3D8] bg-[#FFF8F2] sticky top-0 z-10">
            {/* Coluna GMT */}
            <div className="w-14 shrink-0 flex items-end justify-center pb-2">
              <span className="text-[10px] font-semibold text-[#9E968B] font-[var(--font-jakarta)]">GMT-3</span>
            </div>
            {weekDays.map((d, i) => {
              const k = dayKey(d);
              const isToday = k === todayKey;
              return (
                <div key={k} className={`flex-1 text-center py-2 border-l border-[#E9E3D8] ${isToday ? "bg-[#FCF0E8]" : ""}`}>
                  <p className={`text-[10px] font-semibold uppercase tracking-[0.06em] font-[var(--font-jakarta)] ${isToday ? "text-[#8C6A43]" : "text-[#9E968B]"}`}>
                    {WEEKDAY_SHORT[i]}
                  </p>
                  <div className="flex items-baseline justify-center gap-1 mt-0.5">
                    <span className={`font-[var(--font-editorial)] text-[22px] leading-none tracking-[-0.01em] ${isToday ? "text-[#8C6A43] font-semibold" : "text-[#1C1A17]"}`}>
                      {d.getDate()}
                    </span>
                    <span className={`text-[11px] font-[var(--font-jakarta)] ${isToday ? "text-[#8C6A43]" : "text-[#9E968B]"}`}>
                      {d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}
                    </span>
                  </div>
                  {isToday && <div className="h-0.5 bg-[#8C6A43] mx-3 mt-1 rounded-full" />}
                </div>
              );
            })}
          </div>

          {/* Grade com eventos */}
          <div className="flex">
            {/* Régua de horas */}
            <div className="w-14 shrink-0 relative" style={{ height: GRID_HEIGHT + HOUR_PX }}>
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="absolute right-2 text-[10px] font-medium text-[#9E968B] font-[var(--font-jakarta)]"
                  style={{ top: minutesToPx(h * 60) - 7 }}
                >
                  {String(h).padStart(2, "0")}:00
                </div>
              ))}
            </div>

            {/* Colunas dos dias */}
            {weekDays.map((d, i) => {
              const k = dayKey(d);
              const isToday = k === todayKey;
              const dayEvents = eventsByDay.get(k) ?? [];

              return (
                <div
                  key={k}
                  className={`flex-1 border-l border-[#E9E3D8] relative ${isToday ? "bg-[#FFFAF6]" : "bg-transparent"}`}
                  style={{ height: GRID_HEIGHT + HOUR_PX }}
                >
                  {/* Linhas horizontais por hora */}
                  {HOURS.map((h) => (
                    <div
                      key={h}
                      className="absolute left-0 right-0 border-t border-[#E9E3D8]"
                      style={{ top: minutesToPx(h * 60) }}
                    />
                  ))}

                  {/* "Sem compromissos" para dias sem eventos */}
                  {dayEvents.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="text-[10px] text-[#CDC5BC] font-[var(--font-jakarta)] [writing-mode:vertical-rl] rotate-180 tracking-widest uppercase">
                        Sem compromissos
                      </span>
                    </div>
                  )}

                  {/* Indicador de hora atual */}
                  {isToday && nowTop !== null && (
                    <div
                      className="absolute left-0 right-0 z-20 flex items-center pointer-events-none"
                      style={{ top: nowTop }}
                    >
                      <span className="h-2 w-2 rounded-full bg-[#C1382A] shrink-0 -ml-1" />
                      <div className="flex-1 h-px bg-[#C1382A]" />
                    </div>
                  )}

                  {/* Blocos de eventos */}
                  {dayEvents.map((e) => (
                    <EventBlock
                      key={e.from_google ? `g-${e.google_event_id}` : e.id}
                      event={e}
                      onDelete={() => !e.from_google && e.id && del.mutate(e.id)}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Rodapé com cartões ─────────────────────────────────────────── */}
      <div className="border-t border-[#E9E3D8] bg-[#FFF8F2] px-6 py-4 grid md:grid-cols-3 gap-4">

        {/* Card 1: Google Calendar */}
        <div className="bg-white rounded-lg border border-[#E9E3D8] p-4 flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-[#EBF4EE] flex items-center justify-center shrink-0">
            <CalendarClock className="h-4 w-4 text-[#2E6243]" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[#1C1A17] font-[var(--font-jakarta)]">
              {googleConnected ? "Google Calendar Ativo" : "Google Calendar"}
            </p>
            <p className="text-[12px] text-[#6E685F] font-[var(--font-jakarta)] mt-0.5 truncate">
              {googleConnected
                ? `${googleOnlyCount} evento${googleOnlyCount !== 1 ? "s" : ""} sincronizado${googleOnlyCount !== 1 ? "s" : ""} esta semana`
                : "Não conectado — acesse Configurações"
              }
            </p>
          </div>
          {googleConnected && (
            <RefreshCw
              className="h-4 w-4 text-[#9E968B] shrink-0 cursor-pointer hover:text-[#6E685F]"
              onClick={() => qc.invalidateQueries({ queryKey: ["events"] })}
            />
          )}
        </div>

        {/* Card 2: Reunião crítica */}
        <div className="bg-white rounded-lg border border-[#E9E3D8] p-4 flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-[#F8EBEA] flex items-center justify-center shrink-0">
            <Zap className="h-4 w-4 text-[#9B453B]" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[#1C1A17] font-[var(--font-jakarta)]">
              Reunião Crítica Hoje
            </p>
            {criticalMeeting ? (
              <p className="text-[12px] text-[#6E685F] font-[var(--font-jakarta)] mt-0.5 truncate">
                {criticalMeeting.clients?.name}: {criticalMeeting.title}
              </p>
            ) : (
              <p className="text-[12px] text-[#9E968B] font-[var(--font-jakarta)] mt-0.5">
                Nenhuma reunião com cliente hoje
              </p>
            )}
          </div>
        </div>

        {/* Card 3: Notas preparatórias */}
        <div className="bg-white rounded-lg border border-[#E9E3D8] p-4 flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-[#EBF1F6] flex items-center justify-center shrink-0">
            <Video className="h-4 w-4 text-[#36587A]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-[#1C1A17] font-[var(--font-jakarta)]">
              Notas Preparatórias
            </p>
            <p className="text-[12px] text-[#6E685F] font-[var(--font-jakarta)] mt-0.5">
              {todayTotal > 0
                ? `${todayWithNotes} de ${todayTotal} reuniões pautadas`
                : "Nenhuma reunião hoje"
              }
            </p>
          </div>
          {todayTotal > 0 && (
            <span className="text-[13px] font-bold text-[#36587A] font-[var(--font-jakarta)] shrink-0">
              {todayTotal > 0 ? Math.round(todayWithNotes / todayTotal * 100) : 0}%
            </span>
          )}
        </div>
      </div>

      {/* ── Sheet de novo evento ──────────────────────────────────────── */}
      <NewEventSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        clients={clientsQ.data ?? []}
        isPending={add.isPending}
        onSubmit={(data) => add.mutate(data)}
      />
    </div>
  );
}
