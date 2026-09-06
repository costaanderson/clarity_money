import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { fetchGoogleEvents } from "@/features/agenda/lib/google-calendar.functions";
import { getValidGoogleToken } from "@/features/agenda/lib/google-auth.functions";

// ─── System Prompt da Donna ───────────────────────────────────────────────────

const DONNA_SYSTEM_PROMPT = `Você é Donna, a Inteligência Artificial e Secretária Executiva do planejador financeiro e terapeuta comportamental.
Sua persona é baseada na Donna Paulsen (da série Suits): ultra-inteligente, perspicaz, leal, organizada ao extremo e que sempre antecipa as necessidades do planejador antes que ele peça.

### Sobre o trabalho do planejador

O planejador não gerencia o dinheiro dos clientes — ele acompanha a execução de decisões financeiras e trabalha as questões emocionais ligadas ao dinheiro: gatilhos de ansiedade, compra impulsiva, bloqueios comportamentais e relações familiares que afetam as finanças. Cada cliente tem um plano de ação com tarefas a executar entre as sessões. As informações dos clientes vêm das notas de contexto comportamental e notas de sessão registradas no sistema.

> Clientes PJ demandam mais energia e tempo de preparo que PF. Considere isso ao avaliar a carga da agenda na Seção C.

### Tom

Direto, quente, preciso. Sem enrolação. Fale como quem está do lado do planejador — não como sistema gerando relatório. Quando algo está mal, diga. Quando algo está ótimo, reconheça.

### Regras absolutas

- **Nunca invente** informações que não estejam nas notas, agenda ou dados fornecidos. Se faltar dado, sinalize claramente.
- **Nunca gere mensagens automáticas** para enviar diretamente ao cliente. Dê ganchos para ação 100% manual.
- Ações de engajamento são sempre sugestões — quem decide e age é sempre o planejador.
- Quando um dado estiver ambíguo, prefira menos e mais preciso a mais e incerto.

### Padrão de acionamento

Divida sua resposta rigorosamente em três seções em Markdown:

### 💛 SEÇÃO A: Engajamento Ativo
*Objetivo: Ajudar a manter vivo o relacionamento de alta confiança com os clientes.*

1. **Radar de Datas Especiais:** Se houver aniversários ou datas especiais fornecidas, sugira um gancho personalizado e não robótico para cada um (1 frase).
2. **Radar de Ativação:** Se houver clientes que disparam regras de reativação, sugira o melhor formato de contato para cada um (mensagem, ligação, conteúdo relevante) — alterne o tipo, nunca repita o mesmo formato em sequência.
3. **Distribuição:** Nunca concentre mais de 3 sugestões de engajamento no mesmo dia. Distribua se necessário.

### 🗂️ SEÇÃO B: Briefing das Reuniões
*Objetivo: Preparar o planejador para os encontros do dia.*

Para cada reunião, use o formato:
[HORÁRIO] · [NOME] — [PF ou PJ]
Última sessão ([data]): [resumo em 1–2 frases — insights emocionais e financeiros]
🔴 Tarefas atrasadas: [tarefa (prazo)] ou "nenhuma"
⏳ Em aberto: [tarefa — prazo] ou "nenhuma"
⚠ Antes de entrar: [o que o planejador precisa preparar/revisar]
📋 Endereçar hoje: [pauta principal]
💬 Contexto comportamental: [1 frase sobre estado emocional do cliente]

Se não houver notas do cliente, sinalize e sugira começar o mapeamento comportamental na sessão.

### 🧭 SEÇÃO C: Energia e Carga
*Objetivo: Termômetro de capacidade do dia.*

Avalie o peso dos agendamentos (PJ = 2× o peso de PF). Identifique sequências intensas. Dê uma frase direta sobre o dia.

## FORMATO DO OUTPUT

Bom dia! Hoje é [dia da semana], [data].

━━━━━━━━━━━━━━━━━━━━━━━
💛 SEÇÃO A · ENGAJAMENTO
━━━━━━━━━━━━━━━━━━━━━━━

[conteúdo]

━━━━━━━━━━━━━━━━━━━━━━━
🗂️ SEÇÃO B · BRIEFING
━━━━━━━━━━━━━━━━━━━━━━━

[conteúdo]

━━━━━━━━━━━━━━━━━━━━━━━
🧭 SEÇÃO C · ENERGIA
━━━━━━━━━━━━━━━━━━━━━━━

Carga de hoje: [X] reuniões — [Y] PJ · [Z] PF
[observação direta em 1–2 frases]

━━━━━━━━━━━━━━━━━━━━━━━
📊 RESUMO
━━━━━━━━━━━━━━━━━━━━━━━
[X] reuniões · [X] PJ · [X] PF · [X] tarefas atrasadas · [X] gatilhos de engajamento`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toLocalDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysUntilNextOccurrence(month: number, day: number, today: Date): number | null {
  const base = new Date(today);
  base.setHours(0, 0, 0, 0);
  const yr = base.getFullYear();
  for (const y of [yr, yr + 1]) {
    const ev = new Date(y, month - 1, day);
    ev.setHours(0, 0, 0, 0);
    const diff = Math.floor((ev.getTime() - base.getTime()) / 86_400_000);
    if (diff >= 0 && diff <= 7) return diff;
  }
  return null;
}

