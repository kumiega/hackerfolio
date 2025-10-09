-- -------------------------------------------------------------------
-- migration: create sections table
-- description: create table sections, enable RLS, and define policies
-- timestamp: 2025-10-08 00:00:04 UTC
-- -------------------------------------------------------------------

create table if not exists public.sections (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  name varchar(150) not null,
  position int not null,
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sections enable row level security;

-- policies for authenticated users
create policy sections_select_authenticated
  on public.sections
  for select
  to authenticated
  using (
    exists (
      select 1 from public.portfolios p
      where p.id = public.sections.portfolio_id
        and p.user_id = auth.uid()
    )
  );

create policy sections_insert_authenticated
  on public.sections
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.portfolios p
      where p.id = portfolio_id
        and p.user_id = auth.uid()
    )
  );

create policy sections_update_authenticated
  on public.sections
  for update
  to authenticated
  using (
    exists (
      select 1 from public.portfolios p
      where p.id = public.sections.portfolio_id
        and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.portfolios p
      where p.id = portfolio_id
        and p.user_id = auth.uid()
    )
  );

create policy sections_delete_authenticated
  on public.sections
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.portfolios p
      where p.id = public.sections.portfolio_id
        and p.user_id = auth.uid()
    )
  );

-- policies for anonymous users (no access)
create policy sections_select_anon
  on public.sections
  for select
  to anon
  using (false);

create policy sections_insert_anon
  on public.sections
  for insert
  to anon
  with check (false);

create policy sections_update_anon
  on public.sections
  for update
  to anon
  using (false);

create policy sections_delete_anon
  on public.sections
  for delete
  to anon
  using (false);

-- trigger to automatically update updated_at on row updates
create trigger update_sections_updated_at
  before update on public.sections
  for each row execute procedure public.update_updated_at_column();