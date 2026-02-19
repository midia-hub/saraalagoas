-- Script SQL para verificar duplicatas na tabela cell_people
-- Execute no SQL Editor do Supabase

-- 1. Verificar duplicatas de membros (com person_id)
SELECT 
  c.name AS celula_nome,
  cp.cell_id,
  cp.person_id,
  p.full_name AS pessoa_nome,
  cp.type AS tipo,
  COUNT(*) AS quantidade_duplicatas,
  STRING_AGG(cp.id::text, ', ') AS ids_duplicados,
  STRING_AGG(cp.status, ', ') AS status,
  STRING_AGG(TO_CHAR(cp.created_at, 'DD/MM/YYYY HH24:MI'), ', ') AS datas_criacao
FROM cell_people cp
JOIN cells c ON c.id = cp.cell_id
LEFT JOIN people p ON p.id = cp.person_id
WHERE cp.person_id IS NOT NULL
GROUP BY c.name, cp.cell_id, cp.person_id, p.full_name, cp.type
HAVING COUNT(*) > 1
ORDER BY c.name, p.full_name;

-- 2. Verificar possíveis duplicatas de visitantes (sem person_id, por nome)
SELECT 
  c.name AS celula_nome,
  cp.cell_id,
  cp.full_name AS visitante_nome,
  cp.phone AS telefone,
  cp.type AS tipo,
  COUNT(*) AS quantidade_duplicatas,
  STRING_AGG(cp.id::text, ', ') AS ids_duplicados,
  STRING_AGG(cp.status, ', ') AS status,
  STRING_AGG(TO_CHAR(cp.created_at, 'DD/MM/YYYY HH24:MI'), ', ') AS datas_criacao
FROM cell_people cp
JOIN cells c ON c.id = cp.cell_id
WHERE cp.person_id IS NULL
  AND cp.full_name IS NOT NULL
GROUP BY c.name, cp.cell_id, cp.full_name, cp.phone, cp.type
HAVING COUNT(*) > 1
ORDER BY c.name, cp.full_name;

-- 3. Contar total de duplicatas
SELECT 
  'Total de grupos duplicados (membros com person_id)' AS descricao,
  COUNT(*) AS total
FROM (
  SELECT 
    cp.cell_id,
    cp.person_id
  FROM cell_people cp
  WHERE cp.person_id IS NOT NULL
  GROUP BY cp.cell_id, cp.person_id
  HAVING COUNT(*) > 1
) AS duplicados
UNION ALL
SELECT 
  'Total de grupos duplicados (visitantes por nome)' AS descricao,
  COUNT(*) AS total
FROM (
  SELECT 
    cp.cell_id,
    cp.full_name,
    cp.phone
  FROM cell_people cp
  WHERE cp.person_id IS NULL
    AND cp.full_name IS NOT NULL
  GROUP BY cp.cell_id, cp.full_name, cp.phone
  HAVING COUNT(*) > 1
) AS duplicados;

-- 4. Listar todas as entradas da célula "teste" (se for essa a que tem problema)
SELECT 
  cp.id,
  cp.cell_id,
  c.name AS celula_nome,
  cp.person_id,
  p.full_name AS pessoa_nome_from_people,
  cp.full_name AS nome_direto,
  cp.phone,
  cp.type,
  cp.status,
  cp.created_at,
  cp.updated_at
FROM cell_people cp
JOIN cells c ON c.id = cp.cell_id
LEFT JOIN people p ON p.id = cp.person_id
WHERE LOWER(c.name) = 'teste'
ORDER BY cp.created_at;
