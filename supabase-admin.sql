-- ============================================================
-- Migração: Admin e Configuração do Site 
-- Execute no SQL Editor do Supabase (Dashboard > SQL Editor)
-- ============================================================

-- 1) Tabela de configuração do site (uma chave 'main' com JSON completo)
CREATE TABLE IF NOT EXISTS public.site_config (
  key text PRIMARY KEY DEFAULT 'main',
  value jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

-- 2) Perfis de usuário (para saber quem é admin)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS: site_config - leitura pública, escrita só autenticados
ALTER TABLE public.site_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_config_read" ON public.site_config;
CREATE POLICY "site_config_read" ON public.site_config
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "site_config_update" ON public.site_config;
CREATE POLICY "site_config_update" ON public.site_config
  FOR ALL USING (auth.role() = 'authenticated');

-- Função que verifica se o usuário atual é admin (evita recursão nas policies de profiles)
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public;

-- RLS: profiles - só o próprio usuário pode ler seu perfil; apenas admins podem atualizar roles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_read_own" ON public.profiles;
CREATE POLICY "profiles_read_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Admins podem ler todos os perfis e inserir/atualizar (usa função para evitar recursão)
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
CREATE POLICY "profiles_admin_all" ON public.profiles
  FOR ALL USING (public.is_current_user_admin());

-- Trigger: criar perfil ao se cadastrar (opcional - ou você adiciona admins manualmente)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'viewer');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Inserir config padrão (você pode editar pelo Admin depois)
INSERT INTO public.site_config (key, value)
VALUES ('main', '{}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- PRIMEIRO ADMIN: após criar um usuário em Authentication > Users,
-- defina-o como admin com (substitua USER_UUID pelo id do usuário):
--
--   UPDATE public.profiles SET role = 'admin' WHERE id = 'USER_UUID';
-- ============================================================

-- ============================================================
-- RBAC: Perfis personalizados + permissões por página
-- ============================================================

-- Catálogo de páginas controláveis por permissão
CREATE TABLE IF NOT EXISTS public.access_pages (
  key text PRIMARY KEY,
  label text NOT NULL,
  description text NOT NULL DEFAULT '',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.access_pages (key, label, description, sort_order) VALUES
  ('dashboard', 'Dashboard', 'Visão geral do painel administrativo', 10),
  ('configuracoes', 'Configurações', 'Configurações do site', 20),
  ('upload', 'Upload', 'Upload de mídias para galerias', 30),
  ('galeria', 'Galeria', 'Listagem e consulta de galerias', 40),
  ('usuarios', 'Usuários', 'Gestão de usuários do sistema', 50),
  ('perfis', 'Perfis', 'Gestão de perfis e permissões', 60)
ON CONFLICT (key) DO UPDATE
SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order;

-- Perfis de acesso (Admin e personalizados)
CREATE TABLE IF NOT EXISTS public.access_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text NOT NULL,
  is_admin boolean NOT NULL DEFAULT false,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Permissões por página para cada perfil
CREATE TABLE IF NOT EXISTS public.access_profile_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.access_profiles(id) ON DELETE CASCADE,
  page_key text NOT NULL REFERENCES public.access_pages(key) ON DELETE CASCADE,
  can_view boolean NOT NULL DEFAULT false,
  can_create boolean NOT NULL DEFAULT false,
  can_edit boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, page_key)
);

-- Relaciona cada usuário a exatamente um perfil
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS access_profile_id uuid REFERENCES public.access_profiles(id);

