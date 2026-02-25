-- =====================================================
-- FUNÇÕES NOS SLOTS DE ESCALAS
-- Adiciona suporte a múltiplas funções por culto/arena/evento
-- =====================================================

-- Adiciona coluna funcoes nos slots (ex: ['Câmera', 'Transmissão', 'Áudio'])
ALTER TABLE public.escalas_slots
  ADD COLUMN IF NOT EXISTS funcoes TEXT[] NOT NULL DEFAULT '{}';

-- Índice para facilitar busca por função
CREATE INDEX IF NOT EXISTS idx_escalas_slots_funcoes
  ON public.escalas_slots USING GIN (funcoes);
