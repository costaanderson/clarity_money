# Bússola — CRM comportamental para planejadores financeiros

Stack: **TanStack Start** (React 19, SSR) · **Supabase** (auth, DB, storage) · **Tailwind CSS v4** · **shadcn/ui** · **Vercel**

---

## Como rodar localmente

```bash
# 1. Instale as dependências
npm install

# 2. Copie e preencha as variáveis de ambiente
cp .env.example .env

# 3. Suba o servidor de desenvolvimento
npm run dev
# → http://localhost:3000
```

### Variáveis de ambiente necessárias (`.env`)

| Variável | Descrição |
|---|---|
| `VITE_SUPABASE_URL` | URL do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Chave pública (anon) do Supabase |
| `GOOGLE_AI_API_KEY` | Chave da Google AI (Gemini) |

---

## Estrutura de pastas

```
src/
├── features/                  # Domínios de negócio
│   ├── clients/
│   │   ├── components/        # client-detail, client-detail-sheet, new-client-dialog
│   │   └── lib/               # clients.functions, notes.functions, documents.functions
│   ├── pipeline/              # (usa lib do clients)
│   ├── tasks/
│   │   ├── components/        # task-edit-sheet
│   │   └── lib/               # tasks.functions
│   ├── agenda/
│   │   └── lib/               # calendar.functions
│   ├── cockpit/
│   │   └── lib/               # cockpit.functions (KPIs, intake tokens)
│   ├── week-panel/
│   │   └── lib/               # dashboard.functions
│   ├── diagnostic/
│   │   └── lib/               # diagnostico, diagnostics.functions
│   ├── ai/
│   │   └── lib/               # ai.functions, extract-text
│   ├── settings/
│   │   └── lib/               # categories.functions
│   └── activation-rules/
│       └── lib/               # rules.functions
│
├── shared/                    # Código compartilhado entre features
│   ├── components/
│   │   └── ui/                # shadcn/ui (Button, Card, Input…)
│   ├── hooks/                 # use-mobile
│   ├── lib/                   # error-reporting, utils
│   ├── types/
│   └── utils/
│
├── integrations/
│   └── supabase/              # client, types, auth middleware
│
├── routes/                    # TanStack file-based routes (wrappers finos)
│   ├── __root.tsx
│   ├── auth.tsx / auth.lazy.tsx
│   ├── diagnostico.tsx        # Wizard público de leads
│   ├── api/public/            # Endpoints públicos (leads, diagnóstico)
│   └── _authenticated/        # Rotas protegidas por auth
│       ├── route.tsx          # Auth guard + layout com sidebar
│       ├── index.lazy.tsx     # Painel da Semana
│       ├── clientes/
│       ├── pipeline.lazy.tsx
│       ├── cockpit.lazy.tsx
│       ├── agenda.lazy.tsx
│       ├── tarefas.lazy.tsx
│       ├── categorias.lazy.tsx
│       ├── regras-ativacao.lazy.tsx
│       ├── estrategia.lazy.tsx
│       └── configuracoes.lazy.tsx
│
└── lib/                       # Utilitários globais (utils.ts, error-capture…)
```

---

## Decisões de arquitetura

- **Feature-based**: cada domínio tem seus próprios componentes e lib isolados em `src/features/<domain>/`.
- **Rotas como wrappers finos**: as rotas em `src/routes/_authenticated/` importam de `src/features/` e não contêm lógica de negócio própria.
- **Shared UI**: componentes shadcn ficam em `src/shared/components/ui/` — importados via `@/shared/components/ui/`.
- **Server functions** (TanStack Start): todas as funções de acesso ao banco são `createServerFn()` e rodam no servidor.
- **Auth**: Supabase OAuth nativo (Google). O fluxo usa `supabase.auth.signInWithOAuth`.
- **IA**: Gemini 2.5 Flash via Google AI API direta (`generativelanguage.googleapis.com`). Contexto montado a partir de notas e documentos indexados do cliente.
- **Documentos indexados**: PDFs e `.txt`/`.md` têm o texto extraído e salvo em `documents.extracted_text` para uso pela IA.

---

## Build e deploy

```bash
# Build de produção (preset Vercel)
npm run build

# Deploy: push para main → Vercel detecta e faz deploy automático
git push origin main
```

O projeto usa o preset `vercel` do Nitro. Um script `postinstall` (`scripts/patch-nft.cjs`) corrige a compatibilidade ESM/CJS do `@vercel/nft` no Node.js 22.
