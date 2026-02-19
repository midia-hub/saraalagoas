-- Busca por nome ignorando acentos (full_name_normalized)
CREATE EXTENSION IF NOT EXISTS unaccent;

ALTER TABLE public.people
ADD COLUMN IF NOT EXISTS full_name_normalized text
GENERATED ALWAYS AS (lower(unaccent(coalesce(full_name, '')))) STORED;

CREATE INDEX IF NOT EXISTS idx_people_full_name_normalized
ON public.people(full_name_normalized);

COMMENT ON COLUMN public.people.full_name_normalized IS 'Nome em minúsculas e sem acentos para busca (ilike)';
