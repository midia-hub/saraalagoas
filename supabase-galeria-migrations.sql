-- ============================================================
-- Migração: Sistema de Galeria de Fotos para Cultos/Eventos
-- Execute no SQL Editor do Supabase (Dashboard > SQL Editor)
-- ============================================================

-- 0) Função para checar se o usuário é admin (evita recursão nas policies)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
$$;

-- 1) Tabela de configurações gerais (home_route, etc.)
CREATE TABLE IF NOT EXISTS public.settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- singleton
  home_route text DEFAULT '/',
  updated_at timestamptz DEFAULT now()
);

-- Inserir configuração padrão
INSERT INTO public.settings (id, home_route)
VALUES (1, '/')
ON CONFLICT (id) DO NOTHING;

-- RLS: settings - leitura pública, escrita só admins
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings_read" ON public.settings;
CREATE POLICY "settings_read" ON public.settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "settings_update_admin" ON public.settings;
CREATE POLICY "settings_update_admin" ON public.settings
  FOR ALL USING (public.is_admin());

-- 2) Tabela de cultos (worship_services)
CREATE TABLE IF NOT EXISTS public.worship_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Inserir cultos padrão
INSERT INTO public.worship_services (name, slug, active)
VALUES 
  ('Culto de Fé e Milagres', 'culto-de-fe-e-milagres', true),
  ('Arena', 'arena', true),
  ('Culto da Presença', 'culto-da-presenca', true),
  ('Culto da Família', 'culto-da-familia', true)
ON CONFLICT (slug) DO NOTHING;

-- RLS: worship_services - leitura pública, escrita só admins
ALTER TABLE public.worship_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "worship_services_read" ON public.worship_services;
CREATE POLICY "worship_services_read" ON public.worship_services
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "worship_services_write_admin" ON public.worship_services;
CREATE POLICY "worship_services_write_admin" ON public.worship_services
  FOR ALL USING (public.is_admin());

-- 3) Tabela de galerias
CREATE TABLE IF NOT EXISTS public.galleries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('culto', 'evento')),
  title text NOT NULL, -- nome do culto ou evento
  slug text NOT NULL,
  date date NOT NULL,
  description text,
  drive_folder_id text NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índices para busca eficiente
CREATE INDEX IF NOT EXISTS idx_galleries_type ON public.galleries(type);
CREATE INDEX IF NOT EXISTS idx_galleries_slug ON public.galleries(slug);
CREATE INDEX IF NOT EXISTS idx_galleries_date ON public.galleries(date DESC);
CREATE INDEX IF NOT EXISTS idx_galleries_type_slug_date ON public.galleries(type, slug, date);

-- RLS: galleries - leitura pública, criação autenticada
ALTER TABLE public.galleries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "galleries_read" ON public.galleries;
CREATE POLICY "galleries_read" ON public.galleries
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "galleries_insert_authenticated" ON public.galleries;
CREATE POLICY "galleries_insert_authenticated" ON public.galleries
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "galleries_update_admin" ON public.galleries;
CREATE POLICY "galleries_update_admin" ON public.galleries
  FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "galleries_delete_admin" ON public.galleries;
CREATE POLICY "galleries_delete_admin" ON public.galleries
  FOR DELETE USING (public.is_admin());

-- 4) Tabela de arquivos de galeria
CREATE TABLE IF NOT EXISTS public.gallery_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id uuid NOT NULL REFERENCES public.galleries(id) ON DELETE CASCADE,
  drive_file_id text NOT NULL,
  name text NOT NULL,
  web_view_link text,
  thumbnail_link text,
  mime_type text,
  created_time timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Índice para busca por galeria
CREATE INDEX IF NOT EXISTS idx_gallery_files_gallery_id ON public.gallery_files(gallery_id);

-- RLS: gallery_files - leitura pública, criação autenticada
ALTER TABLE public.gallery_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gallery_files_read" ON public.gallery_files;
CREATE POLICY "gallery_files_read" ON public.gallery_files
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "gallery_files_insert_authenticated" ON public.gallery_files;
CREATE POLICY "gallery_files_insert_authenticated" ON public.gallery_files
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "gallery_files_delete_admin" ON public.gallery_files;
CREATE POLICY "gallery_files_delete_admin" ON public.gallery_files
  FOR DELETE USING (public.is_admin());

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para galleries
DROP TRIGGER IF EXISTS update_galleries_updated_at ON public.galleries;
CREATE TRIGGER update_galleries_updated_at
  BEFORE UPDATE ON public.galleries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para settings
DROP TRIGGER IF EXISTS update_settings_updated_at ON public.settings;
CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON public.settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- CONCLUÍDO!
-- Agora configure as variáveis de ambiente do Google Drive
-- e compartilhe a pasta raiz do Drive com a service account.
-- ============================================================
