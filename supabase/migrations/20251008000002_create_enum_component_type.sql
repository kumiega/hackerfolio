-- -------------------------------------------------------------------
-- migration: create enum component_type
-- description: define enum type for component categories
-- timestamp: 2025-10-08 00:00:02 UTC
-- -------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'component_type') then
    create type public.component_type as enum (
      'text',
      'card',
      'pills',
      'social_links',
      'list',
      'image',
      'bio'
    );
  end if;
end $$;