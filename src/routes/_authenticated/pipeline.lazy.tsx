import { createLazyFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listPipeline, moveClientStage, PIPELINE_STAGES, type PipelineStage } from "@/lib/clients.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KanbanSquare, Instagram, Megaphone, Globe, Users, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ClientDetailSheet } from "@/components/clients/client-detail-sheet";


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
  const clientsQ = useQuery({ queryKey: ["pipeline"], queryFn: () => listPipeline() });
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<PipelineStage | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);


  const move = useMutation({
    mutationFn: (v: { id: string; stage: PipelineStage; order: number }) =>
      moveClientStage({ data: v }),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: ["pipeline"] });
      const prev = qc.getQueryData<Client[]>(["pipeline"]);
      qc.setQueryData<Client[]>(["pipeline"], (old) =>
        (old ?? []).map((c) => (c.id === v.id ? { ...c, pipeline_stage: v.stage, pipeline_order: v.order } : c)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["pipeline"], ctx.prev);
      toast.error("Não foi possível mover o cliente");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pipeline"] });
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
  });

  const columns = useMemo(() => {
    const grouped = new Map<PipelineStage, Client[]>();
    for (const s of PIPELINE_STAGES) grouped.set(s.key, []);
    for (const c of clientsQ.data ?? []) {
      grouped.get(c.pipeline_stage as PipelineStage)?.push(c);
    }
    return grouped;
  }, [clientsQ.data]);

  function handleDrop(stage: PipelineStage) {
    if (!draggingId) return;
    const current = clientsQ.data?.find((c) => c.id === draggingId);
    setDraggingId(null);
    setOverStage(null);
    if (!current || current.pipeline_stage === stage) return;
    const order = (columns.get(stage)?.length ?? 0);
    move.mutate({ id: draggingId, stage, order });
  }

  return (
    <div className="p-8 space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Fluxo comercial</p>
          <h1 className="text-3xl font-serif">Pipeline</h1>
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <KanbanSquare className="h-4 w-4" /> Arraste os cards entre as colunas
        </div>
      </header>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {PIPELINE_STAGES.map((s) => {
          const items = columns.get(s.key) ?? [];
          const isOver = overStage === s.key;
          return (
            <div
              key={s.key}
              onDragOver={(e) => { e.preventDefault(); setOverStage(s.key); }}
              onDragLeave={() => setOverStage((v) => (v === s.key ? null : v))}
              onDrop={() => handleDrop(s.key)}
              className={`w-72 shrink-0 rounded-xl border bg-muted/30 p-3 transition-colors ${isOver ? "bg-accent/50 border-primary/40" : ""}`}
            >
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-sm font-medium">{s.label}</h2>
                <Badge variant="outline" className="text-xs">{items.length}</Badge>
              </div>
              <div className="space-y-2 min-h-16">
                {items.map((c) => (
                  <Card
                    key={c.id}
                    draggable
                    onDragStart={() => setDraggingId(c.id)}
                    onDragEnd={() => { setDraggingId(null); setOverStage(null); }}
                    onClick={() => setOpenId(c.id)}
                    className={`p-3 cursor-pointer hover:shadow-sm transition ${draggingId === c.id ? "opacity-50" : ""}`}
                  >
                    <p className="font-medium text-sm truncate">{c.name}</p>

                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">{c.type}</Badge>
                      <Badge
                        variant={c.status === "ativo" ? "default" : "secondary"}
                        className="text-[10px] px-1.5 py-0"
                      >
                        {c.status}
                      </Badge>
                      {c.categories && (
                        <span
                          className="inline-flex items-center text-[10px] px-1.5 py-0 rounded-full border"
                          style={{ borderColor: c.categories.color, color: c.categories.color }}
                        >
                          {c.categories.name}
                        </span>
                      )}
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
                          {c.last_contact_at && (
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(c.last_contact_at).toLocaleDateString("pt-BR")}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </Card>
                ))}
                {items.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-6">Vazio</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <ClientDetailSheet clientId={openId} open={!!openId} onOpenChange={(o) => !o && setOpenId(null)} />
    </div>

  );
}
