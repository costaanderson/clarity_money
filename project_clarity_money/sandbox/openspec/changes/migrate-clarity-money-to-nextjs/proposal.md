## Why

O projeto Clarity Money foi gerado na plataforma Lovable, que usa TanStack Start + Vite como meta-framework. Para ter controle total do código, deploy independente e usar o ecossistema Next.js (App Router, Server Actions, middleware nativo), é necessário migrar para Next.js — eliminando todas as dependências proprietárias do Lovable.

## What Changes

- **BREAKING** Substituir TanStack Start + Vite por Next.js 14+ (App Router)
- **BREAKING** Substituir TanStack Router (file-based) por Next.js App Router (`app/` directory)
- Converter `src/routes/*.lazy.tsx` → `app/(routes)/page.tsx` com layout compartilhado
- Converter server functions (`src/lib/*.functions.ts`) → Server Actions (`'use server'`)
- Substituir `beforeLoad` auth guard → `middleware.ts` do Next.js
- Remover `@lovable.dev/cloud-auth-js` → usar Supabase Auth JS direto
- Remover `@lovable.dev/vite-tanstack-config` → `next.config.js` manual
- Remover `src/router.tsx`, `src/start.ts`, `src/server.ts` (infraestrutura TanStack)
- Remover `src/lib/lovable-error-reporting.ts`
- Remover `.lovable/` (metadata da plataforma)
- Manter intactos: componentes `src/components/`, Supabase, Tailwind CSS v4, shadcn/ui, React Query, React Hook Form + Zod, Recharts, Lucide

## Capabilities

### New Capabilities

- `nextjs-app-router`: Estrutura de roteamento baseada em `app/` com layouts aninhados, route groups e páginas protegidas via middleware
- `server-actions`: Server Actions do Next.js substituindo as server functions do TanStack Start para operações de dados (cockpit, clientes, tarefas, agenda, etc.)
- `nextjs-auth-middleware`: Middleware nativo do Next.js para proteção de rotas autenticadas, substituindo o `beforeLoad` do TanStack Router
- `supabase-direct-auth`: Integração direta com Supabase Auth (sem wrapper Lovable), incluindo OAuth Google e gerenciamento de sessão via cookies

### Modified Capabilities

<!-- Nenhuma — os requisitos funcionais permanecem idênticos; apenas a camada de framework muda -->

## Impact

**Dependências removidas:**
- `@lovable.dev/cloud-auth-js`
- `@lovable.dev/vite-tanstack-config`
- `@tanstack/start` e plugins relacionados
- `@tanstack/react-router` (substituído pelo roteamento do Next.js)
- `vite`, `nitro` (substituídos pelo build do Next.js)

**Dependências adicionadas:**
- `next` (14+)
- `@supabase/ssr` (para gerenciamento de sessão com cookies no App Router)

**Arquivos afetados:**
- `src/routes/**` → `app/**` (migração completa)
- `src/lib/*.functions.ts` → `app/actions/*.ts` (Server Actions)
- `src/integrations/lovable/` → removido
- `vite.config.ts` → `next.config.js`
- `src/styles.css` → `app/globals.css`
- `src/router.tsx`, `src/start.ts`, `src/server.ts` → removidos

**Sistemas afetados:**
- Deploy na Vercel (continua, mas via adapter Next.js nativo — sem Nitro)
- Supabase (sem mudanças no schema ou RLS)
- Variáveis de ambiente (estrutura muda: `VITE_` prefixes removidos para variáveis server-side)
