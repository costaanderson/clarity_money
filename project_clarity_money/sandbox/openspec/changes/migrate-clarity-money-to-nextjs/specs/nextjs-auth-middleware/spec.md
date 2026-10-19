## ADDED Requirements

### Requirement: Middleware de proteção de rotas autenticadas
O arquivo `middleware.ts` na raiz do projeto SHALL interceptar todas as requisições para rotas autenticadas e verificar a sessão Supabase antes de permitir o acesso.

#### Scenario: Usuário não autenticado tenta acessar rota protegida
- **WHEN** uma requisição chegar em qualquer rota sob `/(authenticated)` (ex: `/cockpit`, `/clientes`)
- **AND** não houver sessão válida nos cookies
- **THEN** o middleware SHALL redirecionar para `/auth` imediatamente, sem renderizar a página

#### Scenario: Usuário autenticado acessa rota protegida
- **WHEN** uma requisição chegar em rota protegida com sessão válida nos cookies
- **THEN** o middleware SHALL deixar a requisição prosseguir normalmente
- **AND** SHALL renovar o token de sessão se estiver próximo do vencimento

---

### Requirement: Refresh automático de sessão no middleware
O middleware SHALL usar `@supabase/ssr` para renovar tokens de sessão expirados de forma transparente.

#### Scenario: Token expirado mas refresh token válido
- **WHEN** o access token estiver expirado mas o refresh token ainda for válido
- **THEN** o middleware SHALL obter um novo access token automaticamente
- **AND** SHALL atualizar os cookies de sessão na response antes de prosseguir

---

### Requirement: Rotas públicas não interceptadas
O middleware SHALL aplicar verificação de auth APENAS nas rotas autenticadas, deixando rotas públicas livres.

#### Scenario: Acesso à página de login
- **WHEN** uma requisição chegar em `/auth`
- **THEN** o middleware SHALL deixar prosseguir sem verificar sessão

#### Scenario: Acesso ao diagnóstico público
- **WHEN** uma requisição chegar em `/diagnostico` ou `/api/public/*`
- **THEN** o middleware SHALL deixar prosseguir sem verificar sessão

---

### Requirement: Redirecionamento de usuário já autenticado em `/auth`
Se um usuário autenticado tentar acessar `/auth`, SHALL ser redirecionado para o dashboard.

#### Scenario: Usuário logado acessa página de login
- **WHEN** uma requisição com sessão válida chegar em `/auth`
- **THEN** o middleware SHALL redirecionar para `/` (dashboard)
