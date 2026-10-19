## ADDED Requirements

### Requirement: Etapa "Finalizado" no pipeline
O pipeline SHALL incluir uma etapa "Finalizado" que representa o encerramento do processo com um cliente. Um cliente movido para "Finalizado" SHALL ter a data de finalização (`finalized_at`) registrada no banco de dados.

#### Scenario: Mover cliente para "Finalizado"
- **WHEN** o usuário arrasta ou move um cliente para a etapa "Finalizado" no pipeline
- **THEN** o status do cliente é atualizado para "finalizado" e `finalized_at` é registrado com a data/hora atual

#### Scenario: Data de finalização registrada
- **WHEN** um cliente é movido para "Finalizado"
- **THEN** o campo `finalized_at` no banco de dados é preenchido com o timestamp do momento da ação

---

### Requirement: Visão padrão do pipeline exclui clientes finalizados
A visão padrão do pipeline SHALL exibir apenas clientes que não estão na etapa "Finalizado". Clientes finalizados SHALL ser acessíveis via filtro ou aba separada.

#### Scenario: Pipeline ativo não exibe clientes finalizados
- **WHEN** o usuário acessa o pipeline sem nenhum filtro aplicado
- **THEN** clientes com status "finalizado" não aparecem em nenhuma coluna do kanban

#### Scenario: Visualizar clientes finalizados
- **WHEN** o usuário ativa o filtro ou aba "Finalizados"
- **THEN** o sistema exibe apenas os clientes com status "finalizado", com a data de finalização visível

---

### Requirement: Reverter cliente de "Finalizado" para etapa anterior
Um cliente na etapa "Finalizado" SHALL poder ser movido de volta para uma etapa ativa do pipeline caso a finalização tenha sido feita por engano.

#### Scenario: Reverter finalização
- **WHEN** o usuário move um cliente de "Finalizado" para qualquer outra etapa do pipeline
- **THEN** o status é atualizado para a nova etapa e `finalized_at` é limpo (definido como null)

---

### Requirement: Clientes finalizados no Cockpit
As métricas do Cockpit SHALL tratar clientes finalizados de forma diferenciada: excluídos das métricas de pipeline ativo, mas incluídos nas métricas de clientes atendidos quando `finalized_at` está dentro do período selecionado.

#### Scenario: Cockpit exclui finalizados do pipeline ativo
- **WHEN** o usuário visualiza as métricas do Cockpit para qualquer período
- **THEN** as métricas de pipeline ativo (ex: clientes por etapa) não incluem clientes com status "finalizado"

#### Scenario: Cockpit inclui finalizados em clientes atendidos
- **WHEN** o usuário seleciona um período no Cockpit que contém a `finalized_at` de um cliente
- **THEN** esse cliente é contabilizado nas métricas de "clientes atendidos" ou equivalente para o período
