# PRD — Refatoração e Evolução do Bússola (CRM)

**Versão:** 1.1  
**Data:** 16/08/2026  
**Produto:** Bússola — CRM comportamental para planejadores financeiros  
**Stack base:** TanStack Start (React 19) + Supabase + Tailwind + shadcn/ui  
**Fonte de feedback:** Transcrição de vídeo WhatsApp — 07/08/2026 (`transcricao_video_2026-08-07.md`)

---

## 1. Contexto e Problema

O Bússola foi gerado via Lovable e já tem base funcional: clientes, pipeline, agenda, tarefas, cockpit, IA e wizard público. Uma usuária real (planejadora financeira) começou a usar o sistema e gravou um vídeo com dúvidas e problemas concretos encontrados no fluxo de uso.

Dois problemas coexistem:

**Técnico:** o código gerado pelo Lovable tem organização ruim — arquivos grandes com responsabilidades misturadas, dependências desnecessárias (`src/integrations/lovable/`, `src/lib/lovable-error-reporting.ts`), lógica de negócio acoplada a componentes de UI. Isso dificulta manutenção e crescimento de features.

**Produto:** os fluxos centrais do sistema — painel da semana, pipeline, tarefas, cockpit, documentos e IA — têm lacunas de usabilidade que impedem o uso real. A usuária não conseguiu completar tarefas básicas (navegar semanas, encerrar um cliente no pipeline, editar uma tarefa) e ficou com dúvidas sobre como os campos e a IA funcionam.

O objetivo não é reescrever. É **organizar o que existe e resolver os problemas de produto com base no feedback real**, mantendo TanStack Start como stack principal.

---

## 2. Usuário / Persona

**Planejador financeiro independente** (ex: CFP autônomo ou pequeno escritório).

Contexto de uso:
- Atende clientes individuais em reuniões presenciais ou por vídeo.
- Usa o Google Agenda como agenda principal — não abre mão dela.
- Usa ferramentas de transcrição de reuniões (ex: Tactic) para registrar conversas com clientes.
- Acessa o sistema pelo desktop (não mobile) durante o horário de trabalho.
- Não é desenvolvedor — espera que cada campo e funcionalidade seja autoexplicativo.
- Começa a usar o sistema de forma exploratória, inserindo dados de teste antes de adotá-lo de verdade.

**Necessidade central:** ter uma visão organizada dos clientes, do pipeline e das tarefas semanais, sem precisar alternar entre várias ferramentas.

---

## 3. Objetivos

### 3.1 Objetivos Técnicos
- Reorganizar o código em arquitetura feature-based, separando UI, lógica, data fetching e tipos.
- Remover ou isolar dependências específicas do Lovable que não agregam valor.
- Melhorar legibilidade, nomenclatura e reutilização de componentes.
- Manter compatibilidade com Supabase (auth, RLS, storage) e com o banco atual, sem recriar migrations.
- Facilitar futuras evoluções e onboarding de novos desenvolvedores.

### 3.2 Objetivos de Produto
- Resolver os bloqueios de uso identificados no feedback (ver Seção 5).
- Tornar cada campo e funcionalidade autoexplicativo para quem está começando a usar.
- Dar ao usuário sensação de controle: navegar entre semanas, encerrar clientes, editar tarefas, filtrar datas.
- Deixar claro o papel dos documentos e da IA no fluxo de uso.

---

## 4. Não-Objetivos (Fora de Escopo nesta fase)

- Reescrever o sistema em outra stack (Next.js, Vite puro, etc.).
- Recriar o banco de dados ou as migrations do zero.
- Implementar sincronização bidirecional completa com Google Agenda — preparar o terreno, mas a sincronização completa é fase 2.
- Redesign visual completo — manter identidade visual atual.
- Criar versão mobile.
- Implementar multitenancy ou suporte a múltiplos planejadores na mesma conta.

---

## 5. Escopo — Problemas e Requisitos

