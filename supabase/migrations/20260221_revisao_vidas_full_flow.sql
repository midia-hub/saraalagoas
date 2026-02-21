-- =========================
-- Revisão de Vidas - Implementação Completa do Fluxo
-- =========================
-- Data: 2026-02-21
-- Objetivo: Expandir revisao_vidas_registrations com campos para:
--   - Pré-Revisão (obrigatório)
--   - Pagamento (validação por secretário)
--   - Anamnese (conclusão)
--   - Status detalhado

-- =========================
-- 1) Expandir revisao_vidas_registrations
-- =========================

-- Adicionar coluna: Pré-Revisão aplicado
ALTER TABLE public.revisao_vidas_registrations
ADD COLUMN IF NOT EXISTS pre_revisao_aplicado BOOLEAN DEFAULT FALSE;

-- Adicionar colunas: Pagamento
ALTER TABLE public.revisao_vidas_registrations
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending' 
  CHECK (payment_status IN ('pending', 'validated', 'cancelled'));

ALTER TABLE public.revisao_vidas_registrations
ADD COLUMN IF NOT EXISTS payment_date DATE;

ALTER TABLE public.revisao_vidas_registrations
ADD COLUMN IF NOT EXISTS payment_validated_by UUID 
  REFERENCES public.people(id) ON DELETE SET NULL;

ALTER TABLE public.revisao_vidas_registrations
ADD COLUMN IF NOT EXISTS payment_validated_at TIMESTAMPTZ;

ALTER TABLE public.revisao_vidas_registrations
ADD COLUMN IF NOT EXISTS payment_notes TEXT;

-- Adicionar coluna: Anamnese preenchida
ALTER TABLE public.revisao_vidas_registrations
ADD COLUMN IF NOT EXISTS anamnese_completed BOOLEAN DEFAULT FALSE;

ALTER TABLE public.revisao_vidas_registrations
ADD COLUMN IF NOT EXISTS anamnese_completed_at TIMESTAMPTZ;

-- =========================
-- 2) Criar tabela para validação de pagamentos
-- =========================

CREATE TABLE IF NOT EXISTS public.revisao_vidas_payment_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES public.revisao_vidas_registrations(id) ON DELETE CASCADE,
  
  -- Dados da validação
  validated_by_person_id UUID NOT NULL REFERENCES public.people(id) ON DELETE RESTRICT,
  validated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Detalhes do pagamento
  payment_date DATE NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('dinheiro', 'pix', 'transferencia', 'debito', 'credito', 'cheque')),
  amount DECIMAL(10,2),
  notes TEXT,
  
  -- Auditoria
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Índices
  UNIQUE(registration_id)
);

CREATE INDEX IF NOT EXISTS idx_payment_validations_registration 
  ON public.revisao_vidas_payment_validations(registration_id);

CREATE INDEX IF NOT EXISTS idx_payment_validations_validated_by 
  ON public.revisao_vidas_payment_validations(validated_by_person_id);

-- =========================
-- 3) Criar enum de status consolidado
-- =========================

-- Tabela de reference para status (para UI e controle)
CREATE TABLE IF NOT EXISTS public.revisao_vidas_registration_statuses (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT 'slate', -- para UI: emerald, amber, slate, rose, purple, etc
  requires_fields TEXT[], -- array JSON de campos obrigatórios
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Limpar e inserir status padrão
TRUNCATE TABLE public.revisao_vidas_registration_statuses CASCADE;

INSERT INTO public.revisao_vidas_registration_statuses (id, label, description, color, requires_fields)
VALUES
  ('inscrito', 'Inscrito', 'Inscrição criada', 'slate', ARRAY[]::TEXT[]),
  ('aguardando_pre_revisao', 'Aguardando Pré-Revisão', 'Pré-Revisão não foi aplicado', 'amber', ARRAY['pre_revisao_aplicado']::TEXT[]),
  ('aguardando_pagamento', 'Aguardando Pagamento', 'Pagamento não foi realizado', 'amber', ARRAY['payment_date']::TEXT[]),
  ('aguardando_validacao', 'Aguardando Validação', 'Pagamento feito, aguardando secretário validar', 'amber', ARRAY['payment_validated_by']::TEXT[]),
  ('aguardando_anamnese', 'Aguardando Anamnese', 'Falta preencher anamnese', 'amber', ARRAY['anamnese_completed']::TEXT[]),
  ('confirmado', 'Confirmado', 'Todos critérios atendidos', 'emerald', ARRAY['pre_revisao_aplicado','payment_validated_by','anamnese_completed']::TEXT[]),
  ('bloqueado', 'Bloqueado', 'Prazo expirou, alterações trancadas', 'rose', ARRAY[]::TEXT[])
ON CONFLICT DO NOTHING;

-- =========================
-- 4) Criar função para calcular status automaticamente
-- =========================

