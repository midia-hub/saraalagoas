-- Contato WhatsApp para divulgação/pesquisas (opcional)
ALTER TABLE public.xp26_feedback
  ADD COLUMN IF NOT EXISTS contato_whatsapp_autorizado boolean,
  ADD COLUMN IF NOT EXISTS nome_contato text,
  ADD COLUMN IF NOT EXISTS whatsapp_contato text;
