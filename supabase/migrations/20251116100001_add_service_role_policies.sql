-- -------------------------------------------------------------------
-- migration: add service role policies
-- description: add policies for service_role to allow full access for admin operations
-- timestamp: 2025-11-16 10:00:01 UTC
-- -------------------------------------------------------------------

-- service role policies for user_profiles (full access for admin operations)
create policy service_role_user_profiles_all
  on public.user_profiles for all to service_role
  using (true) with check (true);

-- service role policies for portfolios (full access for admin operations)
create policy service_role_portfolios_all
  on public.portfolios for all to service_role
  using (true) with check (true);
