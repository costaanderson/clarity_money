import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { type AiProvider, AI_DEFAULT_MODELS } from "./call-ai";

// ─── Busca status da config (nunca retorna a chave ao cliente) ────────────────

export const getUserAiConfigStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("profiles")
      .select("ai_provider, ai_model, ai_api_key")
      .eq("id", context.userId)
      .maybeSingle();

    const provider = (data as any)?.ai_provider as AiProvider | null;
    const model = (data as any)?.ai_model as string | null;
    const hasKey = !!((data as any)?.ai_api_key);

    return {
      provider: provider ?? null,
      model: model ?? (provider ? AI_DEFAULT_MODELS[provider] : null),
      hasKey,
    };
  });

// ─── Salva config do usuário ──────────────────────────────────────────────────

export const saveUserAiConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        provider: z.enum(["gemini", "claude", "openai"]),
        apiKey: z.string().min(1, "API key é obrigatória"),
        model: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const model = data.model?.trim() || AI_DEFAULT_MODELS[data.provider as AiProvider];

    const { error } = await context.supabase
      .from("profiles")
      .update({
        ai_provider: data.provider,
        ai_api_key: data.apiKey.trim(),
        ai_model: model,
      } as any)
      .eq("id", context.userId);

    if (error) throw new Error(error.message);
    return { ok: true, provider: data.provider, model };
  });

// ─── Remove config de IA do usuário ──────────────────────────────────────────

export const clearUserAiConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ ai_provider: null, ai_api_key: null, ai_model: null } as any)
      .eq("id", context.userId);

    if (error) throw new Error(error.message);
    return { ok: true };
  });
