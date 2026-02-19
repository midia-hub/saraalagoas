-- Estrutura de liderança em people
ALTER TABLE public.people
ADD COLUMN IF NOT EXISTS leader_person_id uuid
REFERENCES public.people(id)
ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_people_leader_person_id
ON public.people(leader_person_id);

-- Retorna a estrutura descendente a partir de uma pessoa base
CREATE OR REPLACE FUNCTION public.get_leadership_tree(root_id uuid)
RETURNS TABLE (
  id uuid,
  full_name text,
  leader_person_id uuid,
  level int
)
LANGUAGE sql
STABLE
AS $$
WITH RECURSIVE tree AS (
  SELECT
    p.id,
    p.full_name,
    p.leader_person_id,
    1 AS level,
    ARRAY[p.id]::uuid[] AS path_ids
  FROM public.people p
  WHERE p.id = root_id

  UNION ALL

  SELECT
    child.id,
    child.full_name,
    child.leader_person_id,
    tree.level + 1,
    tree.path_ids || child.id
  FROM public.people child
  JOIN tree ON child.leader_person_id = tree.id
  WHERE NOT child.id = ANY(tree.path_ids)
)
SELECT
  tree.id,
  tree.full_name,
  tree.leader_person_id,
  tree.level
FROM tree;
$$;

-- Retorna a cadeia de liderança acima de uma pessoa
CREATE OR REPLACE FUNCTION public.get_leadership_chain(person_uuid uuid)
RETURNS TABLE (leader_id uuid, level int)
LANGUAGE sql
STABLE
AS $$
WITH RECURSIVE chain AS (
  SELECT
    p.leader_person_id AS leader_id,
    1 AS level,
    ARRAY[p.id]::uuid[] AS path_ids
  FROM public.people p
  WHERE p.id = person_uuid

  UNION ALL

  SELECT
    p2.leader_person_id,
    chain.level + 1,
    chain.path_ids || p2.id
  FROM public.people p2
  JOIN chain ON p2.id = chain.leader_id
  WHERE p2.leader_person_id IS NOT NULL
    AND NOT p2.id = ANY(chain.path_ids)
)
SELECT chain.leader_id, chain.level
FROM chain
WHERE chain.leader_id IS NOT NULL;
$$;
