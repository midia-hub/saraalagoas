-- 20260221_add_completed_review_to_people.sql
-- Adiciona coluna para monitorar conclusão de Revisão de Vidas

ALTER TABLE public.people
ADD COLUMN IF NOT EXISTS completed_review_date TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN public.people.completed_review_date IS 'Data de conclusão da Revisão de Vidas. NULL quando ainda não concluiu.';

CREATE INDEX IF NOT EXISTS idx_people_completed_review_date ON public.people(completed_review_date);
