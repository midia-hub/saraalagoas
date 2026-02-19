-- ============================================================
-- Postagens sociais programadas (Meta: Instagram/Facebook)
-- ============================================================
-- Permite agendar uma postagem para ser publicada no horário definido.
-- O job run-scheduled (cron ou botão "Processar fila") processa as devidas.

create table if not exists public.scheduled_social_posts (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.galleries(id) on delete restrict,
  created_by uuid not null references public.profiles(id) on delete restrict,
  scheduled_at timestamptz not null,
  instance_ids jsonb not null default '[]'::jsonb,
  destinations jsonb not null default '{"instagram":true,"facebook":false}'::jsonb,
  caption text not null default '',
  media_specs jsonb not null default '[]'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'publishing', 'published', 'failed')),
  published_at timestamptz null,
  error_message text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.scheduled_social_posts is 'Postagens Meta (Instagram/Facebook) agendadas para publicação no horário programado';
comment on column public.scheduled_social_posts.media_specs is 'Array de { id: string (drive file id), cropMode: string, altText: string }';
comment on column public.scheduled_social_posts.instance_ids is 'Array de IDs de instância (ex: meta_ig:uuid)';

create index if not exists idx_scheduled_social_posts_scheduled_at on public.scheduled_social_posts(scheduled_at);
create index if not exists idx_scheduled_social_posts_status on public.scheduled_social_posts(status);
create index if not exists idx_scheduled_social_posts_created_by on public.scheduled_social_posts(created_by);

alter table public.scheduled_social_posts enable row level security;

drop policy if exists "scheduled_social_posts_select_authenticated" on public.scheduled_social_posts;
create policy "scheduled_social_posts_select_authenticated"
on public.scheduled_social_posts for select
to authenticated
using (true);

drop policy if exists "scheduled_social_posts_editor_admin_insert" on public.scheduled_social_posts;
create policy "scheduled_social_posts_editor_admin_insert"
on public.scheduled_social_posts for insert
to authenticated
with check (public.is_current_user_editor_or_admin() and created_by = auth.uid());

drop policy if exists "scheduled_social_posts_editor_admin_update" on public.scheduled_social_posts;
create policy "scheduled_social_posts_editor_admin_update"
on public.scheduled_social_posts for update
to authenticated
using (public.is_current_user_editor_or_admin())
with check (public.is_current_user_editor_or_admin());
