-- Fix worship_services table issues
-- Disable RLS since we use service role for API access

-- First, drop any problematic constraints
alter table if exists public.worship_services
  drop constraint if exists worship_services_church_id_fkey;

-- Ensure church_id column exists with proper FK
alter table public.worship_services
  add column if not exists church_id uuid;

-- Add the foreign key constraint properly  
alter table public.worship_services
  add constraint worship_services_church_id_fkey
  foreign key (church_id) references public.churches(id) on delete cascade;

-- Ensure indexes exist
create index if not exists idx_worship_services_church_id on public.worship_services(church_id);
create index if not exists idx_worship_services_active on public.worship_services(active);

-- Disable RLS (service role will handle authorization in API)
alter table public.worship_services disable row level security;

-- Do the same for revisao_vidas tables
alter table if exists public.revisao_vidas_events
  drop constraint if exists revisao_vidas_events_church_id_fkey;

alter table public.revisao_vidas_events
  add column if not exists church_id uuid;

alter table public.revisao_vidas_events
  add constraint revisao_vidas_events_church_id_fkey
  foreign key (church_id) references public.churches(id) on delete cascade;

alter table public.revisao_vidas_events disable row level security;

-- Fix revisao_vidas_registrations
alter table public.revisao_vidas_registrations disable row level security;

-- Fix consolidation_followups 
alter table public.consolidation_followups disable row level security;

-- Fix worship_attendance
alter table public.worship_attendance disable row level security;
