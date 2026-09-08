import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callAI, getCallableAiConfig } from "@/features/ai/lib/call-ai";
import { STRATEGY_SYSTEM_PROMPT } from "./strategy-system-prompt";

// ─── Types ────────────────────────────────────────────────────────────────────

export type StrategicPlanGoals = {
  mrrCurrent: number;
  mrrTarget: number;
  mainGoal: string;
  constraints: string;
};

export type StrategicPlan = {
  id: string;
  quarter: string;
  periodStart: string;
  periodEnd: string;
  goals: StrategicPlanGoals;
  snapshot: Record<string, unknown>;
  content: string;
  createdAt: string;
};

// ─── Server Functions ─────────────────────────────────────────────────────────

/**
 * Gera um plano estratégico de 90 dias com base nos dados reais do negócio
 * e nas metas declaradas pelo planejador.
 */
export const generateStrategicPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (data: {
      quarter: string;
      periodStart: string;
      periodEnd: string;
      goals: StrategicPlanGoals;
    }) => data,
  )
  .handler(async ({ context, data }): Promise<StrategicPlan> => {
    // ── 1. Snapshot: clientes ativos ──────────────────────────────────────────
    const { data: clients } = await context.supabase
      .from("clients")
      .select("id, type, status")
      .eq("user_id", context.userId)
      .in("status", ["ativo", "lead"]);

    const activeClients = (clients ?? []).filter((c) => c.status === "ativo");
    const pjCount = activeClients.filter((c) => c.type === "PJ").length;
    const pfCount = activeClients.filter((c) => c.type === "PF").length;
    const leadsTotal = (clients ?? []).filter((c) => c.status === "lead").length;

    // ── 2. Snapshot: novos leads últimos 30 dias ──────────────────────────────
    const since30d = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const { data: newLeads } = await context.supabase
      .from("clients")
      .select("id, source, utm_source, created_at")
      .eq("user_id", context.userId)
      .eq("status", "lead")
      .gte("created_at", since30d);

    const sourceDistribution: Record<string, number> = {};
    for (const lead of newLeads ?? []) {
      const src = lead.source ?? lead.utm_source ?? "direto";
      sourceDistribution[src] = (sourceDistribution[src] ?? 0) + 1;
    }

    // ── 3. Snapshot: distribuição por estágio do pipeline ─────────────────────
    const { data: pipeline } = await context.supabase
      .from("clients")
      .select("pipeline_stage")
      .eq("user_id", context.userId)
      .eq("status", "lead");

    const stageDistribution: Record<string, number> = {};
    for (const c of pipeline ?? []) {
      const stage = (c as any).pipeline_stage ?? "sem_estágio";
      stageDistribution[stage] = (stageDistribution[stage] ?? 0) + 1;
    }

    // ── 4. Snapshot: tarefas em aberto ────────────────────────────────────────
    const { count: openTasks } = await context.supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.userId)
      .eq("status", "open");

    const snapshot = {
      activeClients: activeClients.length,
      pfCount,
      pjCount,
      leadsTotal,
      newLeadsLast30d: (newLeads ?? []).length,
      openTasks: openTasks ?? 0,
      stageDistribution,
      sourceDistribution,
    };

    // ── 5. Montar userMessage ─────────────────────────────────────────────────
    const lines: string[] = [
      `Trimestre: ${data.quarter}`,
      `Período: ${data.periodStart} a ${data.periodEnd}`,
      "",
      "─── SITUAÇÃO ATUAL DO NEGÓCIO ───",
      `Clientes ativos: ${activeClients.length} (${pfCount} PF · ${pjCount} PJ)`,
      `Leads no pipeline: ${leadsTotal}`,
      `Novos leads (últimos 30 dias): ${(newLeads ?? []).length}`,
      `Tarefas em aberto: ${openTasks ?? 0}`,
      "",
    ];

    if (Object.keys(stageDistribution).length > 0) {
      lines.push("Pipeline por estágio:");
      for (const [stage, count] of Object.entries(stageDistribution)) {
        lines.push(`  ${stage}: ${count}`);
      }
      lines.push("");
    }

    if (Object.keys(sourceDistribution).length > 0) {
      lines.push("Origem dos leads (30 dias):");
      for (const [src, count] of Object.entries(sourceDistribution)) {
        lines.push(`  ${src}: ${count}`);
      }
      lines.push("");
    }

    lines.push(
      "─── METAS DECLARADAS ───",
      `MRR atual: R$ ${data.goals.mrrCurrent.toLocaleString("pt-BR")}`,
      `MRR alvo (fim do trimestre): R$ ${data.goals.mrrTarget.toLocaleString("pt-BR")}`,
      `Objetivo principal: ${data.goals.mainGoal}`,
    );

    if (data.goals.constraints.trim()) {
      lines.push(`Limitações / contexto: ${data.goals.constraints}`);
    }

    const userMessage = lines.join("\n");

    // ── 6. Chamar IA ──────────────────────────────────────────────────────────
    const aiConfig = await getCallableAiConfig(context.userId);
    const content = await callAI(STRATEGY_SYSTEM_PROMPT, userMessage, aiConfig);

    // ── 7. Persistir ──────────────────────────────────────────────────────────
    const { data: saved, error } = await context.supabase
      .from("strategic_plans" as any)
      .insert({
        user_id: context.userId,
        quarter: data.quarter,
        period_start: data.periodStart,
        period_end: data.periodEnd,
        goals: data.goals,
        snapshot,
        content,
      })
      .select()
      .single();

    if (error) throw new Error(`Erro ao salvar plano: ${error.message}`);

    return {
      id: (saved as any).id,
      quarter: (saved as any).quarter,
      periodStart: (saved as any).period_start,
      periodEnd: (saved as any).period_end,
      goals: (saved as any).goals,
      snapshot: (saved as any).snapshot,
      content: (saved as any).content,
      createdAt: (saved as any).created_at,
    };
  });

