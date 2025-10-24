-- -------------------------------------------------------------------
-- migration: disable rls and drop policies
-- description: disable row level security and remove all RLS policies on core tables
-- timestamp: 2025-10-08 00:00:07 UTC
-- -------------------------------------------------------------------

-- disable row level security on each table
alter table public.user_profiles disable row level security;
alter table public.portfolios disable row level security;
alter table public.sections disable row level security;
alter table public.components disable row level security;

-- drop all policies on user_profiles
-- destructive: removing security policies
drop policy if exists user_profiles_select_authenticated on public.user_profiles;
drop policy if exists user_profiles_insert_authenticated on public.user_profiles;
drop policy if exists user_profiles_update_authenticated on public.user_profiles;
drop policy if exists user_profiles_delete_authenticated on public.user_profiles;

-- drop all policies on portfolios
drop policy if exists portfolios_select_authenticated on public.portfolios;
drop policy if exists portfolios_insert_authenticated on public.portfolios;
drop policy if exists portfolios_update_authenticated on public.portfolios;
drop policy if exists portfolios_delete_authenticated on public.portfolios;
drop policy if exists portfolios_select_anon on public.portfolios;
drop policy if exists portfolios_insert_anon on public.portfolios;
drop policy if exists portfolios_update_anon on public.portfolios;
drop policy if exists portfolios_delete_anon on public.portfolios;

-- drop all policies on sections
drop policy if exists sections_select_authenticated on public.sections;
drop policy if exists sections_insert_authenticated on public.sections;
drop policy if exists sections_update_authenticated on public.sections;
drop policy if exists sections_delete_authenticated on public.sections;
drop policy if exists sections_select_anon on public.sections;
drop policy if exists sections_insert_anon on public.sections;
drop policy if exists sections_update_anon on public.sections;
drop policy if exists sections_delete_anon on public.sections;

-- drop all policies on components
drop policy if exists components_select_authenticated on public.components;
drop policy if exists components_insert_authenticated on public.components;
drop policy if exists components_update_authenticated on public.components;
drop policy if exists components_delete_authenticated on public.components;
drop policy if exists components_select_anon on public.components;
drop policy if exists components_insert_anon on public.components;
drop policy if exists components_update_anon on public.components;
drop policy if exists components_delete_anon on public.components;
