# Bússola — CRM para planejadores financeiros

CRM comportamental construído com **TanStack Start (React 19 + Vite)**, **Supabase** (banco, auth, storage) e **Lovable AI Gateway** (Gemini) para resumos e análises.

---

## Stack

- TanStack Start v1 (SSR + server functions) — build via Nitro, preset `vercel`
- React 19, Tailwind CSS v4, shadcn/ui
- Supabase (Postgres com RLS, Auth, Storage bucket `client-documents`)
- Lovable AI Gateway (Gemini 2.5 Flash)

---

## Checklist de variáveis de ambiente

Copie de `.env.example` e configure **todas** na Vercel (Project → Settings → Environment Variables), para os ambientes **Production**, **Preview** e **Development**.

### Cliente (expostas no browser — prefixo `VITE_`)

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | ✅ | URL do projeto Supabase (`https://<ref>.supabase.co`) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | ✅ | Chave publicável/anon — segura para o browser |
| `VITE_SUPABASE_PROJECT_ID` | ✅ | Ref do projeto Supabase |

### Servidor (nunca expor no browser)

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `SUPABASE_URL` | ✅ | Mesma URL, usada em server functions/SSR |
| `SUPABASE_PUBLISHABLE_KEY` | ✅ | Mesma chave anon, usada no middleware de auth |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service role — ignora RLS. **Somente servidor** |
| `LOVABLE_API_KEY` | ✅ (para IA) | Chave do AI Gateway. Sem ela, as funções de IA retornam erro |

> ⚠️ Nunca prefixe chaves de servidor com `VITE_` — isso as publicaria no bundle do cliente.

### Checklist rápido antes do deploy

- [ ] As 3 variáveis `VITE_*` configuradas
- [ ] As 3 variáveis `SUPABASE_*` de servidor configuradas
- [ ] `LOVABLE_API_KEY` configurada (ou aceitar IA desabilitada)
- [ ] Nenhuma chave de servidor com prefixo `VITE_`
- [ ] Variáveis marcadas para Production **e** Preview
- [ ] URL do deploy adicionada em Supabase → Auth → URL Configuration (Site URL + Redirect URLs), incluindo `https://<seu-dominio>` e `https://<seu-dominio>/auth`
- [ ] Provider Google habilitado no Supabase Auth (se for usar login com Google), com o callback `https://<ref>.supabase.co/auth/v1/callback` registrado no Google Cloud Console

---

## Deploy na Vercel a partir do GitHub

### 1. Enviar o código para o GitHub

No Lovable: menu **+** (canto inferior esquerdo do chat) → **GitHub** → **Connect project** → autorize o app → escolha a conta/organização → **Create Repository**. O sync é bidirecional.

Alternativa: **Code Editor** → **Download codebase** e faça `git init && git push` para um repo próprio.

### 2. Importar na Vercel

1. Acesse [vercel.com/new](https://vercel.com/new) e selecione o repositório.
2. Framework Preset: **Other** (o Nitro já gera `.vercel/output` no formato Build Output API v3).
3. Build Command: `npm run build` (ou `bun run build`)
4. Output Directory: deixe **em branco** — o preset `vercel` do Nitro escreve em `.vercel/output`.
5. Install Command: padrão.

O preset já está fixado em `vite.config.ts`:

```ts
nitro: { preset: "vercel" }
```

### 3. Configurar as variáveis

Antes do primeiro build, cole todas as variáveis do checklist acima em **Settings → Environment Variables**. Se você já tiver feito deploy sem elas, use **Deployments → ⋯ → Redeploy** depois de salvá-las.

### 4. Ajustar o Supabase

Em Auth → URL Configuration, adicione a URL de produção da Vercel como **Site URL** e nas **Redirect URLs** (inclua também o domínio de preview `*.vercel.app` se for testar por lá).

### 5. Verificar após o deploy

- [ ] `/` carrega e o login funciona
- [ ] `/diagnostico` (wizard público) abre rápido, sem autenticação
- [ ] Criar/editar cliente persiste no banco
- [ ] Upload de documento funciona (bucket `client-documents`)
- [ ] Geração de IA na aba "IA Bússola" responde

---

## Rodando localmente

```bash
bun install       # ou npm install
cp .env.example .env
# preencha o .env
bun run dev       # http://localhost:8080
```

---

## Rotas públicas (sem auth)

- `GET /diagnostico` — wizard "Raio-X do Sono Financeiro"
- `POST /api/public/diagnostico` — recebe as respostas do wizard
- `POST /api/public/leads` — intake de leads (requer token válido)

Tudo abaixo de `src/routes/_authenticated/` exige sessão.

---

## Observações

- Migrações do banco vivem em `supabase/migrations/` — aplique-as no projeto Supabase de destino se for usar um projeto novo.
- `src/routeTree.gen.ts` é gerado automaticamente; não edite à mão.
- O `.env` não é versionado; as variáveis precisam ser recriadas em cada ambiente de hospedagem.
