/**
 * Camada de abstração de IA.
 * Suporta Gemini (Google AI), Claude (Anthropic) e OpenAI.
 * Cada usuário pode configurar seu próprio provider + API key + modelo.
 * Fallback: GOOGLE_AI_API_KEY do ambiente com gemini-3.6-flash.
 */

export type AiProvider = "gemini" | "claude" | "openai";

export type UserAiConfig = {
  provider: AiProvider;
  apiKey: string;
  model: string;
};

export const AI_PROVIDER_LABELS: Record<AiProvider, string> = {
  gemini: "Google Gemini",
  claude: "Anthropic Claude",
  openai: "OpenAI",
};

export const AI_DEFAULT_MODELS: Record<AiProvider, string> = {
  gemini: "gemini-3.6-flash",
  claude: "claude-sonnet-4-6",
  openai: "gpt-4o",
};

// ─── Busca config do usuário no banco (server-only) ───────────────────────────

export async function getCallableAiConfig(userId: string): Promise<UserAiConfig | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data } = await supabaseAdmin
    .from("profiles")
    .select("ai_provider, ai_api_key, ai_model")
    .eq("id", userId)
    .maybeSingle();

  const provider = (data as any)?.ai_provider as AiProvider | null;
  const apiKey = (data as any)?.ai_api_key as string | null;
  const model = (data as any)?.ai_model as string | null;

  if (!provider || !apiKey) return null;

  return {
    provider,
    apiKey,
    model: model || AI_DEFAULT_MODELS[provider],
  };
}

// ─── Retry com backoff para erros transitórios (503, 529) ────────────────────

const RETRYABLE_STATUSES = new Set([503, 529]);
const MAX_RETRIES = 3;

async function withRetry(fn: () => Promise<string>): Promise<string> {
  let lastError: Error = new Error("Erro desconhecido");
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err as Error;
      const status = (err as any)._status as number | undefined;
      if (!status || !RETRYABLE_STATUSES.has(status) || attempt === MAX_RETRIES) break;
      // Backoff: 2s, 4s, 8s
      await new Promise((r) => setTimeout(r, 2_000 * Math.pow(2, attempt)));
    }
  }
  throw lastError;
}

function makeAiError(status: number, text: string): Error {
  if (status === 429) return new Error("Limite de requisições da IA. Tente em instantes.");
  if (status === 401) return new Error("API key inválida. Verifique nas Configurações.");
  if (RETRYABLE_STATUSES.has(status))
    return Object.assign(
      new Error("A IA está sobrecarregada no momento. Tente novamente em alguns segundos."),
      { _status: status },
    );
  return new Error(`Falha na IA (${status}): ${text.slice(0, 300)}`);
}

// ─── Chamada unificada ────────────────────────────────────────────────────────

export async function callAI(
  system: string,
  user: string,
  config?: UserAiConfig | null,
): Promise<string> {
  // Resolve config: usa a do usuário ou fallback para variável de ambiente
  const provider: AiProvider = config?.provider ?? "gemini";
  const model = config?.model || AI_DEFAULT_MODELS[provider];
  const apiKey = config?.apiKey || process.env.GOOGLE_AI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Nenhuma chave de IA configurada. Configure sua API key nas Configurações do app.",
    );
  }

  if (provider === "claude") {
    return withRetry(() => callClaude(system, user, model, apiKey));
  }

  // Gemini e OpenAI usam endpoint OpenAI-compatible
  const url =
    provider === "gemini"
      ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
      : "https://api.openai.com/v1/chat/completions";

  return withRetry(async () => {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!res.ok) {
      throw makeAiError(res.status, await res.text());
    }

    const json = await res.json();
    return json.choices?.[0]?.message?.content ?? "";
  });
}

async function callClaude(
  system: string,
  user: string,
  model: string,
  apiKey: string,
): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });

  if (!res.ok) {
    throw makeAiError(res.status, await res.text());
  }

  const json = await res.json();
  return (json.content as { type: string; text: string }[])?.[0]?.text ?? "";
}
