import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

function toSlug(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 60);
}

// ── Etapas dinâmicas ──────────────────────────────────────────────────────────

export const listPipelineStages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("pipeline_stages")
      .select("id,label,slug,position,is_won")
      .order("position", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createPipelineStage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ label: z.string().min(1).max(80), is_won: z.boolean().default(false) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const slug = toSlug(data.label);

    // posição = após a última etapa existente
    const { data: last } = await context.supabase
      .from("pipeline_stages")
      .select("position")
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    const position = (last?.position ?? -1) + 1;

    const { data: row, error } = await context.supabase
      .from("pipeline_stages")
      .insert({ label: data.label, slug, position, is_won: data.is_won, user_id: context.userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updatePipelineStage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        label: z.string().min(1).max(80).optional(),
        position: z.number().int().min(0).optional(),
        is_won: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const { error } = await context.supabase
      .from("pipeline_stages")
      .update(rest)
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePipelineStage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), slug: z.string() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    // Bloqueia se houver clientes nessa etapa
    const { count } = await context.supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("pipeline_stage", data.slug)
      .eq("user_id", context.userId);

    if ((count ?? 0) > 0) {
      throw new Error(
        `Essa etapa tem ${count} cliente${count === 1 ? "" : "s"}. Mova-${count === 1 ? "o" : "os"} antes de apagar.`,
      );
    }

    const { error } = await context.supabase
      .from("pipeline_stages")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ── Pipeline board ────────────────────────────────────────────────────────────

export const listPipeline = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { includeWon?: boolean } | undefined) => input ?? {})
  .handler(async ({ data, context }) => {
    // Busca etapas vencedoras do usuário para filtrar quando necessário
    const { data: wonStages } = await context.supabase
      .from("pipeline_stages")
      .select("slug")
      .eq("is_won", true);
    const wonSlugs = (wonStages ?? []).map((s) => s.slug);

    let q = context.supabase
      .from("clients")
      .select(
        "id,name,type,status,pipeline_stage,pipeline_order,last_contact_at,finalized_at,source,source_campaign,client_categories(category_id,categories(id,name,color))",
      )
      .neq("status", "arquivado")
      .order("pipeline_order", { ascending: true })
      .order("updated_at", { ascending: false });

    if (!data.includeWon && wonSlugs.length > 0) {
      q = q.not("pipeline_stage", "in", `(${wonSlugs.map((s) => `"${s}"`).join(",")})`);
    }

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const moveClientStage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        stage: z.string().min(1),
        order: z.number().int().min(0).default(0),
        isWon: z.boolean().default(false),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("clients")
      .update({
        pipeline_stage: data.stage,
        pipeline_order: data.order,
        finalized_at: data.isWon ? new Date().toISOString() : null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const bulkMoveClientStage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        ids: z.array(z.string().uuid()).min(1),
        stage: z.string().min(1),
        isWon: z.boolean().default(false),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("clients")
      .update({
        pipeline_stage: data.stage,
        finalized_at: data.isWon ? new Date().toISOString() : null,
      })
      .in("id", data.ids);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
