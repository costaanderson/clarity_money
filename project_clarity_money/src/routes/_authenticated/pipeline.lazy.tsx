import { createLazyFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listPipeline, moveClientStage, bulkMoveClientStage } from "@/features/pipeline/lib/pipeline.server";
import { PIPELINE_STAGES, PIPELINE_STAGE_FINALIZADO, type PipelineStage } from "@/features/pipeline/lib/pipeline.types";
import { Card } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { CheckCircle, CheckSquare, Instagram, KanbanSquare, Megaphone, Globe, Users, UserPlus, X } from "lucide-react";
import { useMemo, useState } from "react";
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
  const [showFinalized, setShowFinalized] = useState(false);
  const clientsQ = useQuery({
    queryKey: ["pipeline", showFinalized],
    queryFn: () => listPipeline({ data: { includeFinalized: showFinalized } }),
  });
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<PipelineStage | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  // Seleção em massa
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkTargetStage, setBulkTargetStage] = useState<PipelineStage | "">("");

  const allStages = showFinalized
    ? [...PIPELINE_STAGES, PIPELINE_STAGE_FINALIZADO]
    : PIPELINE_STAGES;

  const move = useMutation({
    mutationFn: (v: { id: string; stage: PipelineStage; order: number }) =>
      moveClientStage({ data: v }),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: ["pipeline", showFinalized] });
      const prev = qc.getQueryData<Client[]>(["pipeline", showFinalized]);
      qc.setQueryData<Client[]>(["pipeline", showFinalized], (old) =>
        (old ?? []).map((c) => (c.id === v.id ? { ...c, pipeline_stage: v.stage, pipeline_order: v.order } : c)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["pipeline", showFinalized], ctx.prev);
      toast.error("Não foi possível mover o cliente");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pipeline"] });
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
  });

  const bulkMove = useMutation({
    mutationFn: (v: { ids: string[]; stage: PipelineStage }) =>
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
    bulkMove.mutate({ ids: Array.from(selectedIds), stage: bulkTargetStage as PipelineStage });
  }

  const columns = useMemo(() => {
    const grouped = new Map<PipelineStage, Client[]>();
    for (const s of allStages) grouped.set(s.key, []);
    for (const c of clientsQ.data ?? []) {
      grouped.get(c.pipeline_stage as PipelineStage)?.push(c);
    }
    return grouped;
  }, [clientsQ.data, allStages]);

  function handleDrop(stage: PipelineStage) {
    if (!draggingId || selectionMode) return;
    const current = clientsQ.data?.find((c) => c.id === draggingId);
    setDraggingId(null);
    setOverStage(null);
    if (!current || current.pipeline_stage === stage) return;
    const order = (columns.get(stage)?.length ?? 0);
    move.mutate({ id: draggingId, stage, order });
  }

  const finalizedCount = showFinalized ? (columns.get("finalizado")?.length ?? 0) : 0;

  return (
    <div className="p-4 md:p-8 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Fluxo comercial</p>
          <h1 className="text-3xl font-serif">Pipeline</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant={showFinalized ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFinalized((v) => !v)}
            className="gap-1.5"
          >
            <CheckCircle className="h-4 w-4" />
            Finalizados
            {showFinalized && finalizedCount > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">{finalizedCount}</Badge>
            )}
          </Button>
          {selectionMode ? (
            <Button variant="outline" size="sm" onClick={exitSelectionMode} className="gap-1.5">
              <X className="h-4 w-4" /> Cancelar seleção
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectionMode(true)}
              className="gap-1.5"
            >
              <CheckSquare className="h-4 w-4" /> Selecionar
            </Button>
          )}
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
        {allStages.map((s) => {
          const items = columns.get(s.key) ?? [];
          const isOver = overStage === s.key;
          const isFinalized = s.key === "finalizado";
          return (
            <div
              key={s.key}
              onDragOver={(e) => { if (!selectionMode) { e.preventDefault(); setOverStage(s.key); } }}
              onDragLeave={() => setOverStage((v) => (v === s.key ? null : v))}
              onDrop={() => handleDrop(s.key)}
              className={`w-72 shrink-0 rounded-xl border p-3 transition-colors ${
                isFinalized
                  ? "bg-emerald-50/50 border-emerald-200"
                  : "bg-muted/30"
              } ${isOver && !selectionMode ? "bg-accent/50 border-primary/40" : ""}`}
            >
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className={`text-sm font-medium ${isFinalized ? "text-emerald-700" : ""}`}>
                  {isFinalized && <CheckCircle className="inline h-3.5 w-3.5 mr-1 mb-0.5" />}
                  {s.label}
                </h2>
                <Badge variant="outline" className={`text-xs ${isFinalized ? "border-emerald-300 text-emerald-700" : ""}`}>
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
                      onClick={() => {
                        if (selectionMode) toggleSelection(c.id);
                        else setOpenId(c.id);
                      }}
                      className={`p-3 cursor-pointer transition select-none ${
                        selectionMode
                          ? isSelected
                            ? "ring-2 ring-primary shadow-sm bg-primary/5"
                            : "hover:bg-muted/50"
                          : `hover:shadow-sm ${draggingId === c.id ? "opacity-50" : ""}`
                      } ${isFinalized ? "opacity-75" : ""}`}
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
                            <Badge
                              variant={c.status === "ativo" ? "default" : "secondary"}
                              className="text-[10px] px-1.5 py-0"
                            >
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
                                <span
                                  className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border ${meta.className}`}
                                  title={c.source_campaign ? `Campanha: ${c.source_campaign}` : meta.label}
                                >
                                  <Icon className="h-2.5 w-2.5" />
                                  {meta.label}
                                </span>
                                {isFinalized && c.finalized_at ? (
                                  <span className="text-[10px] text-emerald-600">
                                    Finalizado {new Date(c.finalized_at).toLocaleDateString("pt-BR")}
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
                    {isFinalized ? "Nenhum cliente finalizado" : "Vazio"}
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
            <Select value={bulkTargetStage} onValueChange={(v) => setBulkTargetStage(v as PipelineStage)}>
              <SelectTrigger className="h-8 w-52 text-sm">
                <SelectValue placeholder="Mover para…" />
              </SelectTrigger>
              <SelectContent>
                {[...PIPELINE_STAGES, PIPELINE_STAGE_FINALIZADO].map((s) => (
                  <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              disabled={!bulkTargetStage || bulkMove.isPending}
              onClick={handleBulkMove}
            >
              {bulkMove.isPending ? "Movendo…" : "Mover"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedIds(new Set())}
              className="text-muted-foreground"
            >
              Limpar
            </Button>
          </div>
        </div>
      )}

      <ClientDetailSheet clientId={openId} open={!!openId} onOpenChange={(o) => !o && setOpenId(null)} />
    </div>
  );
}
