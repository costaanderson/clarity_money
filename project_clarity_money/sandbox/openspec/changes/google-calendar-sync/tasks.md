## 1. Banco de dados — Migrations

- [x] 1.1 Criar migration: `CREATE TABLE google_calendar_tokens (user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, access_token text NOT NULL, refresh_token text NOT NULL, expires_at timestamptz NOT NULL, google_email text, created_at timestamptz DEFAULT now())`
- [x] 1.2 Criar migration: `ALTER TABLE calendar_events ADD COLUMN google_event_id text`
- [x] 1.3 Rodar as migrations no Supabase e atualizar `src/integrations/supabase/types.ts` com os novos campos
- [x] 1.4 Criar política RLS em `google_calendar_tokens`: usuário só lê/escreve/deleta o próprio row (`user_id = auth.uid()`)

## 2. Variáveis de ambiente

- [x] 2.1 Adicionar `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` no `.env` local (obtidos no Google Cloud Console)
- [x] 2.2 Adicionar as mesmas variáveis no Vercel (Environment Variables → Production e Preview)
- [x] 2.3 Registrar o URI de redirect `<URL>/api/google/callback` no Google Cloud Console (Credenciais → OAuth 2.0 → URIs autorizados de redirecionamento) — tanto localhost quanto o domínio de produção

## 3. Server functions — Auth Google

- [x] 3.1 Criar `src/features/agenda/lib/google-auth.functions.ts` com:
  - `getGoogleAuthUrl()`: retorna URL do OAuth com scopes, `access_type=offline`, `prompt=consent` e `state` contendo o user_id
  - `exchangeCodeForTokens(code, userId)`: POST para `https://oauth2.googleapis.com/token`, salva tokens na tabela `google_calendar_tokens`
  - `revokeGoogleCalendar(userId)`: deleta o row de `google_calendar_tokens` para o usuário
  - `getGoogleToken(userId)`: busca tokens, renova via refresh_token se `expires_at` próximo, retorna `access_token` válido
  - `getGoogleConnectionStatus(userId)`: retorna `{ connected: boolean, email: string | null }`

## 4. Endpoint de callback OAuth

- [x] 4.1 Criar `src/routes/api/google/callback.ts` como route API do TanStack Start
- [x] 4.2 Handler lê `code` e `state` da query string, chama `exchangeCodeForTokens`, redireciona para `/configuracoes` com `?connected=1` em caso de sucesso ou `?error=google_auth_failed` em caso de erro

## 5. Server functions — Sync de eventos

- [x] 5.1 Criar `src/features/agenda/lib/google-calendar.functions.ts` com:
  - `syncEventToGoogle(userId, event)`: POST para Google Calendar API `/calendars/primary/events`, retorna `google_event_id`
  - `fetchGoogleEvents(userId, from, to)`: GET para Google Calendar API listando eventos no intervalo, retorna array normalizado compatível com o tipo local
  - `deleteGoogleEvent(userId, googleEventId)`: DELETE para Google Calendar API

## 6. Atualizar `calendar.functions.ts`

- [x] 6.1 Atualizar `createEvent` em `src/features/agenda/lib/calendar.functions.ts`: após inserir no Supabase, chamar `syncEventToGoogle` se o usuário tiver Google conectado; salvar o `google_event_id` retornado; em caso de falha de sync, não lançar erro (apenas logar)
- [x] 6.2 Atualizar `deleteEvent`: após deletar do Supabase, se o evento tiver `google_event_id`, chamar `deleteGoogleEvent` (falha não bloqueia)
- [x] 6.3 Atualizar `listEvents`: se o usuário tiver Google conectado, chamar `fetchGoogleEvents` para o mesmo intervalo e mesclar os resultados (deduplicar por `google_event_id`), retornar ordenado por `start_at`

## 7. UI — Configurações

- [x] 7.1 Adicionar server function `getGoogleConnectionStatus` ao card do Google Agenda em `configuracoes.lazy.tsx`
- [x] 7.2 Quando desconectado: substituir botão disabled por botão habilitado "Conectar Google Agenda" que chama `getGoogleAuthUrl` e redireciona
- [x] 7.3 Quando conectado: exibir badge "Conectado" com o email Google, botão "Desconectar" que chama `revokeGoogleCalendar` e invalida a query
- [x] 7.4 Tratar query `?connected=1` e `?error=google_auth_failed` na URL para exibir toast de sucesso/erro ao retornar do OAuth

## 8. UI — Agenda

- [x] 8.1 Atualizar o banner informativo em `agenda.lazy.tsx`: se conectado exibir "Sincronizado com Google Calendar"; se desconectado manter o convite para Configurações
- [x] 8.2 Na listagem de eventos, identificar visualmente eventos exclusivamente do Google (sem `id` local): exibir ícone/badge "Google Agenda" no card do evento
- [x] 8.3 Verificar que eventos com `google_event_id` não aparecem duplicados (um do Supabase + um do Google)

## 9. Verificação final

- [x] 9.1 Testar fluxo completo: conectar → criar evento → verificar no Google Calendar → deletar → verificar remoção
- [x] 9.2 Testar revogação: desconectar → verificar que novos eventos não são sincronizados
- [x] 9.3 Testar com token expirado: forçar `expires_at` no passado no banco → verificar renovação automática
- [x] 9.4 Verificar build sem erros após todas as alterações