### 5.1 Painel da Semana — Navegação entre semanas

**Problema:** O painel avança automaticamente com o tempo. Não é possível ver semanas passadas (histórico) nem futuras (planejamento).

**Requisitos:**
- O usuário consegue navegar para semanas anteriores e futuras a partir do painel.
- A semana atual é claramente indicada (ex: "Semana de 11 a 17 de agosto").
- Os dados exibidos (clientes atendidos, compromissos, tarefas, tarefas atrasadas) refletem a semana selecionada, não necessariamente a semana atual.
- Existe ação clara para voltar à semana atual ("Hoje" ou equivalente).

**Edge cases:**
- Semana sem nenhum dado (tarefas, compromissos, clientes): exibir estado vazio com mensagem clara, não tela em branco.
- Semanas muito no futuro sem dados: comportamento igual ao estado vazio.

---

### 5.2 Cadastro de Clientes — Clareza dos campos

**Problema:** Os campos "Notas e Contextos" e "Contexto Comportamental" não são autoexplicativos. A usuária tentou colar uma transcrição longa no campo "Notas e Contextos" e o campo ficou "muito grande", sem feedback sobre limite ou uso esperado.

**Requisitos:**
- O campo "Notas e Contextos" tem label e placeholder que explicam o uso esperado (ex: observações rápidas, lembretes de reunião — não transcrições longas).
- O campo "Contexto Comportamental" tem label e tooltip explicando que é preenchido automaticamente pela IA ou manualmente pelo planejador, e qual é o limite de caracteres.
- Se o campo tem limite de tamanho, o usuário vê o contador de caracteres restantes em tempo real.

**Edge cases:**
- Usuário cola texto que excede o limite: feedback imediato de erro com o limite informado, sem perda do conteúdo já digitado.

---

### 5.3 Documentos e IA — Transparência do fluxo

**Problema:** A usuária subiu uma transcrição como documento, mas não sabe se a IA a lê. Tentou gerar "Análise Comportamental" e não funcionou, sem mensagem de erro ou explicação. "Registrar Contato" não ficou claro em como usar nem onde o registro aparece.

**Requisitos:**

**Documentos:**
- Existe orientação visível (tooltip, texto de ajuda ou empty state) explicando o que deve ser subido: transcrições de reunião, resumos comportamentais gerados externamente, contratos — e qual é o uso de cada tipo pelo sistema.
- O sistema indica claramente se um documento foi indexado para consulta da IA ou não.

**Análise Comportamental (IA):**
- Existe feedback claro sobre o que é necessário para gerar a análise (ex: "Adicione ao menos um documento ou preencha o Contexto Comportamental para gerar a análise").
- Se a análise não pode ser gerada, a mensagem de erro explica o motivo — não falha silenciosamente.
- Existe indicação de quando a análise está sendo processada (estado de loading) e quando está pronta.

**Registrar Contato:**
- O label e o tooltip explicam o que é registrado (data, canal, resumo do contato) e onde o histórico aparece (ex: na linha do tempo do cliente ou em uma aba dedicada).
- O histórico de contatos registrados é visível no perfil do cliente.

**Edge cases:**
- IA não retorna resposta (timeout ou erro da API): mensagem de erro clara ao usuário, com opção de tentar novamente.
- Documento subido mas sem conteúdo legível (PDF corrompido, imagem sem texto): feedback de que o documento não pôde ser processado.

---

### 5.4 Pipeline — Etapa "Finalizado"

**Problema:** Não existe etapa de encerramento. Clientes que concluíram o processo ficam eternamente na coluna ativa do pipeline, poluindo a visão.

**Requisitos:**
- Existe uma etapa "Finalizado" (ou equivalente) no pipeline.
- Um cliente movido para "Finalizado" não aparece no pipeline ativo por padrão.
- Existe uma forma de visualizar clientes finalizados (ex: filtro ou aba separada).
- A data de finalização é registrada para uso nas métricas do Cockpit.

