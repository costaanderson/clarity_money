import { createLazyFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listPipeline,
  listPipelineStages,
  moveClientStage,
  bulkMoveClientStage,
  createPipelineStage,
  updatePipelineStage,
  deletePipelineStage,
  reorderPipelineStages,
} from "@/features/pipeline/lib/pipeline.server";
import { DEFAULT_PIPELINE_STAGES, type PipelineStage, type PipelineStageRow } from "@/features/pipeline/lib/pipeline.types";
import { parseError } from "@/lib/parse-error";
import { Card } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
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
import {
  CheckCircle,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Instagram,
  KanbanSquare,
  Megaphone,
  Globe,
  Plus,
  Settings2,
  Trash2,
  Trophy,
  Users,
  UserPlus,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ClientDetailSheet } from "@/features/clients/components/client-detail-sheet";

const SOURCE_META: Record<string, { label: string; Icon: typeof Instagram; className: string }> = {
  instagram:    { label: "Instagram",  Icon: Instagram, className: "border-pink-300 text-pink-700 bg-pink-50" },
  google_ads:   { label: "Google Ads", Icon: Megaphone, className: "border-blue-300 text-blue-700 bg-blue-50" },
  landing_page: { label: "LP",         Icon: Globe,     className: "border-emerald-300 text-emerald-700 bg-emerald-50" },
  indicacao:    { label: "Indicação",  Icon: Users,     className: "border-amber-300 text-amber-700 bg-amber-50" },
  outro:        { label: "Manual",     Icon: UserPlus,  className: "border-muted-foreground/30 text-muted-foreground bg-muted/40" },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Route = (createLazyFileRoute as any)("/_authenticated/pipeline")({
  component: PipelinePage,
});

type Client = Awaited<ReturnType<typeof listPipeline>>[number];

function PipelinePage() {
  const qc = useQueryClient();

  const stagesQ = useQuery({
    queryKey: ["pipeline-stages"],
    queryFn: () => listPipelineStages(),
    placeholderData: DEFAULT_PIPELINE_STAGES,
  });
  const stages: PipelineStageRow[] = stagesQ.data ?? DEFAULT_PIPELINE_STAGES;
  const wonSlugs = stages.filter((s) => s.is_won).map((s) => s.slug);

  const [showWon, setShowWon] = useState(false);
  const [openSettings, setOpenSettings] = useState(false);

  const clientsQ = useQuery({
    queryKey: ["pipeline", showWon],
    queryFn: () => listPipeline({ data: { includeWon: showWon } }),
  });

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  // Seleção em massa
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkTargetStage, setBulkTargetStage] = useState<string>("");

  const visibleStages = showWon ? stages : stages.filter((s) => !s.is_won);

  const move = useMutation({
    mutationFn: (v: { id: string; stage: string; order: number; isWon: boolean }) =>
      moveClientStage({ data: v }),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: ["pipeline", showWon] });
      const prev = qc.getQueryData<Client[]>(["pipeline", showWon]);
      qc.setQueryData<Client[]>(["pipeline", showWon], (old) =>
        (old ?? []).map((c) =>
          c.id === v.id ? { ...c, pipeline_stage: v.stage, pipeline_order: v.order } : c,
        ),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["pipeline", showWon], ctx.prev);
      toast.error("Não foi possível mover o cliente");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pipeline"] });
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
  });

  const bulkMove = useMutation({
    mutationFn: (v: { ids: string[]; stage: string; isWon: boolean }) =>
      bulkMoveClientStage({ data: v }),
    onSuccess: (_data, v) => {
      qc.invalidateQueries({ queryKey: ["pipeline"] });
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast.success(`${v.ids.length} cliente${v.ids.length > 1 ? "s" : ""} movido${v.ids.length > 1 ? "s" : ""}`);
      exitSelectionMode();
    },
    onError: () => toast.error("Não foi possível mover os clientes"),
  });

  function exitSelectionMode() {
    setSelectionMode(false);
    setSelectedIds(new Set());
    setBulkTargetStage("");
  }

  function toggleSelection(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleBulkMove() {
    if (!bulkTargetStage || selectedIds.size === 0) return;
    const isWon = wonSlugs.includes(bulkTargetStage);
    bulkMove.mutate({ ids: Array.from(selectedIds), stage: bulkTargetStage, isWon });
  }

  const columns = useMemo(() => {
    const grouped = new Map<string, Client[]>();
    for (const s of visibleStages) grouped.set(s.slug, []);
    for (const c of clientsQ.data ?? []) {
      if (grouped.has(c.pipeline_stage ?? "")) {
        grouped.get(c.pipeline_stage ?? "")!.push(c);
      }
    }
    return grouped;
  }, [clientsQ.data, visibleStages]);

  function handleDrop(slug: string) {
    if (!draggingId || selectionMode) return;
    const current = clientsQ.data?.find((c) => c.id === draggingId);
    setDraggingId(null);
    setOverStage(null);
    if (!current || current.pipeline_stage === slug) return;
    const order = columns.get(slug)?.length ?? 0;
    const isWon = wonSlugs.includes(slug);
    move.mutate({ id: draggingId, stage: slug, order, isWon });
  }

  const wonCount = showWon
    ? wonSlugs.reduce((acc, s) => acc + (columns.get(s)?.length ?? 0), 0)
    : (clientsQ.data ?? []).filter((c) => wonSlugs.includes(c.pipeline_stage ?? "")).length;

  return (
    <div className="p-4 md:p-8 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Fluxo comercial</p>
          <h1 className="text-3xl font-serif">Pipeline</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant={showWon ? "default" : "outline"}
            size="sm"
            onClick={() => setShowWon((v) => !v)}
            className="gap-1.5"
          >
            <CheckCircle className="h-4 w-4" />
            Finalizados
            {wonCount > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">{wonCount}</Badge>
            )}
          </Button>
          {selectionMode ? (
            <Button variant="outline" size="sm" onClick={exitSelectionMode} className="gap-1.5">
              <X className="h-4 w-4" /> Cancelar seleção
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setSelectionMode(true)} className="gap-1.5">
              <CheckSquare className="h-4 w-4" /> Selecionar
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => setOpenSettings(true)} className="gap-1.5">
            <Settings2 className="h-4 w-4" /> Etapas
          </Button>
          {!selectionMode && (
            <div className="text-xs text-muted-foreground hidden sm:flex items-center gap-2">
              <KanbanSquare className="h-4 w-4" /> Arraste os cards entre as colunas
            </div>
          )}
          {selectionMode && (
            <p className="text-xs text-muted-foreground">Clique nos cards para selecionar</p>
          )}
        </div>
      </header>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {visibleStages.map((s) => {
          const items = columns.get(s.slug) ?? [];
          const isOver = overStage === s.slug;
          const isWon = s.is_won;
          return (
            <div
              key={s.slug}
              onDragOver={(e) => { if (!selectionMode) { e.preventDefault(); setOverStage(s.slug); } }}
              onDragLeave={() => setOverStage((v) => (v === s.slug ? null : v))}
              onDrop={() => handleDrop(s.slug)}
              className={`w-72 shrink-0 rounded-xl border p-3 transition-colors ${
                isWon ? "bg-emerald-50/50 border-emerald-200" : "bg-muted/30"
              } ${isOver && !selectionMode ? "bg-accent/50 border-primary/40" : ""}`}
            >
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className={`text-sm font-medium ${isWon ? "text-emerald-700" : ""}`}>
                  {isWon && <Trophy className="inline h-3.5 w-3.5 mr-1 mb-0.5" />}
                  {s.label}
                </h2>
                <Badge variant="outline" className={`text-xs ${isWon ? "border-emerald-300 text-emerald-700" : ""}`}>
                  {items.length}
                </Badge>
              </div>
              <div className="space-y-2 min-h-16">
                {items.map((c) => {
                  const isSelected = selectedIds.has(c.id);
                  return (
                    <Card
                      key={c.id}
                      draggable={!selectionMode}
                      onDragStart={() => { if (!selectionMode) setDraggingId(c.id); }}
                      onDragEnd={() => { setDraggingId(null); setOverStage(null); }}
                      onClick={() => { if (selectionMode) toggleSelection(c.id); else setOpenId(c.id); }}
                      className={`p-3 cursor-pointer transition select-none ${
                        selectionMode
                          ? isSelected
                            ? "ring-2 ring-primary shadow-sm bg-primary/5"
                            : "hover:bg-muted/50"
                          : `hover:shadow-sm ${draggingId === c.id ? "opacity-50" : ""}`
                      } ${isWon ? "opacity-75" : ""}`}
                    >
                      <div className="flex items-start gap-2">
                        {selectionMode && (
                          <div className={`mt-0.5 h-4 w-4 shrink-0 rounded border flex items-center justify-center transition-colors ${
                            isSelected ? "bg-primary border-primary" : "border-muted-foreground/40"
                          }`}>
                            {isSelected && <svg viewBox="0 0 10 8" className="h-2.5 w-2.5 fill-primary-foreground"><path d="M1 4l2.5 2.5L9 1" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{c.name}</p>
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">{c.type}</Badge>
                            <Badge variant={c.status === "ativo" ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
                              {c.status}
                            </Badge>
                            {(c.client_categories ?? []).map((cc: any) => cc.categories).filter(Boolean).map((cat: any) => (
                              <span
                                key={cat.id}
                                className="inline-flex items-center text-[10px] px-1.5 py-0 rounded-full border"
                                style={{ borderColor: cat.color, color: cat.color }}
                              >
                                {cat.name}
                              </span>
                            ))}
                          </div>
                          {(() => {
                            const meta = SOURCE_META[c.source ?? "outro"] ?? SOURCE_META.outro;
                            const Icon = meta.Icon;
                            return (
                              <div className="mt-2 flex items-center justify-between gap-2">
                                <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border ${meta.className}`}>
                                  <Icon className="h-2.5 w-2.5" />
                                  {meta.label}
                                </span>
                                {isWon && c.finalized_at ? (
                                  <span className="text-[10px] text-emerald-600">
                                    {new Date(c.finalized_at).toLocaleDateString("pt-BR")}
                                  </span>
                                ) : c.last_contact_at ? (
                                  <span className="text-[10px] text-muted-foreground">
                                    {new Date(c.last_contact_at).toLocaleDateString("pt-BR")}
                                  </span>
                                ) : null}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </Card>
                  );
                })}
                {items.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    {isWon ? "Nenhum finalizado" : "Vazio"}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Barra de ação em massa */}
      {selectionMode && selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-3 bg-background border shadow-lg rounded-xl px-4 py-3">
            <span className="text-sm font-medium whitespace-nowrap">
              {selectedIds.size} selecionado{selectedIds.size > 1 ? "s" : ""}
            </span>
            <div className="h-4 w-px bg-border" />
            <Select value={bulkTargetStage} onValueChange={setBulkTargetStage}>
              <SelectTrigger className="h-8 w-52 text-sm">
                <SelectValue placeholder="Mover para…" />
              </SelectTrigger>
              <SelectContent>
                {stages.map((s) => (
                  <SelectItem key={s.slug} value={s.slug}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" disabled={!bulkTargetStage || bulkMove.isPending} onClick={handleBulkMove}>
              {bulkMove.isPending ? "Movendo…" : "Mover"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())} className="text-muted-foreground">
              Limpar
            </Button>
          </div>
        </div>
      )}

      {/* Sheet de gerenciamento de etapas */}
      <StagesSettingsSheet open={openSettings} onOpenChange={setOpenSettings} stages={stages} />

      <ClientDetailSheet clientId={openId} open={!!openId} onOpenChange={(o) => !o && setOpenId(null)} />
    </div>
  );
}

// ── Sheet de gerenciamento de etapas ─────────────────────────────────────────

function StagesSettingsSheet({
  open,
  onOpenChange,
  stages,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  stages: PipelineStageRow[];
}) {
  const qc = useQueryClient();
  const [newLabel, setNewLabel] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const [localStages, setLocalStages] = useState<PipelineStageRow[]>(stages);

  // Sincroniza estado local com o servidor, mas não enquanto uma mutation está pendente
  // (evita que o refetch reverta a ordem antes do servidor confirmar)
  useEffect(() => {
    if (!reorder.isPending) {
      setLocalStages(stages);
    }
  }, [stages, reorder.isPending]);

  const addStage = useMutation({
    mutationFn: () => createPipelineStage({ data: { label: newLabel.trim(), is_won: false } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pipeline-stages"] });
      setNewLabel("");
      toast.success("Etapa criada");
    },
    onError: (e: Error) => toast.error(parseError(e)),
  });

  const renameStage = useMutation({
    mutationFn: (id: string) => updatePipelineStage({ data: { id, label: editingLabel.trim() } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pipeline-stages"] });
      qc.invalidateQueries({ queryKey: ["pipeline"] });
      setEditingId(null);
      toast.success("Etapa renomeada");
    },
    onError: (e: Error) => toast.error(parseError(e)),
  });

  const toggleWon = useMutation({
    mutationFn: ({ id, is_won }: { id: string; is_won: boolean }) =>
      updatePipelineStage({ data: { id, is_won } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pipeline-stages"] });
      qc.invalidateQueries({ queryKey: ["pipeline"] });
    },
    onError: (e: Error) => toast.error(parseError(e)),
  });

  const reorder = useMutation({
    mutationFn: (orderedIds: string[]) =>
      reorderPipelineStages({ data: { orderedIds } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pipeline-stages"] }),
    onError: (e: Error) => toast.error(parseError(e)),
  });

  const deleteStage = useMutation({
    mutationFn: (s: PipelineStageRow) => deletePipelineStage({ data: { id: s.id, slug: s.slug } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pipeline-stages"] });
      qc.invalidateQueries({ queryKey: ["pipeline"] });
      toast.success("Etapa removida");
    },
    onError: (e: Error) => toast.error(parseError(e)),
  });

  function moveUp(idx: number) {
    if (idx === 0) return;
    const next = [...localStages];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    setLocalStages(next);
    reorder.mutate(next.map((s) => s.id));
  }

  function moveDown(idx: number) {
    if (idx === localStages.length - 1) return;
    const next = [...localStages];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    setLocalStages(next);
    reorder.mutate(next.map((s) => s.id));
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-serif text-2xl">Etapas do pipeline</SheetTitle>
          <p className="text-sm text-muted-foreground">
            Renomeie, reordene ou adicione etapas. Etapas com clientes não podem ser apagadas.
          </p>
        </SheetHeader>

        <div className="mt-6 space-y-2">
          {localStages.map((s, idx) => (
            <div key={s.id} className="flex items-center gap-2 group rounded-lg border bg-card px-3 py-2">
              {/* Reordenar */}
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => moveUp(idx)}
                  disabled={idx === 0 || reorder.isPending}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => moveDown(idx)}
                  disabled={idx === localStages.length - 1 || reorder.isPending}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Label */}
              <div className="flex-1 min-w-0">
                {editingId === s.id ? (
                  <div className="flex gap-1">
                    <Input
                      autoFocus
                      value={editingLabel}
                      onChange={(e) => setEditingLabel(e.target.value)}
                      className="h-7 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && editingLabel.trim()) renameStage.mutate(s.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                    />
                    <Button
                      size="sm"
                      className="h-7 px-2 text-xs"
                      disabled={!editingLabel.trim() || renameStage.isPending}
                      onClick={() => renameStage.mutate(s.id)}
                    >
                      OK
                    </Button>
                  </div>
                ) : (
                  <button
                    className="text-sm font-medium text-left w-full truncate hover:text-primary transition-colors"
                    onClick={() => { setEditingId(s.id); setEditingLabel(s.label); }}
                  >
                    {s.label}
                  </button>
                )}
              </div>

              {/* Etapa vencedora (is_won) */}
              <button
                title={s.is_won ? "Etapa vencedora (clique para desmarcar)" : "Marcar como etapa vencedora"}
                onClick={() => toggleWon.mutate({ id: s.id, is_won: !s.is_won })}
                className={`transition-colors ${s.is_won ? "text-emerald-600" : "text-muted-foreground/30 hover:text-muted-foreground"}`}
              >
                <Trophy className="h-4 w-4" />
              </button>

              {/* Apagar */}
              <button
                title="Apagar etapa"
                onClick={() => deleteStage.mutate(s)}
                className="text-muted-foreground/30 hover:text-destructive transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Nova etapa */}
        <div className="mt-6 space-y-2">
          <Label>Nova etapa</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Ex: Proposta enviada"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && newLabel.trim()) addStage.mutate(); }}
            />
            <Button
              disabled={!newLabel.trim() || addStage.isPending}
              onClick={() => addStage.mutate()}
              className="gap-1 shrink-0"
            >
              <Plus className="h-4 w-4" /> Criar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            <Trophy className="inline h-3 w-3 mr-1 text-emerald-600" />
            Clique no troféu para marcar uma etapa como vencedora (substitui "Finalizado").
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
