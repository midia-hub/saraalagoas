-- ============================================================
-- Adiciona nome e telefone ao perfil (completar cadastro)
-- Execute no SQL Editor do Supabase após supabase-admin.sql
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS phone text;

COMMENT ON COLUMN public.profiles.full_name IS 'Nome completo preenchido ao completar cadastro';
COMMENT ON COLUMN public.profiles.phone IS 'Telefone preenchido ao completar cadastro';
