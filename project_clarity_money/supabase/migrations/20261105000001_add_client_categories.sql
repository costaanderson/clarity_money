-- Junction table: múltiplas categorias por cliente
create table client_categories (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  user_id uuid not null,
  created_at timestamptz default now(),
  unique(client_id, category_id)
);

alter table client_categories enable row level security;

create policy "Users manage their own client categories"
  on client_categories for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Migra dados existentes de category_id para a nova tabela
insert into client_categories (client_id, category_id, user_id)
select id, category_id, user_id
from clients
where category_id is not null
on conflict do nothing;
