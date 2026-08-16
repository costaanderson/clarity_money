## ADDED Requirements

### Requirement: Cliente Supabase browser com createBrowserClient
O projeto SHALL usar `createBrowserClient` do pacote `@supabase/ssr` para instanciar o cliente Supabase no browser, substituindo o wrapper Lovable.

#### Scenario: Cliente browser inicializado
- **WHEN** um client component precisar do cliente Supabase
- **THEN** SHALL importar de `@/lib/supabase/client` que usa `createBrowserClient`
- **AND** o cliente SHALL usar `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

### Requirement: Cliente Supabase server com createServerClient
O projeto SHALL usar `createServerClient` do pacote `@supabase/ssr` em Server Components, Server Actions e middleware, passando o cookie store para gerenciamento de sessão.

#### Scenario: Server Action acessa Supabase com sessão do usuário
- **WHEN** uma Server Action chamar o cliente server-side
- **THEN** o cliente SHALL ler os cookies da requisição para obter a sessão do usuário atual
- **AND** as queries SHALL respeitar as políticas RLS do Supabase para aquele usuário

#### Scenario: Server Action usa service role (acesso privilegiado)
- **WHEN** uma Server Action precisar contornar RLS
- **THEN** SHALL usar cliente separado com `SUPABASE_SERVICE_ROLE_KEY`
- **AND** esse cliente SHALL nunca ser exposto ao browser

---

### Requirement: Login OAuth via Supabase Auth direto
O fluxo de autenticação OAuth (Google) SHALL ser implementado diretamente via `supabase.auth.signInWithOAuth()`, sem o wrapper `@lovable.dev/cloud-auth-js`.

#### Scenario: Login com Google
- **WHEN** o usuário clicar em "Entrar com Google" na página `/auth`
- **THEN** `supabase.auth.signInWithOAuth({ provider: 'google' })` SHALL redirecionar para o fluxo OAuth do Google
- **AND** após autenticação SHALL redirecionar de volta para `/` (dashboard)

#### Scenario: Callback de autenticação
- **WHEN** o Google redirecionar para o callback após autenticação
- **THEN** o Route Handler em `app/auth/callback/route.ts` SHALL trocar o code por sessão
- **AND** SHALL setar os cookies de sessão corretamente via `@supabase/ssr`

---

### Requirement: Logout limpa sessão e cookies
O logout SHALL encerrar a sessão no Supabase e limpar todos os cookies de autenticação.

#### Scenario: Usuário faz logout
- **WHEN** o usuário acionar o logout
- **THEN** `supabase.auth.signOut()` SHALL ser chamado
- **AND** o usuário SHALL ser redirecionado para `/auth`
- **AND** cookies de sessão SHALL ser removidos

---

### Requirement: Remoção completa de dependências Lovable
Todas as referências ao pacote `@lovable.dev/cloud-auth-js` e ao wrapper de auth Lovable SHALL ser removidas do projeto.

#### Scenario: Build sem dependências Lovable
- **WHEN** o projeto for buildado após a migração
- **THEN** nenhum import de `@lovable.dev/*` SHALL existir no código
- **AND** o build SHALL completar sem erros relacionados a pacotes ausentes
