-- Tabela para armazenar containers de vídeo (Reels) aguardando processamento no Meta.
-- O container pode demorar minutos para ficar pronto; o cron process-video-containers
-- verifica o status periodicamente e publica quando o Meta sinalizar FINISHED.
create table if not exists public.pending_video_containers (
  id               uuid        primary key default gen_random_uuid(),
  container_id     text        not null,
  ig_user_id       text        not null,
  integration_id   uuid        not null,
  access_token     text        not null,
  caption          text        not null default '',
  video_url        text        not null,
  created_by       uuid        not null,
  instance_ids     text[]      not null default '{}',
  destinations     jsonb       not null default '{}',
  cover_url        text        null,
  thumb_offset     int         null,
  -- Referência opcional ao agendamento de origem (postagens agendadas do tipo reel)
  scheduled_post_id uuid       null,
  status           text        not null default 'pending'
                               check (status in ('pending', 'published', 'failed', 'expired')),
  error_message    text        null,
  attempts         int         not null default 0,
  last_checked_at  timestamptz null,
  published_at     timestamptz null,
  media_id         text        null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.pending_video_containers enable row level security;

-- Service role tem acesso total (usada pelo cron)
create policy "service_role_full" on public.pending_video_containers
  as permissive for all
  to service_role
  using (true)
  with check (true);

-- Usuário autenticado só vê os seus próprios containers
create policy "owner_select" on public.pending_video_containers
  as permissive for select
  to authenticated
  using (created_by = auth.uid());

create index if not exists idx_pending_video_containers_status
  on public.pending_video_containers (status, created_at);