/**
 * Retorna o plano estratégico mais recente do usuário.
 */
export const getLatestStrategicPlan = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StrategicPlan | null> => {
    const { data } = await context.supabase
      .from("strategic_plans" as any)
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) return null;

    return {
      id: (data as any).id,
      quarter: (data as any).quarter,
      periodStart: (data as any).period_start,
      periodEnd: (data as any).period_end,
      goals: (data as any).goals,
      snapshot: (data as any).snapshot,
      content: (data as any).content,
      createdAt: (data as any).created_at,
    };
  });

/**
 * Lista os planos estratégicos do usuário (mais recentes primeiro).
 */
export const listStrategicPlans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StrategicPlan[]> => {
    const { data } = await context.supabase
      .from("strategic_plans" as any)
      .select("id, quarter, period_start, period_end, goals, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(10);

    return (data ?? []).map((r: any) => ({
      id: r.id,
      quarter: r.quarter,
      periodStart: r.period_start,
      periodEnd: r.period_end,
      goals: r.goals,
      snapshot: {},
      content: "",
      createdAt: r.created_at,
    }));
  });

/**
 * Retorna um plano específico pelo ID.
 */
export const getStrategicPlanById = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: { id: string }) => data)
  .handler(async ({ context, data }): Promise<StrategicPlan | null> => {
    const { data: row } = await context.supabase
      .from("strategic_plans" as any)
      .select("*")
      .eq("user_id", context.userId)
      .eq("id", data.id)
      .maybeSingle();

    if (!row) return null;

    return {
      id: (row as any).id,
      quarter: (row as any).quarter,
      periodStart: (row as any).period_start,
      periodEnd: (row as any).period_end,
      goals: (row as any).goals,
      snapshot: (row as any).snapshot,
      content: (row as any).content,
      createdAt: (row as any).created_at,
    };
  });
