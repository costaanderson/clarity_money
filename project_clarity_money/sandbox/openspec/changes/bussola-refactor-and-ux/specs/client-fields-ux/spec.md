## ADDED Requirements

### Requirement: Campo "Notas e Contextos" com orientação de uso
O campo "Notas e Contextos" no cadastro/perfil do cliente SHALL ter placeholder e/ou texto de ajuda que explique o uso esperado: observações rápidas, lembretes de reunião, anotações pontuais — não transcrições longas de reuniões.

#### Scenario: Placeholder orienta o uso
- **WHEN** o usuário vê o campo "Notas e Contextos" vazio
- **THEN** o placeholder exibe texto como "Observações rápidas, lembretes ou contexto relevante sobre o cliente"

#### Scenario: Tooltip ou texto de ajuda disponível
- **WHEN** o usuário foca ou passa o cursor no campo "Notas e Contextos"
- **THEN** existe um tooltip ou texto de ajuda indicando que este campo é para notas rápidas; transcrições completas devem ser subidas como Documentos

---

### Requirement: Campo "Contexto Comportamental" com orientação e limite visível
O campo "Contexto Comportamental" SHALL ter label, tooltip e contador de caracteres restantes que deixem claro sua finalidade (síntese do perfil comportamental do cliente) e o limite de tamanho.

#### Scenario: Tooltip explica a finalidade do campo
- **WHEN** o usuário foca ou passa o cursor no campo "Contexto Comportamental"
- **THEN** um tooltip explica que este campo contém a síntese do perfil comportamental, preenchido manualmente pelo planejador ou gerado pela IA a partir dos documentos do cliente

#### Scenario: Contador de caracteres exibido
- **WHEN** o usuário está editando o campo "Contexto Comportamental"
- **THEN** um contador de caracteres restantes é exibido próximo ao campo (ex: "320/500 caracteres")

#### Scenario: Feedback ao exceder limite
- **WHEN** o usuário tenta digitar ou colar texto que excede o limite de caracteres do campo
- **THEN** o sistema exibe feedback imediato (contador em vermelho ou mensagem de erro) indicando o limite atingido, sem perder o conteúdo já inserido dentro do limite

---

### Requirement: Feedback de limite excedido sem perda de conteúdo
Quando o usuário cola texto que excede o limite de qualquer campo com restrição de tamanho, o sistema SHALL exibir feedback claro e SHALL NOT truncar silenciosamente o conteúdo sem aviso.

#### Scenario: Cole de texto longo com aviso
- **WHEN** o usuário cola texto que excede o limite no campo "Contexto Comportamental"
- **THEN** o sistema exibe mensagem indicando o limite e o texto é truncado até o limite OU o campo rejeita o excedente com aviso — nunca trunca silenciosamente sem feedback
