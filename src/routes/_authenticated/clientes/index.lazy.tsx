import { createLazyFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { archiveClient, listClients, restoreClient } from "@/features/clients/lib/clients.functions";
import { listCategories } from "@/features/settings/lib/categories.functions";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Archive, ArchiveRestore, MoreHorizontal, Plus, Search, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { NewClientDialog } from "@/features/clients/components/new-client-dialog";
import { ClientDetailSheet } from "@/features/clients/components/client-detail-sheet";


export const Route = (createLazyFileRoute as unknown as (p: string) => any)("/_authenticated/clientes/")({
  component: ClientsPage,
});

function ClientsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<string>("ativo");
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [openNew, setOpenNew] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);


  const clientsQ = useQuery({
    queryKey: ["clients", { status, search, categoryId }],
    queryFn: () =>
      listClients({ data: { status, search, categoryId: categoryId === "all" ? undefined : categoryId } }),
  });
  const catsQ = useQuery({ queryKey: ["categories"], queryFn: () => listCategories() });

  const archive = useMutation({
    mutationFn: (id: string) => archiveClient({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Cliente arquivado");
    },
  });
  const restore = useMutation({
    mutationFn: (id: string) => restoreClient({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Cliente reativado");
    },
  });

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Sua carteira</p>
          <h1 className="text-3xl font-serif">Clientes</h1>
        </div>
        <Button onClick={() => setOpenNew(true)}>
          <Plus className="h-4 w-4 mr-1" /> Novo cliente
        </Button>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="lead">Leads</SelectItem>
            <SelectItem value="ativo">Ativos</SelectItem>
            <SelectItem value="arquivado">Arquivados</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {catsQ.data?.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {clientsQ.isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}

      {clientsQ.data && clientsQ.data.length === 0 && (
        <Card>
          <CardContent className="p-10 text-center space-y-3">
            <Users className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="font-medium">Nenhum cliente por aqui</p>
            <p className="text-sm text-muted-foreground">Cadastre seu primeiro cliente para começar.</p>
            <Button onClick={() => setOpenNew(true)}>
              <Plus className="h-4 w-4 mr-1" /> Novo cliente
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3">
        {clientsQ.data?.map((c) => (
          <Card
            key={c.id}
            className="hover:shadow-sm transition-shadow cursor-pointer"
            onClick={() => setOpenId(c.id)}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center font-serif">
                {c.name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium truncate">{c.name}</span>
                  <Badge variant="outline">{c.type}</Badge>
                  <Badge variant={c.status === "ativo" ? "default" : c.status === "lead" ? "secondary" : "outline"}>
                    {c.status}
                  </Badge>
                  {c.categories && (
                    <span
                      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border"
                      style={{ borderColor: c.categories.color, color: c.categories.color }}
                    >
                      {c.categories.name}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {[c.email, c.phone].filter(Boolean).join(" · ") || "Sem contato registrado"}
                </p>
              </div>
              <div className="text-right text-xs text-muted-foreground hidden md:block">
                {c.last_contact_at
                  ? `Último contato ${new Date(c.last_contact_at).toLocaleDateString("pt-BR")}`
                  : "Sem contato"}
              </div>
              <div onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setOpenId(c.id)}>Abrir</DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/clientes/$id" params={{ id: c.id }}>Abrir em página cheia</Link>
                    </DropdownMenuItem>
                    {c.status !== "arquivado" ? (
                      <DropdownMenuItem onClick={() => archive.mutate(c.id)}>
                        <Archive className="h-4 w-4 mr-2" /> Arquivar
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={() => restore.mutate(c.id)}>
                        <ArchiveRestore className="h-4 w-4 mr-2" /> Reativar
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <NewClientDialog open={openNew} onOpenChange={setOpenNew} categories={catsQ.data ?? []} />
      <ClientDetailSheet clientId={openId} open={!!openId} onOpenChange={(o) => !o && setOpenId(null)} />

    </div>
  );
}
