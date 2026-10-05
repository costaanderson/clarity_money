## Why

O planejador precisa de uma visão consolidada do dia antes de começar a trabalhar — reuniões de hoje, tarefas atrasadas, clientes para contatar e carga operacional. Hoje essa informação está espalhada em Agenda, Tarefas e Clientes, sem um ponto único de consulta. A view de Briefing centraliza esse resumo e, numa segunda fase, usa IA para preparar o planejador para cada sessão com base nas transcrições.

## What Changes

- Nova rota `/briefing` adicionada ao app (já criada como skeleton)
- Nav lateral atualizado: "Briefing" aparece antes de "Configurações"
- **Fase 1 (dados reais)**: preencher o briefing com dados já disponíveis no Supabase (agenda do dia, tarefas, clientes)
- **Fase 2 (IA)**: Seção A (Engajamento) gerada por Gemini a partir de dados de clientes e histórico de contatos
- **Fase 3 (transcrições)**: Seção B (Reuniões) enriquecida com resumo da última sessão e tarefas do cliente vindas dos documentos indexados

## Capabilities

### New Capabilities
- `daily-briefing`: View que agrega, por dia, os dados de reuniões, tarefas, carga de agenda e sugestões de engajamento com clientes
- `engagement-radar`: Motor de sugestões de contato — identifica clientes sem reunião há N dias, marcos de acompanhamento e gatilhos de engajamento, com controle de duplicidade por período
- `meeting-prep`: Preparação automática de briefing por cliente com base na última transcrição indexada: tarefas abertas/atrasadas, contexto comportamental e pauta sugerida

### Modified Capabilities
- `agenda-events`: A listagem de eventos passa a ser consumida também pela view de Briefing (sem mudança de requisito, apenas novo consumidor)

## Impact

- Novo arquivo: `src/routes/_authenticated/briefing.lazy.tsx`
- Atualização: `src/routes/_authenticated/route.lazy.tsx` (nav)
- Nova server function: `src/features/briefing/lib/briefing.functions.ts`
- Possível nova tabela: `engagement_log` para controle de duplicidade de sugestões de engajamento
- Dependência de IA: Gemini API (já usada no app) para Fase 2 e 3
