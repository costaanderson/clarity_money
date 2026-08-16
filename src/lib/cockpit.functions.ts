import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { CLIENT_SOURCES, type ClientSource } from "@/lib/clients.functions";
import { PIPELINE_STAGES, type PipelineStage } from "@/lib/clients.functions";
import crypto from "crypto";

type OverviewInput = { from: string; to: string };

function hashToken(t: string) {
  return crypto.createHash("sha256").update(t).digest("hex");
}

export const getCockpitOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: OverviewInput) =>
    z.object({ from: z.string(), to: z.string() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const from = new Date(data.from);
    const to = new Date(data.to);

    // 1) clients created in period
    const { data: created, error: e1 } = await context.supabase
      .from("clients")
      .select("id,name,source,source_campaign,status,pipeline_stage,created_at")
      .gte("created_at", from.toISOString())
      .lte("created_at", to.toISOString())
      .neq("status", "arquivado");
    if (e1) throw new Error(e1.message);

    const createdIds = (created ?? []).map((c) => c.id);

    // 2) stage history for these clients — to detect who reached em_andamento or finalizado
    let closed: { client_id: string; changed_at: string }[] = [];
    if (createdIds.length > 0) {
      const { data: hist, error: e2 } = await context.supabase
        .from("client_stage_history")
        .select("client_id,stage,changed_at")
        .in("client_id", createdIds)
        .in("stage", ["em_andamento", "finalizado"])
        .order("changed_at", { ascending: true });
      if (e2) throw new Error(e2.message);
      const seen = new Set<string>();
      for (const r of hist ?? []) {
        if (!seen.has(r.client_id)) {
          seen.add(r.client_id);
          closed.push({ client_id: r.client_id, changed_at: r.changed_at });
        }
      }
    }
    const closedMap = new Map(closed.map((c) => [c.client_id, new Date(c.changed_at)]));

    // 3) all non-archived, non-finalizado clients — for active pipeline funnel snapshot
    const { data: allClients, error: e3 } = await context.supabase
      .from("clients")
      .select("id,source,pipeline_stage,status,created_at")
      .neq("status", "arquivado")
      .neq("pipeline_stage", "finalizado");
    if (e3) throw new Error(e3.message);

    // ---------- Aggregations ----------
    const sources: ClientSource[] = CLIENT_SOURCES.map((s) => s.key as ClientSource);

    // Leads por origem
    const byChannel = sources.map((s) => {
      const leadsInPeriod = (created ?? []).filter((c) => c.source === s);
      const closedInPeriod = leadsInPeriod.filter((c) => closedMap.has(c.id));
      const totalDays = closedInPeriod.reduce((acc, c) => {
        const closedAt = closedMap.get(c.id)!;
        const openedAt = new Date(c.created_at);
        return acc + (closedAt.getTime() - openedAt.getTime()) / (1000 * 60 * 60 * 24);
      }, 0);
      const conversion = leadsInPeriod.length
        ? closedInPeriod.length / leadsInPeriod.length
        : 0;
      const avgDays = closedInPeriod.length ? totalDays / closedInPeriod.length : null;
      return {
        source: s,
        label: CLIENT_SOURCES.find((c) => c.key === s)!.label,
        leads: leadsInPeriod.length,
        closed: closedInPeriod.length,
        conversion,
        avgDaysToClose: avgDays,
      };
    });

    // KPIs
    const totalLeads = created?.length ?? 0;
    const totalClosed = (created ?? []).filter((c) => closedMap.has(c.id)).length;
    const overallConv = totalLeads ? totalClosed / totalLeads : 0;
    const allAvg = (() => {
      const items = (created ?? []).filter((c) => closedMap.has(c.id));
      if (items.length === 0) return null;
      const sum = items.reduce((acc, c) => {
        const closedAt = closedMap.get(c.id)!;
        return acc + (closedAt.getTime() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24);
      }, 0);
      return sum / items.length;
    })();

    // Time series (daily leads per channel)
    const dayMs = 24 * 60 * 60 * 1000;
    const days: string[] = [];
    for (let t = new Date(from).setHours(0, 0, 0, 0); t <= to.getTime(); t += dayMs) {
      days.push(new Date(t).toISOString().slice(0, 10));
    }
    const timeseries = days.map((day) => {
      const row: Record<string, string | number> = { day };
      for (const s of sources) {
        row[s] = (created ?? []).filter(
          (c) => c.source === s && c.created_at.slice(0, 10) === day,
        ).length;
      }
      return row;
    });

    // Funnel per source (current snapshot, clients created in period only)
    const stages: PipelineStage[] = PIPELINE_STAGES.map((s) => s.key as PipelineStage);
    const funnel = sources.map((s) => {
      const inSource = (created ?? []).filter((c) => c.source === s);
      const counts = stages.map((st) => ({
        stage: st,
        label: PIPELINE_STAGES.find((p) => p.key === st)!.label,
        count: inSource.filter((c) => c.pipeline_stage === st).length,
      }));
      return {
        source: s,
        label: CLIENT_SOURCES.find((c) => c.key === s)!.label,
        stages: counts,
      };
    });

    // Campaigns table
    const campaignMap = new Map<string, { leads: number; closed: number }>();
    for (const c of created ?? []) {
      const key = `${c.source}::${c.source_campaign ?? "(sem campanha)"}`;
      const cur = campaignMap.get(key) ?? { leads: 0, closed: 0 };
      cur.leads += 1;
      if (closedMap.has(c.id)) cur.closed += 1;
      campaignMap.set(key, cur);
    }
    const campaigns = Array.from(campaignMap.entries()).map(([k, v]) => {
      const [source, name] = k.split("::");
      return {
        source: source as ClientSource,
        campaign: name,
        leads: v.leads,
        closed: v.closed,
        conversion: v.leads ? v.closed / v.leads : 0,
      };
    }).sort((a, b) => b.leads - a.leads);

    return {
      kpis: {
        totalLeads,
        totalClosed,
        conversion: overallConv,
        avgDaysToClose: allAvg,
      },
      byChannel,
      timeseries,
      funnel,
      campaigns,
      totalActive: (allClients ?? []).length,
    };
  });

// ---------- Lead intake tokens ----------

export const listIntakeTokens = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("lead_intake_tokens")
      .select("id,label,active,created_at,last_used_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createIntakeToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ label: z.string().min(1).max(80) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const raw = `lp_${crypto.randomBytes(24).toString("hex")}`;
    const token_hash = hashToken(raw);
    const { data: row, error } = await context.supabase
      .from("lead_intake_tokens")
      .insert({ label: data.label, token_hash, user_id: context.userId })
      .select("id,label,active,created_at")
      .single();
    if (error) throw new Error(error.message);
    // Return raw token only once
    return { ...row, token: raw };
  });

export const revokeIntakeToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("lead_intake_tokens")
      .update({ active: false })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
