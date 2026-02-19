-- Adiciona Igreja e Equipe à conversão (opcional)
ALTER TABLE public.conversoes
  ADD COLUMN IF NOT EXISTS church_id uuid NULL REFERENCES public.churches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS team_id uuid NULL REFERENCES public.teams(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_conversoes_church_id ON public.conversoes(church_id) WHERE church_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversoes_team_id ON public.conversoes(team_id) WHERE team_id IS NOT NULL;
