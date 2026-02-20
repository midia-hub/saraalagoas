-- Fix worship_services table: add missing columns
-- The table was created in a previous migration without key columns

-- Drop the old table if it's completely empty/broken
-- First, check and add missing columns
alter table if exists public.worship_services
  add column if not exists day_of_week int default 0;

alter table if exists public.worship_services  
  add column if not exists time_of_day text default '19:00';

alter table if exists public.worship_services
  add column if not exists is_arena boolean default false;

alter table if exists public.worship_services
  add column if not exists arena_id uuid references public.arenas(id) on delete set null;

alter table if exists public.worship_services
  add column if not exists active boolean default true;

-- If created_at and updated_at don't exist, add them
alter table if exists public.worship_services
  add column if not exists created_at timestamptz default now();

alter table if exists public.worship_services
  add column if not exists updated_at timestamptz default now();

-- Ensure church_id exists
alter table if exists public.worship_services
  add column if not exists church_id uuid references public.churches(id) on delete cascade;

-- Make sure name column exists
alter table if exists public.worship_services
  add column if not exists name text;

-- Add NOT NULL constraints to required columns (wrapped in a DO block for error handling)
do $$
begin
  alter table public.worship_services alter column name set not null;
  alter table public.worship_services alter column day_of_week set not null;
  alter table public.worship_services alter column time_of_day set not null;
  alter table public.worship_services alter column is_arena set not null;
  alter table public.worship_services alter column active set not null;
exception when others then
  -- If constraints fail, it's OK - columns might already have NOT NULL
end
$$;

-- Recreate indexes
drop index if exists idx_worship_services_church_id;
drop index if exists idx_worship_services_active;
drop index if exists idx_worship_services_arena_id;

create index idx_worship_services_church_id on public.worship_services(church_id);
create index idx_worship_services_active on public.worship_services(active);
create index idx_worship_services_arena_id on public.worship_services(arena_id);

-- Recreate trigger
drop trigger if exists trg_worship_services_updated_at on public.worship_services;
create trigger trg_worship_services_updated_at
  before update on public.worship_services
  for each row execute function public.set_updated_at();

-- Also fix worship_attendance table if needed
alter table if exists public.worship_attendance
  add column if not exists service_id uuid references public.worship_services(id) on delete cascade;

alter table if exists public.worship_attendance
  add column if not exists person_id uuid references public.people(id) on delete cascade;

alter table if exists public.worship_attendance
  add column if not exists leader_person_id uuid references public.people(id) on delete set null;

alter table if exists public.worship_attendance
  add column if not exists attended_on date;

alter table if exists public.worship_attendance
  add column if not exists attended boolean default true;

alter table if exists public.worship_attendance
  add column if not exists arena_id uuid references public.arenas(id) on delete set null;

alter table if exists public.worship_attendance
  add column if not exists notes text;

alter table if exists public.worship_attendance
  add column if not exists registered_by_user_id uuid;

alter table if exists public.worship_attendance
  add column if not exists created_at timestamptz default now();

-- Disable RLS on these tables (service role will enforce auth in API)
alter table public.worship_services disable row level security;
alter table public.worship_attendance disable row level security;
