## ADDED Requirements

### Requirement: Estrutura de pastas App Router
O projeto SHALL usar a convenção `app/` do Next.js App Router com route groups para separar rotas públicas de autenticadas.

#### Scenario: Rotas autenticadas agrupadas
- **WHEN** o desenvolvedor cria uma nova página protegida
- **THEN** o arquivo SHALL estar em `app/(authenticated)/<rota>/page.tsx` e herdar automaticamente o layout com sidebar e header

#### Scenario: Rotas públicas na raiz
- **WHEN** o desenvolvedor cria uma página pública
- **THEN** o arquivo SHALL estar em `app/<rota>/page.tsx` sem herdar o layout autenticado

---

### Requirement: Layout raiz com providers globais
O `app/layout.tsx` SHALL configurar os providers globais necessários para toda a aplicação.

#### Scenario: Providers disponíveis em toda a árvore
- **WHEN** qualquer componente da aplicação precisar de React Query ou notificações Toast
- **THEN** `QueryClientProvider` e `Toaster` (sonner) SHALL estar disponíveis sem configuração adicional

---

### Requirement: Layout autenticado com sidebar e header
O `app/(authenticated)/layout.tsx` SHALL renderizar a sidebar de navegação e o header compartilhados entre todas as páginas protegidas.

#### Scenario: Navegação consistente
- **WHEN** o usuário autenticado navegar entre qualquer rota protegida
- **THEN** a sidebar e o header SHALL permanecer montados sem re-render completo

---

### Requirement: Mapeamento de rotas equivalentes
Todas as rotas existentes no TanStack Router SHALL ter equivalência exata no App Router, sem mudança de URL.

#### Scenario: URLs preservadas após migração
- **WHEN** o usuário acessar qualquer URL existente (ex: `/cockpit`, `/clientes`, `/pipeline`)
- **THEN** a página correta SHALL ser renderizada com o mesmo conteúdo de antes da migração

#### Scenario: Redirecionamento de rota raiz
- **WHEN** o usuário autenticado acessar `/`
- **THEN** o sistema SHALL renderizar o dashboard principal (equivalente ao `index.lazy.tsx` atual)
