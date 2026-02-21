-- =====================================================
-- Revisão de Vidas: formulário público de anamnese por inscrito
-- Data: 2026-02-21
-- =====================================================

-- 1) Token público por inscrição (link individual)
alter table if exists public.revisao_vidas_registrations
  add column if not exists anamnese_token text;

alter table if exists public.revisao_vidas_registrations
  add column if not exists anamnese_completed_at timestamptz;

-- Preenche tokens faltantes (um por inscrição)
update public.revisao_vidas_registrations
set anamnese_token = replace(gen_random_uuid()::text, '-', '')
where anamnese_token is null or btrim(anamnese_token) = '';

create unique index if not exists uq_revisao_reg_anamnese_token
  on public.revisao_vidas_registrations(anamnese_token)
  where anamnese_token is not null;

-- 2) Respostas da anamnese (jsonb para manter flexível)
create table if not exists public.revisao_vidas_anamneses (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null unique references public.revisao_vidas_registrations(id) on delete cascade,
  event_id uuid references public.revisao_vidas_events(id) on delete set null,
  person_id uuid references public.people(id) on delete set null,

  form_data jsonb not null default '{}'::jsonb,
  photo_url text,
  liability_accepted boolean not null default false,
  submitted_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_revisao_anamnese_registration
  on public.revisao_vidas_anamneses(registration_id);

create index if not exists idx_revisao_anamnese_person
  on public.revisao_vidas_anamneses(person_id);

create index if not exists idx_revisao_anamnese_event
  on public.revisao_vidas_anamneses(event_id);

create index if not exists idx_revisao_anamnese_submitted_at
  on public.revisao_vidas_anamneses(submitted_at);

drop trigger if exists trg_revisao_anamnese_updated_at on public.revisao_vidas_anamneses;
create trigger trg_revisao_anamnese_updated_at
before update on public.revisao_vidas_anamneses
for each row execute function public.set_updated_at();

-- RLS off para manter compatível com rotas backend service-role/admin
alter table if exists public.revisao_vidas_anamneses disable row level security;
