## ADDED Requirements

### Requirement: Navegação entre semanas
O Painel da Semana SHALL permitir ao usuário navegar para semanas anteriores e futuras usando controles de navegação (botões anterior/próximo). A semana exibida SHALL ser claramente identificada com o intervalo de datas (ex: "11 a 17 de ago 2026").

#### Scenario: Navegar para semana anterior
- **WHEN** o usuário clica no botão de semana anterior no Painel
- **THEN** o painel exibe os dados (clientes atendidos, compromissos, tarefas, tarefas atrasadas) referentes à semana imediatamente anterior à semana atualmente exibida

#### Scenario: Navegar para próxima semana
- **WHEN** o usuário clica no botão de próxima semana no Painel
- **THEN** o painel exibe os dados referentes à semana imediatamente seguinte à semana atualmente exibida

#### Scenario: Semana atual identificada no cabeçalho
- **WHEN** o usuário está visualizando qualquer semana no Painel
- **THEN** o cabeçalho exibe o intervalo de datas da semana selecionada (de segunda a domingo) no formato "DD de MMM a DD de MMM AAAA"

---

### Requirement: Botão "Hoje" para retornar à semana atual
O Painel SHALL exibir um botão ou ação "Hoje" que retorna a visualização para a semana atual quando o usuário estiver navegando em outra semana.

#### Scenario: Botão "Hoje" visível ao navegar fora da semana atual
- **WHEN** o usuário navega para uma semana que não é a semana atual
- **THEN** um botão "Hoje" é exibido no Painel

#### Scenario: Botão "Hoje" retorna à semana atual
- **WHEN** o usuário clica no botão "Hoje"
- **THEN** o Painel retorna a exibir os dados da semana atual e o botão "Hoje" deixa de ser exibido (ou fica desabilitado)

---

### Requirement: Estado vazio para semana sem dados
Quando uma semana não possui dados (nenhum cliente atendido, nenhum compromisso, nenhuma tarefa), o Painel SHALL exibir uma mensagem de estado vazio clara em vez de contadores zerados sem contexto.

#### Scenario: Semana passada sem dados
- **WHEN** o usuário navega para uma semana passada que não tem nenhum registro
- **THEN** o Painel exibe uma mensagem do tipo "Nenhuma atividade registrada nesta semana" em vez de zeros em branco

#### Scenario: Semana futura sem dados
- **WHEN** o usuário navega para uma semana futura que não tem nenhum compromisso ou tarefa agendada
- **THEN** o Painel exibe uma mensagem do tipo "Nenhuma atividade planejada para esta semana"
