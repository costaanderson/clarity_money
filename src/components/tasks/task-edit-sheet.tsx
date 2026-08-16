import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { updateTask } from "@/lib/tasks.functions";
import { listClients } from "@/lib/clients.functions";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";

type Task = {
  id: string;
  title: string;
  description: string | null;
  due_at: string | null;
  client_id: string | null;
  source: string;
  clients?: { id: string; name: string; type: string } | null;
};

export function TaskEditSheet({
  task,
  open,
  onOpenChange,
}: {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [clientId, setClientId] = useState("none");

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description ?? "");
      setDueAt(task.due_at ? task.due_at.slice(0, 16) : "");
      setClientId(task.client_id ?? "none");
    }
  }, [task]);

  const clientsQ = useQuery({
    queryKey: ["clients", "select"],
    queryFn: () => listClients({ data: { status: "all" } }),
    enabled: open,
  });

  const save = useMutation({
    mutationFn: () =>
      updateTask({
        data: {
          id: task!.id,
          title: title.trim(),
          description: description.trim() || null,
          due_at: dueAt ? new Date(dueAt).toISOString() : null,
          client_id: clientId === "none" ? null : clientId,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Tarefa atualizada");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg p-0 overflow-hidden flex flex-col gap-0"
      >
        <SheetHeader className="px-6 pt-6 pb-3 border-b bg-muted/30 flex-row items-center justify-between space-y-0 shrink-0">
          <SheetTitle className="font-serif text-base text-muted-foreground font-normal">
            Editar tarefa
          </SheetTitle>
          {task?.source === "regra_ativacao" && (
            <Badge variant="secondary" title="Gerada automaticamente por uma regra de ativação configurada em Configurações → Regras">
              Ativação automática
            </Badge>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
          <div>
            <Label>Título</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Descrição da tarefa…"
            />
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhes adicionais (opcional)"
            />
          </div>

          <div>
            <Label>Vencimento</Label>
            <Input
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
            />
          </div>

          <div>
            <Label>Cliente vinculado</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem cliente</SelectItem>
                {clientsQ.data?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {task?.clients && (
              <Button variant="link" size="sm" className="px-0 mt-1 h-auto text-xs" asChild>
                <Link
                  to="/clientes/$id"
                  params={{ id: task.clients.id }}
                  onClick={() => onOpenChange(false)}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Ver perfil de {task.clients.name}
                </Link>
              </Button>
            )}
          </div>
        </div>

        <div className="px-6 pb-6 pt-3 border-t flex justify-end gap-2 shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={!title.trim() || save.isPending}
            onClick={() => save.mutate()}
          >
            Salvar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
