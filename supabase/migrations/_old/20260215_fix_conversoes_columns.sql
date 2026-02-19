-- Garante colunas em conversoes (church_id, team_id, gender, etc.)
-- Execute no Supabase: SQL Editor → New query → Cole e rode.
-- Resolve: "Could not find the 'church_id' column of 'conversoes' in the schema cache"

-- Enum para tipo de conversão (se não existir)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'conversion_type') THEN
    CREATE TYPE public.conversion_type AS ENUM ('accepted','reconciled');
  END IF;
END $$;

-- Colunas de consolidação (cadastros)
ALTER TABLE public.conversoes
  ADD COLUMN IF NOT EXISTS consolidator_person_id uuid NULL REFERENCES public.people(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS consolidator_name_text text NULL,
  ADD COLUMN IF NOT EXISTS cell_id uuid NULL REFERENCES public.cells(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cell_name_text text NULL,
  ADD COLUMN IF NOT EXISTS conversion_type public.conversion_type NULL,
  ADD COLUMN IF NOT EXISTS instagram text NULL;

-- Igreja e equipe
ALTER TABLE public.conversoes
  ADD COLUMN IF NOT EXISTS church_id uuid NULL REFERENCES public.churches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS team_id uuid NULL REFERENCES public.teams(id) ON DELETE SET NULL;

-- Gênero (M/F)
ALTER TABLE public.conversoes
  ADD COLUMN IF NOT EXISTS gender char(1) NULL CHECK (gender IN ('M', 'F'));

-- Índices (evita erro se já existirem)
CREATE INDEX IF NOT EXISTS idx_conversoes_church_id ON public.conversoes(church_id) WHERE church_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversoes_team_id ON public.conversoes(team_id) WHERE team_id IS NOT NULL;
