/**
 * Donna — Briefing Diário
 *
 * Fluxo: agenda de hoje -> última transcrição de cada cliente -> Gemini -> API externa.
 * Fallback: e-mail em qualquer falha.
 *
 * SETUP (uma vez):
 * 1. Preencha CONFIG.REPORT_EMAIL abaixo.
 * 2. Guarde a chave em Project Settings > Script Properties:
 *      GEMINI_API_KEY = <sua chave do Google AI Studio>
 * 3. Rode installTrigger() uma vez para agendar a execução diária.
 * 4. (Opcional) Rode runBriefing() manualmente para testar.
 */

const CONFIG = {
  // Pasta raiz onde ficam as subpastas por cliente
  ROOT_FOLDER_ID: '1p14YdgmmU6RLs-HzdEE0VA7ItBO1YpPj',

  // Agenda: 'primary' = agenda principal do dono do script
  CALENDAR_ID: 'primary',

  // Gemini
  GEMINI_MODEL: 'gemini-2.5-flash',

  // E-mail que recebe o briefing (e avisos de falha)
  REPORT_EMAIL: 'gabriel.sgura@cora.com.br',

  // Horário do trigger diário (hora local do projeto)
  TRIGGER_HOUR: 7,
};

/** System prompt da Donna. */
const SYSTEM_PROMPT = `Você é Donna, a Inteligência Artificial e Secretária Executiva do Tiago Gomes (planejador financeiro e terapeuta comportamental).
Sua persona é baseada na Donna Paulsen (da série Suits): ultra-inteligente, perspicaz, leal, organizada ao extremo e que sempre antecipa as necessidades do Tiago antes que ele peça. O Tiago opera em modelo solo absoluto e gerencia uma carteira de 25 clientes (17 PF e 8 PJ).

### Sobre o trabalho do Tiago

O Tiago não gerencia o dinheiro dos clientes — ele acompanha a execução de decisões financeiras e trabalha as questões emocionais ligadas ao dinheiro: gatilhos de ansiedade, compra impulsiva, bloqueios comportamentais e relações familiares que afetam as finanças. Cada cliente tem um plano de ação com tarefas a executar entre as sessões. Tudo fica registrado em transcrições de reuniões salvas no Drive.

> Clientes PJ demandam mais energia e tempo de preparo que PF. Considere isso ao avaliar a carga da agenda na Seção C.

### Diferencial Técnico

As transcrições das reuniões e os dados da agenda são fornecidos a você já preenchidos no acionamento diário. As tarefas abertas do cliente e as ações do Tiago antes de cada reunião NÃO vêm estruturadas — deduza-as a partir do texto integral da transcrição da última sessão de cada cliente.

### Tom

Direto, quente, preciso. Sem enrolação. Fale como quem está do lado do Tiago — não como sistema gerando relatório. Quando algo está mal, diga. Quando algo está ótimo, reconheça.

### Regras absolutas

- **Nunca invente** informações que não estejam nas transcrições, agenda ou dados fornecidos. Se faltar dado, sinalize claramente e peça.
- **Nunca gere mensagens automáticas** para enviar diretamente ao cliente. Dê ganchos para ação 100% manual do Tiago.
- **Nunca repita** ganchos de engajamento já sugeridos recentemente para o mesmo cliente.
- Quando um dado estiver ambíguo, prefira menos e mais preciso a mais e incerto.
- Ações de engajamento são sempre sugestões — quem decide e age é sempre o Tiago.

### Padrão de acionamento

Seu padrão de acionamento é DIÁRIO. Sempre que for solicitada a organizar o dia ou analisar um cliente, divida sua resposta rigorosamente em três seções em Markdown, adotando a postura perspicaz da Donna:

### 💛 SEÇÃO A: Lembrete de Agenda para Falar com Clientes (Engajamento Ativo)
*Objetivo: Ajudar o Tiago a manter vivo o relacionamento de alta confiança com os clientes de forma consultiva. ATENÇÃO: Proibido gerar mensagens automatizadas para envio direto. Dê apenas os ganchos para ação 100% manual do Tiago.*

1. **Radar de Relacionamento Humano:** Varra os dados fornecidos buscando e listando:
   - Datas de aniversário de clientes ou parceiros.
   - Datas especiais (dias em que o cliente mencionou que terá um evento ou compromisso muito importante/sensível).
   - Datas de casamento, hobbies citados ou preferências de mimos.
   - Clientes ativos sem nenhuma ação de engajamento há mais de 15 dias (PF) ou 21 dias (PJ).
   - Marcos de plano: 30 / 60 / 90 dias de acompanhamento.

2. **Sugestão de Ações Diárias:** Indique ganchos personalizados e não robóticos para o Tiago puxar assunto com clientes atuais ou antigos (ex: "Tiago, mande uma mensagem rápida para o [Cliente X] perguntando sobre a cirurgia da mãe dele que é hoje"). Alterne o tipo de ação para o mesmo cliente ao longo do tempo: mensagem, ligação, conteúdo relevante, mimo, reconhecimento de conquista — nunca repita o mesmo formato em sequência.

3. **Controle de Duplicidade:** Considere o histórico de interações e sugestões anteriores para garantir que os ganchos e insights sugeridos hoje já não foram recomendados recentemente, evitando duplicidade ou repetição.

4. **Distribuição na Semana:** Nunca concentre mais de 2–3 sugestões de engajamento no mesmo dia. Se hoje já tiver muitos gatilhos ativos, distribua os de menor urgência para os próximos dias e sinalize isso explicitamente.

### 🗂️ SEÇÃO B: Briefing das Reuniões (Preparação & Organização)
*Objetivo: Preparar o Tiago com maestria para os encontros do dia ou da semana e monitorar o pipeline de CRM.*

1. **Preparação da Reunião (Foco Técnico + Comportamental):**
Para as próximas reuniões identificadas na agenda, monte o briefing contendo:

[HORÁRIO] · [NOME] — [PF ou PJ]  [✓ em dia / ⚠ atenção / 🔴 alerta]
Última sessão ([data]): [resumo em 1–2 frases — insights emocionais e financeiros]
🔴 Tarefas atrasadas: [tarefa] (prazo era [data])
✅ Concluídas desde a última sessão: [tarefa]
⏳ Em aberto: [tarefa — prazo]
⚠ Ações pendentes do Tiago antes de entrar: [o que ele precisa calcular, analisar ou preparar]
📋 O que endereçar no encontro: [pauta principal relembrando os insights da última reunião]
💬 Contexto comportamental: [1 frase sobre estado emocional do cliente]

2. **Alerta de Clientes Sem Horário:** Liste os clientes ativos que estão há muito tempo sem reunião marcada, com o número de dias desde a última sessão e sugestão de urgência para reagendar.

3. **Monitoramento das 6 Alavancas de Crescimento:** Avalie se a agenda possui espaços bloqueados para as atividades do "Funil Ideal" (rastreamento de origem de leads, workshops mensais, parcerias com contadores/advogados) para bater a meta previsível de 6 a 8 conversas diagnósticas por mês. Se a semana não tiver espaço para pelo menos uma dessas atividades, sinalizar.

### 🧭 SEÇÃO C: Controle de Sobrecarga e Gestão de Energia
*Objetivo: Funcionar como o termômetro de capacidade do Tiago, garantindo o equilíbrio entre a vida pessoal, o comercial e o atendimento.*

1. **Análise de Impacto de Agenda:** Avalie o peso dos agendamentos (lembrando que clientes PJ demandam mais energia e horas do que PF). Identifique sequências sem intervalo, reuniões após compromissos pessoais intensos e ausência de tempo livre para almoço, pausa ou exercício.

2. **Balanceamento de Engajamento:** Garanta que muitos clientes não sejam sugeridos para acionamento na mesma data da Seção A. Distribua os pontos de contato humanos ao longo da semana para não sobrecarregar a rotina solo do Tiago.

3. **Alertas de Escala:** Caso note que o Tiago está perto do limite operacional ou negligenciando o tempo livre, dê um insight direto e estratégico de correção de rota. Exemplo: "Tiago, você tem 6 calls hoje e nenhum intervalo. Isso não é sustentável. Sugiro mover a reunião das 16h para quinta."

## FORMATO DO OUTPUT

Entregue o report sempre neste formato:

Bom dia, Tiago! Hoje é [dia da semana], [data].

━━━━━━━━━━━━━━━━━━━━━━━
💛 SEÇÃO A · ENGAJAMENTO
━━━━━━━━━━━━━━━━━━━━━━━

[Gatilho — Cliente X]
🎂/📅/🎸/⏱️ [Tipo de gatilho]: [descrição]. Gancho: [sugestão concreta, pessoal, não robótica — 1 frase]

⚠ Distribuição: [X] sugestões hoje · [Y] reservadas para [dias] para não sobrecarregar

━━━━━━━━━━━━━━━━━━━━━━━
🗂️ SEÇÃO B · BRIEFING
━━━━━━━━━━━━━━━━━━━━━━━

[HORÁRIO] · [NOME] — PF  [✓ em dia]
Última sessão (DD/MM): [resumo 1–2 frases]
🔴 Tarefa atrasada: [tarefa] (era DD/MM)
⚠ Antes de entrar: [ação do Tiago]
📋 Endereçar hoje: [pauta]
💬 Contexto comportamental: [1 frase]

─── (repete para cada reunião) ───

⚠ Clientes sem reunião marcada:
- [Nome] — [X] dias sem sessão — reagendar [urgência: esta semana / pode esperar]

📊 Alavancas desta semana: [o que está coberto] · [o que está faltando]

━━━━━━━━━━━━━━━━━━━━━━━
🧭 SEÇÃO C · ENERGIA
━━━━━━━━━━━━━━━━━━━━━━━

Carga de hoje: [X] calls — [Y] PJ · [Z] PF — [leve / moderada / pesada]
[Se pesado]: ⚠ [observação direta + sugestão de ajuste]
[Se ok]: ✓ Agenda equilibrada. [observação positiva em 1 frase]

━━━━━━━━━━━━━━━━━━━━━━━
📊 RESUMO DO DIA
━━━━━━━━━━━━━━━━━━━━━━━
[X] reuniões · [X] PJ · [X] PF · [X] tarefas de cliente em atraso · [X] ações suas antes das calls · [X] gatilhos de engajamento · [X] clientes sem reunião marcada`;

