ALTER TABLE public.people_kids_links
  ADD COLUMN IF NOT EXISTS kids_father_name TEXT,
  ADD COLUMN IF NOT EXISTS kids_mother_name TEXT,
  ADD COLUMN IF NOT EXISTS kids_guardian_kinship TEXT;

COMMENT ON COLUMN public.people_kids_links.kids_father_name IS 'Nome do pai da criança';
COMMENT ON COLUMN public.people_kids_links.kids_mother_name IS 'Nome da mãe da criança';
COMMENT ON COLUMN public.people_kids_links.kids_guardian_kinship IS 'Parentesco quando o vínculo for responsável';