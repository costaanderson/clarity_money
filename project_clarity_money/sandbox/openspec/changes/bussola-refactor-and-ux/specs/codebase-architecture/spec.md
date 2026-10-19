## ADDED Requirements

### Requirement: Feature-based folder structure
O codebase SHALL ser organizado em `src/features/<domain>/` com subpastas `components/`, `hooks/`, `services/` e `types/` por domínio. Componentes compartilhados SHALL residir em `src/shared/`. As rotas TanStack em `src/routes/_authenticated/` SHALL ser wrappers finos que importam de `src/features/` e não contêm lógica de negócio.

#### Scenario: Rota importa de feature
- **WHEN** uma rota em `src/routes/_authenticated/pipeline.lazy.tsx` é aberta
- **THEN** ela importa componentes de `src/features/pipeline/components/` e hooks de `src/features/pipeline/hooks/`, sem conter lógica de negócio diretamente

#### Scenario: Componente de UI compartilhado
- **WHEN** um componente de UI é usado em mais de uma feature
- **THEN** ele reside em `src/shared/components/` e é importado pelas features que precisam dele

---

### Requirement: Remoção das dependências do Lovable
O codebase SHALL não conter referências a `src/integrations/lovable/` ou `src/lib/lovable-error-reporting.ts` no fluxo principal da aplicação após a refatoração. Qualquer funcionalidade provida por esses arquivos SHALL ser substituída por equivalente direto ou removida se não utilizada.

#### Scenario: Build sem Lovable
- **WHEN** o projeto é compilado após a refatoração
- **THEN** o build conclui sem erros e sem importar nenhum arquivo de `integrations/lovable/` ou `lib/lovable-error-reporting.ts`

#### Scenario: Erros de runtime sem Lovable
- **WHEN** um erro de runtime ocorre na aplicação após a remoção do Lovable
- **THEN** o erro é capturado pelo error boundary existente e registrado via console estruturado ou Sentry (sem dependência do Lovable)

---

### Requirement: Separação de responsabilidades nos componentes
Componentes de UI SHALL não conter lógica de negócio pesada (queries ao banco, transformações de dados, regras de validação). Essa lógica SHALL residir em hooks (`use*.ts`) ou services (`*.service.ts`) dentro da feature correspondente.

#### Scenario: Componente de UI sem query direta
- **WHEN** um componente de UI como `ClientDetail` precisa de dados do cliente
- **THEN** ele recebe os dados via props ou via hook customizado (`useClient`), sem fazer a query ao Supabase diretamente no corpo do componente

#### Scenario: Hook de feature encapsula lógica
- **WHEN** a lógica de busca e transformação de dados de tarefas é necessária
- **THEN** ela reside em `src/features/tasks/hooks/useTasks.ts`, reutilizável por qualquer componente que precise

---

### Requirement: README técnico atualizado
O `README.md` do projeto SHALL descrever a nova estrutura de pastas, como rodar o projeto localmente e as decisões de arquitetura relevantes após a refatoração.

#### Scenario: Desenvolvedor novo consegue rodar o projeto
- **WHEN** um desenvolvedor lê o README e segue as instruções
- **THEN** consegue instalar dependências e rodar o projeto localmente sem precisar perguntar
