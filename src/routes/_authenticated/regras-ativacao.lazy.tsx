import { createLazyFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createRule,
  deleteRule,
  listRules,
  runActivationRules,
  updateRule,
} from "@/lib/rules.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Play, Trash2, Bell } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = (createLazyFileRoute as unknown as (p: string) => any)(
  "/_authenticated/regras-ativacao",
)({ component: RulesPage });

function RulesPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["rules"], queryFn: () => listRules() });

  const [form, setForm] = useState({
    name: "",
    active: true,
    applies_to_status: "lead" as "lead" | "ativo" | "arquivado",
    trigger_days_no_contact: 14,
    action: "task" as "task" | "email" | "ambos",
    email_subject: "",
    email_body_template: "",
  });

  const add = useMutation({
    mutationFn: () => createRule({ data: form }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rules"] });
      setForm({ ...form, name: "" });
      toast.success("Regra criada");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const upd = useMutation({
    mutationFn: (v: { id: string; active: boolean }) => updateRule({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rules"] }),
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteRule({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rules"] }),
  });
  const run = useMutation({
    mutationFn: () => runActivationRules(),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(`Regras executadas. ${r.created} tarefa(s) criada(s).`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Automação de acompanhamento</p>
          <h1 className="text-3xl font-serif">Regras de ativação</h1>
        </div>
        <Button onClick={() => run.mutate()} disabled={run.isPending}>
          <Play className="h-4 w-4 mr-1" /> Rodar agora
        </Button>
      </header>

      <Card>
        <CardHeader><CardTitle className="text-base font-serif">Nova regra</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex.: Reativação lead 14 dias" />
            </div>
            <div>
              <Label>Se cliente estiver</Label>
              <Select value={form.applies_to_status} onValueChange={(v) => setForm({ ...form, applies_to_status: v as typeof form.applies_to_status })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="arquivado">Arquivado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label>Dias sem contato</Label>
              <Input type="number" min={1} value={form.trigger_days_no_contact} onChange={(e) => setForm({ ...form, trigger_days_no_contact: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Ação</Label>
              <Select value={form.action} onValueChange={(v) => setForm({ ...form, action: v as typeof form.action })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="task">Criar tarefa</SelectItem>
                  <SelectItem value="email">Rascunho de email</SelectItem>
                  <SelectItem value="ambos">Tarefa + email</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {form.action !== "task" && (
            <>
              <div>
                <Label>Assunto do email</Label>
                <Input value={form.email_subject} onChange={(e) => setForm({ ...form, email_subject: e.target.value })} />
              </div>
              <div>
                <Label>Corpo (template)</Label>
                <Textarea rows={4} value={form.email_body_template} onChange={(e) => setForm({ ...form, email_body_template: e.target.value })} placeholder="Olá {{nome}}, faz um tempo que não conversamos…" />
              </div>
            </>
          )}
          <div className="flex justify-end">
            <Button disabled={!form.name.trim() || add.isPending} onClick={() => add.mutate()}>Criar regra</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-2">
        {q.data?.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              <Bell className="h-6 w-6 mx-auto mb-2" /> Sem regras ainda.
            </CardContent>
          </Card>
        )}
        {q.data?.map((r) => (
          <Card key={r.id}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex-1">
                <p className="font-medium">{r.name}</p>
                <p className="text-xs text-muted-foreground">
                  Aplica em <b>{r.applies_to_status}</b> · {r.trigger_days_no_contact} dias sem contato ·{" "}
                  Ação: <b>{r.action}</b>
                </p>
              </div>
              <Switch checked={r.active} onCheckedChange={(v) => upd.mutate({ id: r.id, active: v })} />
              <Button variant="ghost" size="icon" onClick={() => del.mutate(r.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