**Edge cases:**
- Cliente movido para "Finalizado" por engano: deve ser possível mover de volta para uma etapa anterior.
- Clientes finalizados no Cockpit: devem ser excluídos das métricas de pipeline ativo, mas incluídos nas métricas de clientes atendidos (conforme período selecionado).

---

### 5.5 Cockpit — Filtro de data

**Problema:** O único filtro disponível é "últimos 30 dias". Analisar um mês fechado (ex: julho, quando o usuário já está em agosto) resulta em dados incompletos.

**Requisitos:**
- O usuário consegue selecionar um período personalizado de datas para filtrar as métricas do Cockpit.
- Existe atalho para selecionar meses fechados (ex: "Julho 2026", "Junho 2026") sem precisar escolher data início e fim manualmente.
- O período selecionado fica visível no cabeçalho do Cockpit.

**Edge cases:**
- Período sem dados: exibir estado vazio com mensagem clara ("Nenhum dado para o período selecionado"), não zeros sem contexto.
- Período futuro selecionado: exibir aviso de que o período ainda não tem dados completos.

---

### 5.6 Agenda — Status da integração com Google Agenda

**Problema:** A integração está marcada como "em breve" nas configurações, mas a usuária não consegue conectar a conta. Além disso, ela prefere que os compromissos venham do Google para o Bússola (não o contrário).

**Requisitos:**
- O status atual da integração é comunicado de forma honesta: se ainda não está disponível, deve ser claro que é um roadmap futuro — não parece "botão quebrado".
- A tela de configurações explica a direção da sincronização pretendida (Google → Bússola ou bidirecional) para que o usuário não crie expectativas erradas.
- Quando a integração estiver disponível, o fluxo de OAuth do Google é funcional (autorização, desconexão, reconexão).

**Edge cases:**
- OAuth falha (token expirado, permissão negada): mensagem de erro clara com instrução de como reconectar.

---

### 5.7 Tarefas — Edição e alternância de status

**Problema:** Uma tarefa apareceu como concluída sem que a usuária marcasse como tal. Não é possível desmarcar. Também não é possível editar a tarefa diretamente pela tela de tarefas — só navegando para o cliente vinculado.

**Requisitos:**
- O usuário consegue marcar e desmarcar tarefas como concluídas diretamente na tela de tarefas.
- O usuário consegue editar (título, descrição, data, cliente vinculado) uma tarefa diretamente na tela de tarefas, sem precisar navegar para o cliente.
- O campo "Tags" e o campo "Regra de Ativação" têm explicação acessível (tooltip ou texto de ajuda) sobre o que fazem e como usar.
- Uma tarefa não deve aparecer como concluída sem ação explícita do usuário.

**Edge cases:**
- Tarefa editada depois de marcada como concluída: comportamento deve ser o mesmo — edição disponível independente do status.
- Tarefa vinculada a cliente que foi movido para "Finalizado": tarefa ainda deve ser acessível e editável.

---

### 5.8 Configurações — Clareza do link de leads

**Problema:** A usuária não sabe para que serve o link disponível nas configurações. Infere que seja para captar leads via tráfego pago, mas não há confirmação no sistema.

**Requisitos:**
- O link de leads nas configurações tem título e descrição explicando sua finalidade: que é o link público para o wizard de diagnóstico, que pode ser compartilhado em campanhas de tráfego ou perfis sociais, e que os leads captados aparecem no pipeline.
- Existe botão de copiar o link com feedback visual de confirmação (ex: "Copiado!").

---

### 5.9 Refatoração Técnica

**Problema:** Código gerado pelo Lovable com arquivos grandes, responsabilidades misturadas e dependências desnecessárias (`src/integrations/lovable/`, `src/lib/lovable-error-reporting.ts`).