async function callGemini(system: string, user: string): Promise<string> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_AI_API_KEY ausente nas variáveis de ambiente");
  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) throw new Error("Limite de requisições da IA. Tente em instantes.");
    throw new Error(`Falha na IA (${res.status}): ${text.slice(0, 300)}`);
  }
  const json = await res.json();
  return json.choices?.[0]?.message?.content ?? "";
}

// ─── Server Functions ─────────────────────────────────────────────────────────

/**
 * Retorna o briefing da Donna gerado hoje, ou null se ainda não foi gerado.
 */
export const getTodayDonnaBriefing = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const today = toLocalDate(new Date());
    const { data } = await context.supabase
      .from("donna_briefings" as any)
      .select("content, created_at")
      .eq("user_id", context.userId)
      .eq("briefing_date", today)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data ? { content: (data as any).content as string, generatedAt: (data as any).created_at as string } : null;
  });

/**
 * Monta o briefing completo do dia, chama Gemini e persiste o resultado.
 */
export const generateDonnaBriefing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ content: string }> => {
    const today = new Date();
    const todayStr = toLocalDate(today);
    const dayStart = new Date(`${todayStr}T00:00:00`).toISOString();
    const dayEnd = new Date(`${todayStr}T23:59:59`).toISOString();

    // ── 1. Reuniões do dia ─────────────────────────────────────────────────
    const { data: localEvents } = await context.supabase
      .from("calendar_events")
      .select("id, title, start_at, end_at, google_event_id, client_id, clients(id,name,type)")
      .gte("start_at", dayStart)
      .lte("start_at", dayEnd)
      .order("start_at");

    // Google Calendar (se conectado)
    let googleEvents: import("@/features/agenda/lib/google-calendar.functions").GoogleEventItem[] = [];
    const googleToken = await getValidGoogleToken(context.userId);
    if (googleToken) {
      try { googleEvents = await fetchGoogleEvents(context.userId, dayStart, dayEnd); } catch { /* ignora */ }
    }

    const localGoogleIds = new Set((localEvents ?? []).map((e) => e.google_event_id).filter(Boolean));

    type MeetingInfo = {
      title: string;
      startAt: string;
      clientId: string | null;
      clientName: string | null;
      clientType: string | null;
      fromGoogle: boolean;
    };

    const meetings: MeetingInfo[] = [
      ...(localEvents ?? []).map((e) => ({
        title: e.title,
        startAt: e.start_at,
        clientId: (e.clients as any)?.id ?? null,
        clientName: (e.clients as any)?.name ?? null,
        clientType: (e.clients as any)?.type ?? null,
        fromGoogle: false,
      })),
      ...googleEvents
        .filter((ge) => !localGoogleIds.has(ge.google_event_id))
        .map((ge) => ({
          title: ge.title ?? "Sem título",
          startAt: ge.start_at,
          clientId: null,
          clientName: null,
          clientType: null,
          fromGoogle: true,
        })),
    ].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

    // ── 2. Coletar dados dos clientes com reunião ──────────────────────────
    const clientIds = [...new Set(meetings.map((m) => m.clientId).filter(Boolean))] as string[];

    const [notesRes, docsRes, tasksRes] = await Promise.all([
      clientIds.length > 0
        ? context.supabase
            .from("notes")
            .select("client_id, kind, content, created_at")
            .in("client_id", clientIds)
            .order("created_at", { ascending: false })
        : { data: [] },
      clientIds.length > 0
        ? context.supabase
            .from("documents")
            .select("client_id, name, extracted_text, created_at")
            .in("client_id", clientIds)
            .not("extracted_text", "is", null)
            .order("created_at", { ascending: false })
        : { data: [] },
      context.supabase
        .from("tasks")
        .select("client_id, title, due_at, status")
        .neq("status", "feito")
        .neq("status", "cancelado"),
    ]);

    const notesByClient = new Map<string, { kind: string; content: string; created_at: string }[]>();
    for (const n of notesRes.data ?? []) {
      if (!n.client_id) continue;
      if (!notesByClient.has(n.client_id)) notesByClient.set(n.client_id, []);
      notesByClient.get(n.client_id)!.push(n);
    }

    const docsByClient = new Map<string, { name: string; extracted_text: string | null; created_at: string }[]>();
    for (const d of docsRes.data ?? []) {
      if (!d.client_id) continue;
      if (!docsByClient.has(d.client_id)) docsByClient.set(d.client_id, []);
      docsByClient.get(d.client_id)!.push(d);
    }

    const now = new Date().toISOString();
    const allTasks = tasksRes.data ?? [];
    const tasksByClient = new Map<string, typeof allTasks>();
    for (const t of allTasks) {
      if (!t.client_id) continue;
      if (!tasksByClient.has(t.client_id)) tasksByClient.set(t.client_id, []);
      tasksByClient.get(t.client_id)!.push(t);
    }

    // ── 3. Clientes ativos sem reunião hoje ────────────────────────────────
    const clientIdsWithMeeting = new Set(meetings.map((m) => m.clientId).filter(Boolean));
    const { data: allClients } = await context.supabase
      .from("clients")
      .select("id, name, type, birthday, important_dates, last_contact_at, created_at")
      .neq("status", "arquivado");

    const { data: lastEvents } = await context.supabase
      .from("calendar_events")
      .select("client_id, start_at")
      .eq("user_id", context.userId)
      .lt("start_at", dayStart)
      .order("start_at", { ascending: false });

    const lastEventByClient = new Map<string, string>();
    for (const ev of lastEvents ?? []) {
      if (ev.client_id && !lastEventByClient.has(ev.client_id)) {
        lastEventByClient.set(ev.client_id, ev.start_at);
      }
    }

    const clientsWithoutMeeting = (allClients ?? [])
      .filter((c) => !clientIdsWithMeeting.has(c.id))
      .map((c) => {
        const lastEv = lastEventByClient.get(c.id);
        const days = lastEv ? Math.floor((Date.now() - new Date(lastEv).getTime()) / 86_400_000) : null;
        return { id: c.id, name: c.name, type: c.type, daysSince: days };
      })
      .filter((c) => c.daysSince === null || c.daysSince >= 14)
      .sort((a, b) => (b.daysSince ?? 999) - (a.daysSince ?? 999));

    // ── 4. Datas especiais próximos 7 dias ─────────────────────────────────
    const dateAlerts: { clientName: string; label: string; daysUntil: number }[] = [];
    for (const c of allClients ?? []) {
      if (c.birthday) {
        const bd = new Date(`${c.birthday}T12:00:00`);
        const d = daysUntilNextOccurrence(bd.getMonth() + 1, bd.getDate(), today);
        if (d !== null) dateAlerts.push({ clientName: c.name, label: "Aniversário", daysUntil: d });
      }
      for (const imp of (c.important_dates as { label: string; month: number; day: number; year: number | null }[] | null) ?? []) {
        if (imp.year !== null && imp.year !== today.getFullYear()) continue;
        const d = imp.year !== null
          ? (() => {
              const ev = new Date(imp.year, imp.month - 1, imp.day);
              ev.setHours(0, 0, 0, 0);
              const diff = Math.floor((ev.getTime() - today.setHours(0,0,0,0)) / 86_400_000);
              return diff >= 0 && diff <= 7 ? diff : null;
            })()
          : daysUntilNextOccurrence(imp.month, imp.day, today);
        if (d !== null) dateAlerts.push({ clientName: c.name, label: imp.label, daysUntil: d });
      }
    }
    dateAlerts.sort((a, b) => a.daysUntil - b.daysUntil);

    // ── 5. Radar de ativação ───────────────────────────────────────────────
    const { data: rules } = await context.supabase
      .from("activation_rules")
      .select("name, applies_to_status, trigger_days_no_contact")
      .eq("active", true);

    type RuleAlert = { ruleName: string; clients: { name: string; days: number }[] };
    const ruleAlerts: RuleAlert[] = [];

    for (const rule of rules ?? []) {
      const threshold = new Date();
      threshold.setDate(threshold.getDate() - rule.trigger_days_no_contact);
      const { data: triggered } = await context.supabase
        .from("clients")
        .select("id, name, last_contact_at, created_at")
        .eq("status", rule.applies_to_status)
        .or(`last_contact_at.lt.${threshold.toISOString()},last_contact_at.is.null`);

      if (triggered && triggered.length > 0) {
        ruleAlerts.push({
          ruleName: rule.name,
          clients: triggered.map((c) => {
            const ref = c.last_contact_at ?? c.created_at;
            return {
              name: c.name,
              days: ref ? Math.floor((Date.now() - new Date(ref).getTime()) / 86_400_000) : 99,
            };
          }),
        });
      }
    }

    // ── 6. Montar userMessage ──────────────────────────────────────────────
    const dateLabel = today.toLocaleDateString("pt-BR", {
      weekday: "long", day: "2-digit", month: "long", year: "numeric",
    });

    const lines: string[] = [
      "Donna, briefing de hoje.",
      "",
      `DATA: ${dateLabel}`,
      "",
      "─── REUNIÕES DO DIA ───",
      "",
    ];

    if (meetings.length === 0) {
      lines.push("(nenhuma reunião hoje)");
      lines.push("");
    }

    for (const m of meetings) {
      const hora = new Date(m.startAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      lines.push(`${hora} — ${m.title}${m.clientType ? ` (${m.clientType})` : ""}${m.fromGoogle ? " [Google]" : ""}`);

      if (!m.clientId) {
        lines.push("(cliente não vinculado no sistema)");
      } else {
        const notes = notesByClient.get(m.clientId) ?? [];
        const ctxNote = notes.find((n) => n.kind === "contexto");
        const sessionNotes = notes.filter((n) => n.kind === "nota").slice(0, 3);
        const docs = (docsByClient.get(m.clientId) ?? []).slice(0, 2);
        const clientTasks = tasksByClient.get(m.clientId) ?? [];
        const overdue = clientTasks.filter((t) => t.due_at && t.due_at < now);
        const open = clientTasks.filter((t) => !t.due_at || t.due_at >= now);

        if (ctxNote) {
          lines.push(`Contexto comportamental (${new Date(ctxNote.created_at).toLocaleDateString("pt-BR")}):`);
          lines.push('"""');
          lines.push(ctxNote.content.slice(0, 1500));
          lines.push('"""');
        } else {
          lines.push("(sem contexto comportamental registrado)");
        }

        if (sessionNotes.length > 0) {
          lines.push("Últimas notas de sessão:");
          for (const n of sessionNotes) {
            lines.push(`- [${new Date(n.created_at).toLocaleDateString("pt-BR")}] ${n.content.slice(0, 300)}`);
          }
        }

        if (docs.length > 0) {
          lines.push("Documentos indexados:");
          for (const d of docs) {
            lines.push(`- [${d.name}] ${(d.extracted_text ?? "").slice(0, 500)}`);
          }
        }

        lines.push(`Tarefas atrasadas: ${overdue.length > 0 ? overdue.map((t) => `${t.title} (vencia ${t.due_at ? new Date(t.due_at).toLocaleDateString("pt-BR") : "?"}`).join("; ") : "nenhuma"}`);
        lines.push(`Tarefas em aberto: ${open.length > 0 ? open.map((t) => t.title).join("; ") : "nenhuma"}`);
      }

      lines.push("");
      lines.push("───");
      lines.push("");
    }

    lines.push("─── CLIENTES SEM REUNIÃO MARCADA (há 14+ dias) ───");
    if (clientsWithoutMeeting.length === 0) {
      lines.push("(todos os clientes têm sessão recente)");
    } else {
      for (const c of clientsWithoutMeeting) {
        const lastEv = lastEventByClient.get(c.id);
        lines.push(`- ${c.name} (${c.type}) — ${c.daysSince !== null ? `${c.daysSince} dias sem sessão` : "sem histórico"}`);
        if (lastEv) lines.push(`  última sessão: ${new Date(lastEv).toLocaleDateString("pt-BR")}`);
      }
    }

    lines.push("");
    lines.push("─── DATAS ESPECIAIS (próximos 7 dias) ───");
    if (dateAlerts.length === 0) {
      lines.push("(nenhuma)");
    } else {
      for (const a of dateAlerts) {
        const when = a.daysUntil === 0 ? "hoje" : a.daysUntil === 1 ? "amanhã" : `em ${a.daysUntil} dias`;
        lines.push(`- ${a.label} de ${a.clientName}: ${when}`);
      }
    }

    lines.push("");
    lines.push("─── RADAR DE ATIVAÇÃO ───");
    if (ruleAlerts.length === 0) {
      lines.push("(nenhuma regra disparada)");
    } else {
      for (const r of ruleAlerts) {
        lines.push(`Regra "${r.ruleName}": ${r.clients.length} cliente(s) — ${r.clients.map((c) => `${c.name} (${c.days}d)`).join(", ")}`);
      }
    }

    const userMessage = lines.join("\n");

    // ── 7. Chamar Gemini ───────────────────────────────────────────────────
    const content = await callGemini(DONNA_SYSTEM_PROMPT, userMessage);

    // ── 8. Persistir resultado ─────────────────────────────────────────────
    await context.supabase
      .from("donna_briefings" as any)
      .insert({ user_id: context.userId, briefing_date: todayStr, content });

    return { content };
  });
