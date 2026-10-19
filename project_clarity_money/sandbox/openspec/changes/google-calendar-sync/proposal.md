## Why

O planejador financeiro usa o Google Agenda como ferramenta principal para compromissos com clientes. Hoje, a Agenda da Bússola é isolada — o usuário precisaria duplicar cada compromisso manualmente. Isso gera abandono da feature e perda de contexto (histórico de atendimentos).

## What Changes

- Adicionar botão "Conectar Google Agenda" funcional nas Configurações (hoje está desabilitado com "em breve")
- Implementar fluxo OAuth separado para solicitar permissão de leitura/escrita no Google Calendar
- Armazenar os tokens Google (access + refresh) por usuário no Supabase, com revogação disponível
- Ao criar um compromisso na Bússola, criar o evento correspondente no Google Calendar do usuário
- Ao abrir a Agenda, buscar e exibir eventos do Google Calendar junto com os eventos locais
- Sincronização de deleção: ao deletar evento na Bússola, deletar o correspondente no Google
- Exibir status de conexão (conectado / desconectado) e botão de revogar nas Configurações

## Capabilities

### New Capabilities

- `google-calendar-auth`: Fluxo OAuth para autorizar acesso à agenda Google; armazenamento e revogação de tokens por usuário
- `google-calendar-sync`: Criação, leitura e deleção de eventos no Google Calendar a partir da Agenda da Bússola

### Modified Capabilities

- `agenda`: A tela de Agenda passa a exibir eventos do Google Calendar mesclados com os locais, e ao criar/deletar um evento sincroniza com o Google (quando conectado)

## Impact

- Novo endpoint de callback OAuth: `GET /api/google/callback`
- Nova tabela Supabase: `google_calendar_tokens` (user_id, access_token, refresh_token, expires_at)
- Novas server functions: `getGoogleAuthUrl`, `handleGoogleCallback`, `revokeGoogleCalendar`, `syncEventToGoogle`, `fetchGoogleEvents`, `deleteGoogleEvent`
- Dependência nova: chamadas diretas à Google Calendar API v3 via `fetch` (sem pacote extra)
- Configurações: card Google Agenda ganha estado dinâmico (conectado/desconectado)
- Agenda: query de eventos passa a mesclar fonte local + Google Calendar