CREATE OR REPLACE FUNCTION public.calculate_revisao_registration_status(
  registration_id UUID
)
RETURNS TEXT AS $$
DECLARE
  reg RECORD;
  event_date DATE;
  deadline_date DATE;
BEGIN
  -- Buscar registro
  SELECT 
    r.*,
    e.start_date as event_start_date
  INTO reg
  FROM public.revisao_vidas_registrations r
  JOIN public.revisao_vidas_events e ON e.id = r.event_id
  WHERE r.id = registration_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Calcular deadline (1 dia antes)
  deadline_date := reg.event_start_date - INTERVAL '1 day';

  -- Se passou do deadline -> bloqueado
  IF NOW()::DATE > deadline_date THEN
    RETURN 'bloqueado';
  END IF;

  -- Validar campos obrigatórios
  IF NOT COALESCE(reg.pre_revisao_aplicado, FALSE) THEN
    RETURN 'aguardando_pre_revisao';
  END IF;

  IF reg.payment_date IS NULL THEN
    RETURN 'aguardando_pagamento';
  END IF;

  IF reg.payment_validated_by IS NULL THEN
    RETURN 'aguardando_validacao';
  END IF;

  IF NOT COALESCE(reg.anamnese_completed, FALSE) THEN
    RETURN 'aguardando_anamnese';
  END IF;

  -- Todos critérios atendidos
  RETURN 'confirmado';
END;
$$ LANGUAGE plpgsql STABLE;

-- =========================
-- 5) Trigger para atualizar anamnese_completed
-- =========================

CREATE OR REPLACE FUNCTION public.trg_update_anamnese_completed()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando uma anamnese é salva, marcar como completa
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.revisao_vidas_registrations
    SET 
      anamnese_completed = TRUE,
      anamnese_completed_at = NOW()
    WHERE id = NEW.registration_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_revisao_anamnese_completed ON public.revisao_vidas_anamneses;
CREATE TRIGGER trg_revisao_anamnese_completed
AFTER INSERT OR UPDATE ON public.revisao_vidas_anamneses
FOR EACH ROW
EXECUTE FUNCTION public.trg_update_anamnese_completed();

-- =========================
-- 6) Índices para performance
-- =========================

CREATE INDEX IF NOT EXISTS idx_revisao_reg_pre_revisao 
  ON public.revisao_vidas_registrations(pre_revisao_aplicado);

CREATE INDEX IF NOT EXISTS idx_revisao_reg_payment_status 
  ON public.revisao_vidas_registrations(payment_status);

CREATE INDEX IF NOT EXISTS idx_revisao_reg_anamnese_completed 
  ON public.revisao_vidas_registrations(anamnese_completed);

CREATE INDEX IF NOT EXISTS idx_revisao_reg_payment_validated_at
  ON public.revisao_vidas_registrations(payment_validated_at);

-- =========================
-- 7) Views para relatórios
-- =========================

CREATE OR REPLACE VIEW public.revisao_registrations_by_status AS
SELECT 
  s.id as status_id,
  s.label,
  COUNT(r.id) as count,
  COUNT(CASE WHEN NOW()::DATE > (e.start_date - INTERVAL '1 day') THEN 1 END) as overdue
FROM public.revisao_vidas_registration_statuses s
LEFT JOIN public.revisao_vidas_registrations r ON 
  public.calculate_revisao_registration_status(r.id) = s.id
LEFT JOIN public.revisao_vidas_events e ON e.id = r.event_id
GROUP BY s.id, s.label;

-- =========================
-- 8) Profile/Permissão para Secretário do Revisão
-- =========================

-- Nota: O sistema RBAC já existe em 001_base_schema.sql
-- Adicionar permissão (se não existir) será feito no app ou seeder

-- Comentário: Para dar permissão ao usuário, necessário:
-- 1. Ter role 'secretario_revisao' criada com permissão 'consolidacao:validar_pagamento'
-- 2. Usuário ser atribuído essa role

COMMENT ON TABLE public.revisao_vidas_payment_validations IS 
'Registra validações de pagamentos feitas por secretários do Revisão de Vidas';

COMMENT ON COLUMN public.revisao_vidas_registrations.pre_revisao_aplicado IS 
'Se o líder aplicou o Pré-Revisão antes de inscrever (OBRIGATÓRIO)';

COMMENT ON COLUMN public.revisao_vidas_registrations.payment_status IS 
'Status do pagamento: pending|validated|cancelled';

COMMENT ON FUNCTION public.calculate_revisao_registration_status(UUID) IS 
'Calcula dinamicamente o status baseado na situação dos campos obrigatórios e prazos';
