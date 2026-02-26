-- 20260225_add_kids_sara_fields.sql
-- Campos do Cadastro Sara Kids para cadastro infantil nas pessoas

ALTER TABLE public.people
  ADD COLUMN IF NOT EXISTS is_child               BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS kids_father_name        TEXT,
  ADD COLUMN IF NOT EXISTS kids_mother_name        TEXT,
  ADD COLUMN IF NOT EXISTS kids_contact_1          TEXT,
  ADD COLUMN IF NOT EXISTS kids_contact_2          TEXT,
  ADD COLUMN IF NOT EXISTS kids_disability         TEXT,
  ADD COLUMN IF NOT EXISTS kids_favorite_toy       TEXT,
  ADD COLUMN IF NOT EXISTS kids_calming_mechanism  TEXT,
  ADD COLUMN IF NOT EXISTS kids_food_restriction   TEXT,
  ADD COLUMN IF NOT EXISTS kids_language_difficulty TEXT,
  ADD COLUMN IF NOT EXISTS kids_noise_sensitivity  TEXT,
  ADD COLUMN IF NOT EXISTS kids_material_allergy   TEXT,
  ADD COLUMN IF NOT EXISTS kids_ministry_network   TEXT,
  ADD COLUMN IF NOT EXISTS kids_medication         TEXT,
  ADD COLUMN IF NOT EXISTS kids_health_issues      TEXT,
  ADD COLUMN IF NOT EXISTS kids_bathroom_use       TEXT;

COMMENT ON COLUMN public.people.is_child               IS 'Indica que o cadastro é de uma criança (Sara Kids)';
COMMENT ON COLUMN public.people.kids_father_name        IS 'Nome do pai';
COMMENT ON COLUMN public.people.kids_mother_name        IS 'Nome da mãe';
COMMENT ON COLUMN public.people.kids_contact_1          IS 'Contato principal dos pais/responsáveis';
COMMENT ON COLUMN public.people.kids_contact_2          IS 'Contato secundário dos pais/responsáveis';
COMMENT ON COLUMN public.people.kids_disability         IS 'Deficiência da criança (Autismo, TDAH, Down, PC, outros)';
COMMENT ON COLUMN public.people.kids_favorite_toy       IS 'Brincadeira ou brinquedo favorito';
COMMENT ON COLUMN public.people.kids_calming_mechanism  IS 'Mecanismo para acalmar em situações desafiadoras';
COMMENT ON COLUMN public.people.kids_food_restriction   IS 'Restrição ou alergia alimentar';
COMMENT ON COLUMN public.people.kids_language_difficulty IS 'Dificuldade de linguagem e tipo de comunicação usada';
COMMENT ON COLUMN public.people.kids_noise_sensitivity  IS 'Se incomoda com barulhos altos';
COMMENT ON COLUMN public.people.kids_material_allergy   IS 'Alergia a materiais (tinta, massinha etc.)';
COMMENT ON COLUMN public.people.kids_ministry_network   IS 'Rede Ministerial à qual está vinculado';
COMMENT ON COLUMN public.people.kids_medication         IS 'Medicamentos em uso';
COMMENT ON COLUMN public.people.kids_health_issues      IS 'Questões de saúde (ex: problemas respiratórios)';
COMMENT ON COLUMN public.people.kids_bathroom_use       IS 'Uso do banheiro: Sim / Parcialmente c/ ajuda / Independente / Não';
