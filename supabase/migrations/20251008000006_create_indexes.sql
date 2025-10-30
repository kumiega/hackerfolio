-- -------------------------------------------------------------------
-- migration: add indexes for performance
-- description: create indexes on portfolios and JSONB columns
-- timestamp: 2025-10-08 00:00:06 UTC
-- -------------------------------------------------------------------

create index if not exists portfolios_user_id_idx on public.portfolios(user_id);
create index if not exists portfolios_draft_data_gin_idx on public.portfolios using gin (draft_data);
create index if not exists portfolios_published_data_gin_idx on public.portfolios using gin (published_data);