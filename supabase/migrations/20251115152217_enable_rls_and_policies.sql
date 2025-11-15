-- -------------------------------------------------------------------
-- migration: enable rls and recreate policies
-- description: re-enable row level security and recreate all RLS policies on core tables
-- timestamp: 2025-11-15 15:22:17 UTC
-- -------------------------------------------------------------------

-- enable row level security on each table
alter table public.user_profiles enable row level security;
alter table public.portfolios enable row level security;

-- recreate policies for user_profiles

-- policies for authenticated users
create policy user_profiles_select_authenticated
  on public.user_profiles for select to authenticated
  using (id = auth.uid());

create policy user_profiles_insert_authenticated
  on public.user_profiles for insert to authenticated
  with check (id = auth.uid());

create policy user_profiles_update_authenticated
  on public.user_profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy user_profiles_delete_authenticated
  on public.user_profiles for delete to authenticated
  using (id = auth.uid());

-- policies for anonymous users (no access)
create policy user_profiles_anon_deny_all
  on public.user_profiles for all to anon
  using (false);

-- recreate policies for portfolios

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

