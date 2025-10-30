-- -------------------------------------------------------------------
-- migration: disable rls and drop policies
-- description: disable row level security and remove all RLS policies on core tables
-- timestamp: 2025-10-08 00:00:07 UTC
-- -------------------------------------------------------------------

-- disable row level security on each table
alter table public.user_profiles disable row level security;
alter table public.portfolios disable row level security;

-- drop all policies on user_profiles
-- destructive: removing security policies
drop policy if exists user_profiles_select_authenticated on public.user_profiles;
drop policy if exists user_profiles_insert_authenticated on public.user_profiles;
drop policy if exists user_profiles_update_authenticated on public.user_profiles;
drop policy if exists user_profiles_delete_authenticated on public.user_profiles;
drop policy if exists user_profiles_anon_deny_all on public.user_profiles;

-- drop all policies on portfolios
drop policy if exists portfolios_select_authenticated on public.portfolios;
drop policy if exists portfolios_insert_authenticated on public.portfolios;
drop policy if exists portfolios_update_authenticated on public.portfolios;
drop policy if exists portfolios_delete_authenticated on public.portfolios;
drop policy if exists portfolios_select_anon on public.portfolios;
drop policy if exists portfolios_insert_anon on public.portfolios;
drop policy if exists portfolios_update_anon on public.portfolios;
drop policy if exists portfolios_delete_anon on public.portfolios;
