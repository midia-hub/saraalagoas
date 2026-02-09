-- ============================================================
-- CORREÇÃO: Recursão infinita na policy da tabela "profiles"
-- Execute no SQL Editor do Supabase (Dashboard > SQL Editor)
--
-- Causa: políticas que usam "SELECT ... FROM profiles" para
-- checar se o usuário é admin fazem o RLS avaliar profiles
-- de novo → loop infinito.
-- Solução: função SECURITY DEFINER que lê profiles sem RLS.
-- ============================================================

-- 1) Função que verifica se o usuário atual é admin (roda sem RLS)
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

-- 2) Corrigir policy na tabela profiles (evita recursão)
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
CREATE POLICY "profiles_admin_all" ON public.profiles
  FOR ALL USING (public.is_admin());

-- 3) Corrigir policies em settings (se a tabela existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'settings') THEN
    DROP POLICY IF EXISTS "settings_update_admin" ON public.settings;
    CREATE POLICY "settings_update_admin" ON public.settings
      FOR ALL USING (public.is_admin());
  END IF;
END $$;

-- 4) Corrigir policies em worship_services
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'worship_services') THEN
    DROP POLICY IF EXISTS "worship_services_write_admin" ON public.worship_services;
    CREATE POLICY "worship_services_write_admin" ON public.worship_services
      FOR ALL USING (public.is_admin());
  END IF;
END $$;

-- 5) Corrigir policies em galleries
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'galleries') THEN
    DROP POLICY IF EXISTS "galleries_update_admin" ON public.galleries;
    CREATE POLICY "galleries_update_admin" ON public.galleries
      FOR UPDATE USING (public.is_admin());
    DROP POLICY IF EXISTS "galleries_delete_admin" ON public.galleries;
    CREATE POLICY "galleries_delete_admin" ON public.galleries
      FOR DELETE USING (public.is_admin());
  END IF;
END $$;

-- 6) Corrigir policy em gallery_files
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'gallery_files') THEN
    DROP POLICY IF EXISTS "gallery_files_delete_admin" ON public.gallery_files;
    CREATE POLICY "gallery_files_delete_admin" ON public.gallery_files
      FOR DELETE USING (public.is_admin());
  END IF;
END $$;

-- ============================================================
-- Pronto. Recarregue o admin e tente cadastrar o culto de novo.
-- ============================================================
