-- ============================================================
-- Upload + Galeria de Cultos/Eventos (Google Drive + Metadados)
-- ============================================================

create table if not exists public.settings (
  id int primary key default 1,
  home_route text not null default '/',
  updated_at timestamptz not null default now()
);

insert into public.settings (id, home_route)
values (1, '/')
on conflict (id) do nothing;

create table if not exists public.worship_services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.galleries (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('culto', 'evento')),
  title text not null,
  slug text not null,
  date date not null,
  description text null,
  drive_folder_id text not null,
  created_at timestamptz not null default now(),
  unique (type, slug, date)
);

create table if not exists public.gallery_files (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references public.galleries(id) on delete cascade,
  drive_file_id text not null unique,
  name text not null,
  web_view_link text null,
  thumbnail_link text null,
  mime_type text not null,
  created_time timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists idx_galleries_type_date on public.galleries(type, date desc);
create index if not exists idx_galleries_slug_date on public.galleries(slug, date desc);
create index if not exists idx_gallery_files_gallery on public.gallery_files(gallery_id);

alter table public.settings enable row level security;
alter table public.worship_services enable row level security;
alter table public.galleries enable row level security;
alter table public.gallery_files enable row level security;

drop policy if exists "settings_read_all" on public.settings;
create policy "settings_read_all"
on public.settings for select
to public
using (true);

drop policy if exists "worship_services_read_all" on public.worship_services;
create policy "worship_services_read_all"
on public.worship_services for select
to public
using (true);

drop policy if exists "galleries_read_all" on public.galleries;
create policy "galleries_read_all"
  on public.galleries for select to public using (true);

drop policy if exists "galleries_insert_all" on public.galleries;
create policy "galleries_insert_all"
  on public.galleries for insert to public with check (true);

drop policy if exists "galleries_update_all" on public.galleries;
create policy "galleries_update_all"
  on public.galleries for update to public using (true) with check (true);

drop policy if exists "gallery_files_read_all" on public.gallery_files;
create policy "gallery_files_read_all"
  on public.gallery_files for select to public using (true);

drop policy if exists "gallery_files_insert_all" on public.gallery_files;
create policy "gallery_files_insert_all"
  on public.gallery_files for insert to public with check (true);

drop policy if exists "gallery_files_update_all" on public.gallery_files;
create policy "gallery_files_update_all"
  on public.gallery_files for update to public using (true) with check (true);

