## MODIFIED Requirements

### Requirement: Agenda exibe compromissos do período atual
A tela de Agenda SHALL exibir os compromissos do período selecionado. Com Google Calendar conectado, os eventos SHALL ser buscados tanto do Supabase quanto do Google Calendar API para o mesmo intervalo, mesclados e ordenados por `start_at`. Eventos exclusivamente do Google (sem `google_event_id` no Supabase) SHALL ser marcados visualmente como "Google". Eventos locais com `google_event_id` SHALL ser exibidos uma única vez (sem duplicata).

#### Scenario: Visualização sem conexão Google
- **WHEN** usuário acessa a Agenda sem Google Calendar conectado
- **THEN** sistema exibe apenas eventos da tabela `calendar_events` do Supabase ordenados por start_at

#### Scenario: Visualização com conexão Google
- **WHEN** usuário acessa a Agenda com Google Calendar conectado
- **THEN** sistema exibe eventos do Supabase + eventos do Google Calendar mesclados, ordenados por start_at, com badge de origem nos eventos exclusivamente do Google

#### Scenario: Banner informativo atualizado
- **WHEN** usuário acessa a Agenda
- **THEN** se Google conectado: banner indica sincronização ativa; se desconectado: banner convida a conectar em Configurações
