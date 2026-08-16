## Context

O Clarity Money é um CRM comportamental (Bússola CRM) com ~10 rotas autenticadas, Supabase como backend e UI construída com shadcn/ui + Tailwind CSS v4. Foi gerado na plataforma Lovable usando TanStack Start — um meta-framework SSR baseado em Vite + TanStack Router + Nitro. A migração para Next.js elimina a dependência da plataforma Lovable e adota o ecossistema padrão do mercado para projetos React com SSR.

Estado atual:
- Framework: TanStack Start v1 (Vite 8 + Nitro 3, preset Vercel)
- Roteamento: TanStack Router file-based (`src/routes/`)
- Server logic: Server Functions (`src/lib/*.functions.ts`) executadas no servidor via Nitro
- Auth: wrapper Lovable (`@lovable.dev/cloud-auth-js`) sobre Supabase Auth
- Deploy: Vercel (via Nitro preset)

## Goals / Non-Goals

**Goals:**
- Migrar 100% do código para Next.js 14+ App Router sem perda de funcionalidade
- Eliminar todas as dependências `@lovable.dev/*`
- Usar Server Actions nativos do Next.js (substituindo TanStack server functions)
- Gerenciar sessão Supabase via cookies com `@supabase/ssr` (padrão oficial para Next.js App Router)
- Manter deploy na Vercel sem mudanças de infraestrutura
- Preservar todas as rotas públicas e autenticadas com o mesmo comportamento

**Non-Goals:**
- Não alterar o schema do Supabase ou as políticas RLS
- Não reescrever a lógica de negócio das server functions (apenas portar)
- Não migrar para outro provedor de auth (ex: NextAuth, Clerk)
- Não redesenhar a UI ou os componentes
- Não adicionar novas funcionalidades durante a migração

## Decisions

### D1 — App Router (não Pages Router)
**Decisão:** Usar Next.js App Router (`app/` directory).
**Rationale:** App Router é o padrão atual do Next.js para novos projetos. Suporta Server Components, Server Actions e layouts aninhados — equivalente mais próximo ao TanStack Start. Pages Router é legado.
**Alternativa descartada:** Pages Router — requer `getServerSideProps` e API Routes para tudo que o App Router faz nativamente via Server Actions e RSC.

### D2 — Server Actions (não API Routes)
**Decisão:** Converter `src/lib/*.functions.ts` para Server Actions (`'use server'`).
**Rationale:** As server functions do TanStack Start são chamadas inline no cliente com tipagem completa — Server Actions replicam esse padrão diretamente. API Routes adicionariam boilerplate desnecessário (fetch, serialização manual).
**Alternativa descartada:** API Routes — mais verboso, perde type-safety direto; Route Handlers ficam reservados apenas para endpoints públicos (ex: `/api/public/leads`).

### D3 — @supabase/ssr para gerenciamento de sessão
**Decisão:** Usar `@supabase/ssr` com cookies para criar clientes Supabase server-side.
**Rationale:** É a abordagem oficial da Supabase para Next.js App Router. Cria clientes com acesso ao cookie store para leitura/escrita de tokens de sessão em Server Components, Server Actions e middleware.
**Alternativa descartada:** `@supabase/supabase-js` puro no servidor — não lida com refresh automático de sessão em ambiente SSR com App Router.

### D4 — Middleware Next.js para proteção de rotas
**Decisão:** Usar `middleware.ts` na raiz do projeto para proteger rotas autenticadas.
**Rationale:** O middleware Next.js executa no Edge antes do rendering, equivalente ao `beforeLoad` do TanStack Router. Redireciona para `/auth` se não houver sessão válida.
**Alternativa descartada:** Verificar auth dentro de cada `page.tsx` — repetitivo, inconsistente e não protege a rota antes do render.

### D5 — Estrutura de pastas: Route Group `(authenticated)`
**Decisão:** Usar route group `app/(authenticated)/` para agrupar rotas protegidas com layout compartilhado (sidebar, header).
**Rationale:** Route groups permitem compartilhar layout sem adicionar segmento à URL — equivalente ao `_authenticated/` do TanStack Router. A sidebar/header ficam no `layout.tsx` do grupo.

### D6 — Variáveis de ambiente
**Decisão:** Remover prefixo `VITE_` das variáveis expostas ao cliente; usar `NEXT_PUBLIC_` como prefixo.
**Rationale:** Next.js usa `NEXT_PUBLIC_` para expor variáveis ao browser. Variáveis server-only ficam sem prefixo.

