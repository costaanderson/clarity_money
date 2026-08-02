import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const CLIENT_SOURCES = [
  { key: "instagram", label: "Instagram" },
  { key: "google_ads", label: "Google Ads" },
  { key: "landing_page", label: "Landing Page" },
  { key: "indicacao", label: "Indicação" },
  { key: "outro", label: "Manual / Outro" },
] as const;
export type ClientSource = typeof CLIENT_SOURCES[number]["key"];

const clientSchema = z.object({
  type: z.enum(["PF", "PJ"]),
  name: z.string().min(1).max(200),
  email: z.string().email().max(255).optional().or(z.literal("")),
  phone: z.string().max(50).optional().or(z.literal("")),
  document: z.string().max(50).optional().or(z.literal("")),
  status: z.enum(["lead", "ativo", "arquivado"]).default("lead"),
  category_id: z.string().uuid().nullable().optional(),
  source: z.enum(["instagram", "google_ads", "landing_page", "indicacao", "outro"]).default("outro"),
  source_campaign: z.string().max(120).optional().or(z.literal("")),
  pipeline_stage: z.enum(["novo", "primeiro_contato", "reuniao_agendada", "reuniao_realizada", "fechamento", "contrato_enviado", "em_andamento"]).optional(),
});

export const listClients = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { status?: string; search?: string; categoryId?: string } | undefined) => input ?? {})
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("clients")
      .select("*, categories(id,name,color)")
      .order("updated_at", { ascending: false });
    if (data.status && data.status !== "all") q = q.eq("status", data.status as "lead" | "ativo" | "arquivado");
    if (data.categoryId) q = q.eq("category_id", data.categoryId);
    if (data.search) q = q.ilike("name", `%${data.search}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getClient = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("clients")
      .select("*, categories(id,name,color)")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const createClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => clientSchema.parse(input))
  .handler(async ({ data, context }) => {
    const payload = {
      ...data,
      email: data.email || null,
      phone: data.phone || null,
      document: data.document || null,
      category_id: data.category_id || null,
      source_campaign: data.source_campaign || null,
      user_id: context.userId,
    };
    const { data: row, error } = await context.supabase.from("clients").insert(payload).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    clientSchema.partial().extend({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const { data: row, error } = await context.supabase
      .from("clients")
      .update(rest)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const archiveClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("clients")
      .update({ status: "arquivado" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const restoreClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("clients")
      .update({ status: "ativo" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const markContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("clients")
      .update({ last_contact_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const PIPELINE_STAGES = [
  { key: "novo", label: "Novo" },
  { key: "primeiro_contato", label: "Primeiro contato" },
  { key: "reuniao_agendada", label: "Reunião agendada" },
  { key: "reuniao_realizada", label: "Reunião realizada" },
  { key: "fechamento", label: "Fechamento" },
  { key: "contrato_enviado", label: "Contrato enviado" },
  { key: "em_andamento", label: "Em andamento" },
] as const;

export type PipelineStage = typeof PIPELINE_STAGES[number]["key"];

const pipelineStageEnum = z.enum([
  "novo","primeiro_contato","reuniao_agendada","reuniao_realizada","fechamento","contrato_enviado","em_andamento",
]);

export const listPipeline = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("clients")
      .select("id,name,type,status,pipeline_stage,pipeline_order,last_contact_at,category_id,source,source_campaign,categories(id,name,color)")
      .neq("status", "arquivado")
      .order("pipeline_order", { ascending: true })
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const moveClientStage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      id: z.string().uuid(),
      stage: pipelineStageEnum,
      order: z.number().int().min(0).default(0),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("clients")
      .update({ pipeline_stage: data.stage, pipeline_order: data.order })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