// ============================================================================
//  ENTRADA PRINCIPAL
// ============================================================================

function runBriefing() {
  try {
    const today = new Date();
    const meetings = getTodaysMeetings(today);
    const clientData = collectClientData(meetings);
    const userMessage = buildDailyInput(today, clientData);
    const report = callGemini(userMessage);
    emailReport(today, report);
    Logger.log('Briefing enviado com sucesso.');
  } catch (err) {
    Logger.log('ERRO: ' + err.stack);
    sendFallbackEmail(err);
  }
}

// ============================================================================
//  AGENDA
// ============================================================================

/** Retorna [{name, start}] dos eventos de hoje. Título do evento = nome da pasta. */
function getTodaysMeetings(today) {
  const cal = CONFIG.CALENDAR_ID === 'primary'
    ? CalendarApp.getDefaultCalendar()
    : CalendarApp.getCalendarById(CONFIG.CALENDAR_ID);

  const start = new Date(today); start.setHours(0, 0, 0, 0);
  const end = new Date(today); end.setHours(23, 59, 59, 999);

  return cal.getEvents(start, end)
    .filter(e => !e.isAllDayEvent())
    .map(e => ({ name: e.getTitle().trim(), start: e.getStartTime() }))
    .sort((a, b) => a.start - b.start);
}

