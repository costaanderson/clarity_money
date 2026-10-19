## Context

O app usa TanStack Start (SSR) + Supabase + Vercel. O login pode ser via email/senha ou Google OAuth. A Agenda já existe como feature local (tabela `calendar_events` no Supabase). O Google Calendar requer OAuth 2.0 com o scope `https://www.googleapis.com/auth/calendar` e retorna um `refresh_token` permanente que pode ser usado server-side para renovar o `access_token`.

O Google Cloud Console precisa ter a **Calendar API habilitada** e o URI de redirect registrado antes da implementação — isso é pré-requisito manual fora do código.

## Goals / Non-Goals

**Goals:**
- Botão "Conectar Google Agenda" funcional nas Configurações (OAuth com scope de calendar)
- Tokens armazenados no Supabase com renovação automática
- Criar evento na Bússola → cria no Google Calendar
- Agenda exibe eventos locais + Google Calendar mesclados
- Deletar evento → deleta no Google Calendar se sincronizado
- Revogar conexão nas Configurações

**Non-Goals:**
- Sincronização de eventos criados diretamente no Google (pull sem trigger do app)
- Edição de eventos já existentes no Google (apenas criação e deleção)
- Suporte a múltiplos calendários Google (usa apenas o primário `primary`)
- Notificações push ou webhooks do Google

## Decisions

### D1: OAuth separado do login (não reutiliza provider_token do Supabase)

O login Google via Supabase não persiste o `refresh_token` de forma acessível nas server functions — o `provider_token` expira em 1h e não há mecanismo de renovação server-side nativo. Além disso, usuários que usam email/senha também precisam poder conectar a agenda.

**Decisão:** Fluxo OAuth dedicado para calendar, gerenciado pelo próprio app.
- Server function `getGoogleAuthUrl` gera a URL com `access_type=offline&prompt=consent` (garante o refresh_token).
- Callback em `src/routes/api/google/callback.ts` troca o `code` por tokens e salva no banco.
- Alternativa descartada: usar `session.provider_token` do Supabase — não funciona para usuários email/senha e o token expira.

### D2: Tokens no Supabase (tabela `google_calendar_tokens`)

```sql
CREATE TABLE google_calendar_tokens (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  google_email text,
  created_at timestamptz DEFAULT now()
);
-- RLS: user só acessa o próprio row
```

`user_id` como PK (um token por usuário — sem multi-conta).

### D3: `google_event_id` na tabela `calendar_events`

```sql
ALTER TABLE calendar_events ADD COLUMN google_event_id text;
```

Permite deduplificar na listagem e saber qual evento local está sincronizado com o Google.

### D4: Chamadas à Google Calendar API via `fetch` nativo (sem googleapis npm)

O pacote `googleapis` é pesado e tem problemas de compatibilidade ESM em alguns bundlers. As chamadas necessárias são simples (3 endpoints: POST /events, GET /events, DELETE /events/{id}).

**Decisão:** Usar `fetch` direto contra `https://www.googleapis.com/calendar/v3/calendars/primary/events`.

### D5: Renovação de token dentro de cada server function

Antes de qualquer chamada à Google API, a server function checa `expires_at < now() + 60s`. Se expirado, faz POST para `https://oauth2.googleapis.com/token` com o refresh_token e atualiza o banco. Simples e sem infraestrutura extra.

### D6: Falhas de sync não bloqueiam operação local

Se a chamada ao Google falhar (token revogado, quota, timeout), o evento é mantido/deletado no Supabase e o usuário recebe um `toast.warning` explicativo. A operação local nunca é desfeita por falha de sync.

## Risks / Trade-offs

- **Variáveis extras obrigatórias** (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) → precisam ser adicionadas no Vercel e no `.env` antes do deploy
- **`prompt=consent` forçado** → usuário vê a tela de permissão a cada re-conexão (necessário para garantir o refresh_token)
- **Sem sync reverso** → eventos criados diretamente no Google não aparecem na Bússola até que o usuário atualize (limitação conhecida, documentada no banner da Agenda)
- **Rate limits do Google Calendar API** → improvável no uso de um único usuário; sem mitigação adicional necessária nesta fase

## Migration Plan

1. Criar variáveis `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` no Google Cloud Console e no Vercel
2. Registrar URI de redirect: `<VERCEL_URL>/api/google/callback`
3. Rodar migration SQL (tabela `google_calendar_tokens` + coluna `google_event_id`)
4. Deploy — feature fica disponível; usuários que não conectarem não são impactados

## Open Questions

- Qual o domínio de produção para o URI de redirect? (necessário para registrar no Google Cloud Console)
- O Google Cloud Console do projeto já tem Calendar API habilitada?
