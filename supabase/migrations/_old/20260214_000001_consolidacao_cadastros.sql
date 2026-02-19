-- =========================================
-- CONSOLIDAÇÃO - CADASTROS (IGREJA / CÉLULA / ARENA / EQUIPE)
-- Pessoas: usa tabela existente public.people (não criar nova).
-- Tabela de conversões: public.conversoes (alterar com novos campos).
-- =========================================

-- 1) ENUMS
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cell_frequency') THEN
    CREATE TYPE public.cell_frequency AS ENUM ('weekly','biweekly','monthly');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'day_of_week') THEN
    CREATE TYPE public.day_of_week AS ENUM ('mon','tue','wed','thu','fri','sat','sun');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'conversion_type') THEN
    CREATE TYPE public.conversion_type AS ENUM ('accepted','reconciled');
  END IF;
END $$;

-- 2) IGREJAS
CREATE TABLE IF NOT EXISTS public.churches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS churches_name_uq ON public.churches (lower(trim(name)));

-- pastores (N:N) — person_id referencia public.people existente
CREATE TABLE IF NOT EXISTS public.church_pastors (
  church_id uuid NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES public.people(id) ON DELETE RESTRICT,
  role text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (church_id, person_id)
);

-- 3) CÉLULAS
CREATE TABLE IF NOT EXISTS public.cells (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id uuid NULL REFERENCES public.churches(id) ON DELETE SET NULL,

  name text NOT NULL,
  nucleus text NULL,

  day_of_week public.day_of_week NOT NULL,
  time_of_day time NOT NULL,
  frequency public.cell_frequency NOT NULL DEFAULT 'weekly',

  leader_person_id uuid NULL REFERENCES public.people(id) ON DELETE SET NULL,
  co_leader_person_id uuid NULL REFERENCES public.people(id) ON DELETE SET NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cells_church_id_idx ON public.cells(church_id);
CREATE INDEX IF NOT EXISTS cells_leader_person_id_idx ON public.cells(leader_person_id);

-- LT (N:N)
CREATE TABLE IF NOT EXISTS public.cell_lt_members (
  cell_id uuid NOT NULL REFERENCES public.cells(id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES public.people(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (cell_id, person_id)
);

-- 4) ARENA
CREATE TABLE IF NOT EXISTS public.arenas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id uuid NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Arena',
  day_of_week public.day_of_week NOT NULL,
  time_of_day time NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS arenas_church_id_idx ON public.arenas(church_id);

CREATE TABLE IF NOT EXISTS public.arena_leaders (
  arena_id uuid NOT NULL REFERENCES public.arenas(id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES public.people(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (arena_id, person_id)
);

-- 5) EQUIPES (vincula a arena OU igreja)
CREATE TABLE IF NOT EXISTS public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,

  church_id uuid NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  arena_id uuid NULL REFERENCES public.arenas(id) ON DELETE CASCADE,

  leader_person_id uuid NULL REFERENCES public.people(id) ON DELETE SET NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT teams_scope_check CHECK (
    (church_id IS NOT NULL AND arena_id IS NULL)
    OR
    (church_id IS NULL AND arena_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS teams_church_id_idx ON public.teams(church_id);
CREATE INDEX IF NOT EXISTS teams_arena_id_idx ON public.teams(arena_id);

-- 6) ALTER CONVERSOES (tabela real do projeto: public.conversoes)
ALTER TABLE public.conversoes
  ADD COLUMN IF NOT EXISTS consolidator_person_id uuid NULL REFERENCES public.people(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS consolidator_name_text text NULL,
  ADD COLUMN IF NOT EXISTS cell_id uuid NULL REFERENCES public.cells(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cell_name_text text NULL,
  ADD COLUMN IF NOT EXISTS conversion_type public.conversion_type NULL,
  ADD COLUMN IF NOT EXISTS instagram text NULL;

CREATE INDEX IF NOT EXISTS idx_conversoes_consolidator_person_id ON public.conversoes(consolidator_person_id) WHERE consolidator_person_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversoes_cell_id ON public.conversoes(cell_id) WHERE cell_id IS NOT NULL;

-- 7) TRIGGERS updated_at (reutilizar função existente)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid JOIN pg_namespace n ON c.relnamespace = n.oid WHERE c.relname = 'churches' AND n.nspname = 'public' AND t.tgname = 'update_churches_updated_at') THEN
    CREATE TRIGGER update_churches_updated_at BEFORE UPDATE ON public.churches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid JOIN pg_namespace n ON c.relnamespace = n.oid WHERE c.relname = 'cells' AND n.nspname = 'public' AND t.tgname = 'update_cells_updated_at') THEN
    CREATE TRIGGER update_cells_updated_at BEFORE UPDATE ON public.cells FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid JOIN pg_namespace n ON c.relnamespace = n.oid WHERE c.relname = 'arenas' AND n.nspname = 'public' AND t.tgname = 'update_arenas_updated_at') THEN
    CREATE TRIGGER update_arenas_updated_at BEFORE UPDATE ON public.arenas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid JOIN pg_namespace n ON c.relnamespace = n.oid WHERE c.relname = 'teams' AND n.nspname = 'public' AND t.tgname = 'update_teams_updated_at') THEN
    CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 8) RLS (padrão: consolidacao view/manage)
