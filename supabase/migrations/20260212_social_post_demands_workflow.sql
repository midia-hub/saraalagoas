-- ============================================================
-- Fluxo de aprovação de postagens (demandas)
-- ============================================================
-- Etapas: demanda -> artes -> copywriting -> aprovacao_interna -> aprovacao_externa -> programacao -> publicada
-- Cada etapa pode disparar notificação por e-mail (via Edge Function ou job).

create type public.social_demand_step as enum (
  'demanda',
  'artes',
  'copywriting',
  'aprovacao_interna',
  'aprovacao_externa',
  'programacao',
  'publicada'
);

create table if not exists public.social_post_demands (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id) on delete restrict,
  title text not null,
  description text default '',
  format text default '', -- ex: carrossel, single, reels
  workflow_step public.social_demand_step not null default 'demanda',
  assigned_designer_id uuid references public.profiles(id) on delete set null,
  assigned_copywriter_id uuid references public.profiles(id) on delete set null,
  scheduled_post_id uuid null, -- referência a scheduled_social_posts(id); FK opcional (tabela pode não existir ainda)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.social_post_demands is 'Demandas de postagem com fluxo de aprovação (arte, copy, aprovações, programação)';
comment on column public.social_post_demands.workflow_step is 'Etapa atual do fluxo: demanda, artes, copywriting, aprovacao_interna, aprovacao_externa, programacao, publicada';

create index if not exists idx_social_post_demands_workflow_step on public.social_post_demands(workflow_step);
create index if not exists idx_social_post_demands_created_by on public.social_post_demands(created_by);
create index if not exists idx_social_post_demands_scheduled_post_id on public.social_post_demands(scheduled_post_id);

alter table public.social_post_demands enable row level security;

drop policy if exists "social_post_demands_select_authenticated" on public.social_post_demands;
create policy "social_post_demands_select_authenticated"
on public.social_post_demands for select
to authenticated
using (true);

drop policy if exists "social_post_demands_editor_admin_insert" on public.social_post_demands;
create policy "social_post_demands_editor_admin_insert"
on public.social_post_demands for insert
to authenticated
with check (public.is_current_user_editor_or_admin() and created_by = auth.uid());

drop policy if exists "social_post_demands_editor_admin_update" on public.social_post_demands;
create policy "social_post_demands_editor_admin_update"
on public.social_post_demands for update
to authenticated
using (public.is_current_user_editor_or_admin())
with check (public.is_current_user_editor_or_admin());

drop policy if exists "social_post_demands_editor_admin_delete" on public.social_post_demands;
create policy "social_post_demands_editor_admin_delete"
on public.social_post_demands for delete
to authenticated
using (public.is_current_user_editor_or_admin());
