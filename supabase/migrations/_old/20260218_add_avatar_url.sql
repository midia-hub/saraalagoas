-- Adicionar avatar_url para pessoas e perfis
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;

COMMENT ON COLUMN public.people.avatar_url IS 'URL da foto de perfil (Supabase Storage)';
COMMENT ON COLUMN public.profiles.avatar_url IS 'URL da foto de perfil (Supabase Storage)';
