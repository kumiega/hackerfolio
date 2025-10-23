-- -------------------------------------------------------------------
-- migration: create user_profiles table
-- description: create table user_profiles with FK to auth.users, enable RLS, and define policies
-- timestamp: 2025-10-08 00:00:01 UTC
-- -------------------------------------------------------------------

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  -- Required for subdomain functionality (nullable to allow user creation without immediate username)
  username text unique,
  -- Basic auth sync
  email text,
  full_name text,
  avatar_url text,
  -- Metadata
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Constraints (only apply when username is not null)
  constraint username_length check (username is null or (char_length(username) >= 3 and char_length(username) <= 30)),
  constraint username_format check (username is null or username ~* '^[a-z0-9-]+$')
);

alter table public.user_profiles enable row level security;

-- policies for authenticated users
create policy user_profiles_select_authenticated
  on public.user_profiles
  for select
  to authenticated
  using (id = auth.uid());

create policy user_profiles_insert_authenticated
  on public.user_profiles
  for insert
  to authenticated
  with check (id = auth.uid());

-- Allow system functions to insert user profiles (for OAuth flow)
create policy user_profiles_insert_system
  on public.user_profiles
  for insert
  to service_role
  with check (true);

create policy user_profiles_update_authenticated
  on public.user_profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy user_profiles_delete_authenticated
  on public.user_profiles
  for delete
  to authenticated
  using (id = auth.uid());

-- policies for anonymous users (no access)
create policy user_profiles_select_anon
  on public.user_profiles
  for select
  to anon
  using (false);

create policy user_profiles_insert_anon
  on public.user_profiles
  for insert
  to anon
  with check (false);

create policy user_profiles_update_anon
  on public.user_profiles
  for update
  to anon
  using (false);

create policy user_profiles_delete_anon
  on public.user_profiles
  for delete
  to anon
  using (false);

-- function to automatically create user profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  -- Insert user profile with nullable username (no auto-generation)
  -- Use security definer to bypass RLS during user creation
  -- Use ON CONFLICT DO NOTHING to handle duplicate inserts gracefully
  insert into public.user_profiles (
    id,
    username,
    email,
    full_name,
    avatar_url,
    created_at,
    updated_at
  )
  values (
    new.id,
    null, -- username is nullable, will be set later via set_username() function
    coalesce(new.email, ''),
    coalesce(
      new.user_metadata->>'full_name', 
      new.user_metadata->>'name', 
      new.raw_user_meta_data->>'full_name', 
      new.raw_user_meta_data->>'name',
      ''
    ),
    nullif(coalesce(
      new.user_metadata->>'avatar_url',
      new.raw_user_meta_data->>'avatar_url',
      new.user_metadata->>'picture',
      new.raw_user_meta_data->>'picture',
      new.user_metadata->>'profilePicture',
      new.raw_user_meta_data->>'profilePicture'
    ), ''),
    coalesce(new.created_at, now()),
    now()
  )
  on conflict (id) do nothing;
  
  return new;
exception
  when others then
    -- Log the error but don't fail the auth process
    raise log 'Error creating user profile for user %: %', new.id, SQLERRM;
    return new;
end;
$$ language plpgsql security definer;

-- function to sync user profile when auth.users is updated
create or replace function public.handle_user_update()
returns trigger as $$
begin
  update public.user_profiles
  set
    email = coalesce(new.email, email),
    full_name = coalesce(
      new.user_metadata->>'full_name', 
      new.user_metadata->>'name', 
      new.raw_user_meta_data->>'full_name', 
      new.raw_user_meta_data->>'name', 
      full_name
    ),
    avatar_url = nullif(coalesce(
      new.user_metadata->>'avatar_url',
      new.raw_user_meta_data->>'avatar_url',
      new.user_metadata->>'picture',
      new.raw_user_meta_data->>'picture',
      new.user_metadata->>'profilePicture',
      new.raw_user_meta_data->>'profilePicture',
      avatar_url
    ), ''),
    updated_at = now()
  where id = new.id;
  return new;
exception
  when others then
    -- Log the error but don't fail the auth update
    raise log 'Error updating user profile for user %: %', new.id, SQLERRM;
    return new;
end;
$$ language plpgsql security definer;

-- trigger to create profile when user signs up
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- trigger to sync profile when user data is updated
create trigger on_auth_user_updated
  after update on auth.users
  for each row execute procedure public.handle_user_update();

-- function to automatically update updated_at timestamp
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- trigger to automatically update updated_at on row updates
create trigger update_user_profiles_updated_at
  before update on public.user_profiles
  for each row execute procedure public.update_updated_at_column();

-- Function to set username (for onboarding)
create or replace function public.set_username(username_input text)
returns public.user_profiles
language plpgsql
security definer
as $$
declare
  result public.user_profiles;
begin
  -- Validate username format and uniqueness
  if username_input is null or char_length(username_input) < 3 or char_length(username_input) > 30 then
    raise exception 'Username must be between 3 and 30 characters';
  end if;
  
  if not (username_input ~* '^[a-z0-9-]+$') then
    raise exception 'Username can only contain lowercase letters, numbers, and hyphens';
  end if;
  
  if exists (select 1 from public.user_profiles where username = username_input) then
    raise exception 'Username already taken';
  end if;
  
  -- Update the profile
  update public.user_profiles
  set
    username = username_input,
    updated_at = now()
  where id = auth.uid()
  returning * into result;

  if not found then
    raise exception 'User profile not found';
  end if;

  return result;
end;
$$;

-- Grant permissions
grant execute on function public.set_username(text) to authenticated;