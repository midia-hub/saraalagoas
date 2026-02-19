-- ============================================================
-- Funções nomeadas (App Permissions) – camada de permissões por nome
-- ============================================================
-- Cada "função" é uma permissão nomeada (ex: view_gallery, create_post)
-- que mapeia para um recurso + ação do sistema RBAC existente.
-- Assim você pode verificar no backend por nome e adicionar novas
-- funções conforme a plataforma evolui.
--
-- Equivalência com o modelo sugerido:
-- - users         → auth.users + public.profiles
-- - roles         → public.roles
-- - permissions   → public.app_permissions (funções nomeadas)
-- - user_roles    → public.profiles.role_id
-- - role_permissions → public.role_permissions (role + resource + action)
--   A atribuição continua por recurso+ação; cada app_permission
--   aponta para um (resource, action), então ter a role com essa
--   permissão no recurso equivale a "ter a função".
-- ============================================================

-- ============================================================
-- 1. TABELA DE FUNÇÕES NOMEADAS (APP_PERMISSIONS)
-- ============================================================
create table if not exists public.app_permissions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  resource_id uuid not null references public.resources(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.app_permissions is 'Funções nomeadas do sistema (ex: view_gallery, create_post). Cada uma mapeia para um recurso + ação.';

create index if not exists idx_app_permissions_code on public.app_permissions(code);
create index if not exists idx_app_permissions_resource on public.app_permissions(resource_id);

-- ============================================================
-- 2. POPULAR FUNÇÕES NOMEADAS
-- ============================================================
-- Cada código mapeia para (recurso, ação) existente.
insert into public.app_permissions (code, name, description, resource_id, permission_id, sort_order)
select 'view_dashboard', 'Visualizar dashboard', 'Acesso ao painel principal', r.id, p.id, 10
from public.resources r, public.permissions p
where r.key = 'dashboard' and p.action = 'view'
on conflict (code) do update set name = excluded.name, description = excluded.description, sort_order = excluded.sort_order;

insert into public.app_permissions (code, name, description, resource_id, permission_id, sort_order)
select 'view_gallery', 'Visualizar galeria', 'Permite visualizar imagens na galeria', r.id, p.id, 20
from public.resources r, public.permissions p
where r.key = 'galeria' and p.action = 'view'
on conflict (code) do update set name = excluded.name, description = excluded.description, sort_order = excluded.sort_order;

insert into public.app_permissions (code, name, description, resource_id, permission_id, sort_order)
select 'create_gallery', 'Criar conteúdo na galeria', 'Criar galerias e enviar imagens', r.id, p.id, 21
from public.resources r, public.permissions p
where r.key = 'galeria' and p.action = 'create'
on conflict (code) do update set name = excluded.name, description = excluded.description, sort_order = excluded.sort_order;

insert into public.app_permissions (code, name, description, resource_id, permission_id, sort_order)
select 'edit_gallery', 'Editar galeria', 'Editar galerias e imagens', r.id, p.id, 22
from public.resources r, public.permissions p
where r.key = 'galeria' and p.action = 'edit'
on conflict (code) do update set name = excluded.name, description = excluded.description, sort_order = excluded.sort_order;

insert into public.app_permissions (code, name, description, resource_id, permission_id, sort_order)
select 'delete_gallery', 'Excluir galeria', 'Excluir galerias e imagens', r.id, p.id, 23
from public.resources r, public.permissions p
where r.key = 'galeria' and p.action = 'delete'
on conflict (code) do update set name = excluded.name, description = excluded.description, sort_order = excluded.sort_order;

insert into public.app_permissions (code, name, description, resource_id, permission_id, sort_order)
select 'create_post', 'Criar post', 'Criar posts a partir das imagens da galeria', r.id, p.id, 30
from public.resources r, public.permissions p
where r.key = 'instagram' and p.action = 'create'
on conflict (code) do update set name = excluded.name, description = excluded.description, sort_order = excluded.sort_order;

insert into public.app_permissions (code, name, description, resource_id, permission_id, sort_order)
select 'edit_post', 'Editar post', 'Editar posts', r.id, p.id, 31
from public.resources r, public.permissions p
where r.key = 'instagram' and p.action = 'edit'
on conflict (code) do update set name = excluded.name, description = excluded.description, sort_order = excluded.sort_order;

insert into public.app_permissions (code, name, description, resource_id, permission_id, sort_order)
select 'delete_post', 'Excluir post', 'Excluir posts', r.id, p.id, 32
from public.resources r, public.permissions p
where r.key = 'instagram' and p.action = 'delete'
on conflict (code) do update set name = excluded.name, description = excluded.description, sort_order = excluded.sort_order;

insert into public.app_permissions (code, name, description, resource_id, permission_id, sort_order)
select 'view_instagram', 'Visualizar Instagram', 'Visualizar painel e publicações do Instagram', r.id, p.id, 33
from public.resources r, public.permissions p
where r.key = 'instagram' and p.action = 'view'
on conflict (code) do update set name = excluded.name, description = excluded.description, sort_order = excluded.sort_order;

insert into public.app_permissions (code, name, description, resource_id, permission_id, sort_order)
select 'manage_users', 'Gerenciar usuários', 'Criar, editar e excluir usuários', r.id, p.id, 40
from public.resources r, public.permissions p
where r.key = 'usuarios' and p.action = 'manage'
on conflict (code) do update set name = excluded.name, description = excluded.description, sort_order = excluded.sort_order;

insert into public.app_permissions (code, name, description, resource_id, permission_id, sort_order)
select 'view_users', 'Visualizar usuários', 'Visualizar lista de usuários', r.id, p.id, 41
from public.resources r, public.permissions p
where r.key = 'usuarios' and p.action = 'view'
on conflict (code) do update set name = excluded.name, description = excluded.description, sort_order = excluded.sort_order;

insert into public.app_permissions (code, name, description, resource_id, permission_id, sort_order)
select 'manage_settings', 'Gerenciar configurações', 'Editar configurações do site', r.id, p.id, 50
from public.resources r, public.permissions p
where r.key = 'configuracoes' and p.action = 'manage'
on conflict (code) do update set name = excluded.name, description = excluded.description, sort_order = excluded.sort_order;

insert into public.app_permissions (code, name, description, resource_id, permission_id, sort_order)
select 'view_settings', 'Visualizar configurações', 'Visualizar configurações do site', r.id, p.id, 51
from public.resources r, public.permissions p
where r.key = 'configuracoes' and p.action = 'view'
on conflict (code) do update set name = excluded.name, description = excluded.description, sort_order = excluded.sort_order;

insert into public.app_permissions (code, name, description, resource_id, permission_id, sort_order)
select 'manage_roles', 'Gerenciar funções e permissões', 'Criar, editar e excluir roles e permissões', r.id, p.id, 60
from public.resources r, public.permissions p
where r.key = 'roles' and p.action = 'manage'
on conflict (code) do update set name = excluded.name, description = excluded.description, sort_order = excluded.sort_order;

insert into public.app_permissions (code, name, description, resource_id, permission_id, sort_order)
select 'view_roles', 'Visualizar funções', 'Visualizar roles e permissões', r.id, p.id, 61
from public.resources r, public.permissions p
where r.key = 'roles' and p.action = 'view'
on conflict (code) do update set name = excluded.name, description = excluded.description, sort_order = excluded.sort_order;

insert into public.app_permissions (code, name, description, resource_id, permission_id, sort_order)
select 'upload_files', 'Fazer upload', 'Enviar arquivos e imagens', r.id, p.id, 70
from public.resources r, public.permissions p
where r.key = 'upload' and p.action = 'create'
on conflict (code) do update set name = excluded.name, description = excluded.description, sort_order = excluded.sort_order;

insert into public.app_permissions (code, name, description, resource_id, permission_id, sort_order)
select 'view_meta', 'Visualizar integrações Meta', 'Visualizar integrações Facebook/Instagram', r.id, p.id, 80
from public.resources r, public.permissions p
where r.key = 'meta' and p.action = 'view'
on conflict (code) do update set name = excluded.name, description = excluded.description, sort_order = excluded.sort_order;

insert into public.app_permissions (code, name, description, resource_id, permission_id, sort_order)
select 'view_cultos', 'Visualizar cultos e eventos', 'Visualizar cultos e eventos', r.id, p.id, 90
from public.resources r, public.permissions p
where r.key = 'cultos' and p.action = 'view'
on conflict (code) do update set name = excluded.name, description = excluded.description, sort_order = excluded.sort_order;

insert into public.app_permissions (code, name, description, resource_id, permission_id, sort_order)
select 'manage_cultos', 'Gerenciar cultos e eventos', 'Criar, editar e excluir cultos/eventos', r.id, p.id, 91
from public.resources r, public.permissions p
where r.key = 'cultos' and p.action = 'manage'
on conflict (code) do update set name = excluded.name, description = excluded.description, sort_order = excluded.sort_order;

-- ============================================================
-- 3. FUNÇÃO: VERIFICAR SE USUÁRIO TEM UMA FUNÇÃO NOMEADA
-- ============================================================
create or replace function public.user_has_app_permission(
  user_id uuid,
  permission_code text
)
returns boolean as $$
declare
  res_key text;
  perm_action text;
  has_perm boolean;
  is_admin_user boolean;
begin
  -- Admin tem todas as funções
  select r.is_admin into is_admin_user
  from public.profiles p
  inner join public.roles r on r.id = p.role_id
  where p.id = user_id;

  if is_admin_user then
    return true;
  end if;

  -- Resolver código da função para (resource_key, action)
  select res.key, perm.action into res_key, perm_action
  from public.app_permissions ap
  inner join public.resources res on res.id = ap.resource_id
  inner join public.permissions perm on perm.id = ap.permission_id
  where ap.code = permission_code
    and ap.is_active = true;

  if res_key is null or perm_action is null then
    return false;
  end if;

  -- Usar a função existente de verificação por recurso + ação
  select public.user_has_permission(user_id, res_key, perm_action) into has_perm;
  return coalesce(has_perm, false);
end;
$$ language plpgsql security definer stable
set search_path = public;

comment on function public.user_has_app_permission is 'Verifica se o usuário tem a função nomeada (ex: view_gallery, create_post).';

-- ============================================================
-- 4. FUNÇÃO: LISTAR FUNÇÕES QUE O USUÁRIO POSSUI
-- ============================================================
create or replace function public.get_user_app_permissions(user_id uuid)
returns table (
  code text,
  name text,
  description text
) as $$
begin
  return query
  select distinct ap.code, ap.name, ap.description
  from public.app_permissions ap
  inner join public.resources res on res.id = ap.resource_id
  inner join public.permissions perm on perm.id = ap.permission_id
  where ap.is_active = true
    and public.user_has_permission(user_id, res.key, perm.action)
  order by ap.sort_order, ap.code;
end;
$$ language plpgsql security definer stable
set search_path = public;

comment on function public.get_user_app_permissions is 'Retorna todas as funções nomeadas que o usuário possui.';

-- ============================================================
-- 5. RLS E TRIGGER UPDATED_AT
-- ============================================================
alter table public.app_permissions enable row level security;

drop policy if exists "app_permissions_select_authenticated" on public.app_permissions;
create policy "app_permissions_select_authenticated"
on public.app_permissions for select
to authenticated
using (true);

drop policy if exists "app_permissions_manage_admin" on public.app_permissions;
create policy "app_permissions_manage_admin"
on public.app_permissions for all
to authenticated
using (public.current_user_can('roles', 'manage'))
with check (public.current_user_can('roles', 'manage'));

create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_app_permissions_updated_at on public.app_permissions;
create trigger update_app_permissions_updated_at
  before update on public.app_permissions
  for each row
  execute function public.update_updated_at_column();
