import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const pipelineStageEnum = z.enum([
  "novo",
  "primeiro_contato",
  "reuniao_agendada",
  "reuniao_realizada",
  "fechamento",
  "contrato_enviado",
  "em_andamento",
  "finalizado",
]);

export const listPipeline = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { includeFinalized?: boolean } | undefined) => input ?? {})
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("clients")
      .select(
        "id,name,type,status,pipeline_stage,pipeline_order,last_contact_at,finalized_at,category_id,source,source_campaign,categories(id,name,color)",
      )
      .neq("status", "arquivado")
      .order("pipeline_order", { ascending: true })
      .order("updated_at", { ascending: false });
    if (!data.includeFinalized) {
      q = q.neq("pipeline_stage", "finalizado");
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
        stage: pipelineStageEnum,
        order: z.number().int().min(0).default(0),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const update = {
      pipeline_stage: data.stage,
      pipeline_order: data.order,
      finalized_at: data.stage === "finalizado" ? new Date().toISOString() : null,
    };
    const { error } = await context.supabase
      .from("clients")
      .update(update)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
