# Feature: Clients

Gerenciamento completo de clientes do CRM Bússola — cadastro, edição, categorias, notas, documentos, transcrições do Drive e análise por IA.

---

## Estrutura de arquivos

```
clients/
├── components/
│   ├── category-multi-select.tsx   # Seletor múltiplo de categorias (popover)
│   ├── client-detail-sheet.tsx     # Gaveta lateral que envolve o ClientDetail
│   ├── client-detail.tsx           # Página/componente principal do perfil do cliente
│   └── new-client-dialog.tsx       # Dialog de criação de novo cliente
└── lib/
    ├── clients.schemas.ts          # Schemas Zod de validação
    ├── clients.server.ts           # Server functions CRUD de clientes
    ├── clients.types.ts            # Constantes e tipos compartilhados
    ├── documents.server.ts         # Server functions de documentos anexados
    ├── notes.server.ts             # Server functions de notas e contextos
    └── __tests__/
        └── clients-validation.test.ts  # Testes de validação do schema
```

---

## Componentes

### `ClientDetail` — `client-detail.tsx`

Componente principal do perfil do cliente. Renderiza o cabeçalho com avatar, badges, contatos e botões de ação, seguido de cinco abas:

| Aba | Valor | Componente interno |
|-----|-------|--------------------|
| Dados cadastrais | `dados` | `EditPanel` |
| Transcrições & Notas | `transcricoes` | `TranscriptionsPanel` + `NotesPanel` |
| Documentos | `documentos` | `DocumentsPanel` |
| Diagnóstico | `diagnostico` | `DiagnosticPanel` |
| IA Bússola | `ia` | `AIPanel` |

**Props:** `{ id: string }` — UUID do cliente.

**Queries carregadas no mount:**
- `["client", id]` → `getClient`
- `["categories"]` → `listCategories`
- `["pipeline-stages"]` → `listPipelineStages`

---

#### `EditPanel`

Formulário de edição dos dados cadastrais: tipo (PF/PJ), status, nome, e-mail, telefone, CPF/CNPJ, categorias, etapa do pipeline, origem, campanha, aniversário e datas especiais monitoradas pela Donna.

---

#### `TranscriptionsPanel`

Exibe as transcrições do Google Drive vinculadas ao cliente e as notas manuais.

**Funcionalidades:**
- **Drive Sync Card** — busca arquivos via `listClientDriveTranscriptions`, mostra quantidade encontrada e botão "Sincronizar"
- **Seletor de arquivo** — se houver múltiplos arquivos, permite escolher qual visualizar
- **Player simulado** — play/pause com timer que avança em tempo real (UI only, sem streaming de áudio)
- **Busca** — filtra linhas da transcrição em tempo real por palavra-chave
- **Split view:**
  - *Coluna esquerda* — transcrição parseada linha a linha; falas do cliente em itálico serifado; timestamps clicáveis que sincronizam com o player; tags automáticas por palavra-chave (`Gatilho Financeiro`, `Aposentadoria`, `Objeção`, `Intenção de Aporte`)
  - *Coluna direita* — botão "Sintetizar com Donna IA" que chama `generateAI` com a transcrição como contexto; resultado exibido como cards de destaque
- **Notas rápidas** — reutiliza `NotesPanel` ao final da aba

**Parser de transcrição (`parseTranscript`):**
Detecta dois formatos:
```
[HH:MM:SS] Nome: fala
Nome: fala
```
Linhas sem padrão reconhecido são exibidas como texto simples.

---

#### `NotesPanel`

Formulário para adicionar notas de dois tipos:
- **Nota de contato** — resumo de conversa, próximos passos
- **Contexto comportamental** — perfil emocional/financeiro do cliente (limite: 4.000 caracteres)

Notas são listadas separadas por tipo, da mais recente para a mais antiga. Cada nota tem botão de exclusão visível no hover.

---

#### `DocumentsPanel`

Upload e listagem de documentos anexados ao cliente (Supabase Storage, bucket `client-documents`).

- Arquivos `.pdf`, `.txt` e `.md` têm texto extraído automaticamente no upload (`extractText`) e ficam marcados como "Indexado"
- Outros formatos são armazenados mas não processados pela IA
- Download via URL assinada com validade de 10 minutos

---

#### `AIPanel`

Geração de análises via IA para o cliente. Tipos disponíveis:

| Tipo | Descrição |
|------|-----------|
| `resumo` | Resumo objetivo das notas e documentos |
| `briefing` | Preparação para reunião (contexto, decisões, 3 perguntas-chave) |
| `analise` | Análise comportamental (gatilhos, padrões, riscos) |
| `mensagem` | Mensagem de reativação (WhatsApp + e-mail) |

Contexto enviado à IA: dados cadastrais + notas + documentos indexados + **transcrições do Google Drive** (adicionadas automaticamente se disponíveis).

