-- Garante uma única integração ativa por page_id na plataforma.
-- Desativa duplicatas (mantém a mais recente por page_id) e cria índice único.

-- 1) Desativar duplicatas: manter apenas uma integração ativa por page_id (a mais recente)
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY page_id ORDER BY updated_at DESC) AS rn
  FROM public.meta_integrations
  WHERE is_active = true AND page_id IS NOT NULL
)
UPDATE public.meta_integrations m
SET is_active = false, updated_at = now()
FROM ranked r
WHERE m.id = r.id AND r.rn > 1;

-- 2) Índice único: uma única linha ativa por page_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_meta_integrations_page_active_unique
ON public.meta_integrations (page_id)
WHERE is_active = true AND page_id IS NOT NULL;
