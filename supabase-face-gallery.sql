-- Tabela face_gallery: candidatas para facial scan (Modelo A).
-- Execute no Supabase: Dashboard → SQL Editor → New query → Cole e rode (Run).

-- Tabela
create table if not exists public.face_gallery (
  id uuid primary key default gen_random_uuid(),
  person_id text not null,
  org_id text not null,
  storage_path text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (org_id, person_id, storage_path)
);

comment on table public.face_gallery is 'Imagens de faces por pessoa/org para fluxo de facial scan';
comment on column public.face_gallery.person_id is 'Identificador da pessoa (ex: contact_id)';
comment on column public.face_gallery.org_id is 'Identificador da organização';
comment on column public.face_gallery.storage_path is 'Path no Storage (ex: faces/pending/org_id/person_id/arquivo.jpg)';
comment on column public.face_gallery.active is 'Se true, imagem é candidata para processamento';

-- RLS
alter table public.face_gallery enable row level security;

-- Permite o frontend (anon) inserir após um upload
create policy "Allow anon insert face_gallery"
on public.face_gallery
for insert
to anon
with check (true);

-- Permite leitura para listar candidatas (ex: n8n ou dashboard)
create policy "Allow anon select face_gallery"
on public.face_gallery
for select
to anon
using (true);

-- Índices úteis para consultas por org/person e candidatas ativas
create index if not exists idx_face_gallery_org_active
on public.face_gallery (org_id, active) where active = true;

create index if not exists idx_face_gallery_person
on public.face_gallery (org_id, person_id);
