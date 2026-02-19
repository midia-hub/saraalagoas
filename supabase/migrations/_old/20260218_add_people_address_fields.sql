-- Adiciona colunas de número e complemento do endereço na tabela people
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS address_number text;
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS address_complement text;
