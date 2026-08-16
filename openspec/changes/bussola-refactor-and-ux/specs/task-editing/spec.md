## ADDED Requirements

### Requirement: Alternar status de conclusão de tarefa inline
O usuário SHALL conseguir marcar e desmarcar tarefas como concluídas diretamente na lista de tarefas, sem navegar para o cliente vinculado.

#### Scenario: Marcar tarefa como concluída
- **WHEN** o usuário clica no checkbox de uma tarefa pendente na tela de tarefas
- **THEN** a tarefa é marcada como concluída e o checkbox exibe estado marcado

#### Scenario: Desmarcar tarefa concluída
- **WHEN** o usuário clica no checkbox de uma tarefa já marcada como concluída
- **THEN** a tarefa volta ao status pendente e o checkbox exibe estado desmarcado

#### Scenario: Tarefa não muda status sem ação do usuário
- **WHEN** o usuário visualiza a lista de tarefas sem interagir com checkboxes
- **THEN** nenhuma tarefa muda de status automaticamente

---

### Requirement: Edição de tarefa via sheet lateral
O usuário SHALL conseguir editar todos os campos de uma tarefa (título, descrição, data de vencimento, cliente vinculado, tags) diretamente na tela de tarefas, sem precisar navegar para o perfil do cliente. A edição SHALL ocorrer em um sheet lateral.

#### Scenario: Abrir sheet de edição de tarefa
- **WHEN** o usuário clica no título ou no ícone de edição de uma tarefa na lista
- **THEN** um sheet lateral é aberto com todos os campos da tarefa editáveis

#### Scenario: Salvar edição de tarefa
- **WHEN** o usuário edita campos no sheet e clica em "Salvar"
- **THEN** as alterações são persistidas e o sheet é fechado; a lista de tarefas reflete as mudanças imediatamente

#### Scenario: Editar tarefa já concluída
- **WHEN** o usuário abre o sheet de uma tarefa marcada como concluída
- **THEN** os campos continuam editáveis normalmente, independente do status de conclusão

#### Scenario: Link para cliente vinculado dentro do sheet
- **WHEN** o sheet de edição de tarefa está aberto e a tarefa tem um cliente vinculado
- **THEN** existe um link no sheet que navega para o perfil do cliente vinculado

---

### Requirement: Clareza dos campos de Tags e Regra de Ativação
Os campos "Tags" e "Regra de Ativação" no formulário de tarefa SHALL ter tooltip ou texto de ajuda explicando sua finalidade e como usar.

#### Scenario: Tooltip de Tags visível
- **WHEN** o usuário passa o cursor (ou toca) no label ou ícone de ajuda do campo "Tags"
- **THEN** um tooltip exibe a explicação de que tags são usadas para categorizar e filtrar tarefas

#### Scenario: Tooltip de Regra de Ativação visível
- **WHEN** o usuário passa o cursor (ou toca) no label ou ícone de ajuda do campo "Regra de Ativação"
- **THEN** um tooltip explica que regras de ativação associam a tarefa a um gatilho automático de ativação configurado nas configurações do sistema
