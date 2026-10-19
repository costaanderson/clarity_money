## 1. Setup do Projeto Next.js

- [ ] 1.1 Instalar `next`, `@supabase/ssr` e remover `vite`, `@tanstack/start`, `@tanstack/react-router`, `nitro`, `@lovable.dev/*`
- [ ] 1.2 Criar `next.config.js` com suporte a Tailwind CSS v4 (via `@tailwindcss/postcss`)
- [ ] 1.3 Criar `postcss.config.js` com plugin `@tailwindcss/postcss`
- [ ] 1.4 Atualizar `package.json`: scripts `dev`, `build`, `start` para comandos Next.js
- [ ] 1.5 Atualizar `.env.example`: renomear `VITE_SUPABASE_URL` → `NEXT_PUBLIC_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`, remover `LOVABLE_API_KEY`
- [ ] 1.6 Criar `app/globals.css` importando o conteúdo de `src/styles.css`
- [ ] 1.7 Atualizar `tsconfig.json`: ajustar paths para `@/*` apontar para `./src/*` e incluir `app/` no rootDir

## 2. Infraestrutura Supabase com @supabase/ssr

- [ ] 2.1 Criar `src/lib/supabase/client.ts` usando `createBrowserClient` com `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] 2.2 Criar `src/lib/supabase/server.ts` usando `createServerClient` com acesso ao cookie store (`cookies()` do `next/headers`)
- [ ] 2.3 Criar `src/lib/supabase/server-admin.ts` usando `createServerClient` com `SUPABASE_SERVICE_ROLE_KEY` para acesso privilegiado
- [ ] 2.4 Criar `src/lib/supabase/middleware.ts` com helper `updateSession` para refresh de tokens no middleware

## 3. Middleware de Autenticação

- [ ] 3.1 Criar `middleware.ts` na raiz do projeto com lógica de proteção de rotas
- [ ] 3.2 Configurar `matcher` no middleware para interceptar apenas rotas autenticadas (excluir `/auth`, `/diagnostico`, `/api/public/*`, assets estáticos)
- [ ] 3.3 Implementar redirecionamento para `/auth` quando sessão ausente
- [ ] 3.4 Implementar redirecionamento para `/` quando usuário autenticado tenta acessar `/auth`
- [ ] 3.5 Integrar `updateSession` para refresh automático de tokens no middleware

## 4. Layouts e Estrutura App Router

- [ ] 4.1 Criar `app/layout.tsx` (root layout) com `QueryClientProvider`, `Toaster` e importação de `globals.css`
- [ ] 4.2 Criar `app/(authenticated)/layout.tsx` com sidebar de navegação e header compartilhados
- [ ] 4.3 Mover/adaptar componente de sidebar do projeto atual para o novo layout autenticado
- [ ] 4.4 Criar `app/auth/callback/route.ts` (Route Handler para callback OAuth do Supabase)

## 5. Autenticação Direta Supabase (sem Lovable)

- [ ] 5.1 Criar `app/auth/page.tsx` portando lógica de `src/routes/auth.lazy.tsx`
- [ ] 5.2 Substituir `@lovable.dev/cloud-auth-js` por `supabase.auth.signInWithOAuth({ provider: 'google' })`
- [ ] 5.3 Implementar logout via `supabase.auth.signOut()` com redirecionamento para `/auth`
- [ ] 5.4 Remover `src/integrations/lovable/` e `src/lib/lovable-error-reporting.ts`

## 6. Server Actions — Lógica de Negócio

- [ ] 6.1 Criar `src/actions/clients.ts` portando `src/lib/clients.functions.ts` com diretiva `'use server'`
- [ ] 6.2 Criar `src/actions/cockpit.ts` portando `src/lib/cockpit.functions.ts`
- [ ] 6.3 Criar `src/actions/tasks.ts` portando `src/lib/tasks.functions.ts`
- [ ] 6.4 Criar `src/actions/calendar.ts` portando `src/lib/calendar.functions.ts`
- [ ] 6.5 Criar `src/actions/rules.ts` portando `src/lib/rules.functions.ts`
- [ ] 6.6 Criar `src/actions/notes.ts` portando `src/lib/notes.functions.ts`
- [ ] 6.7 Criar `src/actions/documents.ts` portando `src/lib/documents.functions.ts`
- [ ] 6.8 Criar `src/actions/diagnostics.ts` portando `src/lib/diagnostics.functions.ts`
- [ ] 6.9 Criar `app/api/public/leads/route.ts` portando endpoint público de leads

## 7. Rotas Autenticadas

- [ ] 7.1 Criar `app/(authenticated)/page.tsx` (dashboard — porta `index.lazy.tsx`)
- [ ] 7.2 Criar `app/(authenticated)/cockpit/page.tsx` (porta `cockpit.lazy.tsx`)
- [ ] 7.3 Criar `app/(authenticated)/pipeline/page.tsx` (porta `pipeline.lazy.tsx`)
- [ ] 7.4 Criar `app/(authenticated)/clientes/page.tsx` (porta `clientes/index.lazy.tsx`)
- [ ] 7.5 Criar `app/(authenticated)/tarefas/page.tsx` (porta `tarefas.lazy.tsx`)
- [ ] 7.6 Criar `app/(authenticated)/agenda/page.tsx` (porta `agenda.lazy.tsx`)
- [ ] 7.7 Criar `app/(authenticated)/categorias/page.tsx` (porta `categorias.lazy.tsx`)
- [ ] 7.8 Criar `app/(authenticated)/configuracoes/page.tsx` (porta `configuracoes.lazy.tsx`)
- [ ] 7.9 Criar `app/(authenticated)/estrategia/page.tsx` (porta `estrategia.lazy.tsx`)
- [ ] 7.10 Criar `app/(authenticated)/regras-ativacao/page.tsx` (porta `regras-ativacao.lazy.tsx`)

## 8. Rota Pública — Diagnóstico

- [ ] 8.1 Criar `app/diagnostico/page.tsx` portando `src/routes/diagnostico.tsx`
- [ ] 8.2 Verificar se `src/lib/diagnostico.ts` (lógica do questionário) pode ser reutilizado sem alteração

## 9. Ajustes de Componentes

- [ ] 9.1 Adicionar `'use client'` em todos os componentes `src/components/` que usam hooks ou event handlers
- [ ] 9.2 Verificar componentes shadcn/ui com estado Radix UI e marcar como client components se necessário
- [ ] 9.3 Atualizar imports de `@/integrations/supabase/client` → `@/lib/supabase/client` em todos os componentes
- [ ] 9.4 Atualizar imports de `@/integrations/supabase/client.server` → `@/lib/supabase/server` nas actions

## 10. Limpeza e Remoção de Código Lovable/TanStack

- [ ] 10.1 Remover `src/router.tsx`, `src/start.ts`, `src/server.ts`
- [ ] 10.2 Remover `src/routeTree.gen.ts` (gerado pelo TanStack Router)
- [ ] 10.3 Remover `vite.config.ts` e `bunfig.toml`
- [ ] 10.4 Remover pasta `.lovable/`
- [ ] 10.5 Remover `src/lib/lovable-error-reporting.ts` e todas as suas referências
- [ ] 10.6 Desinstalar pacotes obsoletos: `@tanstack/react-router`, `@tanstack/start`, `@tanstack/router-plugin`, `vite`, `@lovable.dev/cloud-auth-js`, `@lovable.dev/vite-tanstack-config`, `nitropack`

## 11. Validação Final

- [ ] 11.1 Rodar `npm run build` e confirmar que não há erros de compilação
- [ ] 11.2 Testar fluxo completo de autenticação: login OAuth Google → dashboard → logout
- [ ] 11.3 Testar todas as rotas autenticadas manualmente (acesso com e sem sessão)
- [ ] 11.4 Testar rota pública `/diagnostico` sem autenticação
- [ ] 11.5 Verificar que não há nenhum import de `@lovable.dev/*` ou `@tanstack/router` no código
- [ ] 11.6 Fazer deploy na Vercel e validar em produção
