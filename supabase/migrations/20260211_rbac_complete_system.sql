-- ============================================================
-- Sistema RBAC Completo (Role-Based Access Control)
-- ============================================================
-- Esta migration cria um sistema completo de controle de acesso
-- baseado em funções (roles) com permissões granulares por recurso.
--
-- Estrutura:
-- - roles: Define os tipos de usuários (Admin, Moderador, etc)
-- - permissions: Define todas as ações possíveis no sistema
-- - resources: Define os recursos/páginas do sistema
-- - role_permissions: Relaciona roles com permissões em recursos específicos
-- - Atualiza profiles para usar o novo sistema
-- ============================================================

-- ============================================================
-- 1. TABELA DE RECURSOS (RESOURCES)
-- ============================================================
-- Define todos os recursos/páginas/módulos do sistema
create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  category text, -- 'admin', 'content', 'social', 'config'
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.resources is 'Recursos e módulos do sistema que podem ter permissões aplicadas';

-- ============================================================
-- 2. TABELA DE PERMISSÕES (PERMISSIONS)
-- ============================================================
-- Define os tipos de ações que podem ser realizadas
create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  action text not null, -- 'view', 'create', 'edit', 'delete', 'manage', etc
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

comment on table public.permissions is 'Tipos de ações/permissões que podem ser atribuídas';

-- Constraint única: uma ação só pode existir uma vez
create unique index if not exists idx_permissions_action_unique on public.permissions(action);

-- ============================================================
-- 3. TABELA DE ROLES (TIPOS DE USUÁRIO)
-- ============================================================
-- Define os diferentes tipos de usuários do sistema
create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  is_admin boolean not null default false,
  is_system boolean not null default false, -- roles do sistema não podem ser deletadas
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.roles is 'Tipos de usuários (roles) do sistema';
comment on column public.roles.is_admin is 'Se true, tem acesso total independente de permissões específicas';
comment on column public.roles.is_system is 'Se true, não pode ser deletada (roles core do sistema)';

