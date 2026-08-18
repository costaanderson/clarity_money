## Fase 1 — Dados reais (sem IA)

_Meta: preencher a view de Briefing com dados que já existem no Supabase._

### 1. Server function de briefing diário
- [ ] 1.1 Criar `src/features/briefing/lib/briefing.functions.ts` com server function `getDailyBriefing({ data: { date } })` que retorna:
  - `meetings`: eventos do dia (hora, título, `client_id` se houver vinculação pelo nome)
  - `overdueTasks`: tarefas vencidas com `clients.name`
  - `pendingTasks`: tarefas abertas (sem vencimento)
  - `clientsWithoutMeeting`: clientes ativos que não têm evento no dia E não têm sessão marcada nos próximos 7 dias
  - `meetingCount`, `pjCount` (heurística: se `type === "pj"` no client)
- [ ] 1.2 Reusar `listEvents` e `listTasks` internamente ou fazer queries diretas para evitar N+1

### 2. Atualizar a view `/briefing` para usar a server function
- [ ] 2.1 Substituir as 3 queries separadas (`eventsQ`, `tasksQ`, `clientsQ`) por uma única query `["briefing", date]` que chama `getDailyBriefing`
- [ ] 2.2 Seção B — Reuniões: para cada evento, tentar casar o título com o nome do cliente (`clients`) e exibir:
  - Tipo PF/PJ
  - Tarefas atrasadas do cliente (já vem no payload)
  - Link para o perfil do cliente
- [ ] 2.3 Seção C — Energia: usar `pjCount` para calcular peso real da agenda (PJ = 2x), exibir badge correto e mensagem ajustada
- [ ] 2.4 Seção B — Clientes sem reunião: exibir lista de `clientsWithoutMeeting` com dias desde a última sessão e badge de urgência (>14 dias = atenção, >21 = alerta)

### 3. Navegação de data no Briefing
- [ ] 3.1 Adicionar controles de data (← Ontem / Hoje / Amanhã →) no cabeçalho da view, igual ao padrão do Painel da Semana
- [ ] 3.2 A query `["briefing", date]` deve reagir à data selecionada

---

## Fase 2 — Engajamento com IA (Seção A)

_Meta: gerar sugestões de contato personalizadas usando Gemini._

### 4. Tabela de controle de engajamento
- [ ] 4.1 Criar migration: `CREATE TABLE engagement_log (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE, client_id uuid REFERENCES clients(id) ON DELETE CASCADE, suggested_at date NOT NULL, action_type text, note text, created_at timestamptz DEFAULT now())`
- [ ] 4.2 Adicionar RLS: usuário só lê/escreve seus próprios registros
- [ ] 4.3 Atualizar `src/integrations/supabase/types.ts` com o novo tipo

### 5. Server function de engajamento
- [ ] 5.1 Criar `src/features/briefing/lib/engagement.functions.ts` com `getEngagementSuggestions({ data: { date } })`:
  - Busca clientes ativos
  - Filtra: sem contato há > 15 dias (PF) ou > 21 dias (PJ)
  - Filtra: aniversariantes do mês (campo `birthday` no client se existir)
  - Consulta `engagement_log` para excluir sugestões dos últimos 7 dias (controle de duplicidade)
  - Retorna lista de `{ clientId, name, type, reason, lastContact }`
- [ ] 5.2 Criar `generateEngagementHooks({ data: { suggestions, date } })`:
  - Monta prompt para Gemini com os dados dos clientes (sem transcrições ainda)
  - Retorna array de `{ clientId, hook }` — o gancho de texto personalizado
  - Salva na `engagement_log` após geração (para controle de duplicidade)

### 6. UI — Seção A com IA
- [ ] 6.1 Adicionar botão "Gerar Sugestões" na Seção A (chama `generateEngagementHooks`, mostra loading)
- [ ] 6.2 Exibir cada sugestão com: nome do cliente, motivo (sem reunião / aniversário / marco), hook gerado
- [ ] 6.3 Botão "Marcar como feito" por sugestão — registra ação na `engagement_log` e remove da lista
- [ ] 6.4 Limitar a no máximo 3 sugestões por dia (distribuir o restante com nota "Reservado para amanhã/quinta")

---

## Fase 3 — Preparação com transcrições (Seção B enriquecida)

_Meta: enriquecer o briefing de cada reunião com dados da última sessão._

### 7. Integração com documentos indexados
- [ ] 7.1 Verificar se os documentos do cliente (`documents` table) têm campo `session_number` ou equivalente para identificar a última transcrição
- [ ] 7.2 Se não tiver: adicionar campo `session_number int` e `session_date date` na tabela `documents` via migration, preencher retroativamente por convenção de nome (se aplicável)

### 8. Server function de preparação de reunião
- [ ] 8.1 Criar `prepareMeetingBriefing({ data: { clientId, meetingDate } })`:
  - Busca último documento do cliente (maior `session_number` ou mais recente)
  - Extrai texto via Supabase Storage
  - Monta prompt para Gemini: "Você é assistente do planejador. Dado o texto da última sessão, extraia: resumo em 2 frases, tarefas abertas do cliente, tarefas do planejador antes da próxima sessão, pauta sugerida, contexto comportamental em 1 frase."
  - Retorna JSON estruturado com esses campos
- [ ] 8.2 Cache da resposta na session (não regenerar a cada reload) — usar `useState` ou salvar em `localStorage` com chave `briefing-{clientId}-{date}`

### 9. UI — Seção B enriquecida
- [ ] 9.1 Para cada reunião com cliente vinculado: botão "Preparar" que chama `prepareMeetingBriefing` (loading individual por reunião)
- [ ] 9.2 Exibir resultado expandido abaixo do evento:
  - Última sessão: resumo
  - Tarefas atrasadas do cliente
  - Ações do planejador antes de entrar
  - Pauta a endereçar
  - Contexto comportamental
- [ ] 9.3 Se o cliente não tiver documentos: mostrar "Nenhuma transcrição indexada. Adicione documentos no perfil do cliente."

---

## Verificação final
- [ ] 10.1 Testar Fase 1: briefing de dia com e sem reuniões, com tarefas atrasadas, com clientes sem sessão
- [ ] 10.2 Testar Fase 2: geração de sugestões, controle de duplicidade, "marcar como feito"
- [ ] 10.3 Testar Fase 3: preparação de reunião com cliente que tem documentos, e sem documentos
- [ ] 10.4 Verificar build sem erros após todas as alterações
