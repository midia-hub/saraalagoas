-- Adiciona colunas de vínculo ao registro de pessoa para pai e mãe da criança Sara Kids
ALTER TABLE public.people
  ADD COLUMN IF NOT EXISTS kids_father_id UUID REFERENCES public.people(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS kids_mother_id UUID REFERENCES public.people(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.people.kids_father_id IS 'FK para registro da pessoa pai';
COMMENT ON COLUMN public.people.kids_mother_id IS 'FK para registro da pessoa mãe';
