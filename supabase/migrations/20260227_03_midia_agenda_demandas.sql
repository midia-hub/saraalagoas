-- =====================================================
-- MÍDIA / SOCIAL - AGENDA E DEMANDAS
-- =====================================================

create table if not exists public.media_agenda_events (
  id            uuid primary key default gen_random_uuid(),
  church_id     uuid not null references public.churches(id) on delete cascade,
  name          text not null,
  description   text,
  multi_day     boolean not null default false,
  send_to_media boolean not null default true,
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.media_agenda_event_days (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.media_agenda_events(id) on delete cascade,
  event_date  date not null,
  start_time  text not null,
  end_time    text,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.media_agenda_items (
  id                 uuid primary key default gen_random_uuid(),
  church_id          uuid not null references public.churches(id) on delete cascade,
  link_type          text not null check (link_type in ('culto', 'arena', 'evento')),
  worship_service_id uuid references public.worship_services(id) on delete set null,
  arena_id           uuid references public.arenas(id) on delete set null,
  event_id           uuid references public.media_agenda_events(id) on delete set null,
  notes              text,
  send_to_media      boolean not null default true,
  created_by         uuid references public.profiles(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table if not exists public.media_demands (
  id             uuid primary key default gen_random_uuid(),
  source_type    text not null default 'agenda' check (source_type in ('agenda', 'manual')),
  church_id      uuid references public.churches(id) on delete set null,
  agenda_item_id uuid references public.media_agenda_items(id) on delete set null,
  event_id       uuid references public.media_agenda_events(id) on delete set null,
  title          text not null,
  description    text,
  status         text not null default 'pendente' check (status in ('pendente', 'em_andamento', 'concluida', 'cancelada')),
  created_by     uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists idx_media_agenda_events_church on public.media_agenda_events(church_id);
create index if not exists idx_media_agenda_event_days_event on public.media_agenda_event_days(event_id);
create index if not exists idx_media_agenda_items_church on public.media_agenda_items(church_id);
create index if not exists idx_media_agenda_items_event on public.media_agenda_items(event_id);
create index if not exists idx_media_demands_status on public.media_demands(status);
create index if not exists idx_media_demands_church on public.media_demands(church_id);

create or replace trigger trg_media_agenda_events_updated_at
  before update on public.media_agenda_events
  for each row execute function public.set_updated_at();

create or replace trigger trg_media_agenda_items_updated_at
  before update on public.media_agenda_items
  for each row execute function public.set_updated_at();

create or replace trigger trg_media_demands_updated_at
  before update on public.media_demands
  for each row execute function public.set_updated_at();

alter table public.media_agenda_events enable row level security;
alter table public.media_agenda_event_days enable row level security;
alter table public.media_agenda_items enable row level security;
alter table public.media_demands enable row level security;

create policy "admin_all_media_agenda_events" on public.media_agenda_events for all using (true) with check (true);
create policy "admin_all_media_agenda_event_days" on public.media_agenda_event_days for all using (true) with check (true);
create policy "admin_all_media_agenda_items" on public.media_agenda_items for all using (true) with check (true);
create policy "admin_all_media_demands" on public.media_demands for all using (true) with check (true);
