## ADDED Requirements

### Requirement: Usuário pode conectar sua conta Google Calendar
O sistema SHALL permitir que o usuário autorize acesso ao Google Calendar via OAuth 2.0, independentemente do método de login (Google ou email/senha). O fluxo SHALL solicitar o scope `https://www.googleapis.com/auth/calendar`. Após autorização, o sistema SHALL salvar `access_token`, `refresh_token` e `expires_at` na tabela `google_calendar_tokens` (RLS por user_id).

#### Scenario: Usuário inicia conexão
- **WHEN** usuário clica em "Conectar Google Agenda" nas Configurações
- **THEN** sistema redireciona para URL de autorização do Google com os scopes corretos e parâmetro `state` contendo o user_id

#### Scenario: Callback bem-sucedido
- **WHEN** Google redireciona para `/api/google/callback` com `code` válido
- **THEN** sistema troca o `code` por `access_token` e `refresh_token`, salva na tabela `google_calendar_tokens` e redireciona para `/configuracoes`

#### Scenario: Callback com erro
- **WHEN** Google redireciona para `/api/google/callback` com parâmetro `error`
- **THEN** sistema redireciona para `/configuracoes` com query `?error=google_auth_failed` e exibe mensagem de erro

### Requirement: Usuário pode ver status da conexão nas Configurações
O sistema SHALL exibir no card "Google Agenda" se a conta está conectada ou desconectada, com o email do Google conectado quando disponível.

#### Scenario: Conta conectada
- **WHEN** usuário acessa Configurações e há token válido para seu user_id
- **THEN** sistema exibe badge "Conectado" com email da conta Google e botão "Desconectar"

#### Scenario: Conta desconectada
- **WHEN** usuário acessa Configurações e não há token para seu user_id
- **THEN** sistema exibe botão "Conectar Google Agenda" habilitado

### Requirement: Usuário pode revogar a conexão
O sistema SHALL permitir que o usuário remova a autorização, deletando o registro de tokens do banco.

#### Scenario: Revogação
- **WHEN** usuário clica em "Desconectar" nas Configurações
- **THEN** sistema deleta o registro em `google_calendar_tokens` para o user_id e atualiza o card para estado desconectado

### Requirement: Sistema renova access_token automaticamente
O sistema SHALL usar o `refresh_token` para obter um novo `access_token` quando o token atual estiver expirado (expires_at < now), antes de qualquer chamada à Google Calendar API.

#### Scenario: Token expirado
- **WHEN** uma server function tenta usar o access_token e `expires_at` já passou
- **THEN** sistema faz POST para `https://oauth2.googleapis.com/token` com o refresh_token, salva o novo access_token e expires_at no banco e prossegue com a operação
