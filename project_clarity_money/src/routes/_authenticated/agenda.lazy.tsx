import { createLazyFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createEvent, deleteEvent, listEvents } from "@/features/agenda/lib/calendar.functions";
import { getGoogleConnectionStatus } from "@/features/agenda/lib/google-auth.functions";
import { listClients } from "@/features/clients/lib/clients.functions";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { CalendarClock, Trash2, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = (createLazyFileRoute as unknown as (p: string) => any)(
  "/_authenticated/agenda",
)({ component: AgendaPage });

function startOfWeekIso() {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

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
        },
      }),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["events"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setTitle(""); setDescription(""); setStart(""); setEnd(""); setMeet(""); setClientId("none");
      if (googleConnected && !result.syncedToGoogle) {
        toast.warning("Compromisso criado, mas não foi possível sincronizar com o Google Agenda. Verifique a conexão em Configurações.");
      } else if (result.syncedToGoogle) {
        toast.success("Compromisso criado e adicionado ao Google Agenda.");
      } else {
        toast.success("Compromisso criado.");
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteEvent({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  });

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Compromissos</p>
          <h1 className="text-3xl font-serif">Agenda</h1>
        </div>
      </header>

      <Card className={googleConnected ? "bg-emerald-50/60 border-emerald-200" : "bg-secondary/40"}>
        <CardContent className="p-4 text-sm">
          <p className="font-medium mb-1 flex items-center gap-2">
            <CalendarClock className="h-4 w-4" /> Google Agenda
            {googleConnected && (
              <Badge variant="outline" className="gap-1 border-emerald-400 text-emerald-700 text-[10px]">
                <CheckCircle2 className="h-3 w-3" /> Sincronizado
              </Badge>
            )}
          </p>
          {googleConnected ? (
            <p className="text-muted-foreground">
              Compromissos criados aqui serão adicionados ao seu Google Agenda automaticamente.
            </p>
          ) : (
            <p className="text-muted-foreground">
              A sincronização com o Google Agenda pode ser ativada em{" "}
              <Link to="/configuracoes" className="underline text-primary">Configurações</Link>.
              Enquanto isso, você já pode agendar compromissos aqui e vinculá-los a clientes.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 grid gap-3">
          <div>
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Sessão com…" />
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label>Início</Label>
              <Input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div>
              <Label>Fim</Label>
              <Input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label>Cliente</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem cliente</SelectItem>
                  {clientsQ.data?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Link (Meet/Zoom)</Label>
              <Input value={meet} onChange={(e) => setMeet(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Notas</Label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="flex justify-end">
            <Button
              disabled={!title.trim() || !start || !end || add.isPending}
              onClick={() => add.mutate()}
            >
              Agendar
            </Button>
          </div>
        </CardContent>
      </Card>

      <EventsGrouped events={eventsQ.data ?? []} onDelete={(id) => del.mutate(id)} />
    </div>
  );
}

// ─── EventsGrouped ────────────────────────────────────────────────────────────

type EventItem = Awaited<ReturnType<typeof listEvents>>[number];

function EventsGrouped({
  events,
  onDelete,
}: {
  events: EventItem[];
  onDelete: (id: string) => void;
}) {
  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">Sem compromissos no período.</p>;
  }

  // Agrupar por dia
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const byDay = new Map<string, EventItem[]>();
  for (const e of events) {
    const d = new Date(e.start_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(e);
  }

  function dayLabel(key: string) {
    const d = new Date(`${key}T12:00:00`);
    const diff = Math.floor((d.getTime() - today.getTime()) / 86_400_000);
    const weekday = d.toLocaleDateString("pt-BR", { weekday: "long" });
    const date = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
    if (diff === 0) return { label: `Hoje · ${date}`, isToday: true };
    if (diff === 1) return { label: `Amanhã · ${date}`, isToday: false };
    if (diff === -1) return { label: `Ontem · ${date}`, isToday: false };
    return { label: `${weekday.charAt(0).toUpperCase() + weekday.slice(1)} · ${date}`, isToday: false };
  }

  return (
    <div className="space-y-4">
      {[...byDay.entries()].map(([dayKey, dayEvents]) => {
        const { label, isToday } = dayLabel(dayKey);
        return (
          <div key={dayKey}>
            {/* Cabeçalho do dia */}
            <div className="flex items-center gap-3 mb-2">
              <div className={`flex items-center gap-2 text-sm font-medium ${isToday ? "text-primary" : "text-foreground/70"}`}>
                <CalendarClock className="h-4 w-4 shrink-0" />
                {label}
              </div>
              <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                {dayEvents.length} reunião{dayEvents.length !== 1 ? "ões" : ""}
              </span>
              <div className="flex-1 border-t border-border/50" />
            </div>

            {/* Eventos do dia */}
            <div className="grid gap-2 pl-2 border-l-2 border-border/40 ml-2">
              {dayEvents.map((e) => {
                const isGoogleOnly = e.from_google === true;
                const key = isGoogleOnly ? `g-${e.google_event_id}` : e.id;
                return (
                  <Card key={key} className={isGoogleOnly ? "opacity-80 border-dashed" : ""}>
                    <CardContent className="p-3 flex items-start gap-3">
                      <div className="text-xs text-muted-foreground font-medium w-12 shrink-0 pt-0.5 text-right">
                        {new Date(e.start_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm">{e.title}</p>
                          {isGoogleOnly && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-300 text-blue-600">
                              Google Agenda
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          até {new Date(e.end_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          {!isGoogleOnly && e.clients?.name && (
                            <> · <Link to="/clientes/$id" params={{ id: (e.clients as any).id }} className="underline">{(e.clients as any).name}</Link></>
                          )}
                        </p>
                        {!isGoogleOnly && e.meet_link && (
                          <a href={e.meet_link} target="_blank" rel="noopener" className="text-xs text-primary underline">
                            Abrir link
                          </a>
                        )}
                      </div>
                      {!isGoogleOnly && (
                        <Button variant="ghost" size="icon" className="shrink-0" onClick={() => onDelete(e.id!)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
