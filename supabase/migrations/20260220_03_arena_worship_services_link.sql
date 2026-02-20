-- Link worship_services to arenas when is_arena = true
-- Arena é um culto específico vinculado a uma Igreja

alter table public.worship_services
  add column if not exists arena_id uuid references public.arenas(id) on delete set null;

-- Create index for arena lookups
create index if not exists idx_worship_services_arena_id on public.worship_services(arena_id);

-- Add constraint: if is_arena = true, then arena_id must be set
-- (This will be enforced at API level, not at DB)

-- Seed some default arenas linked to churches if needed
-- You can call the API to create these via POST /api/admin/consolidacao/worship-services

-- Also update worship_attendance to track arena participation
alter table public.worship_attendance
  add column if not exists arena_id uuid references public.arenas(id) on delete set null;

create index if not exists idx_worship_attendance_arena_id on public.worship_attendance(arena_id);
