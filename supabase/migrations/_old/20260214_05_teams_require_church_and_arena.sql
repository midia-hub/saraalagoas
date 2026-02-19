-- Equipe obrigatoriamente vinculada a uma igreja e a uma arena (e a arena à igreja)

-- Remove regra antiga (vinculava a igreja OU arena)
ALTER TABLE public.teams DROP CONSTRAINT IF EXISTS teams_scope_check;

-- Preenche church_id onde só tinha arena_id
UPDATE public.teams t
SET church_id = (SELECT a.church_id FROM public.arenas a WHERE a.id = t.arena_id LIMIT 1)
WHERE t.arena_id IS NOT NULL AND t.church_id IS NULL;

-- Preenche arena_id onde só tinha church_id (primeira arena da igreja)
UPDATE public.teams t
SET arena_id = (SELECT a.id FROM public.arenas a WHERE a.church_id = t.church_id ORDER BY a.name LIMIT 1)
WHERE t.church_id IS NOT NULL AND t.arena_id IS NULL;

-- Remove equipes que ficariam sem os dois (dados inválidos)
DELETE FROM public.teams WHERE church_id IS NULL OR arena_id IS NULL;

-- Torna igreja e arena obrigatórios
ALTER TABLE public.teams
  ALTER COLUMN church_id SET NOT NULL,
  ALTER COLUMN arena_id SET NOT NULL;

-- A regra "arena deve ser da igreja" é garantida na aplicação (API) ao criar/editar equipes.
-- PostgreSQL não permite subquery em CHECK constraint.
