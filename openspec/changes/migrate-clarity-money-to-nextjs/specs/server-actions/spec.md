## ADDED Requirements

### Requirement: Server Actions como substituto das server functions
Cada arquivo `src/lib/*.functions.ts` SHALL ser portado para um Server Action equivalente em `app/actions/*.ts` com a diretiva `'use server'` no topo do arquivo.

#### Scenario: Server Action executada pelo client component
- **WHEN** um componente client chamar uma função de `app/actions/*.ts`
- **THEN** a função SHALL executar no servidor com acesso ao cliente Supabase server-side
- **AND** o resultado SHALL ser retornado com tipagem TypeScript preservada

#### Scenario: Acesso ao banco via service role no servidor
- **WHEN** uma Server Action precisar de acesso privilegiado ao Supabase (ignorando RLS)
- **THEN** SHALL usar o cliente com `SUPABASE_SERVICE_ROLE_KEY` disponível apenas no servidor

---

### Requirement: Integração de Server Actions com React Query
Server Actions SHALL ser utilizadas como `queryFn` dentro de hooks `useQuery` para cache e revalidação.

#### Scenario: Dados cacheados com React Query
- **WHEN** um componente chamar `useQuery({ queryFn: () => serverAction() })`
- **THEN** o React Query SHALL cachear o resultado e evitar chamadas desnecessárias ao servidor

#### Scenario: Mutações via Server Action
- **WHEN** o usuário executar uma ação de escrita (criar cliente, atualizar tarefa, etc.)
- **THEN** o componente SHALL usar `useMutation` com a Server Action como `mutationFn`
- **AND** após sucesso SHALL invalidar as queries relacionadas com `queryClient.invalidateQueries`

---

### Requirement: Endpoints públicos via Route Handlers
Endpoints que recebem requests externas (ex: intake de leads) SHALL usar Route Handlers (`app/api/.../route.ts`) em vez de Server Actions.

#### Scenario: Endpoint público de leads
- **WHEN** uma requisição POST chegar em `/api/public/leads`
- **THEN** o Route Handler SHALL processar a requisição sem exigir autenticação
- **AND** SHALL retornar resposta JSON com status HTTP apropriado

---

### Requirement: Mapeamento completo de server functions
Todos os arquivos de server functions existentes SHALL ser portados sem perda de lógica de negócio.

#### Scenario: Cobertura total das funções
- **WHEN** a migração for concluída
- **THEN** SHALL existir um arquivo em `app/actions/` correspondente a cada `src/lib/*.functions.ts`:
  - `clients.functions.ts` → `app/actions/clients.ts`
  - `cockpit.functions.ts` → `app/actions/cockpit.ts`
  - `tasks.functions.ts` → `app/actions/tasks.ts`
  - `calendar.functions.ts` → `app/actions/calendar.ts`
  - `rules.functions.ts` → `app/actions/rules.ts`
  - `notes.functions.ts` → `app/actions/notes.ts`
  - `documents.functions.ts` → `app/actions/documents.ts`
  - `diagnostics.functions.ts` → `app/actions/diagnostics.ts`