Mapeamento:
| Atual | Next.js |
|---|---|
| `VITE_SUPABASE_URL` | `NEXT_PUBLIC_SUPABASE_URL` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_SERVICE_ROLE_KEY` (sem mudança) |
| `LOVABLE_API_KEY` | Removido (ou substituído por `OPENAI_API_KEY` se mantiver IA) |

## Risks / Trade-offs

**[React Query em Server Components]** → Server Actions retornam dados diretamente; React Query continua útil para cache client-side e mutações. Manter o padrão atual de usar `useQuery` com Server Actions como fetcher.

**[Tailwind CSS v4 no Next.js]** → Tailwind v4 usa `@tailwindcss/vite` como plugin Vite — no Next.js, usar `@tailwindcss/postcss` como plugin PostCSS. Requer ajuste no `next.config.js` e `postcss.config.js`. Mitigação: checar compatibilidade antes de iniciar.

**[`'use client'` vs Server Components]** → Componentes com hooks (`useState`, `useQuery`, event handlers) precisam de `'use client'`. Componentes shadcn/ui que usam Radix UI (que tem estado interno) precisarão ser marcados. Mitigação: adicionar `'use client'` apenas onde necessário, seguindo o padrão "push client to the leaves".

**[Server Actions e React Query]** → Server Actions não são URLs — não podem ser chamadas via `fetch` direto no `useQuery`. Padrão correto: criar funções wrapper que chamam a Server Action e usar como `queryFn`. Mitigação: documentar padrão no projeto.

**[Lovable AI Gateway]** → `src/lib/ai.functions.ts` usa `LOVABLE_API_KEY` para chamar Gemini via proxy Lovable. Após a migração, essa integração será perdida. Mitigação: avaliar substituição por OpenAI direta ou manter temporariamente como funcionalidade desativada.

## Migration Plan

**Fase 1 — Setup do projeto Next.js**
1. Criar `next.config.js`, `postcss.config.js`, instalar `next`, `@supabase/ssr`
2. Configurar `app/globals.css` (importar `src/styles.css`)
3. Criar `app/layout.tsx` (root shell com providers: QueryClientProvider, Toaster)
4. Criar `middleware.ts` (auth guard)

**Fase 2 — Infraestrutura Supabase**
5. Criar `lib/supabase/client.ts` (browser client com `createBrowserClient`)
6. Criar `lib/supabase/server.ts` (server client com `createServerClient` + cookies)
7. Criar `lib/supabase/middleware.ts` (helper para refresh de sessão no middleware)

**Fase 3 — Server Actions**
8. Portar `src/lib/clients.functions.ts` → `app/actions/clients.ts`
9. Portar `src/lib/cockpit.functions.ts` → `app/actions/cockpit.ts`
10. Portar `src/lib/tasks.functions.ts` → `app/actions/tasks.ts`
11. Portar `src/lib/calendar.functions.ts` → `app/actions/calendar.ts`
12. Portar `src/lib/rules.functions.ts` → `app/actions/rules.ts`
13. Portar `src/lib/notes.functions.ts` → `app/actions/notes.ts`
14. Portar `src/lib/documents.functions.ts` → `app/actions/documents.ts`
15. Portar `src/lib/diagnostics.functions.ts` → `app/actions/diagnostics.ts`

**Fase 4 — Rotas autenticadas**
16. Criar `app/(authenticated)/layout.tsx` (sidebar + header)
17. Portar cada rota: `/`, `/cockpit`, `/pipeline`, `/clientes`, `/tarefas`, `/agenda`, `/categorias`, `/configuracoes`, `/estrategia`, `/regras-ativacao`

**Fase 5 — Rotas públicas**
18. Portar `/auth` → `app/auth/page.tsx`
19. Portar `/diagnostico` → `app/diagnostico/page.tsx`
20. Portar `/api/public/leads` → `app/api/public/leads/route.ts`

**Fase 6 — Limpeza**
21. Remover `src/router.tsx`, `src/start.ts`, `src/server.ts`, `vite.config.ts`
22. Remover `src/integrations/lovable/`, `src/lib/lovable-error-reporting.ts`
23. Desinstalar `@lovable.dev/*`, `@tanstack/start`, `@tanstack/react-router`, `vite`, `nitro`
24. Atualizar `.env` e `.env.example` com novos nomes de variáveis

**Rollback:** O repositório original (`AndiCora/clarity_money`) permanece intacto. Em caso de problemas, reverter para o branch/commit anterior.

## Open Questions

- **IA:** Manter ou remover `ai.functions.ts`? Se manter, qual API substituirá o Lovable AI Gateway?
- **Recharts v2:** Migrar para Recharts v3 durante a migração ou manter v2 por ora?
- **`bunfig.toml`:** Manter Bun como package manager no novo projeto ou usar npm/pnpm?
