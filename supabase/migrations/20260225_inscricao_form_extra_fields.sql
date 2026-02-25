-- =========================
-- Inscrição Revisão de Vidas – campos extras do formulário público
-- Data: 2026-02-25
-- =========================

-- Decisão de fé informada no ato da inscrição
ALTER TABLE public.revisao_vidas_registrations
ADD COLUMN IF NOT EXISTS decision_type TEXT
  CHECK (decision_type IN ('aceitou', 'reconciliou'));

-- Nome do líder / consolidador (texto livre, preenchido no formulário público)
ALTER TABLE public.revisao_vidas_registrations
ADD COLUMN IF NOT EXISTS leader_name TEXT;

-- Equipe / ministério de origem
ALTER TABLE public.revisao_vidas_registrations
ADD COLUMN IF NOT EXISTS team TEXT;

-- Comentários / índice
COMMENT ON COLUMN public.revisao_vidas_registrations.decision_type
  IS 'aceitou = Aceitou a Jesus | reconciliou = Reconciliou-se';

COMMENT ON COLUMN public.revisao_vidas_registrations.leader_name
  IS 'Nome do líder ou consolidador que acompanha a pessoa';

COMMENT ON COLUMN public.revisao_vidas_registrations.team
  IS 'Equipe / ministério de origem da pessoa';