-- Perfis de sistema padrão
INSERT INTO public.access_profiles (name, description, is_admin, is_system)
VALUES ('Admin', 'Acesso irrestrito a todas as páginas e funcionalidades.', true, true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.access_profiles (name, description, is_admin, is_system)
VALUES ('Usuário padrão', 'Acesso limitado conforme permissões atribuídas ao perfil.', false, true)
ON CONFLICT (name) DO NOTHING;

-- Garante permissões totais para Admin em todas as páginas
INSERT INTO public.access_profile_permissions (
  profile_id, page_key, can_view, can_create, can_edit, can_delete
)
SELECT
  ap.id,
  p.key,
  true,
  true,
  true,
  true
FROM public.access_profiles ap
CROSS JOIN public.access_pages p
WHERE ap.name = 'Admin'
ON CONFLICT (profile_id, page_key) DO UPDATE
SET
  can_view = true,
  can_create = true,
  can_edit = true,
  can_delete = true;

-- Permissão mínima para Usuário padrão (somente dashboard)
INSERT INTO public.access_profile_permissions (
  profile_id, page_key, can_view, can_create, can_edit, can_delete
)
SELECT
  ap.id,
  p.key,
  (p.key = 'dashboard') AS can_view,
  false,
  false,
  false
FROM public.access_profiles ap
JOIN public.access_pages p ON p.key = 'dashboard'
WHERE ap.name = 'Usuário padrão'
ON CONFLICT (profile_id, page_key) DO UPDATE
SET
  can_view = EXCLUDED.can_view,
  can_create = EXCLUDED.can_create,
  can_edit = EXCLUDED.can_edit,
  can_delete = EXCLUDED.can_delete;

-- Migração de usuários legados (role -> access_profile_id)
UPDATE public.profiles p
SET access_profile_id = ap.id
FROM public.access_profiles ap
WHERE p.access_profile_id IS NULL
  AND p.role = 'admin'
  AND ap.name = 'Admin';

UPDATE public.profiles p
SET access_profile_id = ap.id
FROM public.access_profiles ap
WHERE p.access_profile_id IS NULL
  AND p.role <> 'admin'
  AND ap.name = 'Usuário padrão';

-- Garante vínculo obrigatório de perfil para novos/atuais usuários
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE access_profile_id IS NULL) THEN
    RAISE EXCEPTION 'Existem usuários sem access_profile_id. Corrija antes de aplicar NOT NULL.';
  END IF;
END $$;

ALTER TABLE public.profiles
ALTER COLUMN access_profile_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_access_profile_id ON public.profiles(access_profile_id);
CREATE INDEX IF NOT EXISTS idx_access_profile_permissions_profile ON public.access_profile_permissions(profile_id);

-- Função de verificação de admin atualizada para RBAC (com fallback legado por role)
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    LEFT JOIN public.access_profiles ap ON ap.id = p.access_profile_id
    WHERE p.id = auth.uid()
      AND (COALESCE(ap.is_admin, false) = true OR p.role = 'admin')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public;

-- Trigger de novo usuário: define profile com role legado e access_profile_id padrão
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  default_profile_id uuid;
BEGIN
  SELECT id INTO default_profile_id
  FROM public.access_profiles
  WHERE name = 'Usuário padrão'
  LIMIT 1;

  INSERT INTO public.profiles (id, email, role, access_profile_id)
  VALUES (NEW.id, NEW.email, 'viewer', default_profile_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS de RBAC
ALTER TABLE public.access_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_profile_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "access_pages_read_authenticated" ON public.access_pages;
CREATE POLICY "access_pages_read_authenticated"
ON public.access_pages FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "access_profiles_read_authenticated" ON public.access_profiles;
CREATE POLICY "access_profiles_read_authenticated"
ON public.access_profiles FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "access_profiles_admin_manage" ON public.access_profiles;
CREATE POLICY "access_profiles_admin_manage"
ON public.access_profiles FOR ALL
USING (public.is_current_user_admin())
WITH CHECK (public.is_current_user_admin());

DROP POLICY IF EXISTS "access_profile_permissions_read_authenticated" ON public.access_profile_permissions;
CREATE POLICY "access_profile_permissions_read_authenticated"
ON public.access_profile_permissions FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "access_profile_permissions_admin_manage" ON public.access_profile_permissions;
CREATE POLICY "access_profile_permissions_admin_manage"
ON public.access_profile_permissions FOR ALL
USING (public.is_current_user_admin())
WITH CHECK (public.is_current_user_admin());
