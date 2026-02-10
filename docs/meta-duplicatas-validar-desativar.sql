-- ============================================================
-- Validação e correção de duplicatas em meta_integrations
-- Execute no Supabase: SQL Editor (Dashboard)
-- ============================================================

-- 1) LISTAR TODOS OS REGISTROS (ver o que está no banco)
SELECT id, created_at, updated_at,
       page_id, page_name,
       instagram_business_account_id, instagram_username,
       is_active
FROM public.meta_integrations
ORDER BY updated_at DESC;


-- 2) IDENTIFICAR DUPLICATAS POR PÁGINA (mesmo page_id ativo mais de uma vez)
-- Cada linha = uma página Facebook (e sua conta Instagram vinculada) repetida
SELECT page_id, page_name, COUNT(*) AS qtd,
       array_agg(id ORDER BY updated_at DESC) AS ids,
       array_agg(updated_at::text ORDER BY updated_at DESC) AS datas
FROM public.meta_integrations
WHERE is_active = true AND page_id IS NOT NULL
GROUP BY page_id, page_name
HAVING COUNT(*) > 1;


-- 3) DETALHAR QUAIS IDs SERÃO MANTIDOS (1 por page_id) E QUAIS SERÃO DESATIVADOS
WITH ranked AS (
  SELECT id, page_id, page_name, instagram_username, updated_at,
         ROW_NUMBER() OVER (PARTITION BY page_id ORDER BY updated_at DESC) AS rn
  FROM public.meta_integrations
  WHERE is_active = true AND page_id IS NOT NULL
)
SELECT id, page_id, page_name, instagram_username, updated_at,
       CASE WHEN rn = 1 THEN 'MANTER' ELSE 'DESATIVAR' END AS acao
FROM ranked
ORDER BY page_id, rn;


-- 4) DESATIVAR DUPLICATAS (manter só a mais recente por page_id)
-- Descomente e execute após validar os resultados acima.
/*
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
*/

-- 5) (Opcional) Conferir após o UPDATE: só deve haver 1 ativo por page_id
-- SELECT page_id, page_name, COUNT(*) FROM public.meta_integrations WHERE is_active = true AND page_id IS NOT NULL GROUP BY page_id, page_name;
