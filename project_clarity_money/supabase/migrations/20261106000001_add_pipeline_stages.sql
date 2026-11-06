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

-- Precisa dropar o trigger antes de alterar o tipo do enum
drop trigger if exists trg_client_stage_change on clients;

-- Converte clients.pipeline_stage de enum para text
alter table clients
  alter column pipeline_stage type text
  using pipeline_stage::text;

-- Converte client_stage_history.stage de enum para text
alter table client_stage_history
  alter column stage type text
  using stage::text;

-- Recria a função sem dependência do enum (já usa text)
create or replace function public.log_client_stage_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.client_stage_history (client_id, user_id, stage, status)
    values (new.id, new.user_id, new.pipeline_stage, new.status);
  elsif new.pipeline_stage is distinct from old.pipeline_stage
     or new.status is distinct from old.status then
    insert into public.client_stage_history (client_id, user_id, stage, status)
    values (new.id, new.user_id, new.pipeline_stage, new.status);
  end if;
  return new;
end;
$$;

-- Recria o trigger
create trigger trg_client_stage_change
after insert or update of pipeline_stage, status on public.clients
for each row execute function public.log_client_stage_change();

-- Agora é seguro dropar o enum (sem dependências)
drop type if exists public.pipeline_stage;

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
