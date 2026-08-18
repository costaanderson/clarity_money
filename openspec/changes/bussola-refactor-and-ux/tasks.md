## 1. Substituir autenticação OAuth do Lovable por Supabase nativo

- [x] 1.1 Verificar no dashboard do Supabase quais providers OAuth estão configurados (Google, Apple, Microsoft)
- [x] 1.2 Criar `src/shared/lib/auth.ts` com funções de login usando `supabase.auth.signInWithOAuth`
- [x] 1.3 Substituir todas as chamadas a `lovable.auth.signInWithOAuth` pelo novo helper
- [x] 1.4 Remover `src/integrations/lovable/index.ts` e desinstalar `@lovable.dev/cloud-auth-js`
- [x] 1.5 Verificar que o fluxo de login (Google ao menos) funciona end-to-end após a substituição

## 2. Substituir gateway de IA do Lovable pela API direta do Gemini

- [x] 2.1 Adicionar variável de ambiente `GOOGLE_AI_API_KEY` no `.env` local e no ambiente de deploy (Netlify/equivalente)
- [x] 2.2 Atualizar `src/lib/ai.functions.ts`: trocar `AI_URL` e `LOVABLE_API_KEY` pela URL e key do Gemini direto (`https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`)
- [x] 2.3 Remover variável `LOVABLE_API_KEY` dos ambientes após confirmar que a nova key funciona
- [ ] 2.4 Testar geração de cada `kind` (resumo, mensagem, analise, briefing) com a nova API

## 3. Extração de texto de documentos para contexto da IA

- [x] 3.1 Criar migration aditiva: `ALTER TABLE documents ADD COLUMN extracted_text text;`
- [x] 3.2 Rodar a migration no Supabase e atualizar `src/integrations/supabase/types.ts` com o novo campo
- [x] 3.3 Instalar `pdf-parse` como dependência de produção
- [x] 3.4 Criar função de extração de texto em `src/features/ai/lib/extract-text.ts`:
  - `.txt` / `.md`: download do Storage + retorno direto como string
  - `.pdf`: download do Storage + extração via `pdf-parse`
  - Outros formatos: retornar `null`
- [x] 3.5 Atualizar `registerDocument` em `documents.functions.ts`: após inserir o registro, baixar o arquivo do Storage, extrair o texto e atualizar `extracted_text` na mesma operação
- [x] 3.6 Atualizar `generateAI` em `ai.functions.ts`: buscar `documents.extracted_text` (todos os documentos do cliente com texto não nulo) e concatenar ao contexto das notas com separador claro (ex: `\n\n--- Documentos ---\n`)
- [x] 3.7 Verificar que a geração de Análise Comportamental passa a incluir o conteúdo dos documentos indexados

## 4. Remoção das demais dependências do Lovable e reorganização do codebase

- [x] 4.1 Auditar e remover `src/lib/lovable-error-reporting.ts`; substituir por `console.error` estruturado em `src/shared/lib/error-reporting.ts`
- [x] 4.2 Atualizar todos os imports que apontavam para `lovable-error-reporting.ts`
- [x] 4.3 Criar estrutura de pastas `src/features/<domain>/` para: `clients`, `pipeline`, `tasks`, `agenda`, `cockpit`, `week-panel`, `diagnostic`, `ai`, `settings`, `activation-rules`
- [x] 4.4 Criar `src/shared/components/`, `src/shared/hooks/`, `src/shared/lib/`, `src/shared/types/`, `src/shared/utils/`
- [x] 4.5 Mover `src/components/ui/` para `src/shared/components/ui/` (shadcn); atualizar alias de imports
- [x] 4.6 Mover e reorganizar feature `clients` (componentes de `src/components/clients/` + `src/lib/clients.functions.ts`) para `src/features/clients/`
- [x] 4.7 Mover e reorganizar feature `pipeline` para `src/features/pipeline/`
- [x] 4.8 Mover e reorganizar feature `tasks` (`tasks.functions.ts`) para `src/features/tasks/`
- [x] 4.9 Mover e reorganizar feature `cockpit` (`cockpit.functions.ts`) para `src/features/cockpit/`
- [x] 4.10 Mover e reorganizar feature `week-panel` (`dashboard.functions.ts`) para `src/features/week-panel/`
- [x] 4.11 Mover e reorganizar features restantes: `agenda` (`calendar.functions.ts`), `ai` (`ai.functions.ts`), `settings`, `diagnostic` (`diagnostics.functions.ts`, `diagnostico.ts`), `activation-rules` (`rules.functions.ts`)
- [x] 4.12 Tornar rotas em `src/routes/_authenticated/` wrappers finos: remover lógica de negócio das rotas e garantir importações de `src/features/`
- [x] 4.13 Verificar build completo após reorganização; corrigir imports quebrados
- [x] 4.14 Atualizar `README.md` com nova estrutura de pastas, como rodar localmente e decisões de arquitetura

## 5. Painel da Semana — Navegação entre semanas

- [x] 5.1 Adicionar state `weekOffset` (inteiro, 0 = semana atual) ao componente do Painel
- [x] 5.2 Implementar função `getWeekRange(offset)` que retorna `{ start: Date, end: Date }` (segunda a domingo)
- [x] 5.3 Adicionar botões anterior/próximo de semana no cabeçalho do Painel
- [x] 5.4 Exibir intervalo da semana selecionada no cabeçalho (ex: "11 a 17 de ago 2026")
- [x] 5.5 Adicionar botão "Hoje" visível apenas quando `weekOffset !== 0`; clicar reseta para `0`
- [x] 5.6 Atualizar queries do Painel (clientes atendidos, compromissos, tarefas, tarefas atrasadas) para filtrar pelo intervalo `start`/`end` da semana selecionada
- [x] 5.7 Implementar estado vazio para semana sem dados em cada card/seção do Painel

