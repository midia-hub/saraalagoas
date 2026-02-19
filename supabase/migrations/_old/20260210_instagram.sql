-- ============================================================
-- Instagram module
-- ============================================================

create extension if not exists pgcrypto;

insert into public.access_pages (key, label, description, sort_order)
values ('instagram', 'Instagram', 'Gestão de instâncias e postagens do Instagram', 70)
on conflict (key) do update
set
  label = excluded.label,
  description = excluded.description,
  sort_order = excluded.sort_order;

create or replace function public.is_current_user_editor_or_admin()
returns boolean as $$
  select exists (
    select 1
    from public.profiles p
    left join public.access_profiles ap on ap.id = p.access_profile_id
    where p.id = auth.uid()
      and (
        p.role in ('admin', 'editor')
        or coalesce(ap.is_admin, false) = true
      )
  );
$$ language sql security definer stable
set search_path = public;

create table if not exists public.instagram_instances (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  provider text not null default 'instagram' check (provider = 'instagram'),
  access_token text not null,
  ig_user_id text not null,
  token_expires_at timestamptz null,
  status text not null default 'disconnected' check (status in ('connected', 'disconnected')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.instagram_post_drafts (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references public.galleries(id) on delete restrict,
  created_by uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'draft' check (status in ('draft', 'ready', 'scheduled', 'published', 'failed')),
  caption text not null default '',
  preset text not null default '4:5',
  publish_mode text null check (publish_mode in ('now', 'scheduled')),
  scheduled_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.instagram_post_assets (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.instagram_post_drafts(id) on delete cascade,
  source_url text not null,
  storage_path text null,
  final_url text null,
  width int null,
  height int null,
  sort_order int not null default 0,
  status text not null default 'pending' check (status in ('pending', 'processed', 'failed')),
  error_message text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.instagram_post_jobs (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.instagram_post_drafts(id) on delete cascade,
  instance_id uuid not null references public.instagram_instances(id) on delete restrict,
  status text not null default 'queued' check (status in ('queued', 'running', 'published', 'failed')),
  run_at timestamptz null,
  published_at timestamptz null,
  error_message text null,
  result_payload jsonb not null default '{}'::jsonb,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_instagram_drafts_gallery on public.instagram_post_drafts(gallery_id);
create index if not exists idx_instagram_drafts_created_by on public.instagram_post_drafts(created_by);
create index if not exists idx_instagram_assets_draft on public.instagram_post_assets(draft_id, sort_order);
create index if not exists idx_instagram_jobs_status_run_at on public.instagram_post_jobs(status, run_at);
create index if not exists idx_instagram_jobs_draft on public.instagram_post_jobs(draft_id);

alter table public.instagram_instances enable row level security;
alter table public.instagram_post_drafts enable row level security;
alter table public.instagram_post_assets enable row level security;
alter table public.instagram_post_jobs enable row level security;

drop policy if exists "instagram_instances_select_authenticated" on public.instagram_instances;
create policy "instagram_instances_select_authenticated"
on public.instagram_instances for select
to authenticated
using (true);

drop policy if exists "instagram_instances_editor_admin_manage" on public.instagram_instances;
create policy "instagram_instances_editor_admin_manage"
on public.instagram_instances for all
to authenticated
using (public.is_current_user_editor_or_admin())
with check (public.is_current_user_editor_or_admin());

drop policy if exists "instagram_post_drafts_select_authenticated" on public.instagram_post_drafts;
create policy "instagram_post_drafts_select_authenticated"
on public.instagram_post_drafts for select
to authenticated
using (true);

drop policy if exists "instagram_post_drafts_editor_admin_insert" on public.instagram_post_drafts;
create policy "instagram_post_drafts_editor_admin_insert"
on public.instagram_post_drafts for insert
to authenticated
with check (public.is_current_user_editor_or_admin() and created_by = auth.uid());

drop policy if exists "instagram_post_drafts_editor_admin_update" on public.instagram_post_drafts;
create policy "instagram_post_drafts_editor_admin_update"
on public.instagram_post_drafts for update
to authenticated
using (public.is_current_user_editor_or_admin())
with check (public.is_current_user_editor_or_admin());

drop policy if exists "instagram_post_assets_select_authenticated" on public.instagram_post_assets;
create policy "instagram_post_assets_select_authenticated"
on public.instagram_post_assets for select
to authenticated
using (true);

drop policy if exists "instagram_post_assets_editor_admin_manage" on public.instagram_post_assets;
create policy "instagram_post_assets_editor_admin_manage"
on public.instagram_post_assets for all
to authenticated
using (
  public.is_current_user_editor_or_admin()
  and exists (
    select 1
    from public.instagram_post_drafts d
    where d.id = draft_id
  )
)
with check (
  public.is_current_user_editor_or_admin()
  and exists (
    select 1
    from public.instagram_post_drafts d
    where d.id = draft_id
  )
);

drop policy if exists "instagram_post_jobs_select_authenticated" on public.instagram_post_jobs;
create policy "instagram_post_jobs_select_authenticated"
on public.instagram_post_jobs for select
to authenticated
using (true);

drop policy if exists "instagram_post_jobs_editor_admin_insert" on public.instagram_post_jobs;
create policy "instagram_post_jobs_editor_admin_insert"
on public.instagram_post_jobs for insert
to authenticated
with check (public.is_current_user_editor_or_admin() and created_by = auth.uid());

drop policy if exists "instagram_post_jobs_editor_admin_update" on public.instagram_post_jobs;
create policy "instagram_post_jobs_editor_admin_update"
on public.instagram_post_jobs for update
to authenticated
using (public.is_current_user_editor_or_admin())
with check (public.is_current_user_editor_or_admin());

insert into storage.buckets (id, name, public)
values ('instagram_posts', 'instagram_posts', true)
on conflict (id) do update
set public = true;

drop policy if exists "instagram_posts_public_read" on storage.objects;
create policy "instagram_posts_public_read"
on storage.objects for select
to public
using (bucket_id = 'instagram_posts');

drop policy if exists "instagram_posts_editor_admin_upload" on storage.objects;
create policy "instagram_posts_editor_admin_upload"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'instagram_posts'
  and public.is_current_user_editor_or_admin()
);
