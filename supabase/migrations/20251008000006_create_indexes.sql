-- -------------------------------------------------------------------
-- migration: add indexes for performance
-- description: create indexes on portfolios, sections, and components
-- timestamp: 2025-10-08 00:00:06 UTC
-- -------------------------------------------------------------------

create index if not exists portfolios_user_id_idx on public.portfolios(user_id);
create index if not exists sections_portfolio_id_idx on public.sections(portfolio_id);
create index if not exists sections_position_idx on public.sections(position);
create index if not exists components_section_id_idx on public.components(section_id);
create index if not exists components_position_idx on public.components(position);
create index if not exists components_data_gin_idx on public.components using gin (data);