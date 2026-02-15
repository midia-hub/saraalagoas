-- Múltiplos líderes por equipe: tabela N:N team_leaders

CREATE TABLE IF NOT EXISTS public.team_leaders (
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES public.people(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, person_id)
);

CREATE INDEX IF NOT EXISTS team_leaders_team_id_idx ON public.team_leaders(team_id);
CREATE INDEX IF NOT EXISTS team_leaders_person_id_idx ON public.team_leaders(person_id);

-- Migra líder único existente para team_leaders
INSERT INTO public.team_leaders (team_id, person_id)
SELECT id, leader_person_id FROM public.teams
WHERE leader_person_id IS NOT NULL
ON CONFLICT (team_id, person_id) DO NOTHING;

-- Remove coluna única
ALTER TABLE public.teams DROP COLUMN IF EXISTS leader_person_id;

-- RLS
ALTER TABLE public.team_leaders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_leaders_select_consolidacao" ON public.team_leaders;
CREATE POLICY "team_leaders_select_consolidacao" ON public.team_leaders FOR SELECT TO authenticated
  USING (public.current_user_can('consolidacao', 'view') OR public.current_user_can('consolidacao', 'manage'));
DROP POLICY IF EXISTS "team_leaders_all_consolidacao" ON public.team_leaders;
CREATE POLICY "team_leaders_all_consolidacao" ON public.team_leaders FOR ALL TO authenticated
  USING (public.current_user_can('consolidacao', 'manage'))
  WITH CHECK (public.current_user_can('consolidacao', 'manage'));
