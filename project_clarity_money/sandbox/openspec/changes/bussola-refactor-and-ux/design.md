## Context

O Bússola foi gerado inteiramente via Lovable. A estrutura atual é flat: toda a lógica de UI, negócio e data fetching vive em `src/components/` e `src/lib/`, com arquivos grandes como `client-detail.tsx` misturando responsabilidades. Existem duas dependências diretas do Lovable (`src/integrations/lovable/index.ts` e `src/lib/lovable-error-reporting.ts`) que precisam ser auditadas e removidas.

O banco de dados é Supabase (PostgreSQL) com RLS. O roteamento usa TanStack Start com file-based routes em `src/routes/_authenticated/`. O projeto já tem `src/integrations/supabase/` funcionando e não deve ser alterado.

## Goals / Non-Goals

**Goals:**
- Reorganizar o código em arquitetura feature-based sem quebrar funcionalidades existentes
- Remover dependências do Lovable de forma segura (audit → substituir → remover)
- Implementar as 7 capabilities de produto definidas no proposal
- Manter compatibilidade total com o banco Supabase atual (apenas migrations aditivas)

**Non-Goals:**
- Reescrever em outra stack ou mudar o framework de roteamento
- Recriar migrations do zero ou alterar colunas existentes
- Implementar sincronização bidirecional com Google Agenda
- Adicionar testes automatizados nesta fase

## Decisions

### 1. Arquitetura feature-based sob `src/features/`

**Decisão:** Criar `src/features/<domain>/` com subpastas `components/`, `hooks/`, `services/` e `types/` por domínio. As rotas TanStack em `src/routes/_authenticated/` ficam como wrappers finos — importam de `features/` e não contêm lógica.

**Alternativa considerada:** Manter estrutura atual e apenas extrair lógica dos componentes grandes. Descartada porque não resolve o problema de escalabilidade e mistura de responsabilidades.

**Domínios:** `auth`, `clients`, `pipeline`, `tasks`, `agenda`, `cockpit`, `week-panel`, `diagnostic`, `ai`, `settings`, `activation-rules`.

**Compartilhado:** `src/shared/` para componentes de UI reutilizáveis (shadcn permanece em `shared/components/ui/`), hooks genéricos, tipos globais e utils.

---

### 2. Remoção das dependências do Lovable

**Decisão:** Auditar os dois arquivos antes de remover:
- `src/integrations/lovable/index.ts` — verificar se é apenas re-export de config; substituir pelo equivalente direto ou remover se não usado
- `src/lib/lovable-error-reporting.ts` — substituir por wrapper simples de log de erro (`console.error` estruturado ou Sentry se já configurado) e remover referências ao Lovable

**Ordem:** audit → substituir referências → remover arquivo → verificar build.

---

### 3. Etapa "Finalizado" no pipeline — coluna de status

**Decisão:** Adicionar `'finalizado'` como novo valor na coluna de status do pipeline no Supabase (migration aditiva — não altera valores existentes). Clientes finalizados têm `finalized_at` (timestamp) registrado para uso nas métricas do Cockpit.

**Alternativa considerada:** Adicionar coluna booleana `is_finalized`. Descartada porque o pipeline já usa uma coluna de status para o kanban — adicionar um valor ao enum é mais consistente e evita lógica dual.

**Impacto no Cockpit:** queries do Cockpit devem excluir clientes `finalizados` das métricas de pipeline ativo, mas incluí-los nas métricas de "clientes atendidos" se `finalized_at` estiver dentro do período selecionado.

---

### 4. Filtro de data no Cockpit — state local

**Decisão:** Armazenar o período selecionado em state local do componente (não na URL). Oferecer dois modos: seleção livre (date range picker) e atalhos por mês (lista dos últimos 6 meses + mês atual).

**Alternativa considerada:** Persistir na URL para compartilhamento de links. Descartada nesta fase — o sistema tem um único usuário e a complexidade não se justifica agora.

---

### 5. Edição de tarefas — sheet lateral

**Decisão:** Usar o padrão sheet lateral (já existe `client-detail-sheet.tsx`) para edição de tarefas. Clicar em uma tarefa na tela de tarefas abre o sheet com todos os campos editáveis. Marcar/desmarcar concluída fica disponível tanto no sheet quanto inline na lista (checkbox).

**Alternativa considerada:** Edição inline na linha da lista. Descartada por complexidade de layout com múltiplos campos (título, data, cliente, tags, regra de ativação).

---

### 6. Navegação de semanas — offset em state

**Decisão:** Armazenar um inteiro `weekOffset` (0 = semana atual, -1 = semana anterior, +1 = próxima) em state local do Painel. Calcular o intervalo da semana a partir do offset. Botão "Hoje" reseta para 0.

**Alternativa considerada:** Armazenar a data exata de início da semana. O offset é mais simples e suficiente para o caso de uso atual.

---

### 7. Clareza de campos e IA — apenas frontend

**Decisão:** Todas as melhorias de clareza (labels, placeholders, tooltips, contadores, estados de erro da IA, orientação de documentos) são mudanças puramente de frontend. Nenhuma alteração de schema necessária.

