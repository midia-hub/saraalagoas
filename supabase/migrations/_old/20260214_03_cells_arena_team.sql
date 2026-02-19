-- Célula pode ser vinculada opcionalmente a uma arena e a uma equipe dessa arena

ALTER TABLE public.cells
  ADD COLUMN IF NOT EXISTS arena_id uuid NULL REFERENCES public.arenas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS team_id uuid NULL REFERENCES public.teams(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS cells_arena_id_idx ON public.cells(arena_id);
CREATE INDEX IF NOT EXISTS cells_team_id_idx ON public.cells(team_id);

-- Regra: se team_id estiver preenchido, a equipe deve ser da arena selecionada (validado na aplicação ao salvar).
