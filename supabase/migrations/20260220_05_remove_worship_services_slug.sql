-- 20260220_05_remove_worship_services_slug.sql
-- Remove unnecessary slug column from worship_services table that was causing NOT NULL constraint errors

alter table if exists public.worship_services
  drop column if exists slug;

-- Also drop any unique constraint on slug if it exists
alter table if exists public.worship_services
  drop constraint if exists idx_worship_services_slug;

alter table if exists public.worship_services
  drop constraint if exists worship_services_slug_key;
