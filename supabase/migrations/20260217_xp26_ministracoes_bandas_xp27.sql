-- ============================================================
-- XP26 Alagoas — Bloco Ministrações, Bandas e XP27 (todos os participantes)
-- ============================================================

ALTER TABLE public.xp26_feedback
  ADD COLUMN IF NOT EXISTS melhor_ministracao text,
  ADD COLUMN IF NOT EXISTS motivo_ministracao text,
  ADD COLUMN IF NOT EXISTS avaliacao_geral_ministracoes text,
  ADD COLUMN IF NOT EXISTS melhor_banda text,
  ADD COLUMN IF NOT EXISTS avaliacao_louvor_geral text,
  ADD COLUMN IF NOT EXISTS avaliacao_som_louvor text,
  ADD COLUMN IF NOT EXISTS avaliacao_energia_banda text,
  ADD COLUMN IF NOT EXISTS avaliacao_conexao_louvor text,
  ADD COLUMN IF NOT EXISTS formato_preferido_xp27 text,
  ADD COLUMN IF NOT EXISTS indicacao_preletor_xp27 text,
  ADD COLUMN IF NOT EXISTS indicacao_banda_xp27 text,
  ADD COLUMN IF NOT EXISTS tema_preferido_xp27 text[],
  ADD COLUMN IF NOT EXISTS tema_preferido_xp27_outro text,
  ADD COLUMN IF NOT EXISTS sugestao_xp27 text;

-- participaria_xp27 já existe (participara_xp27 no código)
