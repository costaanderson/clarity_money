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

### Convenção de nomes em `lib/`

Cada feature segue a mesma divisão por responsabilidade:

| Arquivo | O que contém |
|---|---|
| `*.types.ts` | Constantes, enums e interfaces (sem dependências externas) |
| `*.schemas.ts` | Schemas Zod de validação |
| `*.logic.ts` | Funções puras (sem acesso a banco ou rede) |
| `*.server.ts` | `createServerFn()` — funções que rodam no servidor |

```
src/
├── features/                     # Domínios de negócio
│   ├── clients/
│   │   ├── components/           # client-detail, client-detail-sheet, new-client-dialog
│   │   └── lib/
│   │       ├── clients.types.ts  # CLIENT_SOURCES, ClientSource
│   │       ├── clients.schemas.ts# clientSchema, ImportantDate
│   │       ├── clients.server.ts # listClients, getClient, createClient…
│   │       ├── notes.server.ts   # listNotes, createNote, deleteNote
│   │       └── documents.server.ts
│   ├── pipeline/
│   │   └── lib/
│   │       ├── pipeline.types.ts # PIPELINE_STAGES, PipelineStage
│   │       └── pipeline.server.ts# listPipeline, moveClientStage
│   ├── tasks/
│   │   ├── components/           # task-edit-sheet
│   │   └── lib/
│   │       ├── tasks.schemas.ts  # createTaskSchema, updateTaskSchema
│   │       ├── tasks.logic.ts    # toIsoOrNull()
│   │       └── tasks.server.ts   # listTasks, createTask, updateTask…
│   ├── agenda/
│   │   └── lib/
│   │       ├── calendar.schemas.ts
│   │       └── calendar.server.ts
│   ├── cockpit/
│   │   └── lib/
│   │       └── cockpit.server.ts # getCockpitOverview, intake tokens
│   ├── week-panel/
│   │   └── lib/
│   │       ├── dashboard.logic.ts# getWeekRange()
│   │       └── dashboard.server.ts
│   ├── briefing/
│   │   └── lib/
│   │       ├── briefing.types.ts
│   │       ├── briefing.logic.ts # daysUntilNextOccurrence()
│   │       ├── briefing.server.ts# getDailyBriefing, getEngagementRadar…
│   │       └── donna-ai.server.ts# getTodayDonnaBriefing, generateDonnaBriefing
│   ├── strategy/
│   │   └── lib/
│   │       ├── strategy.types.ts
│   │       └── strategy.server.ts
│   ├── diagnostic/
│   │   └── lib/
│   ├── ai/
│   │   └── lib/                  # call-ai, extract-text
│   ├── settings/
│   │   └── lib/
│   │       └── categories.server.ts
│   └── activation-rules/
│       └── lib/
│           ├── rules.schemas.ts
│           └── rules.server.ts
│
├── shared/                       # Código compartilhado entre features
│   ├── components/
│   │   └── ui/                   # shadcn/ui (Button, Card, Input…)
│   ├── hooks/                    # use-mobile
│   ├── lib/                      # error-reporting, utils
│   ├── types/
│   └── utils/
│
├── integrations/
│   └── supabase/                 # client, types, auth middleware
│
├── routes/                       # TanStack file-based routes (wrappers finos)
│   ├── __root.tsx
│   ├── auth.tsx / auth.lazy.tsx
│   ├── diagnostico.tsx           # Wizard público de leads
│   ├── api/public/               # Endpoints públicos (leads, diagnóstico)
│   └── _authenticated/           # Rotas protegidas por auth
│       ├── route.tsx             # Auth guard + layout com sidebar
│       ├── index.lazy.tsx        # Painel da Semana
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
└── lib/                          # Utilitários globais (utils.ts, error-capture…)
```

### Documentação do projeto

```
docs/
├── PRD.md                        # Product Requirements Document
├── table_clarity.md              # Estrutura das tabelas do banco
├── transcricao_video_2026-08-07.md
├── architecture/
│   ├── clarity-money-architecture.html
│   └── clarity-money.architecture.json
├── design/
│   ├── painel.txt                # Tokens do design system "Editorial Clarity"
│   └── stitch-painel/            # Mockup gerado pelo Stitch
└── prototypes/
    └── donna-briefing.gs         # Protótipo Apps Script da Donna
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
