-- Gênero na conversão (para mensagem personalizada)
ALTER TABLE public.conversoes
  ADD COLUMN IF NOT EXISTS gender char(1) NULL CHECK (gender IN ('M', 'F'));

COMMENT ON COLUMN public.conversoes.gender IS 'M = masculino, F = feminino';
