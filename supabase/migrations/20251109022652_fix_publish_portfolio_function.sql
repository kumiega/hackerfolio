-- Fix publish_portfolio function to match current schema where bio is an object, not array
create or replace function public.publish_portfolio(portfolio_id uuid)
returns public.portfolios
language plpgsql
security definer
as $$
declare
  result public.portfolios;
  section_count int;
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
    (
      select coalesce(sum(jsonb_array_length(section->'components')), 0)
      from jsonb_array_elements(draft_data->'sections') as section
    )
  into section_count, component_count
  from public.portfolios
  where id = portfolio_id;

  -- Validate at least 1 section
  if section_count is null or section_count < 1 then
    raise exception 'Portfolio must have at least 1 section';
  end if;

  -- Validate at least 1 component in sections
  if component_count is null or component_count < 1 then
    raise exception 'Portfolio must have at least 1 component (in sections)';
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