**Requisitos:**
- O código é reorganizado em arquitetura feature-based (cada domínio com seus próprios componentes, hooks, services e tipos).
- Dependências e utilitários do Lovable são removidos ou isolados sem quebrar funcionalidades.
- Componentes de UI não contêm lógica de negócio pesada.
- A reorganização não quebra o build nem o deploy.
- O README técnico é atualizado com a nova estrutura e decisões de arquitetura.

---

## 6. Prioridades

| Prioridade | Item |
|------------|------|
| Alta | Refatoração técnica (fundação para tudo o mais) |
| Alta | Navegação de semanas no Painel |
| Alta | Etapa "Finalizado" no Pipeline |
| Alta | Filtro de data no Cockpit |
| Alta | Edição e desmarcar tarefas |
| Média | Clareza dos campos de cliente (Notas, Contexto Comportamental) |
| Média | Transparência do fluxo de IA (Análise Comportamental, Registrar Contato) |
| Média | Orientação sobre documentos (o que subir e como a IA usa) |
| Baixa | Status honesto da integração Google Agenda |
| Baixa | Clareza do link de leads nas Configurações |

---

## 7. Critérios de Aceite

### Técnicos
- [ ] O código está organizado por features e é fácil de navegar sem conhecer o projeto.
- [ ] Nenhuma referência ao Lovable permanece no fluxo principal da aplicação.
- [ ] Build e deploy funcionam normalmente após a reorganização.
- [ ] Nenhuma funcionalidade existente foi quebrada (fluxos críticos testados manualmente a cada etapa).
- [ ] O README técnico descreve a estrutura de pastas e como rodar o projeto.

### Produto
- [ ] O usuário consegue navegar para semanas anteriores e futuras no Painel da Semana.
- [ ] A semana atual é claramente identificada no Painel.
- [ ] Existe estado vazio visível quando uma semana não tem dados.
- [ ] O Pipeline possui etapa "Finalizado" e clientes finalizados não aparecem na visão ativa por padrão.
- [ ] O Cockpit permite selecionar período personalizado e meses fechados.
- [ ] Tarefas podem ser marcadas e desmarcadas como concluídas diretamente na tela de tarefas.
- [ ] Tarefas podem ser editadas diretamente na tela de tarefas.
- [ ] Os campos "Notas e Contextos" e "Contexto Comportamental" têm texto de ajuda que explica o uso esperado.
- [ ] A Análise Comportamental exibe mensagem clara quando não pode ser gerada, com o motivo.
- [ ] "Registrar Contato" tem explicação do que registra e onde o histórico aparece.
- [ ] A tela de documentos orienta o usuário sobre o que subir.
- [ ] O link de leads nas Configurações tem descrição da sua finalidade.

---

## 8. Métricas de Sucesso

As métricas abaixo são para avaliar se as melhorias geraram resultado real de uso — não apenas se a feature foi entregue.

| Métrica | Como medir |
|---------|------------|
| Usuário completa o cadastro de um cliente sem dúvidas nos campos | Observação/feedback direto em sessão de uso após entrega |
| Análise Comportamental é gerada com sucesso na primeira tentativa | Verificar se erros silenciosos desaparecem; feedback do usuário |
| Tarefas criadas não aparecem como "concluídas" sem ação do usuário | Zero relatos desse bug após correção |
| Usuário acessa semanas passadas no Painel para ver histórico | Feedback direto do usuário após entrega |
| Cockpit usado para analisar mês fechado (ex: julho em agosto) | Feedback direto do usuário após entrega |

> **Nota:** O produto ainda está em uso inicial por um único usuário. Métricas quantitativas (taxas, funis, eventos) podem ser adicionadas numa fase futura quando houver volume suficiente.

---

## 9. Dependências

