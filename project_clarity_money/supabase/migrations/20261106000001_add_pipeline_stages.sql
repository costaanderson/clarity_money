-- Tabela de etapas dinâmicas por usuário
create table pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  label text not null,
  slug text not null,
  position integer not null default 0,
  is_won boolean not null default false,
  created_at timestamptz default now(),
  unique(user_id, slug)
);

alter table pipeline_stages enable row level security;

create policy "Users manage their own pipeline stages"
  on pipeline_stages for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Converte clients.pipeline_stage de enum para text
alter table clients
  alter column pipeline_stage type text
  using pipeline_stage::text;

-- Converte client_stage_history.stage de enum para text (se existir)
alter table client_stage_history
  alter column stage type text
  using stage::text;

-- Semeia as etapas padrão para todos os usuários existentes
insert into pipeline_stages (user_id, label, slug, position, is_won)
select
  p.id,
  s.label,
  s.slug,
  s.position,
  s.is_won
from profiles p
cross join (values
  ('Novo',               'novo',               0, false),
  ('Primeiro contato',   'primeiro_contato',   1, false),
  ('Reunião agendada',   'reuniao_agendada',   2, false),
  ('Reunião realizada',  'reuniao_realizada',  3, false),
  ('Fechamento',         'fechamento',          4, false),
  ('Contrato enviado',   'contrato_enviado',   5, false),
  ('Em andamento',       'em_andamento',       6, false),
  ('Finalizado',         'finalizado',          7, true)
) as s(label, slug, position, is_won)
on conflict do nothing;
