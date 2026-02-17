-- ============================================================
-- XP26 Alagoas — Colunas específicas por perfil (Participante / Voluntário)
-- ============================================================

-- Bloco PARTICIPANTE
ALTER TABLE public.xp26_feedback
  ADD COLUMN IF NOT EXISTS fortalecer_fe text,
  ADD COLUMN IF NOT EXISTS decisao_importante boolean,
  ADD COLUMN IF NOT EXISTS decisao_qual text,
  ADD COLUMN IF NOT EXISTS ministeracoes_claras text,
  ADD COLUMN IF NOT EXISTS tempo_atividades text,
  ADD COLUMN IF NOT EXISTS sinalizacao text,
  ADD COLUMN IF NOT EXISTS filas text,
  ADD COLUMN IF NOT EXISTS som text,
  ADD COLUMN IF NOT EXISTS info_antes_evento text,
  ADD COLUMN IF NOT EXISTS acompanhou_instagram boolean,
  ADD COLUMN IF NOT EXISTS comunicacao_digital text,
  ADD COLUMN IF NOT EXISTS participara_xp27 text;

-- Bloco VOLUNTÁRIO
ALTER TABLE public.xp26_feedback
  ADD COLUMN IF NOT EXISTS escala_organizada text,
  ADD COLUMN IF NOT EXISTS instrucoes_claras text,
  ADD COLUMN IF NOT EXISTS lider_acessivel text,
  ADD COLUMN IF NOT EXISTS carga_horaria text,
  ADD COLUMN IF NOT EXISTS tempo_descanso text,
  ADD COLUMN IF NOT EXISTS falhas_area boolean,
  ADD COLUMN IF NOT EXISTS falhas_descricao text,
  ADD COLUMN IF NOT EXISTS valorizado text,
  ADD COLUMN IF NOT EXISTS lider_avaliacao text,
  ADD COLUMN IF NOT EXISTS servir_novamente text,
  ADD COLUMN IF NOT EXISTS servir_melhorar text;
