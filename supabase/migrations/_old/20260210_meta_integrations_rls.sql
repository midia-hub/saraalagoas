-- ============================================================
-- Meta integrations: tabela + RLS (validação/correção)
-- Resolve: "new row violates row-level security policy for table meta_integrations"
--
-- Segurança:
-- - RLS está correto: só usuários autenticados com permissão Instagram (create) podem INSERT.
-- - O callback OAuth é acessado por REDIRECIONAMENTO do Facebook (sem JWT do usuário).
--   Por isso a aplicação usa SUPABASE_SERVICE_ROLE_KEY no callback (ignora RLS) e
--   confia no state assinado (stateData.userId). Mantenha SUPABASE_SERVICE_ROLE_KEY na Vercel.
-- ============================================================

create extension if not exists pgcrypto;

-- Tabela (idempotente)
create table if not exists public.meta_integrations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  provider text not null default 'meta' check (provider = 'meta'),
  facebook_user_id text,
  facebook_user_name text,
  page_id text,
  page_name text,
  page_access_token text,
  instagram_business_account_id text,
  instagram_username text,
  scopes text[] default array[]::text[],
  access_token text not null,
  token_expires_at timestamptz null,
  is_active boolean not null default true,
  metadata jsonb default '{}'::jsonb
);

create index if not exists idx_meta_integrations_created_by on public.meta_integrations(created_by);
create index if not exists idx_meta_integrations_facebook_user on public.meta_integrations(facebook_user_id);
create index if not exists idx_meta_integrations_page on public.meta_integrations(page_id);
create index if not exists idx_meta_integrations_instagram on public.meta_integrations(instagram_business_account_id);
create index if not exists idx_meta_integrations_active on public.meta_integrations(is_active) where is_active = true;

alter table public.meta_integrations enable row level security;

-- Função: quem pode gerenciar integrações Meta (admin/editor ou perfil com permissão instagram)
create or replace function public.can_manage_meta_integrations(action text default 'view')
returns boolean as $$
  select exists (
    select 1
    from public.profiles p
    left join public.access_profiles ap on ap.id = p.access_profile_id
    left join public.access_profile_permissions app
      on app.profile_id = ap.id and app.page_key = 'instagram'
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

-- Políticas RLS (drop + create para garantir estado correto)
drop policy if exists "meta_integrations_select" on public.meta_integrations;
create policy "meta_integrations_select"
on public.meta_integrations for select to authenticated
using (public.can_manage_meta_integrations('view'));

drop policy if exists "meta_integrations_insert" on public.meta_integrations;
create policy "meta_integrations_insert"
on public.meta_integrations for insert to authenticated
with check (public.can_manage_meta_integrations('create'));

drop policy if exists "meta_integrations_update" on public.meta_integrations;
create policy "meta_integrations_update"
on public.meta_integrations for update to authenticated
using (public.can_manage_meta_integrations('edit'))
with check (public.can_manage_meta_integrations('edit'));

drop policy if exists "meta_integrations_delete" on public.meta_integrations;
create policy "meta_integrations_delete"
on public.meta_integrations for delete to authenticated
using (public.can_manage_meta_integrations('delete'));

comment on table public.meta_integrations is 'Integrações Meta (Facebook/Instagram). INSERT no callback OAuth usa service_role (sem JWT).';
