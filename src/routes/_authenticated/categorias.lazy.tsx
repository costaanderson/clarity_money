import { createLazyFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createCategory, deleteCategory, listCategories } from "@/features/settings/lib/categories.functions";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Trash2, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = (createLazyFileRoute as unknown as (p: string) => any)(
  "/_authenticated/categorias",
)({ component: CategoriesPage });

const COLORS = ["#8b5a2b", "#2f855a", "#2b6cb0", "#805ad5", "#c05621", "#b83280", "#4a5568"];

function CategoriesPage() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const q = useQuery({ queryKey: ["categories"], queryFn: () => listCategories() });

  const add = useMutation({
    mutationFn: () => createCategory({ data: { name, color } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      setName("");
      toast.success("Categoria criada");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteCategory({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      <header>
        <p className="text-sm text-muted-foreground">Organização</p>
        <h1 className="text-3xl font-serif">Categorias</h1>
      </header>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-3 gap-3 items-end">
            <div className="col-span-2">
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Reserva, Endividado, VIP" />
            </div>
            <div>
              <Label>Cor</Label>
              <div className="flex gap-2 mt-1">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`h-7 w-7 rounded-full border ${color === c ? "ring-2 ring-offset-2 ring-primary" : ""}`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => add.mutate()} disabled={!name.trim() || add.isPending}>
              <Plus className="h-4 w-4 mr-1" /> Adicionar
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-2">
        {q.data?.map((c) => (
          <Card key={c.id}>
            <CardContent className="p-3 flex items-center gap-3">
              <span className="h-4 w-4 rounded-full" style={{ background: c.color }} />
              <span className="flex-1">{c.name}</span>
              <Button variant="ghost" size="icon" onClick={() => del.mutate(c.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
        {q.data?.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma categoria.</p>}
      </div>
    </div>
  );
}
