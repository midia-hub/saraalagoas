-- Permite status "draft" em postagens da fila (composer / nova postagem).
-- O processamento automático deve continuar a considerar apenas status "pending".

alter table public.scheduled_social_posts
  drop constraint if exists scheduled_social_posts_status_check;

alter table public.scheduled_social_posts
  add constraint scheduled_social_posts_status_check
  check (
    status in (
      'pending',
      'publishing',
      'published',
      'failed',
      'cancelled',
      'video_processing',
      'draft'
    )
  );

comment on column public.scheduled_social_posts.status is
  'pending=agendada; draft=rascunho composer; publishing/publicado/falha/cancelado/video_processing';
