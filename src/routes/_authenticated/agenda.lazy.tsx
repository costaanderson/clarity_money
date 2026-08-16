import { createLazyFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createEvent, deleteEvent, listEvents } from "@/features/agenda/lib/calendar.functions";
import { listClients } from "@/features/clients/lib/clients.functions";
import { Card, CardContent } from "@/shared/components/ui/card";
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
import { CalendarClock, Trash2 } from "lucide-react";
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setTitle(""); setDescription(""); setStart(""); setEnd(""); setMeet(""); setClientId("none");
      toast.success("Compromisso criado");
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

      <Card className="bg-secondary/40">
        <CardContent className="p-4 text-sm">
          <p className="font-medium mb-1 flex items-center gap-2">
            <CalendarClock className="h-4 w-4" /> Google Agenda
          </p>
          <p className="text-muted-foreground">
            A sincronização bidirecional com o Google Agenda pode ser ativada em{" "}
            <Link to="/configuracoes" className="underline text-primary">Configurações</Link>.
            Enquanto isso, você já pode agendar compromissos aqui e vinculá-los a clientes.
          </p>
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

      <div className="grid gap-2">
        {eventsQ.data?.length === 0 && <p className="text-sm text-muted-foreground">Sem compromissos.</p>}
        {eventsQ.data?.map((e) => (
          <Card key={e.id}>
            <CardContent className="p-3 flex items-start gap-3">
              <CalendarClock className="h-5 w-5 text-primary mt-1" />
              <div className="flex-1 min-w-0">
                <p className="font-medium">{e.title}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(e.start_at).toLocaleString("pt-BR")} — {new Date(e.end_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  {e.clients?.name && (<> · <Link to="/clientes/$id" params={{ id: e.clients.id }} className="underline">{e.clients.name}</Link></>)}
                </p>
                {e.meet_link && (
                  <a href={e.meet_link} target="_blank" rel="noopener" className="text-xs text-primary underline">
                    Abrir link
                  </a>
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={() => del.mutate(e.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
