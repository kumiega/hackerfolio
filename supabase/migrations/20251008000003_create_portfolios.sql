-- -------------------------------------------------------------------
-- migration: create portfolios table with JSONB structure
-- description: create portfolios table with draft_data and published_data
-- timestamp: 2025-10-08 00:00:03 UTC
-- -------------------------------------------------------------------

create table if not exists public.portfolios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.user_profiles(id) on delete cascade,
  draft_data jsonb not null default '{"full_name": "", "position": "", "bio": [], "avatar_url": null, "sections": []}'::jsonb,
  published_data jsonb default null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_published_at timestamptz default null
);

comment on table public.portfolios is 'User portfolios with draft and published versions stored as JSONB';
comment on column public.portfolios.draft_data is 'Draft portfolio data in JSONB format: {"full_name": "string", "position": "string", "bio": [{"id": "uuid", "type": "text|image|social_links", "data": {}}], "avatar_url": "string|null", "sections": [{"id": "uuid", "title": "string", "slug": "string", "description": "string", "visible": true, "components": [{"id": "uuid", "type": "text|card|pills|social_links|list|image|bio", "data": {}}]}]}';
comment on column public.portfolios.published_data is 'Published portfolio data (same structure as draft_data), NULL if never published';
comment on column public.portfolios.last_published_at is 'Timestamp of last publish action';

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

-- function to publish portfolio (copy draft_data to published_data)
create or replace function public.publish_portfolio(portfolio_id uuid)
returns public.portfolios
language plpgsql
security definer
as $$
declare
  result public.portfolios;
  section_count int;
  bio_count int;
  component_count int;
begin
  -- Validate user owns the portfolio
  if not exists (
    select 1 from public.portfolios
    where id = portfolio_id and user_id = auth.uid()
  ) then
    raise exception 'Portfolio not found or access denied';
  end if;

  -- Get draft_data to validate
  select
    jsonb_array_length(draft_data->'sections'),
    jsonb_array_length(coalesce(draft_data->'bio', '[]'::jsonb)),
    (
      select coalesce(sum(jsonb_array_length(section->'components')), 0)
      from jsonb_array_elements(draft_data->'sections') as section
    )
  into section_count, bio_count, component_count
  from public.portfolios
  where id = portfolio_id;

  -- Validate at least 1 section and some content (bio or section components)
  if section_count is null or section_count < 1 then
    raise exception 'Portfolio must have at least 1 section';
  end if;

  if (component_count is null or component_count < 1) and (bio_count is null or bio_count < 1) then
    raise exception 'Portfolio must have at least 1 component (in sections or bio)';
  end if;

  -- Publish: copy draft_data to published_data
  update public.portfolios
  set 
    published_data = draft_data,
    last_published_at = now()
  where id = portfolio_id and user_id = auth.uid()
  returning * into result;

  return result;
end;
$$;

grant execute on function public.publish_portfolio(uuid) to authenticated;