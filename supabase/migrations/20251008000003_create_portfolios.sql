-- -------------------------------------------------------------------
-- migration: create portfolios table
-- description: create table portfolios, enable RLS, and define policies
-- timestamp: 2025-10-08 00:00:03 UTC
-- -------------------------------------------------------------------

create table if not exists public.portfolios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.user_profiles(id) on delete cascade,
  is_published boolean not null default false,
  published_at timestamptz,
  title varchar(100) not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.portfolios enable row level security;

-- policies for authenticated users
create policy portfolios_select_authenticated
  on public.portfolios
  for select
  to authenticated
  using (user_id = auth.uid());

create policy portfolios_insert_authenticated
  on public.portfolios
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy portfolios_update_authenticated
  on public.portfolios
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy portfolios_delete_authenticated
  on public.portfolios
  for delete
  to authenticated
  using (user_id = auth.uid());

-- policies for anonymous users (no access)
create policy portfolios_select_anon
  on public.portfolios
  for select
  to anon
  using (false);

create policy portfolios_insert_anon
  on public.portfolios
  for insert
  to anon
  with check (false);

create policy portfolios_update_anon
  on public.portfolios
  for update
  to anon
  using (false);

create policy portfolios_delete_anon
  on public.portfolios
  for delete
  to anon
  using (false);

-- function to automatically update updated_at timestamp
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- trigger to automatically update updated_at on row updates
create trigger update_portfolios_updated_at
  before update on public.portfolios
  for each row execute procedure public.update_updated_at_column();