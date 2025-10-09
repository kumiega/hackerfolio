-- -------------------------------------------------------------------
-- migration: create app_errors table and utilities
-- description: error tracking with enums, RLS, helper fns, and indexes
-- timestamp: 2025-10-08 00:00:08 UTC
-- -------------------------------------------------------------------

-- Enums for error severity and source
do $$
begin
  if not exists (select 1 from pg_type where typname = 'error_severity') then
    create type public.error_severity as enum ('debug', 'info', 'warn', 'error', 'fatal');
  end if;
  if not exists (select 1 from pg_type where typname = 'error_source') then
    create type public.error_source as enum ('frontend', 'api', 'edge', 'worker', 'db', 'other');
  end if;
end $$;

-- Main table
create table if not exists public.app_errors (
  id bigserial primary key,
  occurred_at timestamptz not null default now(),
  severity public.error_severity not null default 'error',
  source public.error_source not null default 'other',
  user_id uuid references public.user_profiles(id) on delete set null,
  request_id text,
  session_id text,
  route text,
  endpoint text,
  error_code text,
  message text not null,
  stack text,
  context jsonb not null default '{}'::jsonb,
  client_ip inet,
  user_agent text,
  -- denormalized fields for quick filters
  username text,
  portfolio_id uuid references public.portfolios(id) on delete set null
);

comment on table public.app_errors is 'Centralized application error/event store for observability and triage.';

-- RLS: allow anonymous and authenticated to insert (client logging), but no select/update/delete; service_role can manage
alter table public.app_errors enable row level security;

-- deny by default for anon/auth
create policy app_errors_insert_anon
  on public.app_errors
  for insert
  to anon
  with check (true);

create policy app_errors_insert_authenticated
  on public.app_errors
  for insert
  to authenticated
  with check (true);

-- No read/update/delete for anon/auth
create policy app_errors_select_anon
  on public.app_errors
  for select
  to anon
  using (false);

create policy app_errors_select_authenticated
  on public.app_errors
  for select
  to authenticated
  using (false);

create policy app_errors_update_any
  on public.app_errors
  for update
  to authenticated
  using (false)
  with check (false);

create policy app_errors_delete_any
  on public.app_errors
  for delete
  to authenticated
  using (false);

-- Indexes
create index if not exists app_errors_occurred_at_idx on public.app_errors(occurred_at desc);
create index if not exists app_errors_severity_idx on public.app_errors(severity);
create index if not exists app_errors_source_idx on public.app_errors(source);
create index if not exists app_errors_user_id_idx on public.app_errors(user_id);
create index if not exists app_errors_request_id_idx on public.app_errors(request_id);
create index if not exists app_errors_portfolio_id_idx on public.app_errors(portfolio_id);
create index if not exists app_errors_context_gin_idx on public.app_errors using gin (context);

-- Helper function to log errors safely via RPC
create or replace function public.log_app_error(
  severity_in public.error_severity default 'error',
  source_in public.error_source default 'other',
  message_in text,
  error_code_in text default null,
  route_in text default null,
  endpoint_in text default null,
  request_id_in text default null,
  session_id_in text default null,
  stack_in text default null,
  context_in jsonb default '{}'::jsonb,
  client_ip_in inet default null,
  user_agent_in text default null,
  portfolio_id_in uuid default null
)
returns public.app_errors
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_username text;
  v_err public.app_errors;
begin
  -- capture user context if available
  begin
    v_user_id := auth.uid();
  exception when others then
    v_user_id := null;
  end;

  if v_user_id is not null then
    select username into v_username from public.user_profiles where id = v_user_id;
  end if;

  insert into public.app_errors (
    severity, source, user_id, request_id, session_id, route, endpoint,
    error_code, message, stack, context, client_ip, user_agent, username, portfolio_id
  ) values (
    severity_in, source_in, v_user_id, request_id_in, session_id_in, route_in, endpoint_in,
    error_code_in, left(coalesce(message_in, 'unknown error'), 2000), left(stack_in, 20000),
    coalesce(context_in, '{}'::jsonb), client_ip_in, user_agent_in, v_username, portfolio_id_in
  ) returning * into v_err;

  return v_err;
end;
$$;

revoke all on function public.log_app_error(public.error_severity, public.error_source, text, text, text, text, text, text, text, jsonb, inet, text, uuid) from public;
grant execute on function public.log_app_error(public.error_severity, public.error_source, text, text, text, text, text, text, text, jsonb, inet, text, uuid) to anon, authenticated;

-- Cleanup routine for retention
create or replace function public.app_errors_cleanup(retain_days int default 30)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted int;
begin
  if retain_days is null or retain_days < 1 then
    raise exception 'retain_days must be >= 1';
  end if;

  delete from public.app_errors
  where occurred_at < now() - (retain_days || ' days')::interval;
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.app_errors_cleanup(int) from public;
-- Only service role should call cleanup; do not grant to anon/auth


