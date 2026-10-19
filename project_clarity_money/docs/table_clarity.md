## Table `profiles`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  Nullable |
| `email` | `text` |  Nullable |
| `google_calendar_connected` | `bool` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `categories`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `name` | `text` |  |
| `color` | `text` |  |
| `created_at` | `timestamptz` |  |

## Table `clients`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `type` | `client_type` |  |
| `name` | `text` |  |
| `email` | `text` |  Nullable |
| `phone` | `text` |  Nullable |
| `document` | `text` |  Nullable |
| `status` | `client_status` |  |
| `category_id` | `uuid` |  Nullable |
| `last_contact_at` | `timestamptz` |  Nullable |
| `next_action_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `pipeline_stage` | `pipeline_stage` |  |
| `pipeline_order` | `int4` |  |
| `source` | `client_source` |  |
| `source_campaign` | `text` |  Nullable |
| `utm_source` | `text` |  Nullable |
| `utm_medium` | `text` |  Nullable |
| `utm_campaign` | `text` |  Nullable |
| `landing_url` | `text` |  Nullable |
| `referrer` | `text` |  Nullable |

## Table `notes`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `client_id` | `uuid` |  |
| `kind` | `note_kind` |  |
| `content` | `text` |  |
| `created_at` | `timestamptz` |  |

## Table `documents`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `client_id` | `uuid` |  |
| `name` | `text` |  |
| `path` | `text` |  |
| `size` | `int8` |  Nullable |
| `mime` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `extracted_text` | `text` |  Nullable |

## Table `tasks`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `client_id` | `uuid` |  Nullable |
| `title` | `text` |  |
| `description` | `text` |  Nullable |
| `due_at` | `timestamptz` |  Nullable |
| `status` | `task_status` |  |
| `source` | `task_source` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `activation_rules`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `name` | `text` |  |
| `trigger_days_no_contact` | `int4` |  |
| `applies_to_status` | `client_status` |  |
| `action` | `rule_action` |  |
| `email_subject` | `text` |  Nullable |
| `email_body_template` | `text` |  Nullable |
| `active` | `bool` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `calendar_events`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `client_id` | `uuid` |  Nullable |
| `google_event_id` | `text` |  Nullable |
| `title` | `text` |  |
| `description` | `text` |  Nullable |
| `location` | `text` |  Nullable |
| `meet_link` | `text` |  Nullable |
| `start_at` | `timestamptz` |  |
| `end_at` | `timestamptz` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `ai_generations`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `client_id` | `uuid` |  Nullable |
| `kind` | `ai_kind` |  |
| `prompt` | `text` |  Nullable |
| `output` | `text` |  |
| `created_at` | `timestamptz` |  |

## Table `client_stage_history`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `client_id` | `uuid` |  |
| `user_id` | `uuid` |  |
| `stage` | `pipeline_stage` |  |
| `status` | `text` |  |
| `changed_at` | `timestamptz` |  |

## Table `lead_intake_tokens`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `label` | `text` |  |
| `token_hash` | `text` |  Unique |
| `active` | `bool` |  |
| `created_at` | `timestamptz` |  |
| `last_used_at` | `timestamptz` |  Nullable |

## Table `lead_intake_log`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `token_id` | `uuid` |  Nullable |
| `ip` | `text` |  Nullable |
| `ok` | `bool` |  |
| `reason` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `client_diagnostics`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `client_id` | `uuid` |  |
| `user_id` | `uuid` |  |
| `diagnostic_type` | `text` |  |
| `score` | `int4` |  |
| `max_score` | `int4` |  |
| `stage_key` | `text` |  Nullable |
| `stage_label` | `text` |  Nullable |
| `answers` | `jsonb` |  |
| `created_at` | `timestamptz` |  |

## Custom Types / Enums

### `client_type`

`PF` | `PJ`

### `client_status`

`lead` | `ativo` | `arquivado`

### `note_kind`

`nota` | `contexto`

### `task_status`

`pendente` | `feito` | `cancelado`

### `task_source`

`manual` | `regra_ativacao`

### `rule_action`

`task` | `email` | `ambos`

### `ai_kind`

`resumo` | `mensagem` | `analise` | `briefing`

### `pipeline_stage`

`novo` | `primeiro_contato` | `reuniao_agendada` | `reuniao_realizada` | `fechamento` | `contrato_enviado` | `em_andamento` | `finalizado`

### `client_source`

`instagram` | `landing_page` | `indicacao` | `outro` | `google_ads`

## RLS Policies

### `profiles`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `own profile` | ALL | public | PERMISSIVE | `(auth.uid() = id)` | `(auth.uid() = id)` |

### `lead_intake_log`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `no direct access` | SELECT | public | PERMISSIVE | `false` | — |

### `lead_intake_tokens`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Users manage their own lead intake tokens` | ALL | authenticated | PERMISSIVE | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |

### `activation_rules`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Users manage their own activation rules` | ALL | authenticated | PERMISSIVE | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |

### `ai_generations`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Users manage their own ai generations` | ALL | authenticated | PERMISSIVE | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |

### `calendar_events`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Users manage their own calendar events` | ALL | authenticated | PERMISSIVE | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |

### `categories`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Users manage their own categories` | ALL | authenticated | PERMISSIVE | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |

### `client_diagnostics`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Users manage their own client diagnostics` | ALL | authenticated | PERMISSIVE | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |

### `client_stage_history`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Users manage their own client stage history` | ALL | authenticated | PERMISSIVE | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |

### `clients`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Users manage their own clients` | ALL | authenticated | PERMISSIVE | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |

### `documents`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Users manage their own documents` | ALL | authenticated | PERMISSIVE | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |

### `notes`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Users manage their own notes` | ALL | authenticated | PERMISSIVE | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |

### `tasks`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Users manage their own tasks` | ALL | authenticated | PERMISSIVE | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |

