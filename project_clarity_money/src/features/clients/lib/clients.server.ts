import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { clientSchema } from "./clients.schemas";

export const listClients = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { status?: string; search?: string; categoryId?: string } | undefined) =>
      input ?? {},
  )
  .handler(async ({ data, context }) => {
    const hasCategory = !!data.categoryId;
    const selectStr = hasCategory
      ? "*, client_categories!inner(category_id, categories(id,name,color))"
      : "*, client_categories(category_id, categories(id,name,color))";

    let q = context.supabase
      .from("clients")
      .select(selectStr)
      .order("updated_at", { ascending: false });

    if (data.status && data.status !== "all")
      q = q.eq("status", data.status as "lead" | "ativo" | "arquivado");
    if (data.categoryId) q = q.eq("client_categories.category_id", data.categoryId);
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
      .select("*, client_categories(category_id, categories(id,name,color))")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const createClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => clientSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { category_ids, category_id: _deprecated, ...clientData } = data;
    const payload = {
      ...clientData,
      email: clientData.email || null,
      phone: clientData.phone || null,
      document: clientData.document || null,
      category_id: null,
      source_campaign: clientData.source_campaign || null,
      birthday: clientData.birthday || null,
      important_dates: clientData.important_dates ?? null,
      user_id: context.userId,
    };
    const { data: row, error } = await context.supabase
      .from("clients")
      .insert(payload)
      .select()
      .single();
    if (error) throw new Error(error.message);

    if (category_ids && category_ids.length > 0) {
      await context.supabase.from("client_categories").insert(
        category_ids.map((cid) => ({
          client_id: row.id,
          category_id: cid,
          user_id: context.userId,
        })),
      );
    }

    return row;
  });

export const updateClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    clientSchema.partial().extend({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { id, category_ids, category_id: _deprecated, ...rest } = data;
    const { data: row, error } = await context.supabase
      .from("clients")
      .update(rest)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateClientCategories = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ clientId: z.string().uuid(), categoryIds: z.array(z.string().uuid()) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await context.supabase
      .from("client_categories")
      .delete()
      .eq("client_id", data.clientId);

    if (data.categoryIds.length > 0) {
      const { error } = await context.supabase.from("client_categories").insert(
        data.categoryIds.map((cid) => ({
          client_id: data.clientId,
          category_id: cid,
          user_id: context.userId,
        })),
      );
      if (error) throw new Error(error.message);
    }

    return { ok: true };
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
