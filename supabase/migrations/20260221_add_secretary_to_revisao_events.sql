-- =========================
-- Adicionar Secretário na tabela de Eventos de Revisão
-- =========================

-- Adicionar coluna secretary_person_id e secretary_person para validação de pagamentos
ALTER TABLE public.revisao_vidas_events
ADD COLUMN IF NOT EXISTS secretary_person_id UUID REFERENCES public.people(id) ON DELETE SET NULL;

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_revisao_events_secretary 
  ON public.revisao_vidas_events(secretary_person_id);

-- Comentário explicativo
COMMENT ON COLUMN public.revisao_vidas_events.secretary_person_id IS 
'Usuário secretário responsável por validar pagamentos deste evento';
