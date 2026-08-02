
## 1. LP pública dentro do app

Rota pública **`/diagnostico`** (SSR, sem gate de auth). O wizard do HTML enviado vira um componente React usando os mesmos tokens de design (creme + verde) e as mesmas 7 perguntas, 4 estágios (Insônia Financeira → Quase Lá).

Fluxo:
1. Intro → 7 perguntas (uma por tela, avança ao clicar) → captura (nome, email, WhatsApp) → resultado (estágio + insights + CTA para agendar).
2. No submit da captura, chama o endpoint público `POST /api/public/leads` já existente com um payload estendido (ver seção 3).
3. Tela de resultado mostra o estágio calculado no cliente E é persistido no backend.

Sobre subdomínio: dá pra usar `diagnostico.seudominio.com` depois no DNS apontando pro mesmo app — a rota `/diagnostico` funciona nos dois casos. Começamos pela rota, você conecta o subdomínio na hora do deploy.

## 2. Guardar o diagnóstico no CRM

Migração:
- Enum `client_source`: adicionar `google_ads`. Valores finais: `instagram`, `google_ads`, `landing_page`, `indicacao`, `outro`.
- Nova tabela **`client_diagnostics`** (1-para-1 flexível com `clients`):
  - `id`, `client_id` (fk, cascade), `user_id`, `diagnostic_type` (text, ex.: `sono_financeiro`), `score` (int), `max_score` (int), `stage_key` (text), `stage_label` (text), `answers` (jsonb — array com pergunta + resposta escolhida), `created_at`.
  - RLS: dono só vê o seu. GRANT SELECT/INSERT/UPDATE/DELETE para `authenticated`, ALL para `service_role`. Sem acesso a `anon` — o insert é feito pelo `supabaseAdmin` no endpoint público.
- Sem alteração em `clients` além do enum.

Na ficha do cliente (`/clientes/$id`), novo bloco **"Diagnóstico"** mostrando estágio, score, data e respostas completas em accordion. Só aparece se existir.

## 3. Endpoint público estendido

`src/routes/api/public/leads.ts` passa a aceitar campos opcionais adicionais no body:
- `diagnostic_type`, `score`, `max_score`, `stage_key`, `stage_label`, `answers` (array)
- já aceita: `name`, `email`, `phone`, `utm_*`, `landing_url`, `referrer`

Lógica:
1. Valida token (já existe).
2. Insere `clients` com `source` derivado de `utm_source` (mapa: `instagram`→`instagram`, `google`/`google_ads`→`google_ads`, resto/vazio→`landing_page` quando veio da LP).
3. Se veio bloco de diagnóstico, insere linha em `client_diagnostics` referenciando o cliente criado.
4. Continua atualizando `last_used_at` do token e log de intake.

## 4. Tracking — URLs para colar em cada canal

A LP fica em `https://SEUDOMINIO/diagnostico` (ou `https://diagnostico.SEUDOMINIO`). O CRM lê os parâmetros e mapeia origem automaticamente.

**Instagram (bio, stories, posts)**
```
https://SEUDOMINIO/diagnostico?utm_source=instagram&utm_medium=social&utm_campaign=bio
https://SEUDOMINIO/diagnostico?utm_source=instagram&utm_medium=social&utm_campaign=reels-sono&utm_content=reel-01
https://SEUDOMINIO/diagnostico?utm_source=instagram&utm_medium=social&utm_campaign=stories-set25
```

**Google Ads (URL final de cada anúncio)**
```
https://SEUDOMINIO/diagnostico?utm_source=google_ads&utm_medium=cpc&utm_campaign={campaignid}&utm_content={adgroupid}&gclid={gclid}
```
No painel do Google Ads use os *ValueTrack* `{campaignid}`, `{adgroupid}`, `{gclid}` — eles se preenchem sozinhos. Assim cada lead vem carimbado com a campanha e o clique exato.

**Manual (você cadastrando pela tela "Novo cliente")**: `source = outro` ou o canal real que você escolher no select. Sem UTM.

Regra de mapeamento no backend:
- `utm_source = instagram` → `source = instagram`
- `utm_source ∈ {google, google_ads, googleads, adwords}` → `source = google_ads`
- LP sem UTM → `source = landing_page`
- Cadastro manual → o que o usuário selecionou no dialog

## 5. Badge de origem nos cards

Nos cards do Pipeline (e opcionalmente na lista de clientes), pequena tag no rodapé do card:
- Instagram → ícone Instagram + texto "Instagram"
- Google Ads → ícone Megafone + "Google Ads"
- Landing Page → ícone Globe + "LP"
- Indicação → ícone Users + "Indicação"
- Manual/Outro → ícone UserPlus + "Manual"

Cores usando tokens semânticos existentes (badges neutros com pequeno accent). Se houver `source_campaign`, mostra como tooltip ao passar o mouse.

## 6. Configurações — instruções de tracking

Na tela `/configuracoes`, dentro do bloco de "Captura de leads" que já existe, adiciono um accordion **"URLs de tracking prontas"** que mostra os 3 templates acima com botão de copiar, substituindo `SEUDOMINIO` pelo domínio detectado em runtime.

## Arquivos afetados

**Novos**
- `src/routes/diagnostico.tsx` — LP + wizard (pública, SSR).
- `src/components/diagnostico/*` — steps do wizard (intro, question, capture, result), constantes das perguntas/estágios.
- `src/lib/diagnostics.functions.ts` — server fn autenticada para ler diagnóstico de um cliente na ficha.

**Editados**
- Migração Supabase: enum + tabela `client_diagnostics` + grants + RLS.
- `src/routes/api/public/leads.ts` — aceitar bloco de diagnóstico, mapear `utm_source` para enum, inserir na nova tabela.
- `src/lib/clients.functions.ts` — adicionar `google_ads` em `CLIENT_SOURCES` e no schema Zod.
- `src/components/clients/new-client-dialog.tsx` — nova opção "Google Ads" no select.
- `src/routes/_authenticated/pipeline.tsx` — badge de origem no card.
- `src/routes/_authenticated/clientes/$id.tsx` — bloco "Diagnóstico".
- `src/routes/_authenticated/configuracoes.tsx` — accordion com URLs de tracking prontas.

## Fora deste escopo
- Conectar subdomínio de fato (é passo de DNS no publish, não de código).
- Envio automático do PDF/e-mail com o diagnóstico ao lead (só salva no CRM por enquanto).
- Integração server-side com API do Google Ads / Meta Ads (só rastreio por UTM).
