-- Visitantes em presença de culto (registro rápido sem cadastro completo em people)

create table if not exists public.worship_attendance_visitors (
  id uuid primary key default gen_random_uuid(),
  church_id uuid references public.churches(id) on delete set null,
  service_id uuid not null references public.worship_services(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  leader_person_id uuid references public.people(id) on delete set null,
  attended_on date not null,
  visitor_name text not null,
  notes text,
  registered_by_user_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_worship_att_visitors_service_date
  on public.worship_attendance_visitors(service_id, attended_on);

create index if not exists idx_worship_att_visitors_leader
  on public.worship_attendance_visitors(leader_person_id, attended_on);

create index if not exists idx_worship_att_visitors_church
  on public.worship_attendance_visitors(church_id, attended_on);

alter table if exists public.worship_attendance_visitors disable row level security;
