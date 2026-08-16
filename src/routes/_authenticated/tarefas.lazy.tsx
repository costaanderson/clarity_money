import { createLazyFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createTask, deleteTask, listTasks, setTaskStatus } from "@/lib/tasks.functions";
import { listClients } from "@/lib/clients.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { TaskEditSheet } from "@/components/tasks/task-edit-sheet";

export const Route = (createLazyFileRoute as unknown as (p: string) => any)(
  "/_authenticated/tarefas",
)({ component: TasksPage });

type Task = Awaited<ReturnType<typeof listTasks>>[number];

function TasksPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "pendente" | "feito">("pendente");
  const [range, setRange] = useState<"all" | "week" | "overdue">("all");
  const [editTask, setEditTask] = useState<Task | null>(null);

  const tasksQ = useQuery({
    queryKey: ["tasks", { filter, range }],
    queryFn: () => listTasks({ data: { status: filter, range } }),
  });
  const clientsQ = useQuery({
    queryKey: ["clients", "select"],
    queryFn: () => listClients({ data: { status: "all" } }),
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState<string>("");
  const [clientId, setClientId] = useState<string>("none");

  const add = useMutation({
    mutationFn: () =>
      createTask({
        data: {
          title,
          description,
          due_at: dueAt ? new Date(dueAt).toISOString() : null,
          client_id: clientId === "none" ? null : clientId,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setTitle("");
      setDescription("");
      setDueAt("");
      setClientId("none");
      toast.success("Tarefa criada");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const toggle = useMutation({
    mutationFn: (v: { id: string; status: "pendente" | "feito" }) => setTaskStatus({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteTask({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <header>
        <p className="text-sm text-muted-foreground">Execução</p>
        <h1 className="text-3xl font-serif">Tarefas</h1>
      </header>

      <Card>
        <CardContent className="p-4 grid gap-3">
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label>Título</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ligar para o cliente…" />
            </div>
            <div>
              <Label>Vencimento</Label>
              <Input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
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
              <Label>Descrição</Label>
              <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button disabled={!title.trim() || add.isPending} onClick={() => add.mutate()}>Adicionar</Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pendente">Pendentes</SelectItem>
            <SelectItem value="feito">Feitas</SelectItem>
            <SelectItem value="all">Todas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={range} onValueChange={(v) => setRange(v as typeof range)}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Qualquer data</SelectItem>
            <SelectItem value="week">Esta semana</SelectItem>
            <SelectItem value="overdue">Atrasadas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        {tasksQ.data?.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma tarefa.</p>}
        {tasksQ.data?.map((t) => (
          <Card key={t.id}>
            <CardContent className="p-3 flex items-start gap-3">
              <Checkbox
                checked={t.status === "feito"}
                onCheckedChange={(v) =>
                  toggle.mutate({ id: t.id, status: v ? "feito" : "pendente" })
                }
                className="mt-1"
              />
              <div className="flex-1 min-w-0">
                <button
                  className={`text-left w-full ${t.status === "feito" ? "line-through text-muted-foreground" : "font-medium"} hover:underline`}
                  onClick={() => setEditTask(t)}
                >
                  {t.title}
                </button>
                {t.description && (<p className="text-sm text-muted-foreground">{t.description}</p>)}
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  {t.due_at && (<span>{new Date(t.due_at).toLocaleString("pt-BR")}</span>)}
                  {t.clients?.name && (
                    <Link to="/clientes/$id" params={{ id: t.clients.id }} className="underline">
                      {t.clients.name}
                    </Link>
                  )}
                  {t.source === "regra_ativacao" && (
                    <Badge
                      variant="secondary"
                      title="Gerada automaticamente por uma regra de ativação configurada em Configurações → Regras"
                    >
                      Ativação
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  title="Editar tarefa"
                  onClick={() => setEditTask(t)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => del.mutate(t.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <TaskEditSheet
        task={editTask}
        open={!!editTask}
        onOpenChange={(o) => !o && setEditTask(null)}
      />
    </div>
  );
}
