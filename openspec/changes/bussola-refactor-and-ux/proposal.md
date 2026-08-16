## Why

O Bússola foi gerado via Lovable e já tem uma base funcional, mas o código tem organização ruim (arquivos grandes, lógica misturada, dependências desnecessárias do Lovable) e os fluxos centrais de produto têm lacunas de usabilidade que impedem o uso real — identificadas em sessão de feedback com usuária real (07/08/2026). A refatoração e as melhorias precisam acontecer agora para tornar o sistema mantível e adotável antes que o uso cresça.

## What Changes

- Reorganização do código em arquitetura feature-based, removendo dependências do Lovable
- Navegação entre semanas no Painel da Semana (histórico + futuro)
- Etapa "Finalizado" no Pipeline, com clientes finalizados excluídos da visão ativa
- Filtro de data personalizado no Cockpit (período livre + atalhos por mês)
- Edição e alternância de status de tarefas diretamente na tela de tarefas
- Clareza dos campos de cliente: labels, placeholders, tooltips e contadores de caracteres
- Transparência do fluxo de IA: feedback de pré-requisitos, estados de loading/erro e histórico de "Registrar Contato" visível
- Orientação sobre documentos: o que subir e como a IA usa cada tipo

## Capabilities

### New Capabilities

- `codebase-architecture`: Reorganização do codebase de estrutura plana/Lovable para feature-based (componentes, hooks, services e tipos por domínio), com remoção de dependências do Lovable
- `week-panel-navigation`: Navegação entre semanas no Painel da Semana com estado vazio e botão "Hoje"
- `pipeline-finalized-stage`: Etapa "Finalizado" no pipeline com visão filtrada de clientes finalizados e impacto no Cockpit
- `cockpit-date-filter`: Filtro de período personalizado e atalhos por mês no Cockpit
- `task-editing`: Edição inline e alternância de status de tarefas diretamente na tela de tarefas
- `client-fields-ux`: Melhoria de labels, placeholders, tooltips e contadores nos campos de cliente
- `ai-flow-transparency`: Feedback de pré-requisitos da IA, estados de loading/erro, histórico de Registrar Contato e orientação sobre documentos

### Modified Capabilities

<!-- Nenhuma spec existente — todas as capabilities são novas -->

## Impact

- **Frontend:** todos os componentes nas rotas `_authenticated/` são afetados pela refatoração; componentes de Pipeline, Tarefas, Cockpit, Painel (index) e Clientes recebem novas funcionalidades
- **Backend/Supabase:** nova coluna ou valor de enum para status "finalizado" no pipeline; nenhuma outra migration destrutiva
- **IA:** ajuste no fluxo de geração da Análise Comportamental para expor pré-requisitos e estados de erro; nenhuma mudança de modelo ou provider
- **Dependências removidas:** `src/integrations/lovable/` e `src/lib/lovable-error-reporting.ts`
- **Sem impacto:** banco de dados existente (exceto adição aditiva para pipeline), autenticação, wizard público de diagnóstico, rotas de API públicas