## Risks / Trade-offs

- **Reorganização quebra imports:** durante a refatoração, imports de `src/components/` e `src/lib/` precisam ser atualizados. Risco mitigado fazendo a mudança por domínio um de cada vez, verificando o build após cada domínio.
- **Migration de pipeline:** adicionar valor ao enum de status pode requerer recriação do tipo no PostgreSQL (dependendo de como o enum foi criado). Verificar se é `text` com constraint ou `enum` nativo — se for enum nativo, usar `ALTER TYPE ... ADD VALUE` que é não-destrutivo.
- **IA retorna erro sem context claro:** o fluxo atual pode falhar silenciosamente. A melhoria de transparência depende de entender quais erros a API retorna — mapear antes de implementar as mensagens de erro.
- **Sheet de tarefas vs. navegação atual:** atualmente, clicar numa tarefa navega para o cliente. Mudar para sheet pode quebrar expectativas do usuário que aprendeu o comportamento atual. Mitigação: manter link para o cliente dentro do sheet.

## Migration Plan

1. Criar branch `refactor/architecture-and-ux` a partir do `main`
2. **Fase 1 — Refatoração:** por domínio, mover para `src/features/`; verificar build após cada domínio; remover Lovable no final
3. **Fase 2 — Features de produto:** implementar capabilities na ordem de prioridade do PRD; cada capability em commit separado
4. **Fase 3 — Polimento:** clareza de campos, IA, documentos
5. Merge para `main` após todas as fases passarem no build e nos testes manuais dos fluxos críticos

**Rollback:** qualquer fase pode ser revertida via git sem impacto no banco, exceto a migration de pipeline (que é aditiva e não-destrutiva).

---

### 8. Substituição do gateway de IA do Lovable — chamada direta ao Gemini

**Descoberta:** `ai.functions.ts` usa `LOVABLE_API_KEY` e `https://ai.gateway.lovable.dev/v1/chat/completions` como gateway. Isso é uma dependência de infraestrutura do Lovable que precisa ser removida junto com as demais.

**Decisão:** Substituir pela chamada direta à API do Google Gemini (`https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`). O endpoint é compatível com o formato OpenAI (`messages` com `role`/`content`), então a mudança é mínima — apenas trocar a URL e a variável de ambiente (`LOVABLE_API_KEY` → `GOOGLE_AI_API_KEY`).

**Alternativa considerada:** Migrar para OpenAI ou Anthropic. Descartada porque o modelo atual (`google/gemini-2.5-flash`) já é do Google e a troca direta tem menor custo de migração.

---

### 9. Substituição do OAuth do Lovable por Supabase nativo

**Descoberta:** `src/integrations/lovable/index.ts` usa `@lovable.dev/cloud-auth-js` para OAuth (Google, Apple, Microsoft, Lovable). A remoção do Lovable quebra o fluxo de login.

**Decisão:** Substituir por `supabase.auth.signInWithOAuth({ provider: 'google' })` (e equivalentes para outros providers) usando o Supabase Auth nativo. O resultado é idêntico para o usuário — redireciona para o provider e retorna o token para o Supabase.

**Atenção:** Verificar se os providers OAuth estão configurados no dashboard do Supabase antes de remover o wrapper do Lovable.

---

### 10. Extração de texto de documentos para contexto da IA

**Decisão (B escolhida):** Implementar extração de texto no momento do upload. Adicionar coluna `extracted_text text` (nullable) na tabela `documents`. Ao registrar um documento, o servidor tenta extrair o texto e salva nessa coluna. Documentos com `extracted_text` não nulo exibem badge "Indexado"; os demais exibem "Não processado".

**Tipos de arquivo suportados nesta fase:**
- `.txt` e `.md`: download do Storage + leitura direta como string
- `.pdf`: download do Storage + extração via `pdf-parse` (Node.js)
- Imagens e outros formatos: armazenados sem extração (badge "Não processado")

**Contexto da IA atualizado:** `generateAI` passa a buscar também `documents.extracted_text` e concatena os textos extraídos ao contexto das notas, com separador claro para o modelo.

**Migration necessária:** `ALTER TABLE documents ADD COLUMN extracted_text text;` — aditiva e não-destrutiva.

## Open Questions

- `pipeline_stage` é enum nativo PostgreSQL (confirmado via types.ts). Migration: `ALTER TYPE pipeline_stage ADD VALUE 'finalizado'` — não-destrutiva. ✓ **Resolvido**
- `src/integrations/lovable/index.ts` fornece OAuth em runtime. Precisa ser substituído por Supabase native OAuth antes de remover. ✓ **Resolvido**
- API do Gemini direta retorna códigos HTTP padrão — 429 (rate limit) e 4xx/5xx tratáveis da mesma forma que o gateway atual. ✓ **Resolvido**
- A tabela `tasks` não tem coluna `tags` no banco — o campo "Tags" no formulário precisa ser investigado no componente antes de implementar a edição de tarefas.
