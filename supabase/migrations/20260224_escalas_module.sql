-- =====================================================
-- MÓDULO DE ESCALAS (Schedule/Availability Module)
-- =====================================================

-- 1. escalas_links: configuração de cada "rodada de disponibilidade"
create table if not exists public.escalas_links (
  id          uuid primary key default gen_random_uuid(),
  token       text unique not null default replace(gen_random_uuid()::text, '-', ''),
  ministry    text not null,
  church_id   uuid references public.churches(id) on delete cascade,
  month       int not null check (month between 1 and 12),
  year        int not null,
  label       text,        -- título opcional exibido ao voluntário
  status      text not null default 'active' check (status in ('active', 'closed')),
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 2. escalas_slots: cada data/horário gerado (culto, arena ou evento customizado)
create table if not exists public.escalas_slots (
  id            uuid primary key default gen_random_uuid(),
  link_id       uuid not null references public.escalas_links(id) on delete cascade,
  type          text not null default 'culto' check (type in ('culto', 'arena', 'evento')),
  label         text not null,     -- nome do culto/arena/evento
  date          date not null,
  time_of_day   text not null default '19:00',
  source_id     uuid,              -- worship_service.id ou arena.id (nullable para evento customizado)
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);

-- 3. escalas_respostas: disponibilidade de cada voluntário por slot
create table if not exists public.escalas_respostas (
  id            uuid primary key default gen_random_uuid(),
  link_id       uuid not null references public.escalas_links(id) on delete cascade,
  person_id     uuid not null references public.people(id) on delete cascade,
  slot_id       uuid not null references public.escalas_slots(id) on delete cascade,
  disponivel    boolean not null default true,
  observacao    text,
  submitted_at  timestamptz not null default now(),
  unique (link_id, person_id, slot_id)
);

-- Indexes
create index if not exists idx_escalas_links_ministry  on public.escalas_links(ministry);
create index if not exists idx_escalas_links_church_id on public.escalas_links(church_id);
create index if not exists idx_escalas_links_token     on public.escalas_links(token);
create index if not exists idx_escalas_slots_link_id   on public.escalas_slots(link_id);
create index if not exists idx_escalas_respostas_link  on public.escalas_respostas(link_id);
create index if not exists idx_escalas_respostas_person on public.escalas_respostas(person_id);

-- Triggers updated_at
create or replace trigger trg_escalas_links_updated_at
  before update on public.escalas_links
  for each row execute function public.set_updated_at();

-- RLS
alter table public.escalas_links    enable row level security;
alter table public.escalas_slots    enable row level security;
alter table public.escalas_respostas enable row level security;

-- Admins gerenciam tudo
create policy "admin_all_escalas_links"     on public.escalas_links    for all using (true) with check (true);
create policy "admin_all_escalas_slots"     on public.escalas_slots    for all using (true) with check (true);
create policy "admin_all_escalas_respostas" on public.escalas_respostas for all using (true) with check (true);
