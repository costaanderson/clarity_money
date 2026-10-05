import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { callAI, getCallableAiConfig } from "./call-ai";

type Kind = "resumo" | "mensagem" | "analise" | "briefing";

const SYSTEM_PROMPTS: Record<Kind, string> = {
  resumo:
    "Você é um assistente do planejador financeiro. Escreva um resumo objetivo, em português do Brasil, das notas e contextos do cliente. Destaque decisões financeiras em execução, dívidas, reservas e compromissos. Use bullet points curtos.",
  mensagem:
    "Você escreve mensagens curtas e humanas para reativar clientes de um planejador financeiro comportamental. Tom cordial, sem clichês, foco em progresso e próximo passo. Português do Brasil. Ofereça 2 variações (WhatsApp curto e Email um pouco mais formal). Nunca prometa retornos financeiros.",
  analise:
    "Você é um assistente com abordagem comportamental. Analise as notas do cliente e traga: gatilhos emocionais, padrões de comportamento com dinheiro, riscos de recaída e sugestões práticas para a próxima conversa. Português do Brasil, tom respeitoso, sem diagnóstico clínico.",
  briefing:
    "Você prepara briefings de reunião para o planejador financeiro. Gere: (1) contexto rápido do cliente, (2) status das decisões em execução, (3) 3 perguntas-chave para a reunião, (4) próximo passo sugerido. Português do Brasil, no máximo 250 palavras.",
};

export const generateAI = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        kind: z.enum(["resumo", "mensagem", "analise", "briefing"]),
        client_id: z.string().uuid(),
        extra_prompt: z.string().max(2000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const [{ data: client }, { data: notes }, { data: documents }] = await Promise.all([
      context.supabase.from("clients").select("*, categories(name)").eq("id", data.client_id).maybeSingle(),
      context.supabase
        .from("notes")
        .select("kind,content,created_at")
        .eq("client_id", data.client_id)
        .order("created_at", { ascending: false })
        .limit(50),
      context.supabase
        .from("documents")
        .select("name,extracted_text,created_at")
        .eq("client_id", data.client_id)
        .not("extracted_text", "is", null)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);
    if (!client) throw new Error("Cliente não encontrado");

    const hasNotes = (notes ?? []).length > 0;
    const hasDocs = (documents ?? []).length > 0;
    if (!hasNotes && !hasDocs) {
      throw new Error(
        "Adicione ao menos uma nota ou suba um documento indexável (transcrição ou resumo em texto) para gerar a análise.",
      );
    }

    const aiConfig = await getCallableAiConfig(context.userId);

    const docsSection =
      hasDocs
        ? [
            "",
            "--- Documentos indexados ---",
            ...(documents ?? []).map(
              (d) =>
                `[${d.name} — ${new Date(d.created_at).toLocaleDateString("pt-BR")}]\n${d.extracted_text}`,
            ),
          ]
        : [];

    const contextText = [
      `Cliente: ${client.name} (${client.type})`,
      client.email ? `Email: ${client.email}` : null,
      client.phone ? `Telefone: ${client.phone}` : null,
      client.status ? `Status: ${client.status}` : null,
      client.last_contact_at ? `Último contato: ${new Date(client.last_contact_at).toLocaleString("pt-BR")}` : "Sem contato registrado",
      "",
      "Notas e contextos (mais recentes primeiro):",
      ...(notes ?? []).map(
        (n) => `- [${n.kind}] ${new Date(n.created_at).toLocaleDateString("pt-BR")}: ${n.content}`,
      ),
      ...docsSection,
      data.extra_prompt ? `\nInstrução adicional do planejador: ${data.extra_prompt}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const output = await callAI(SYSTEM_PROMPTS[data.kind], contextText, aiConfig);

    await context.supabase.from("ai_generations").insert({
      user_id: context.userId,
      client_id: data.client_id,
      kind: data.kind,
      prompt: data.extra_prompt ?? null,
      output,
    });

    return { output };
  });

export const listAIGenerations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { clientId: string }) =>
    z.object({ clientId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("ai_generations")
      .select("*")
      .eq("client_id", data.clientId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
