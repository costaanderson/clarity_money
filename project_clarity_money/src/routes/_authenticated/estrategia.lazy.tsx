import { createLazyFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  generateStrategicPlan,
  getLatestStrategicPlan,
  listStrategicPlans,
  getStrategicPlanById,
  type StrategicPlanGoals,
  type StrategicPlan,
} from "@/features/strategy/lib/strategy.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Compass,
  Sparkles,
  Loader2,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  History,
  Target,
  TrendingUp,
  Calendar,
  HelpCircle,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { toast } from "sonner";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Route = (createLazyFileRoute as any)("/_authenticated/estrategia")({
  component: EstrategiaPage,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function currentQuarter(): { quarter: string; periodStart: string; periodEnd: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  const q = Math.floor(month / 3) + 1;
  const quarterStart = new Date(year, (q - 1) * 3, 1);
  const quarterEnd = new Date(year, q * 3, 0);

  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  return {
    quarter: `Q${q} ${year}`,
    periodStart: fmt(quarterStart),
    periodEnd: fmt(quarterEnd),
  };
}

function formatDate(dateStr: string) {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function EstrategiaPage() {
  const [view, setView] = useState<"plan" | "form" | "history">("plan");
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const qc = useQueryClient();

  const latestQ = useQuery({
    queryKey: ["strategic-plan-latest"],
    queryFn: () => getLatestStrategicPlan(),
    staleTime: 5 * 60_000,
  });

  const historyQ = useQuery({
    queryKey: ["strategic-plans-list"],
    queryFn: () => listStrategicPlans(),
    enabled: view === "history",
    staleTime: 60_000,
  });

  const selectedPlanQ = useQuery({
    queryKey: ["strategic-plan", selectedPlanId],
    queryFn: () => getStrategicPlanById({ data: { id: selectedPlanId! } }),
    enabled: !!selectedPlanId,
    staleTime: 10 * 60_000,
  });

  const activePlan = selectedPlanId ? selectedPlanQ.data : latestQ.data;
  const isLoadingPlan = selectedPlanId ? selectedPlanQ.isLoading : latestQ.isLoading;

  function handleSelectFromHistory(plan: StrategicPlan) {
    setSelectedPlanId(plan.id);
    setView("plan");
  }

  function handleNewPlan() {
    setSelectedPlanId(null);
    setView("form");
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      {/* Cabeçalho */}
      <header className="space-y-1">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Compass className="h-5 w-5 text-primary" />
            <h1 className="text-3xl font-serif">Estratégia</h1>
          </div>
          <div className="flex items-center gap-2">
            {view !== "history" && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setView("history")}
              >
                <History className="h-3.5 w-3.5" />
                Histórico
              </Button>
            )}
            {view === "history" && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setView("plan")}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Voltar
              </Button>
            )}
            {view !== "form" && (
              <Button size="sm" className="gap-1.5" onClick={handleNewPlan}>
                <Sparkles className="h-3.5 w-3.5" />
                Novo plano
              </Button>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Planejamento estratégico de 90 dias gerado com IA a partir dos dados reais do seu negócio.
        </p>
      </header>

      {/* Conteúdo */}
      {view === "form" && (
        <PlanForm
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ["strategic-plan-latest"] });
            qc.invalidateQueries({ queryKey: ["strategic-plans-list"] });
            setSelectedPlanId(null);
            setView("plan");
          }}
          onCancel={() => setView("plan")}
        />
      )}

      {view === "plan" && (
        <PlanView plan={activePlan ?? null} isLoading={isLoadingPlan} onNew={handleNewPlan} />
      )}

      {view === "history" && (
        <HistoryView
          plansQ={historyQ}
          onSelect={handleSelectFromHistory}
        />
      )}
    </div>
  );
}

// ─── PlanForm ─────────────────────────────────────────────────────────────────

const BLANK_GOALS: StrategicPlanGoals = {
  mrrCurrent: 0,
  mrrTarget: 0,
  mainGoal: "",
  constraints: "",
};

function PlanForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const defaultPeriod = currentQuarter();
  const [quarter, setQuarter] = useState(defaultPeriod.quarter);
  const [periodStart, setPeriodStart] = useState(defaultPeriod.periodStart);
  const [periodEnd, setPeriodEnd] = useState(defaultPeriod.periodEnd);
  const [goals, setGoals] = useState<StrategicPlanGoals>(BLANK_GOALS);

  const generate = useMutation({
    mutationFn: () =>
      generateStrategicPlan({ data: { quarter, periodStart, periodEnd, goals } }),
    onSuccess,
    onError: (e: Error) => toast.error(e.message),
  });

  const canSubmit =
    quarter.trim() &&
    periodStart &&
    periodEnd &&
    goals.mrrCurrent >= 0 &&
    goals.mrrTarget > 0 &&
    goals.mainGoal.trim();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-serif flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          Definir metas do trimestre
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Período */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>Trimestre</Label>
            <Input
              placeholder="Ex.: Q4 2026"
              value={quarter}
              onChange={(e) => setQuarter(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Início</Label>
            <Input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Fim</Label>
            <Input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
            />
          </div>
        </div>

        {/* MRR */}
        <TooltipProvider>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Label>MRR atual (R$)</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[260px] text-xs">
                    <p>
                      <strong>MRR (Monthly Recurring Revenue)</strong> — receita mensal recorrente.
                      É a soma das mensalidades fixas dos seus clientes ativos neste mês.
                      Não inclui cobranças avulsas ou únicas.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                type="number"
                min={0}
                placeholder="Ex.: 8000"
                value={goals.mrrCurrent || ""}
                onChange={(e) => setGoals({ ...goals, mrrCurrent: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Label>MRR alvo ao fim do trimestre (R$)</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[260px] text-xs">
                    <p>
                      Qual MRR você quer atingir ao final do trimestre?
                      Esse número ancora o plano — a IA vai calcular quantos clientes
                      novos você precisa fechar para chegar lá.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                type="number"
                min={0}
                placeholder="Ex.: 15000"
                value={goals.mrrTarget || ""}
                onChange={(e) => setGoals({ ...goals, mrrTarget: Number(e.target.value) })}
              />
            </div>
          </div>
        </TooltipProvider>

        {/* Objetivo principal */}
        <div className="space-y-1.5">
          <Label>Objetivo principal do trimestre</Label>
          <Textarea
            placeholder="Ex.: Dobrar o número de clientes ativos de 8 para 16, focando em PF com renda acima de R$ 10k."
            rows={3}
            value={goals.mainGoal}
            onChange={(e) => setGoals({ ...goals, mainGoal: e.target.value })}
          />
        </div>

        {/* Limitações */}
        <div className="space-y-1.5">
          <Label>
            Limitações ou contexto relevante{" "}
            <span className="text-muted-foreground font-normal">(opcional)</span>
          </Label>
          <Textarea
            placeholder="Ex.: Vou tirar 2 semanas de férias em dezembro. Não quero atender mais de 20 clientes simultâneos."
            rows={2}
            value={goals.constraints}
            onChange={(e) => setGoals({ ...goals, constraints: e.target.value })}
          />
        </div>

        {/* Info: dados automáticos */}
        <div className="rounded-lg bg-muted/50 border border-dashed p-3 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground/70">Dados coletados automaticamente do sistema:</p>
          <p>Clientes ativos (PF/PJ) · Leads no pipeline · Novos leads (30 dias) · Distribuição por estágio e origem</p>
        </div>

        {/* Ações */}
        <div className="flex items-center justify-end gap-3 pt-1">
          <Button variant="outline" onClick={onCancel} disabled={generate.isPending}>
            Cancelar
          </Button>
          <Button
            disabled={!canSubmit || generate.isPending}
            onClick={() => generate.mutate()}
            className="gap-1.5"
          >
            {generate.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {generate.isPending ? "Gerando plano…" : "Gerar plano estratégico"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── PlanView ─────────────────────────────────────────────────────────────────

function PlanView({
  plan,
  isLoading,
  onNew,
}: {
  plan: StrategicPlan | null | undefined;
  isLoading: boolean;
  onNew: () => void;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 space-y-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
          <Skeleton className="h-32 w-full mt-4" />
        </CardContent>
      </Card>
    );
  }

  if (!plan) {
    return (
      <Card>
        <CardContent className="p-10 text-center space-y-4">
          <Compass className="h-10 w-10 mx-auto text-muted-foreground/40" />
          <div>
            <p className="text-sm font-medium">Nenhum plano estratégico ainda</p>
            <p className="text-xs text-muted-foreground mt-1">
              Defina suas metas e a IA vai gerar um plano de 90 dias com base nos dados reais do seu negócio.
            </p>
          </div>
          <Button onClick={onNew} className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            Criar primeiro plano
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Cabeçalho do plano */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono text-xs">
                  {plan.quarter}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3 inline mr-1" />
                  {formatDate(plan.periodStart)} – {formatDate(plan.periodEnd)}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground pt-0.5">
                <span>
                  <TrendingUp className="h-3 w-3 inline mr-1" />
                  MRR {plan.goals.mrrCurrent.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} →{" "}
                  {plan.goals.mrrTarget.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
                <span className="text-muted-foreground/50">·</span>
                <span>Gerado {formatDateTime(plan.createdAt)}</span>
              </div>
              <p className="text-sm text-foreground/80 mt-1">{plan.goals.mainGoal}</p>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={onNew}>
              <RefreshCw className="h-3.5 w-3.5" />
              Novo plano
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Conteúdo do plano */}
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="text-sm leading-relaxed whitespace-pre-wrap font-mono text-foreground/90 bg-muted/30 rounded-lg p-4 max-h-[70vh] overflow-y-auto">
            {plan.content}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── HistoryView ──────────────────────────────────────────────────────────────

function HistoryView({
  plansQ,
  onSelect,
}: {
  plansQ: ReturnType<typeof useQuery<StrategicPlan[]>>;
  onSelect: (plan: StrategicPlan) => void;
}) {
  const plans = plansQ.data ?? [];

  if (plansQ.isLoading) {
    return (
      <Card>
        <CardContent className="p-6 space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (plans.length === 0) {
    return (
      <Card>
        <CardContent className="p-10 text-center">
          <History className="h-8 w-8 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum plano anterior encontrado.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-serif flex items-center gap-2">
          <History className="h-4 w-4" />
          Histórico de planos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {plans.map((plan, i) => (
          <button
            key={plan.id}
            onClick={() => onSelect(plan)}
            className="w-full text-left rounded-lg border p-3 hover:bg-muted/50 transition-colors group"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant={i === 0 ? "default" : "secondary"} className="text-[10px] shrink-0">
                    {i === 0 ? "Mais recente" : plan.quarter}
                  </Badge>
                  {i === 0 && (
                    <span className="text-xs text-muted-foreground">{plan.quarter}</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {formatDate(plan.periodStart)} – {formatDate(plan.periodEnd)}
                  {" · "}
                  R$ {plan.goals.mrrCurrent.toLocaleString("pt-BR")} →{" "}
                  R$ {plan.goals.mrrTarget.toLocaleString("pt-BR")}
                </p>
                <p className="text-xs text-foreground/70 truncate">{plan.goals.mainGoal}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-foreground transition-colors" />
            </div>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