-- ============================================================
-- 4. TABELA DE ROLE_PERMISSIONS
-- ============================================================
-- Relaciona roles com permissões em recursos específicos
create table if not exists public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.roles(id) on delete cascade,
  resource_id uuid not null references public.resources(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.role_permissions is 'Relacionamento entre roles, recursos e permissões';

-- Constraint única: uma role só pode ter uma permissão específica para um recurso específico
create unique index if not exists idx_role_permissions_unique 
on public.role_permissions(role_id, resource_id, permission_id);

-- Índices para melhor performance
create index if not exists idx_role_permissions_role on public.role_permissions(role_id);
create index if not exists idx_role_permissions_resource on public.role_permissions(resource_id);

-- ============================================================
-- 5. ATUALIZAR TABELA PROFILES
-- ============================================================
-- Adiciona coluna role_id na tabela profiles
alter table public.profiles 
add column if not exists role_id uuid references public.roles(id) on delete set null;

-- Índice para melhor performance
create index if not exists idx_profiles_role on public.profiles(role_id);

-- ============================================================
-- 6. POPULAR DADOS INICIAIS
-- ============================================================

-- 6.1 Inserir permissões padrão
insert into public.permissions (action, name, description) values
  ('view', 'Visualizar', 'Permissão para visualizar o recurso'),
  ('create', 'Criar', 'Permissão para criar novos itens'),
  ('edit', 'Editar', 'Permissão para editar itens existentes'),
  ('delete', 'Excluir', 'Permissão para excluir itens'),
  ('manage', 'Gerenciar', 'Permissão completa sobre o recurso (todas as ações)')
on conflict (action) do update set
  name = excluded.name,
  description = excluded.description;

-- 6.2 Inserir recursos/módulos do sistema
insert into public.resources (key, name, description, category, sort_order) values
  ('dashboard', 'Dashboard', 'Painel principal administrativo', 'admin', 10),
  ('configuracoes', 'Configurações', 'Configurações do site e da plataforma', 'config', 20),
  ('usuarios', 'Usuários', 'Gerenciamento de usuários', 'admin', 30),
  ('roles', 'Funções e Permissões', 'Gerenciamento de roles e permissões', 'admin', 40),
  ('galeria', 'Galeria', 'Gerenciamento de galerias e imagens', 'content', 50),
  ('upload', 'Upload', 'Upload de arquivos e imagens', 'content', 60),
  ('instagram', 'Instagram', 'Integração e publicações no Instagram', 'social', 70),
  ('facebook', 'Facebook', 'Integração e publicações no Facebook', 'social', 80),
  ('meta', 'Integrações Meta', 'Gestão de integrações Meta (Facebook/Instagram)', 'social', 85),
  ('cultos', 'Cultos e Eventos', 'Gerenciamento de cultos e eventos', 'content', 90)
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  sort_order = excluded.sort_order;

-- 6.3 Inserir roles padrão do sistema
insert into public.roles (key, name, description, is_admin, is_system, sort_order) values
  ('admin', 'Administrador', 'Acesso completo a todas as funcionalidades da plataforma', true, true, 10),
  ('moderador', 'Moderador', 'Pode moderar conteúdo e gerenciar aspectos operacionais', false, true, 20),
  ('usuario_padrao', 'Usuário Padrão', 'Acesso restrito a funcionalidades específicas', false, true, 30),
  ('convidado', 'Convidado', 'Apenas visualização, sem edição', false, true, 40)
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description,
  is_admin = excluded.is_admin,
  sort_order = excluded.sort_order;

-- ============================================================
-- 7. CONFIGURAR PERMISSÕES PADRÃO PARA CADA ROLE
-- ============================================================

-- Helper para obter IDs
do $$
declare
  role_admin_id uuid;
  role_moderador_id uuid;
  role_usuario_id uuid;
  role_convidado_id uuid;
  
  perm_view_id uuid;
  perm_create_id uuid;
  perm_edit_id uuid;
  perm_delete_id uuid;
  perm_manage_id uuid;
  
  res_dashboard_id uuid;
  res_config_id uuid;
  res_usuarios_id uuid;
  res_roles_id uuid;
  res_galeria_id uuid;
  res_upload_id uuid;
  res_instagram_id uuid;
  res_facebook_id uuid;
  res_meta_id uuid;
  res_cultos_id uuid;
begin
  -- Buscar IDs das roles
  select id into role_admin_id from public.roles where key = 'admin';
  select id into role_moderador_id from public.roles where key = 'moderador';
  select id into role_usuario_id from public.roles where key = 'usuario_padrao';
  select id into role_convidado_id from public.roles where key = 'convidado';
  
  -- Buscar IDs das permissões
  select id into perm_view_id from public.permissions where action = 'view';
  select id into perm_create_id from public.permissions where action = 'create';
  select id into perm_edit_id from public.permissions where action = 'edit';
  select id into perm_delete_id from public.permissions where action = 'delete';
  select id into perm_manage_id from public.permissions where action = 'manage';
  
  -- Buscar IDs dos recursos
  select id into res_dashboard_id from public.resources where key = 'dashboard';
  select id into res_config_id from public.resources where key = 'configuracoes';
  select id into res_usuarios_id from public.resources where key = 'usuarios';
  select id into res_roles_id from public.resources where key = 'roles';
  select id into res_galeria_id from public.resources where key = 'galeria';
  select id into res_upload_id from public.resources where key = 'upload';
  select id into res_instagram_id from public.resources where key = 'instagram';
  select id into res_facebook_id from public.resources where key = 'facebook';
  select id into res_meta_id from public.resources where key = 'meta';
  select id into res_cultos_id from public.resources where key = 'cultos';
  
  -- ========================================
  -- ADMIN: Acesso total (manage em tudo)
  -- ========================================
  -- Na prática, admins têm acesso independente de permissões,
  -- mas vamos registrar para referência e futuras funcionalidades
  insert into public.role_permissions (role_id, resource_id, permission_id)
  select role_admin_id, r.id, perm_manage_id
  from public.resources r
  where r.is_active = true
  on conflict do nothing;
  
  -- ========================================
  -- MODERADOR: Permissões intermediárias
  -- ========================================
  -- Dashboard: view
  insert into public.role_permissions (role_id, resource_id, permission_id) values
    (role_moderador_id, res_dashboard_id, perm_view_id)
  on conflict do nothing;
  
  -- Galeria: view, create, edit, delete
  insert into public.role_permissions (role_id, resource_id, permission_id) values
    (role_moderador_id, res_galeria_id, perm_view_id),
    (role_moderador_id, res_galeria_id, perm_create_id),
    (role_moderador_id, res_galeria_id, perm_edit_id),
    (role_moderador_id, res_galeria_id, perm_delete_id)
  on conflict do nothing;
  
  -- Upload: view, create
  insert into public.role_permissions (role_id, resource_id, permission_id) values
    (role_moderador_id, res_upload_id, perm_view_id),
    (role_moderador_id, res_upload_id, perm_create_id)
  on conflict do nothing;
  
  -- Instagram: view, create, edit
  insert into public.role_permissions (role_id, resource_id, permission_id) values
    (role_moderador_id, res_instagram_id, perm_view_id),
    (role_moderador_id, res_instagram_id, perm_create_id),
    (role_moderador_id, res_instagram_id, perm_edit_id)
  on conflict do nothing;
  
  -- Facebook: view, create, edit
  insert into public.role_permissions (role_id, resource_id, permission_id) values
    (role_moderador_id, res_facebook_id, perm_view_id),
    (role_moderador_id, res_facebook_id, perm_create_id),
    (role_moderador_id, res_facebook_id, perm_edit_id)
  on conflict do nothing;
  
  -- Meta: view
  insert into public.role_permissions (role_id, resource_id, permission_id) values
    (role_moderador_id, res_meta_id, perm_view_id)
  on conflict do nothing;
  
  -- Cultos: view, create, edit
  insert into public.role_permissions (role_id, resource_id, permission_id) values
    (role_moderador_id, res_cultos_id, perm_view_id),
    (role_moderador_id, res_cultos_id, perm_create_id),
    (role_moderador_id, res_cultos_id, perm_edit_id)
  on conflict do nothing;
  
  -- ========================================
  -- USUÁRIO PADRÃO: Acesso restrito
  -- ========================================
  -- Dashboard: view
  insert into public.role_permissions (role_id, resource_id, permission_id) values
    (role_usuario_id, res_dashboard_id, perm_view_id)
  on conflict do nothing;
  
  -- Galeria: view
  insert into public.role_permissions (role_id, resource_id, permission_id) values
    (role_usuario_id, res_galeria_id, perm_view_id)
  on conflict do nothing;
  
  -- Cultos: view
  insert into public.role_permissions (role_id, resource_id, permission_id) values
    (role_usuario_id, res_cultos_id, perm_view_id)
  on conflict do nothing;
  
  -- ========================================
  -- CONVIDADO: Apenas visualização
  -- ========================================
  -- Dashboard: view
  insert into public.role_permissions (role_id, resource_id, permission_id) values
    (role_convidado_id, res_dashboard_id, perm_view_id)
  on conflict do nothing;
  
  -- Galeria: view
  insert into public.role_permissions (role_id, resource_id, permission_id) values
    (role_convidado_id, res_galeria_id, perm_view_id)
  on conflict do nothing;
  
end $$;

-- ============================================================
-- 8. FUNÇÕES AUXILIARES
-- ============================================================

-- 8.1 Função para verificar se usuário tem uma permissão específica
create or replace function public.user_has_permission(
  user_id uuid,
  resource_key text,
  permission_action text
)
returns boolean as $$
declare
  has_perm boolean;
  is_admin_user boolean;
begin
  -- Verificar se é admin (acesso total)
  select r.is_admin into is_admin_user
  from public.profiles p
  inner join public.roles r on r.id = p.role_id
  where p.id = user_id;
  
  if is_admin_user then
    return true;
  end if;
  
  -- Verificar permissão específica
  select exists(
    select 1
    from public.profiles p
    inner join public.roles r on r.id = p.role_id
    inner join public.role_permissions rp on rp.role_id = r.id
    inner join public.resources res on res.id = rp.resource_id
    inner join public.permissions perm on perm.id = rp.permission_id
    where p.id = user_id
      and res.key = resource_key
      and res.is_active = true
      and r.is_active = true
      and (perm.action = permission_action or perm.action = 'manage')
  ) into has_perm;
  
  return coalesce(has_perm, false);
end;
$$ language plpgsql security definer stable;

comment on function public.user_has_permission is 'Verifica se um usuário tem uma permissão específica em um recurso';

-- 8.2 Função para obter todas as permissões de um usuário
create or replace function public.get_user_permissions(user_id uuid)
returns table (
  resource_key text,
  resource_name text,
  permission_action text,
  permission_name text
) as $$
begin
  return query
  select 
    res.key as resource_key,
    res.name as resource_name,
    perm.action as permission_action,
    perm.name as permission_name
  from public.profiles p
  inner join public.roles r on r.id = p.role_id
  inner join public.role_permissions rp on rp.role_id = r.id
  inner join public.resources res on res.id = rp.resource_id
  inner join public.permissions perm on perm.id = rp.permission_id
  where p.id = user_id
    and res.is_active = true
    and r.is_active = true
  order by res.sort_order, perm.action;
end;
$$ language plpgsql security definer stable;

comment on function public.get_user_permissions is 'Retorna todas as permissões de um usuário';

-- 8.3 Atualizar função is_current_user_editor_or_admin para usar o novo sistema
create or replace function public.is_current_user_editor_or_admin()
returns boolean as $$
begin
  return exists (
    select 1
    from public.profiles p
    left join public.roles r on r.id = p.role_id
    left join public.access_profiles ap on ap.id = p.access_profile_id
    where p.id = auth.uid()
      and (
        p.role in ('admin', 'editor')
        or coalesce(ap.is_admin, false) = true
        or coalesce(r.is_admin, false) = true
      )
  );
end;
$$ language plpgsql security definer stable
set search_path = public;

-- 8.4 Função para verificar se usuário atual tem permissão
create or replace function public.current_user_can(
  resource_key text,
  permission_action text
)
returns boolean as $$
begin
  return public.user_has_permission(auth.uid(), resource_key, permission_action);
end;
$$ language plpgsql security definer stable;

comment on function public.current_user_can is 'Verifica se o usuário autenticado tem uma permissão específica';

-- ============================================================
-- 9. ROW LEVEL SECURITY (RLS)
-- ============================================================

-- 9.1 Resources
alter table public.resources enable row level security;

drop policy if exists "resources_select_authenticated" on public.resources;
create policy "resources_select_authenticated"
on public.resources for select
to authenticated
using (true);

drop policy if exists "resources_manage_admin" on public.resources;
create policy "resources_manage_admin"
on public.resources for all
to authenticated
using (public.current_user_can('roles', 'manage'))
with check (public.current_user_can('roles', 'manage'));

-- 9.2 Permissions
alter table public.permissions enable row level security;

drop policy if exists "permissions_select_authenticated" on public.permissions;
create policy "permissions_select_authenticated"
on public.permissions for select
to authenticated
using (true);

drop policy if exists "permissions_manage_admin" on public.permissions;
create policy "permissions_manage_admin"
on public.permissions for all
to authenticated
using (public.current_user_can('roles', 'manage'))
with check (public.current_user_can('roles', 'manage'));

-- 9.3 Roles
alter table public.roles enable row level security;

drop policy if exists "roles_select_authenticated" on public.roles;
create policy "roles_select_authenticated"
on public.roles for select
to authenticated
using (true);

drop policy if exists "roles_manage_admin" on public.roles;
create policy "roles_manage_admin"
on public.roles for all
to authenticated
using (public.current_user_can('roles', 'manage'))
with check (public.current_user_can('roles', 'manage'));

-- 9.4 Role Permissions
alter table public.role_permissions enable row level security;

drop policy if exists "role_permissions_select_authenticated" on public.role_permissions;
create policy "role_permissions_select_authenticated"
on public.role_permissions for select
to authenticated
using (true);

drop policy if exists "role_permissions_manage_admin" on public.role_permissions;
create policy "role_permissions_manage_admin"
on public.role_permissions for all
to authenticated
using (public.current_user_can('roles', 'manage'))
with check (public.current_user_can('roles', 'manage'));

-- ============================================================
-- 10. MIGRAÇÃO DE DADOS EXISTENTES
-- ============================================================

-- Migrar usuários com role legada 'admin' para o novo sistema
update public.profiles p
set role_id = (select id from public.roles where key = 'admin')
where p.role = 'admin' 
  and p.role_id is null;

-- Migrar usuários com role legada 'editor' para moderador
update public.profiles p
set role_id = (select id from public.roles where key = 'moderador')
where p.role = 'editor' 
  and p.role_id is null;

-- Migrar usuários sem role para usuário padrão
update public.profiles p
set role_id = (select id from public.roles where key = 'usuario_padrao')
where p.role_id is null 
  and p.access_profile_id is null
  and p.role is null;

-- ============================================================
-- 11. TRIGGERS PARA UPDATED_AT
-- ============================================================

create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_resources_updated_at on public.resources;
create trigger update_resources_updated_at
  before update on public.resources
  for each row
  execute function public.update_updated_at_column();

drop trigger if exists update_roles_updated_at on public.roles;
create trigger update_roles_updated_at
  before update on public.roles
  for each row
  execute function public.update_updated_at_column();

drop trigger if exists update_role_permissions_updated_at on public.role_permissions;
create trigger update_role_permissions_updated_at
  before update on public.role_permissions
  for each row
  execute function public.update_updated_at_column();
