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

CREATE POLICY "site_config_read" ON public.site_config
  FOR SELECT USING (true);

CREATE POLICY "site_config_update" ON public.site_config
  FOR ALL USING (auth.role() = 'authenticated');

-- RLS: profiles - só o próprio usuário pode ler seu perfil; apenas admins podem atualizar roles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_read_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Admins podem ler todos os perfis e inserir/atualizar (para gestão de usuários)
CREATE POLICY "profiles_admin_all" ON public.profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

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