| Dependência | Tipo | Risco |
|-------------|------|-------|
| Supabase (auth, RLS, storage) | Externa (infra) | Baixo — já em uso, manter compatibilidade durante refatoração |
| OpenAI API (ou equivalente) | Externa (IA) | Médio — Análise Comportamental depende dessa API; falhas devem ter fallback visível |
| Google OAuth (integração Agenda) | Externa (autenticação) | Alto — integração ainda não funcional; tratar como fase 2 se necessário |
| TanStack Start (server functions, roteamento) | Framework | Baixo — mantido; reorganização não muda o framework |
| `src/integrations/lovable/` | Interna (remover) | Médio — verificar o que usa antes de remover |

---

## 10. Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Reorganização de pastas quebra o build | Refatorar em etapas pequenas; verificar build a cada etapa antes de seguir |
| Remoção de dependências do Lovable quebra funcionalidade não mapeada | Auditar `src/integrations/lovable/index.ts` antes de remover; substituir com equivalente se necessário |
| Mudança nos campos do cliente gera perda de dados já cadastrados | Não alterar schema do banco; apenas melhorar labels/placeholders/tooltips no frontend |
| Etapa "Finalizado" no pipeline afeta métricas do Cockpit de forma inesperada | Definir explicitamente nas specs como clientes finalizados são tratados em cada métrica |
| Integração Google Agenda requer OAuth que pode ter escopo/configuração complexa | Não bloquear as demais entregas; implementar como fase 2 isolada |
| IA retorna erro silencioso (sem mensagem ao usuário) | Garantir que qualquer erro da API de IA resulte em mensagem visível |

---

## 11. Estratégia de Rollback

- **Refatoração:** Todo o trabalho deve ser feito em branch separada (`refactor/architecture-and-ux`). O `main` permanece estável. Se a reorganização quebrar algo crítico, reverte o merge da branch — sem perda de funcionalidade para o usuário.
- **Melhorias de produto:** Cada item de produto pode ser revertido individualmente via git, pois devem ser implementados como commits separados por feature.
- **Banco de dados:** Nenhuma migration destrutiva nesta fase. Se alguma migration for necessária para o item "Finalizado" no pipeline, deve ser aditiva (nova coluna/valor de enum) — nunca remover ou alterar colunas existentes.

---

## 12. Monitoramento

- **Build/Deploy:** Verificar que o CI/CD (Netlify ou equivalente) continua funcionando após cada etapa da refatoração.
- **Erros de IA:** Implementar log (Supabase ou console estruturado) para falhas nas chamadas à API de IA — distinguir "sem dados suficientes" de "erro de API" de "timeout".
- **Erros de UI:** Manter (ou substituir) o error boundary atual para capturar erros de renderização e reportar com contexto.

---

## 13. Ordem de Execução Sugerida

**Fase 1 — Fundação técnica**
1. Auditar e isolar/remover dependências do Lovable
2. Reorganizar pastas para feature-based
3. Extrair lógica dos componentes maiores (ex: `client-detail.tsx`)
4. Atualizar README técnico

**Fase 2 — Melhorias de alta prioridade**
5. Navegação de semanas no Painel da Semana
6. Etapa "Finalizado" no Pipeline (+ ajuste nas métricas do Cockpit)
7. Filtro de data personalizado no Cockpit
8. Edição e desmarcar tarefas diretamente na tela de tarefas

**Fase 3 — Clareza e polimento**
9. Clareza dos campos de cliente (labels, placeholders, tooltips, contadores)
10. Transparência do fluxo de IA e documentos
11. Status da integração Google Agenda e link de leads nas Configurações

---

## 14. Itens para Fases Futuras

- Sincronização bidirecional com Google Agenda (Google → Bússola e Bússola → Google)
- Métricas quantitativas no Cockpit (com volume de usuários suficiente)
- Multitenancy / suporte a múltiplos planejadores
- Versão mobile

---

## 15. Anexos

- Transcrição original do feedback: `transcricao_video_2026-08-07.md`
- Specs técnicas: a gerar em `SPECS.md` (via `/opsx:propose` — o projeto já usa OpenSpec em `openspec/`)
