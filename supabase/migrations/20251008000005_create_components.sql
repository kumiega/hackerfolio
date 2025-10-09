-- -------------------------------------------------------------------
-- migration: create components table
-- description: create table components, enable RLS, and define policies
-- timestamp: 2025-10-08 00:00:05 UTC
-- -------------------------------------------------------------------

create table if not exists public.components (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.sections(id) on delete cascade,
  type public.component_type not null,
  position int not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.components enable row level security;

-- policies for authenticated users
create policy components_select_authenticated
  on public.components
  for select
  to authenticated
  using (
    exists (
      select 1 from public.sections s
      join public.portfolios p on p.id = s.portfolio_id
      where s.id = public.components.section_id
        and p.user_id = auth.uid()
    )
  );

create policy components_insert_authenticated
  on public.components
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.sections s
      join public.portfolios p on p.id = s.portfolio_id
      where s.id = section_id
        and p.user_id = auth.uid()
    )
  );

create policy components_update_authenticated
  on public.components
  for update
  to authenticated
  using (
    exists (
      select 1 from public.sections s
      join public.portfolios p on p.id = s.portfolio_id
      where s.id = public.components.section_id
        and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.sections s
      join public.portfolios p on p.id = s.portfolio_id
      where s.id = section_id
        and p.user_id = auth.uid()
    )
  );

create policy components_delete_authenticated
  on public.components
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.sections s
      join public.portfolios p on p.id = s.portfolio_id
      where s.id = public.components.section_id
        and p.user_id = auth.uid()
    )
  );

-- policies for anonymous users (no access)
create policy components_select_anon
  on public.components
  for select
  to anon
  using (false);

create policy components_insert_anon
  on public.components
  for insert
  to anon
  with check (false);

create policy components_update_anon
  on public.components
  for update
  to anon
  using (false);

create policy components_delete_anon
  on public.components
  for delete
  to anon
  using (false);

-- trigger to automatically update updated_at on row updates
create trigger update_components_updated_at
  before update on public.components
  for each row execute procedure public.update_updated_at_column();