---

#### `DiagnosticPanel`

Exibe os resultados do "Raio-X do Sono Financeiro" respondido pelo cliente, com pontuação e respostas detalhadas por questão.

---

### `ClientDetailSheet` — `client-detail-sheet.tsx`

Gaveta lateral (`Sheet`) que envolve o `ClientDetail`. Usada nas listas de clientes e no pipeline para abrir o perfil sem sair da página. Inclui botão "Abrir página cheia" que navega para `/clientes/:id`.

**Props:** `{ clientId: string | null, open: boolean, onOpenChange: (open: boolean) => void }`

---

### `NewClientDialog` — `new-client-dialog.tsx`

Dialog de criação de novo cliente com todos os campos essenciais: tipo, status, nome, e-mail, telefone, CPF/CNPJ, categorias (multi-select), etapa do pipeline, origem e campanha.

Ao salvar, invalida as queries `["clients"]`, `["cockpit"]` e `["pipeline"]`.

---

### `CategoryMultiSelect` — `category-multi-select.tsx`

Popover com checkboxes coloridos para seleção de múltiplas categorias. Usado no `EditPanel`, `NewClientDialog` e no cabeçalho do `ClientDetail`.

**Props:**
```ts
{
  categories: { id: string; name: string; color: string }[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
}
```

---

## Server Functions

### `clients.server.ts`

| Função | Método | Descrição |
|--------|--------|-----------|
| `listClients` | GET | Lista clientes com filtros opcionais: `status`, `search` (ilike), `categoryId` |
| `getClient` | GET | Busca um cliente por UUID com suas categorias |
| `createClient` | POST | Cria cliente e insere categorias na junction table |
| `updateClient` | POST | Atualiza campos do cliente (patch parcial) |
| `updateClientCategories` | POST | Substitui todas as categorias do cliente (delete + insert) |
| `archiveClient` | POST | Define `status = "arquivado"` |
| `restoreClient` | POST | Define `status = "ativo"` |
| `markContact` | POST | Atualiza `last_contact_at` para o momento atual |

---

### `notes.server.ts`

| Função | Método | Descrição |
|--------|--------|-----------|
| `listNotes` | GET | Lista notas do cliente, da mais recente para a mais antiga |
| `createNote` | POST | Cria nota (`nota` ou `contexto`) e atualiza `last_contact_at` |
| `deleteNote` | POST | Remove nota por UUID |

---

### `documents.server.ts`

| Função | Método | Descrição |
|--------|--------|-----------|
| `listDocuments` | GET | Lista documentos do cliente |
| `createSignedUpload` | POST | Gera URL assinada para upload direto no Storage |
| `registerDocument` | POST | Registra documento no banco e tenta extrair texto automaticamente |
| `getDocumentUrl` | POST | Gera URL assinada para download (válida por 10 min) |
| `deleteDocument` | POST | Remove arquivo do Storage e registro do banco |

---

## Schemas e Tipos

### `clients.schemas.ts`

```ts
clientSchema         // Validação completa do cliente (zod)
importantDateSchema  // Datas especiais monitoradas pela Donna
ImportantDate        // Tipo inferido de importantDateSchema
```

### `clients.types.ts`

```ts
CLIENT_SOURCES  // Array de origens disponíveis com key e label
ClientSource    // Union type das origens ("instagram" | "google_ads" | ...)
```

---

## Dependências externas relevantes

| Módulo | Uso |
|--------|-----|
| `@/features/ai/lib/ai.functions` | `generateAI`, `listAIGenerations`, `listClientDriveTranscriptions` |
| `@/features/agenda/lib/google-drive-reader` | Leitura de transcrições do Drive (via server fn acima) |
| `@/features/diagnostic/lib/diagnostics.functions` | `listClientDiagnostics` para a aba Diagnóstico |
| `@/features/pipeline/lib/pipeline.server` | `listPipelineStages` para o seletor de etapa |
| `@/features/settings/lib/categories.server` | `listCategories` para o multi-select |
| `@/features/ai/lib/extract-text` | Extração de texto de PDFs/TXTs no upload |
| Supabase Storage | Bucket `client-documents` para arquivos anexados |

---

## Tabelas do banco (Supabase)

| Tabela | Uso |
|--------|-----|
| `clients` | Dados cadastrais do cliente |
| `client_categories` | Junction table: cliente ↔ categorias (N:N) |
| `categories` | Categorias criadas pelo planejador |
| `notes` | Notas e contextos comportamentais |
| `documents` | Metadados dos arquivos; `extracted_text` indexado pela IA |
| `ai_generations` | Histórico de análises geradas pela IA Bússola |
| `diagnostics` | Respostas do Raio-X do Sono Financeiro |
