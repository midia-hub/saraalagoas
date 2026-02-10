-- ============================================================
-- Meta (Facebook/Instagram) Integration Module
-- ============================================================

create extension if not exists pgcrypto;

-- Criar tabela para armazenar integrações Meta
create table if not exists public.meta_integrations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  
  -- Provider info
  provider text not null default 'meta' check (provider = 'meta'),
  
  -- Facebook user info
  facebook_user_id text,
  facebook_user_name text,
  
  -- Page info
  page_id text,
  page_name text,
  page_access_token text, -- Token da página (necessário para publicar)
  
  -- Instagram Business Account info
  instagram_business_account_id text,
  instagram_username text,
  
  -- OAuth info
  scopes text[] default array[]::text[],
  access_token text not null, -- Token de longa duração do usuário
  token_expires_at timestamptz null,
  
  -- Status
  is_active boolean not null default true,
  
  -- Metadata adicional
  metadata jsonb default '{}'::jsonb
);

-- Índices
create index if not exists idx_meta_integrations_created_by on public.meta_integrations(created_by);
create index if not exists idx_meta_integrations_facebook_user on public.meta_integrations(facebook_user_id);
create index if not exists idx_meta_integrations_page on public.meta_integrations(page_id);
create index if not exists idx_meta_integrations_instagram on public.meta_integrations(instagram_business_account_id);
create index if not exists idx_meta_integrations_active on public.meta_integrations(is_active) where is_active = true;

-- Habilitar RLS
alter table public.meta_integrations enable row level security;

-- Função helper para verificar se o usuário pode gerenciar integrações Meta
create or replace function public.can_manage_meta_integrations(action text default 'view')
returns boolean as $$
  select exists (
    select 1
    from public.profiles p
    left join public.access_profiles ap on ap.id = p.access_profile_id
    left join public.access_profile_permissions app
      on app.profile_id = ap.id
      and app.page_key = 'instagram' -- Usamos permissões do Instagram
    where p.id = auth.uid()
      and (
        p.role in ('admin', 'editor')
        or coalesce(ap.is_admin, false) = true
        or (
          case action
            when 'view' then coalesce(app.can_view, false)
            when 'create' then coalesce(app.can_create, false)
            when 'edit' then coalesce(app.can_edit, false)
            when 'delete' then coalesce(app.can_delete, false)
            else false
          end
        )
      )
  );
$$ language sql security definer stable
set search_path = public;

-- RLS Policies

-- SELECT: apenas quem pode ver Instagram
drop policy if exists "meta_integrations_select" on public.meta_integrations;
create policy "meta_integrations_select"
on public.meta_integrations for select
to authenticated
using (public.can_manage_meta_integrations('view'));

-- INSERT: apenas quem pode criar no Instagram
drop policy if exists "meta_integrations_insert" on public.meta_integrations;
create policy "meta_integrations_insert"
on public.meta_integrations for insert
to authenticated
with check (public.can_manage_meta_integrations('create'));

-- UPDATE: apenas quem pode editar no Instagram
drop policy if exists "meta_integrations_update" on public.meta_integrations;
create policy "meta_integrations_update"
on public.meta_integrations for update
to authenticated
using (public.can_manage_meta_integrations('edit'))
with check (public.can_manage_meta_integrations('edit'));

-- DELETE: apenas quem pode deletar no Instagram
drop policy if exists "meta_integrations_delete" on public.meta_integrations;
create policy "meta_integrations_delete"
on public.meta_integrations for delete
to authenticated
using (public.can_manage_meta_integrations('delete'));

-- Comentários
comment on table public.meta_integrations is 'Armazena integrações com Meta (Facebook/Instagram) para OAuth e publicações';
comment on column public.meta_integrations.access_token is 'Token de longa duração do usuário (long-lived token)';
comment on column public.meta_integrations.page_access_token is 'Token da página para publicar no Instagram';
comment on column public.meta_integrations.instagram_business_account_id is 'ID da conta Instagram Business vinculada à página';
