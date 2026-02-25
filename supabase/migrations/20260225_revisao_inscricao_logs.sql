-- =========================
-- Revisão de Vidas - Logs de Inscrição
-- =========================
-- Data: 2026-02-25
-- Objetivo: armazenar auditoria das tentativas e resultados de inscrição pública

CREATE TABLE IF NOT EXISTS public.revisao_vidas_inscricao_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.revisao_vidas_events(id) ON DELETE SET NULL,
  registration_id UUID REFERENCES public.revisao_vidas_registrations(id) ON DELETE SET NULL,
  person_id UUID REFERENCES public.people(id) ON DELETE SET NULL,

  person_name TEXT,
  phone_masked TEXT,
  action TEXT NOT NULL CHECK (
    action IN (
      'attempt',
      'person_reused',
      'person_created',
      'registration_exists',
      'registration_created',
      'registration_error'
    )
  ),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_revisao_inscricao_logs_event_created
  ON public.revisao_vidas_inscricao_logs(event_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_revisao_inscricao_logs_action_created
  ON public.revisao_vidas_inscricao_logs(action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_revisao_inscricao_logs_person_created
  ON public.revisao_vidas_inscricao_logs(person_id, created_at DESC);
