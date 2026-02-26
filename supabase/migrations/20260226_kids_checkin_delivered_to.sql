-- Adiciona campos de registro de entrega no check-out de crianças
ALTER TABLE public.kids_checkin
  ADD COLUMN IF NOT EXISTS delivered_to_id   UUID REFERENCES public.people(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS delivered_to_name TEXT;

COMMENT ON COLUMN public.kids_checkin.delivered_to_id   IS 'ID da pessoa que recebeu a criança no check-out (pai/mãe/responsável)';
COMMENT ON COLUMN public.kids_checkin.delivered_to_name IS 'Nome snapshot de quem recebeu a criança no check-out';