## 6. Pipeline — Etapa "Finalizado"

- [x] 6.1 Criar migration: `ALTER TYPE pipeline_stage ADD VALUE 'finalizado';`
- [x] 6.2 Criar migration: `ALTER TABLE clients ADD COLUMN finalized_at timestamptz;`
- [x] 6.3 Rodar as migrations no Supabase e atualizar `src/integrations/supabase/types.ts`
- [x] 6.4 Adicionar coluna "Finalizado" no kanban do pipeline
- [x] 6.5 Implementar lógica de mover cliente para "Finalizado": atualiza `pipeline_stage = 'finalizado'` e registra `finalized_at = now()`
- [x] 6.6 Implementar reversão: ao mover de "Finalizado" para outra etapa, limpar `finalized_at = null`
- [x] 6.7 Filtrar clientes com `pipeline_stage = 'finalizado'` da visão padrão do pipeline
- [x] 6.8 Adicionar filtro/aba "Finalizados" que exibe apenas clientes finalizados com `finalized_at` visível
- [x] 6.9 Ajustar queries do Cockpit: excluir `pipeline_stage = 'finalizado'` das métricas de pipeline ativo; incluir clientes com `finalized_at` dentro do período nas métricas de clientes atendidos

## 7. Cockpit — Filtro de data personalizado

- [x] 7.1 Substituir o filtro "últimos 30 dias" por seletor de período com date range picker (shadcn Calendar)
- [x] 7.2 Implementar lista de atalhos de mês (mês atual + 5 meses anteriores) com seleção em um clique
- [x] 7.3 Exibir período selecionado no cabeçalho do Cockpit
- [x] 7.4 Atualizar todas as queries do Cockpit para usar `dateStart`/`dateEnd` como filtro
- [x] 7.5 Implementar estado vazio para período sem dados
- [x] 7.6 Implementar aviso quando `dateEnd` está no futuro

## 8. Tarefas — Edição e alternância de status

- [x] 8.1 Investigar o componente de tarefas (`src/routes/_authenticated/tarefas.lazy.tsx`) para confirmar se o campo "Tags" tem persistência no banco ou é apenas UI
- [x] 8.2 Adicionar checkbox inline na lista de tarefas para toggle de status (`pendente` ↔ `feito`)
- [x] 8.3 Implementar chamada ao Supabase para atualizar `task_status` ao clicar no checkbox
- [x] 8.4 Criar sheet lateral de edição de tarefa (`TaskEditSheet`) seguindo o padrão de `client-detail-sheet.tsx`
- [x] 8.5 Abrir `TaskEditSheet` ao clicar no título ou ícone de edição de uma tarefa
- [x] 8.6 Preencher sheet com campos editáveis: `title`, `description`, `due_at`, `client_id` e, se confirmado com persistência, `tags`
- [x] 8.7 Implementar salvamento das edições no Supabase e fechar o sheet ao salvar
- [x] 8.8 Adicionar link para o perfil do cliente vinculado dentro do sheet
- [x] 8.9 Adicionar tooltips para "Tags" e "Regra de Ativação" explicando a finalidade de cada campo

## 9. Clareza dos campos de cliente

- [x] 9.1 Atualizar placeholder do campo "Notas e Contextos" para orientar uso correto (notas rápidas, não transcrições longas)
- [x] 9.2 Adicionar tooltip ao campo "Notas e Contextos" indicando que transcrições devem ser subidas na aba Documentos
- [x] 9.3 Atualizar label e adicionar tooltip ao campo "Contexto Comportamental" explicando que é a síntese do perfil comportamental (manual ou gerado pela IA)
- [x] 9.4 Implementar contador de caracteres restantes no campo "Contexto Comportamental" (verificar limite atual, max: 4000 via `createNote`)
- [x] 9.5 Implementar feedback visual ao atingir o limite (contador vermelho + mensagem)

## 10. Transparência do fluxo de IA e documentos

- [x] 10.1 Adicionar badge "Indexado" nos documentos com `extracted_text` não nulo; "Não processado" nos demais
- [x] 10.2 Adicionar texto orientativo na seção de documentos explicando: transcrições e resumos são indexados pela IA; contratos e imagens são armazenados mas não processados
- [x] 10.3 Implementar verificação de pré-requisitos antes de gerar a Análise Comportamental: o cliente deve ter ao menos uma nota ou um documento indexado; exibir mensagem clara se não atender
- [x] 10.4 Implementar estado de loading visível durante geração (spinner ou skeleton no lugar da análise)
- [x] 10.5 Capturar e exibir erros da IA ao usuário: mensagem legível + botão "Tentar novamente" (o `throw new Error` já existe no servidor — garantir que o frontend trate o erro)
- [x] 10.6 Adicionar tooltip ao botão "Registrar Contato" explicando que registra data, canal e conteúdo do contato como uma nota
- [x] 10.7 Implementar seção de histórico de contatos no perfil do cliente (exibir notas com `kind = 'contexto'` como linha do tempo de contatos)
- [x] 10.8 Adicionar estado vazio orientativo na seção de histórico de contatos
- [x] 10.9 Adicionar descrição e finalidade ao link de leads nas Configurações
- [x] 10.10 Implementar botão "Copiar link" com feedback visual temporário ("Copiado!" por 2 segundos)
