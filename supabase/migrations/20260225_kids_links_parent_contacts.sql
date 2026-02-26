ALTER TABLE public.people_kids_links
  ADD COLUMN IF NOT EXISTS kids_father_contact TEXT,
  ADD COLUMN IF NOT EXISTS kids_mother_contact TEXT;

COMMENT ON COLUMN public.people_kids_links.kids_father_contact IS 'Contato do pai da criança';
COMMENT ON COLUMN public.people_kids_links.kids_mother_contact IS 'Contato da mãe da criança';