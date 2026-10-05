import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { extractText } from "@/features/ai/lib/extract-text";

export const listDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { clientId: string }) =>
    z.object({ clientId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("documents")
      .select("*")
      .eq("client_id", data.clientId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createSignedUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        client_id: z.string().uuid(),
        file_name: z.string().min(1).max(255),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const safe = data.file_name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${context.userId}/${data.client_id}/${Date.now()}-${safe}`;
    const { data: signed, error } = await supabaseAdmin.storage
      .from("client-documents")
      .createSignedUploadUrl(path);
    if (error) throw new Error(error.message);
    return { path, token: signed.token, signedUrl: signed.signedUrl };
  });

export const registerDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        client_id: z.string().uuid(),
        name: z.string(),
        mime: z.string().optional(),
        size: z.number().optional(),
        path: z.string(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    // Insere o registro do documento
    const { data: row, error } = await context.supabase
      .from("documents")
      .insert({ ...data, user_id: context.userId })
      .select()
      .single();
    if (error) throw new Error(error.message);

    // Tenta extrair texto do arquivo para indexação pela IA
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: fileData, error: downloadError } = await supabaseAdmin.storage
        .from("client-documents")
        .download(data.path);
      if (!downloadError && fileData) {
        const buffer = Buffer.from(await fileData.arrayBuffer());
        const extracted = await extractText(buffer, data.mime ?? null);
        if (extracted !== null) {
          await context.supabase
            .from("documents")
            .update({ extracted_text: extracted })
            .eq("id", row.id);
          return { ...row, extracted_text: extracted };
        }
      }
    } catch {
      // Extração falhou — documento registrado sem texto indexado
    }

    return row;
  });

export const getDocumentUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: doc } = await context.supabase
      .from("documents")
      .select("path")
      .eq("id", data.id)
      .maybeSingle();
    if (!doc) throw new Error("Documento não encontrado");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage
      .from("client-documents")
      .createSignedUrl(doc.path, 60 * 10);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl };
  });

export const deleteDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: doc } = await context.supabase
      .from("documents")
      .select("path")
      .eq("id", data.id)
      .maybeSingle();
    if (doc?.path) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.storage.from("client-documents").remove([doc.path]);
    }
    const { error } = await context.supabase.from("documents").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