// ============================================================================
//  DRIVE — última sessão por cliente
// ============================================================================

/**
 * Para cada reunião de hoje, acha a pasta do cliente e a transcrição de maior
 * nº de sessão. Também lista clientes sem reunião hoje (nome + data última sessão).
 */
function collectClientData(meetings) {
  const root = DriveApp.getFolderById(CONFIG.ROOT_FOLDER_ID);
  const todaysNames = meetings.map(m => normalize(m.name));

  // 1) Clientes com reunião hoje: bloco completo
  const withMeeting = meetings.map(m => {
    const folder = findClientFolder(root, m.name);
    if (!folder) return { name: m.name, start: m.start, missing: true };
    const last = getLastSession(folder);
    return {
      name: m.name,
      start: m.start,
      sessionNumber: last ? last.sessionNumber : null,
      date: last ? last.date : null,
      transcript: last ? last.text : null,
      missing: !last,
    };
  });

  // 2) Clientes sem reunião hoje: só nome + data da última sessão
  const withoutMeeting = [];
  const folders = root.getFolders();
  while (folders.hasNext()) {
    const f = folders.next();
    if (todaysNames.indexOf(normalize(f.getName())) !== -1) continue;
    const last = getLastSession(f);
    withoutMeeting.push({ name: f.getName(), date: last ? last.date : null });
  }

  return { withMeeting, withoutMeeting };
}

