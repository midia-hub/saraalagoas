-- ============================================================
-- XP26 Alagoas — Pesquisa pós-evento (feedback) — MIGRAÇÃO COMPLETA
-- Substitui: 20260217_xp26_feedback, 20260217_xp26_feedback_perfil_blocks,
--            20260217_xp26_ministracoes_bandas_xp27
-- Use esta migração sozinha em ambiente novo ou após remover as três acima.
-- ============================================================

-- Remove tabela antiga só se for ambiente novo (opcional: comente as 2 linhas abaixo para preservar dados)
-- DROP TABLE IF EXISTS public.xp26_feedback;

CREATE TABLE IF NOT EXISTS public.xp26_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),

  -- Identificação e experiência geral
  arena text,
  perfil text,
  nota_evento integer CHECK (nota_evento >= 0 AND nota_evento <= 10),
  impacto_principal text[],
  impacto_outro text,

  -- Bloco PARTICIPANTE
  fortalecer_fe text,
  decisao_importante boolean,
  decisao_qual text,
  ministeracoes_claras text,
  tempo_atividades text,
  sinalizacao text,
  filas text,
  som text,
  info_antes_evento text,
  acompanhou_instagram boolean,
  comunicacao_digital text,
  participara_xp27 text,

  -- Bloco VOLUNTÁRIO
  escala_organizada text,
  instrucoes_claras text,
  lider_acessivel text,
  carga_horaria text,
  tempo_descanso text,
  falhas_area boolean,
  falhas_descricao text,
  valorizado text,
  lider_avaliacao text,
  servir_novamente text,
  servir_melhorar text,

  -- Bloco MINISTRAÇÕES, BANDAS E XP27 (todos)
  melhor_ministracao text,
  motivo_ministracao text,
  avaliacao_geral_ministracoes text,
  melhor_banda text,
  avaliacao_louvor_geral text,
  avaliacao_som_louvor text,
  avaliacao_energia_banda text,
  avaliacao_conexao_louvor text,
  formato_preferido_xp27 text,
  indicacao_preletor_xp27 text,
  indicacao_banda_xp27 text,
  tema_preferido_xp27 text[],
  tema_preferido_xp27_outro text,
  sugestao_xp27 text,

  -- Etapas comuns (organização, impacto, feedback aberto)
  organizacao text,
  teve_problema boolean DEFAULT false,
  descricao_problema text,
  superou_expectativa text,
  nps integer CHECK (nps >= 0 AND nps <= 10),
  melhorias text,
  mensagem_final text,
  contato_whatsapp_autorizado boolean,
  nome_contato text,
  whatsapp_contato text
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_xp26_feedback_created_at ON public.xp26_feedback(created_at);
CREATE INDEX IF NOT EXISTS idx_xp26_feedback_arena ON public.xp26_feedback(arena);
CREATE INDEX IF NOT EXISTS idx_xp26_feedback_nps ON public.xp26_feedback(nps);
CREATE INDEX IF NOT EXISTS idx_xp26_feedback_perfil ON public.xp26_feedback(perfil);

COMMENT ON TABLE public.xp26_feedback IS 'Respostas da pesquisa pós-evento XP26 Alagoas (formulário completo: perfil, ministrações, bandas, XP27)';

-- ============================================================
-- Se a tabela já existir (criada por migrações anteriores),
-- os ALTERs abaixo garantem todas as colunas (idempotente).
-- ============================================================
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
  ADD COLUMN IF NOT EXISTS participara_xp27 text,
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
  ADD COLUMN IF NOT EXISTS servir_melhorar text,
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
  ADD COLUMN IF NOT EXISTS sugestao_xp27 text,
  ADD COLUMN IF NOT EXISTS contato_whatsapp_autorizado boolean,
  ADD COLUMN IF NOT EXISTS nome_contato text,
  ADD COLUMN IF NOT EXISTS whatsapp_contato text;

-- ============================================================
-- RLS - SEGURANÇA POR LINHA
-- ============================================================

-- 1) Habilitar RLS
ALTER TABLE public.xp26_feedback ENABLE ROW LEVEL SECURITY;

-- 2) Política para INSERÇÃO: Qualquer pessoa (anônima ou autenticada) pode enviar feedback
DROP POLICY IF EXISTS "xp26_feedback_insert_anon" ON public.xp26_feedback;
CREATE POLICY "xp26_feedback_insert_anon" ON public.xp26_feedback
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- 3) Política para LEITURA/GESTÃO: Apenas administradores podem ver ou gerenciar os resultados
DROP POLICY IF EXISTS "xp26_feedback_admin_all" ON public.xp26_feedback;
CREATE POLICY "xp26_feedback_admin_all" ON public.xp26_feedback
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.roles r ON r.id = p.role_id
      WHERE p.id = auth.uid() AND r.is_admin = true
    )
  );
