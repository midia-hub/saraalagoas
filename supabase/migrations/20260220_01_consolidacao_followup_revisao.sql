-- 20260220_01_consolidacao_followup_revisao.sql

-- =========================
-- 1) Acompanhamento Consolidação
-- =========================

create table if not exists public.consolidation_followups (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  conversion_id uuid references public.conversoes(id) on delete set null,

  -- quem acompanhou (time de consolidação)
  consolidator_person_id uuid references public.people(id) on delete set null,

  -- líder direto (quando existir: via célula / arena / equipe / liderança direta)
  leader_person_id uuid references public.people(id) on delete set null,

  -- ações
  contacted boolean not null default false,
  contacted_at timestamptz,
  contacted_channel text, -- whatsapp|ligacao|instagram|outro (flexível)
  contacted_notes text,

  fono_visit_done boolean not null default false,
  fono_visit_date date,
  visit_done boolean not null default false,
  visit_date date,

  -- acompanhamento e revisão
  status text not null default 'em_acompanhamento', -- em_acompanhamento|direcionado_revisao|inscrito_revisao|concluiu_revisao|encerrado
  next_review_event_id uuid, -- FK adicionada após criar tabela events
  next_review_date date,

  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_followups_person_id on public.consolidation_followups(person_id);
create index if not exists idx_followups_conversion_id on public.consolidation_followups(conversion_id);
create index if not exists idx_followups_leader_person_id on public.consolidation_followups(leader_person_id);
create index if not exists idx_followups_status on public.consolidation_followups(status);

-- updated_at trigger helper
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_followups_updated_at on public.consolidation_followups;
create trigger trg_followups_updated_at
before update on public.consolidation_followups
for each row execute function public.set_updated_at();


-- =========================
-- 2) Cultos por Igreja
-- =========================
create table if not exists public.worship_services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  day_of_week int not null default 0,
  time_of_day text not null default '19:00',
  is_arena boolean not null default false,
  active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Garantir colunas mesmo que a tabela já existisse sem elas
alter table public.worship_services
  add column if not exists church_id uuid references public.churches(id) on delete cascade;

create index if not exists idx_worship_services_church_id on public.worship_services(church_id);
create index if not exists idx_worship_services_active on public.worship_services(active);

drop trigger if exists trg_worship_services_updated_at on public.worship_services;
create trigger trg_worship_services_updated_at
before update on public.worship_services
for each row execute function public.set_updated_at();


-- =========================
-- 3) Presença em Cultos
-- =========================
create table if not exists public.worship_attendance (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.worship_services(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,

  leader_person_id uuid references public.people(id) on delete set null,
  attended_on date not null,

  attended boolean not null default true,
  notes text,

  registered_by_user_id uuid, -- auth.users.id (não FK para evitar dependência)
  created_at timestamptz not null default now()
);

-- Suporte a migração de present -> attended se necessário
do $$
begin
  if exists (select 1 from information_schema.columns where table_name='worship_attendance' and column_name='present') then
    alter table public.worship_attendance rename column present to attended;
  end if;
end $$;


-- =========================
-- 4) Revisão de Vidas (Eventos)
-- =========================
create table if not exists public.revisao_vidas_events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date not null,
  end_date date,
  active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Garantir colunas mesmo que a tabela já existisse sem elas
alter table public.revisao_vidas_events
  add column if not exists church_id uuid references public.churches(id) on delete cascade;

create index if not exists idx_revisao_events_church on public.revisao_vidas_events(church_id);
create index if not exists idx_revisao_events_active on public.revisao_vidas_events(active);

drop trigger if exists trg_revisao_events_updated_at on public.revisao_vidas_events;
create trigger trg_revisao_events_updated_at
before update on public.revisao_vidas_events
for each row execute function public.set_updated_at();


-- =========================
-- 5) Revisão de Vidas (Inscrições)
-- =========================
create table if not exists public.revisao_vidas_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.revisao_vidas_events(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,

  leader_person_id uuid references public.people(id) on delete set null,
  status text not null default 'inscrito', -- inscrito|participou|concluiu|cancelado
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_revisao_reg_unique
on public.revisao_vidas_registrations(event_id, person_id);

create index if not exists idx_revisao_reg_person on public.revisao_vidas_registrations(person_id);
create index if not exists idx_revisao_reg_event on public.revisao_vidas_registrations(event_id);
create index if not exists idx_revisao_reg_status on public.revisao_vidas_registrations(status);

drop trigger if exists trg_revisao_reg_updated_at on public.revisao_vidas_registrations;
create trigger trg_revisao_reg_updated_at
before update on public.revisao_vidas_registrations
for each row execute function public.set_updated_at();


-- =========================
-- 6) Ajuste FK do followup -> event
-- =========================
alter table public.consolidation_followups
  drop constraint if exists fk_followups_next_review_event;

alter table public.consolidation_followups
  add constraint fk_followups_next_review_event
  foreign key (next_review_event_id) references public.revisao_vidas_events(id) on delete set null;
