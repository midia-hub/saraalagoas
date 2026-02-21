-- 20260221_add_payment_details_to_registrations.sql
-- Adiciona colunas payment_method e amount à tabela revisao_vidas_registrations

ALTER TABLE public.revisao_vidas_registrations
ADD COLUMN IF NOT EXISTS payment_method TEXT 
  CHECK (payment_method IN ('dinheiro', 'pix', 'transferencia', 'debito', 'credito', 'cheque'));

ALTER TABLE public.revisao_vidas_registrations
ADD COLUMN IF NOT EXISTS amount DECIMAL(10,2);

CREATE INDEX IF NOT EXISTS idx_revisao_reg_payment_method 
  ON public.revisao_vidas_registrations(payment_method);
