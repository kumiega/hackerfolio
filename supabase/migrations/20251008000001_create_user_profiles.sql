-- -------------------------------------------------------------------
-- migration: create user_profiles table (simplified)
-- description: minimal profile with only app-specific data
-- timestamp: 2025-10-08 00:00:01 UTC
-- -------------------------------------------------------------------

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  is_onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint username_length check (username is null or (char_length(username) >= 3 and char_length(username) <= 30)),
  constraint username_format check (username is null or username ~* '^[a-z0-9-]+$')
);

alter table public.user_profiles enable row level security;

-- Policies for authenticated users
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

-- Policies for anonymous users (no access)
create policy user_profiles_anon_deny_all
  on public.user_profiles for all to anon
  using (false);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id, username, is_onboarded)
  values (new.id, null, false)
  on conflict (id) do nothing;
  return new;
exception
  when others then
    raise log 'Error creating user profile for user %: %', new.id, SQLERRM;
    return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-update updated_at
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_user_profiles_updated_at
  before update on public.user_profiles
  for each row execute procedure public.update_updated_at_column();

-- Function to set username (onboarding)
create or replace function public.set_username(username_input text)
returns public.user_profiles
language plpgsql
security definer
as $$
declare
  result public.user_profiles;
begin
  if username_input is null or char_length(username_input) < 3 or char_length(username_input) > 30 then
    raise exception 'Username must be between 3 and 30 characters';
  end if;
  
  if not (username_input ~* '^[a-z0-9-]+$') then
    raise exception 'Username can only contain lowercase letters, numbers, and hyphens';
  end if;
  
  if exists (select 1 from public.user_profiles where username = username_input) then
    raise exception 'Username already taken';
  end if;
  
  update public.user_profiles
  set username = username_input
  where id = auth.uid()
  returning * into result;

  if not found then
    raise exception 'User profile not found';
  end if;

  return result;
end;
$$;

-- Function to complete onboarding
create or replace function public.complete_onboarding()
returns void
language plpgsql
security definer
as $$
begin
  update public.user_profiles
  set is_onboarded = true
  where id = auth.uid();
end;
$$;

-- Grant permissions
grant execute on function public.set_username(text) to authenticated;
grant execute on function public.complete_onboarding() to authenticated;