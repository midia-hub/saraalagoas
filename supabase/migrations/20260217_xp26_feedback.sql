-- ============================================================
-- XP26 Alagoas — Pesquisa pós-evento (feedback)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.xp26_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  arena text,
  perfil text,
  nota_evento integer CHECK (nota_evento >= 0 AND nota_evento <= 10),
  impacto_principal text[],
  impacto_outro text,
  organizacao text,
  teve_problema boolean,
  descricao_problema text,
  superou_expectativa text,
  nps integer CHECK (nps >= 0 AND nps <= 10),
  melhorias text,
  mensagem_final text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_xp26_feedback_created_at ON public.xp26_feedback(created_at);
CREATE INDEX IF NOT EXISTS idx_xp26_feedback_arena ON public.xp26_feedback(arena);
CREATE INDEX IF NOT EXISTS idx_xp26_feedback_nps ON public.xp26_feedback(nps);

COMMENT ON TABLE public.xp26_feedback IS 'Respostas da pesquisa pós-evento XP26 Alagoas';
