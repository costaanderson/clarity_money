## ADDED Requirements

### Requirement: Filtro de período personalizado no Cockpit
O Cockpit SHALL permitir ao usuário selecionar um período personalizado de datas (data início e data fim) para filtrar todas as métricas exibidas. O período selecionado SHALL ser visível no cabeçalho do Cockpit.

#### Scenario: Selecionar período personalizado
- **WHEN** o usuário define uma data de início e uma data de fim no seletor de período do Cockpit
- **THEN** todas as métricas do Cockpit são recalculadas e exibidas para o intervalo selecionado

#### Scenario: Período selecionado visível no cabeçalho
- **WHEN** o usuário aplica qualquer filtro de período
- **THEN** o cabeçalho do Cockpit exibe o período ativo no formato "DD/MM/AAAA a DD/MM/AAAA" ou equivalente legível

---

### Requirement: Atalhos de período por mês fechado
O Cockpit SHALL oferecer atalhos para selecionar meses fechados sem precisar definir datas manualmente. Os atalhos SHALL incluir ao menos o mês atual e os 5 meses anteriores.

#### Scenario: Selecionar mês fechado via atalho
- **WHEN** o usuário seleciona "Julho 2026" na lista de atalhos de mês
- **THEN** o Cockpit filtra métricas de 01/07/2026 a 31/07/2026 automaticamente

#### Scenario: Lista de atalhos exibe meses disponíveis
- **WHEN** o usuário abre o seletor de período
- **THEN** são exibidos o mês atual e os 5 meses anteriores como opções de seleção rápida, além da opção de período personalizado

---

### Requirement: Estado vazio para período sem dados
Quando o período selecionado não contém nenhum dado, o Cockpit SHALL exibir mensagem de estado vazio em vez de zeros sem contexto.

#### Scenario: Período sem dados exibe estado vazio
- **WHEN** o usuário seleciona um período sem registros de atividade
- **THEN** o Cockpit exibe "Nenhum dado para o período selecionado" em vez de métricas zeradas sem explicação

#### Scenario: Período futuro exibe aviso
- **WHEN** o usuário seleciona um período que ainda não ocorreu (data fim no futuro)
- **THEN** o Cockpit exibe aviso de que o período ainda não tem dados completos, junto com os dados parciais disponíveis