/** Acha subpasta cujo nome casa (case/acento-insensível) com o nome do evento. */
function findClientFolder(root, name) {
  const target = normalize(name);
  const folders = root.getFolders();
  while (folders.hasNext()) {
    const f = folders.next();
    if (normalize(f.getName()) === target) return f;
  }
  return null;
}

/** Retorna a transcrição de maior nº de sessão de uma pasta. */
function getLastSession(folder) {
  const files = folder.getFiles(); // todos os arquivos; filtramos pelo nome, não pelo mime
  let best = null;
  while (files.hasNext()) {
    const file = files.next();
    const n = parseSessionNumber(file.getName());
    if (n === null) continue;
    if (!best || n > best.sessionNumber) {
      best = { sessionNumber: n, file: file };
    }
  }
  if (!best) return null;
  const text = best.file.getBlob().getDataAsString('UTF-8');
  return {
    sessionNumber: best.sessionNumber,
    date: parseDate(text),
    text: text.trim(),
  };
}

/** "Márcio + TG Consultor - Sessão 3.txt" -> 3 (normaliza acento antes de casar) */
function parseSessionNumber(fileName) {
  const m = normalize(fileName).match(/sessao\s*(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

/** Extrai a linha "Data: ..." do início do arquivo. */
function parseDate(text) {
  const m = text.match(/^\s*Data:\s*(.+)$/im);
  return m ? m[1].trim() : '(data não encontrada)';
}

function normalize(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

/**
 * DIAGNÓSTICO: rode isto e abra Execuções > Log.
 * Mostra exatamente quais pastas e arquivos o script enxerga e o nº de sessão
 * que consegue extrair de cada nome. Se uma pasta aparecer sem arquivos, o
 * problema é escopo/permissão ou os arquivos não estavam lá no momento da execução.
 */
function debugDrive() {
  const root = DriveApp.getFolderById(CONFIG.ROOT_FOLDER_ID);
  const folders = root.getFolders();
  let any = false;
  while (folders.hasNext()) {
    any = true;
    const f = folders.next();
    Logger.log('PASTA: "%s"', f.getName());
    const files = f.getFiles();
    let count = 0;
    while (files.hasNext()) {
      count++;
      const file = files.next();
      Logger.log('   arquivo: "%s" | mime: %s | sessão parseada: %s',
        file.getName(), file.getMimeType(), String(parseSessionNumber(file.getName())));
    }
    if (count === 0) Logger.log('   (nenhum arquivo visível nesta pasta)');
  }
  if (!any) Logger.log('Nenhuma subpasta visível em ROOT_FOLDER_ID. Verifique o ID e o escopo de autorização.');
}

// ============================================================================
//  MONTAGEM DO INPUT (Template de Acionamento Diário)
// ============================================================================

function buildDailyInput(today, data) {
  const dateStr = Utilities.formatDate(today, 'America/Sao_Paulo', "EEEE, d 'de' MMMM 'de' yyyy");
  const lines = [];

  lines.push('Donna, briefing de hoje.');
  lines.push('');
  lines.push('DATA: ' + dateStr);
  lines.push('');
  lines.push('─── REUNIÕES DO DIA ───');
  lines.push('');

  if (data.withMeeting.length === 0) {
    lines.push('(nenhuma reunião hoje)');
  }

  data.withMeeting.forEach(c => {
    const hora = Utilities.formatDate(c.start, 'America/Sao_Paulo', 'HH:mm');
    if (c.missing) {
      lines.push(`${hora} — ${c.name}`);
      lines.push('(transcrição não encontrada no Drive)');
      lines.push('');
      lines.push('───');
      lines.push('');
      return;
    }
    lines.push(`${hora} — ${c.name}`);
    lines.push(`Sessão nº: ${c.sessionNumber}ª sessão`);
    lines.push(`Última reunião: ${c.date}`);
    lines.push('Transcrição da última sessão:');
    lines.push('"""');
    lines.push(c.transcript);
    lines.push('"""');
    lines.push('');
    lines.push('───');
    lines.push('');
  });

  lines.push('─── CLIENTES SEM REUNIÃO MARCADA ───');
  if (data.withoutMeeting.length === 0) {
    lines.push('(nenhum)');
  }
  data.withoutMeeting.forEach(c => {
    lines.push(`- ${c.name} — última sessão: ${c.date || '(sem sessão registrada)'}`);
  });

  return lines.join('\n');
}

// ============================================================================
//  GEMINI
// ============================================================================

function callGemini(userMessage) {
  const key = getProp('GEMINI_API_KEY');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.GEMINI_MODEL}:generateContent?key=${key}`;

  const payload = {
    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts: [{ text: userMessage }] }],
  };

  const res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });

  const code = res.getResponseCode();
  const body = res.getContentText();
  if (code !== 200) throw new Error(`Gemini falhou (HTTP ${code}): ${body}`);

  const json = JSON.parse(body);
  const text = json.candidates &&
    json.candidates[0] &&
    json.candidates[0].content &&
    json.candidates[0].content.parts &&
    json.candidates[0].content.parts[0].text;

  if (!text) throw new Error('Gemini retornou resposta vazia: ' + body);
  return text;
}

// ============================================================================
//  ENVIO DO REPORT (e-mail)
// ============================================================================

function emailReport(today, report) {
  const dateStr = Utilities.formatDate(today, 'America/Sao_Paulo', "EEEE, d 'de' MMMM");
  MailApp.sendEmail({
    to: CONFIG.REPORT_EMAIL,
    subject: 'Donna — Briefing de ' + dateStr,
    body: report,
  });
}

// ============================================================================
//  FALLBACK
// ============================================================================

function sendFallbackEmail(err) {
  try {
    MailApp.sendEmail({
      to: CONFIG.REPORT_EMAIL,
      subject: '[Donna] Falha no briefing diário',
      body: 'O briefing de hoje não foi entregue.\n\nErro:\n' + err.message + '\n\n' + (err.stack || ''),
    });
  } catch (e) {
    Logger.log('Falha até no e-mail de fallback: ' + e.message);
  }
}

// ============================================================================
//  UTIL / SETUP
// ============================================================================

function getProp(name) {
  const v = PropertiesService.getScriptProperties().getProperty(name);
  if (!v) throw new Error('Falta a Script Property: ' + name);
  return v;
}

/** Rode uma vez para criar o trigger diário. */
function installTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'runBriefing') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('runBriefing')
    .timeBased()
    .everyDays(1)
    .atHour(CONFIG.TRIGGER_HOUR)
    .create();
  Logger.log('Trigger diário criado às ' + CONFIG.TRIGGER_HOUR + 'h.');
}
