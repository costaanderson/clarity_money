## ADDED Requirements

### Requirement: Pré-requisitos da Análise Comportamental comunicados
Antes ou no momento de solicitar a geração da Análise Comportamental, o sistema SHALL comunicar claramente quais dados são necessários para que a IA gere a análise (ex: documentos indexados ou Contexto Comportamental preenchido).

#### Scenario: Pré-requisito não atendido ao solicitar análise
- **WHEN** o usuário solicita gerar a Análise Comportamental sem documentos indexados e sem Contexto Comportamental preenchido
- **THEN** o sistema exibe mensagem explicando o que falta (ex: "Adicione ao menos um documento ou preencha o Contexto Comportamental para gerar a análise"), sem iniciar o processamento

#### Scenario: Pré-requisito atendido ao solicitar análise
- **WHEN** o usuário solicita gerar a Análise Comportamental com ao menos um pré-requisito satisfeito
- **THEN** o sistema inicia o processamento e exibe estado de loading

---

### Requirement: Estado de loading da Análise Comportamental
Durante o processamento da Análise Comportamental, o sistema SHALL exibir um estado de loading visível que indique ao usuário que a análise está sendo gerada.

#### Scenario: Loading visível durante geração
- **WHEN** a Análise Comportamental está sendo gerada pela IA
- **THEN** o sistema exibe indicador de carregamento (spinner, skeleton ou texto "Gerando análise...") no lugar onde a análise será exibida

#### Scenario: Análise exibida ao concluir
- **WHEN** a IA conclui a geração da Análise Comportamental com sucesso
- **THEN** o indicador de loading é substituído pelo conteúdo da análise gerada

---

### Requirement: Mensagem de erro da Análise Comportamental
Se a geração da Análise Comportamental falhar (erro de API, timeout ou dados insuficientes), o sistema SHALL exibir mensagem de erro específica com opção de tentar novamente.

#### Scenario: Erro de API na geração
- **WHEN** a API de IA retorna erro durante a geração da Análise Comportamental
- **THEN** o sistema exibe mensagem de erro (ex: "Não foi possível gerar a análise. Tente novamente.") e um botão para repetir a ação

#### Scenario: Timeout na geração
- **WHEN** a API de IA não responde dentro do tempo limite
- **THEN** o sistema encerra o estado de loading, exibe mensagem de timeout e oferece opção de tentar novamente

---

### Requirement: Orientação sobre o uso de documentos
A seção de documentos do cliente SHALL exibir orientação sobre o que deve ser subido e como cada tipo de documento é usado pela IA.

#### Scenario: Orientação visível na seção de documentos
- **WHEN** o usuário acessa a aba de documentos de um cliente (com ou sem documentos cadastrados)
- **THEN** existe texto de ajuda ou empty state explicando: transcrições de reunião são indexadas pela IA para análise; resumos comportamentais externos (ex: gerados pelo Tactic) também são aceitos; contratos e documentos formais são armazenados mas não processados pela IA

#### Scenario: Indicação de indexação do documento
- **WHEN** um documento é subido e processado com sucesso pela IA
- **THEN** o documento exibe indicador visual de que foi indexado para consulta da IA (ex: badge "Indexado" ou ícone)

#### Scenario: Documento não processável
- **WHEN** um documento subido não pode ser processado pela IA (ex: imagem sem texto, PDF corrompido)
- **THEN** o documento exibe indicador de que não foi indexado, com mensagem explicativa (ex: "Documento não pôde ser lido pela IA")

---

### Requirement: Histórico de "Registrar Contato" visível
A funcionalidade "Registrar Contato" SHALL ter label e tooltip explicando o que é registrado, e o histórico de contatos SHALL ser visível no perfil do cliente.

#### Scenario: Tooltip de Registrar Contato disponível
- **WHEN** o usuário passa o cursor ou foca no botão/ação "Registrar Contato"
- **THEN** um tooltip explica que registra a data, canal e resumo do contato realizado com o cliente

#### Scenario: Histórico de contatos visível no perfil
- **WHEN** o usuário acessa o perfil de um cliente que tem contatos registrados
- **THEN** existe uma seção ou aba com o histórico de contatos registrados, exibindo data, canal e resumo de cada um

#### Scenario: Primeiro contato sem histórico exibe estado vazio
- **WHEN** o usuário acessa o perfil de um cliente sem nenhum contato registrado
- **THEN** a seção de histórico exibe estado vazio com texto orientando a usar "Registrar Contato" para iniciar o registro

---

### Requirement: Link de leads nas Configurações com descrição
O link de leads na tela de Configurações SHALL ter título e descrição explicando sua finalidade: link público para o wizard de diagnóstico, que pode ser compartilhado em campanhas ou redes sociais, com os leads capturados aparecendo no pipeline.

#### Scenario: Descrição do link de leads visível
- **WHEN** o usuário acessa a tela de Configurações
- **THEN** o link de leads é acompanhado de descrição (ex: "Este é o link público do seu formulário de diagnóstico. Compartilhe em campanhas ou redes sociais — os leads captados aparecerão automaticamente no seu pipeline.")

#### Scenario: Botão copiar com feedback
- **WHEN** o usuário clica em "Copiar link"
- **THEN** o link é copiado para a área de transferência e um feedback visual temporário confirma a ação (ex: texto muda para "Copiado!" por 2 segundos)