ALTER TABLE public.churches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.church_pastors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cells ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cell_lt_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arenas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arena_leaders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "churches_select_consolidacao" ON public.churches;
CREATE POLICY "churches_select_consolidacao" ON public.churches FOR SELECT TO authenticated
  USING (public.current_user_can('consolidacao', 'view') OR public.current_user_can('consolidacao', 'manage'));
DROP POLICY IF EXISTS "churches_all_consolidacao" ON public.churches;
CREATE POLICY "churches_all_consolidacao" ON public.churches FOR ALL TO authenticated
  USING (public.current_user_can('consolidacao', 'manage'))
  WITH CHECK (public.current_user_can('consolidacao', 'manage'));

DROP POLICY IF EXISTS "church_pastors_select_consolidacao" ON public.church_pastors;
CREATE POLICY "church_pastors_select_consolidacao" ON public.church_pastors FOR SELECT TO authenticated
  USING (public.current_user_can('consolidacao', 'view') OR public.current_user_can('consolidacao', 'manage'));
DROP POLICY IF EXISTS "church_pastors_all_consolidacao" ON public.church_pastors;
CREATE POLICY "church_pastors_all_consolidacao" ON public.church_pastors FOR ALL TO authenticated
  USING (public.current_user_can('consolidacao', 'manage'))
  WITH CHECK (public.current_user_can('consolidacao', 'manage'));

DROP POLICY IF EXISTS "cells_select_consolidacao" ON public.cells;
CREATE POLICY "cells_select_consolidacao" ON public.cells FOR SELECT TO authenticated
  USING (public.current_user_can('consolidacao', 'view') OR public.current_user_can('consolidacao', 'manage'));
DROP POLICY IF EXISTS "cells_all_consolidacao" ON public.cells;
CREATE POLICY "cells_all_consolidacao" ON public.cells FOR ALL TO authenticated
  USING (public.current_user_can('consolidacao', 'manage'))
  WITH CHECK (public.current_user_can('consolidacao', 'manage'));

DROP POLICY IF EXISTS "cell_lt_members_select_consolidacao" ON public.cell_lt_members;
CREATE POLICY "cell_lt_members_select_consolidacao" ON public.cell_lt_members FOR SELECT TO authenticated
  USING (public.current_user_can('consolidacao', 'view') OR public.current_user_can('consolidacao', 'manage'));
DROP POLICY IF EXISTS "cell_lt_members_all_consolidacao" ON public.cell_lt_members;
CREATE POLICY "cell_lt_members_all_consolidacao" ON public.cell_lt_members FOR ALL TO authenticated
  USING (public.current_user_can('consolidacao', 'manage'))
  WITH CHECK (public.current_user_can('consolidacao', 'manage'));

DROP POLICY IF EXISTS "arenas_select_consolidacao" ON public.arenas;
CREATE POLICY "arenas_select_consolidacao" ON public.arenas FOR SELECT TO authenticated
  USING (public.current_user_can('consolidacao', 'view') OR public.current_user_can('consolidacao', 'manage'));
DROP POLICY IF EXISTS "arenas_all_consolidacao" ON public.arenas;
CREATE POLICY "arenas_all_consolidacao" ON public.arenas FOR ALL TO authenticated
  USING (public.current_user_can('consolidacao', 'manage'))
  WITH CHECK (public.current_user_can('consolidacao', 'manage'));

DROP POLICY IF EXISTS "arena_leaders_select_consolidacao" ON public.arena_leaders;
CREATE POLICY "arena_leaders_select_consolidacao" ON public.arena_leaders FOR SELECT TO authenticated
  USING (public.current_user_can('consolidacao', 'view') OR public.current_user_can('consolidacao', 'manage'));
DROP POLICY IF EXISTS "arena_leaders_all_consolidacao" ON public.arena_leaders;
CREATE POLICY "arena_leaders_all_consolidacao" ON public.arena_leaders FOR ALL TO authenticated
  USING (public.current_user_can('consolidacao', 'manage'))
  WITH CHECK (public.current_user_can('consolidacao', 'manage'));

DROP POLICY IF EXISTS "teams_select_consolidacao" ON public.teams;
CREATE POLICY "teams_select_consolidacao" ON public.teams FOR SELECT TO authenticated
  USING (public.current_user_can('consolidacao', 'view') OR public.current_user_can('consolidacao', 'manage'));
DROP POLICY IF EXISTS "teams_all_consolidacao" ON public.teams;
CREATE POLICY "teams_all_consolidacao" ON public.teams FOR ALL TO authenticated
  USING (public.current_user_can('consolidacao', 'manage'))
  WITH CHECK (public.current_user_can('consolidacao', 'manage'));
