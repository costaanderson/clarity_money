## ADDED Requirements

### Requirement: Criar evento na Bússola sincroniza com Google Calendar
Quando o usuário cria um compromisso na Agenda da Bússola e está com Google Calendar conectado, o sistema SHALL criar o evento correspondente no Google Calendar primário do usuário e salvar o `google_event_id` retornado no registro local.

#### Scenario: Criação com Google conectado
- **WHEN** usuário submete o formulário de novo compromisso e há token Google válido
- **THEN** sistema cria o evento no Supabase, depois cria o evento no Google Calendar com título, descrição, start_at e end_at, salva o `google_event_id` no registro local e exibe confirmação de sucesso

#### Scenario: Criação sem Google conectado
- **WHEN** usuário submete o formulário de novo compromisso e não há token Google
- **THEN** sistema cria o evento apenas no Supabase sem tentativa de sincronização

#### Scenario: Falha na criação no Google
- **WHEN** a criação no Google Calendar retorna erro (ex: token expirado após tentativa de refresh)
- **THEN** sistema mantém o evento criado no Supabase, exibe aviso "Compromisso salvo, mas não foi possível sincronizar com o Google Calendar" e não bloqueia o fluxo

### Requirement: Eventos do Google Calendar aparecem na Agenda
Quando o usuário acessa a Agenda e está com Google Calendar conectado, o sistema SHALL buscar eventos do Google Calendar para o intervalo exibido e mostrá-los mesclados com os eventos locais.

#### Scenario: Listagem com Google conectado
- **WHEN** usuário acessa a Agenda e há token Google válido
- **THEN** sistema busca eventos do Google Calendar via API para o período atual, mescla com eventos locais (deduplicando por google_event_id) e exibe todos ordenados por data

#### Scenario: Eventos do Google identificados visualmente
- **WHEN** um evento exibido na Agenda veio do Google Calendar (sem registro local correspondente)
- **THEN** evento exibe badge ou ícone "Google" para diferenciá-lo dos eventos locais

#### Scenario: Listagem sem Google conectado
- **WHEN** usuário acessa a Agenda e não há token Google
- **THEN** sistema exibe apenas eventos locais do Supabase, sem tentativa de chamada à API Google

### Requirement: Deletar evento na Bússola remove do Google Calendar
Quando o usuário deleta um compromisso que possui `google_event_id`, o sistema SHALL também deletar o evento correspondente no Google Calendar.

#### Scenario: Deleção com evento sincronizado
- **WHEN** usuário clica em deletar um evento que tem `google_event_id`
- **THEN** sistema deleta o evento no Supabase e em seguida deleta no Google Calendar via DELETE na API

#### Scenario: Falha na deleção no Google
- **WHEN** a deleção no Google Calendar retorna erro
- **THEN** sistema mantém a deleção local (Supabase) e exibe aviso sem bloquear o fluxo
