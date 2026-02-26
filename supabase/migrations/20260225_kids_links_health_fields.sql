-- Adiciona campos de saúde/comportamento diretamente na tabela de vínculos (people_kids_links)
-- Os dados das crianças (Sara Kids) passam a ser registrados no momento do vínculo com o adulto.

ALTER TABLE public.people_kids_links
  ADD COLUMN IF NOT EXISTS kids_contact_1           TEXT,
  ADD COLUMN IF NOT EXISTS kids_contact_2           TEXT,
  ADD COLUMN IF NOT EXISTS kids_disability          TEXT,
  ADD COLUMN IF NOT EXISTS kids_favorite_toy        TEXT,
  ADD COLUMN IF NOT EXISTS kids_calming_mechanism   TEXT,
  ADD COLUMN IF NOT EXISTS kids_food_restriction    TEXT,
  ADD COLUMN IF NOT EXISTS kids_language_difficulty TEXT,
  ADD COLUMN IF NOT EXISTS kids_noise_sensitivity   TEXT,
  ADD COLUMN IF NOT EXISTS kids_material_allergy    TEXT,
  ADD COLUMN IF NOT EXISTS kids_ministry_network    TEXT,
  ADD COLUMN IF NOT EXISTS kids_medication          TEXT,
  ADD COLUMN IF NOT EXISTS kids_health_issues       TEXT,
  ADD COLUMN IF NOT EXISTS kids_bathroom_use        TEXT;

COMMENT ON COLUMN public.people_kids_links.kids_contact_1           IS 'Contato 1 dos responsáveis pela criança';
COMMENT ON COLUMN public.people_kids_links.kids_contact_2           IS 'Contato 2 dos responsáveis pela criança';
COMMENT ON COLUMN public.people_kids_links.kids_disability          IS 'Deficiências/diagnósticos da criança';
COMMENT ON COLUMN public.people_kids_links.kids_favorite_toy        IS 'Brinquedo ou brincadeira favorita';
COMMENT ON COLUMN public.people_kids_links.kids_calming_mechanism   IS 'Como acalmá-la em situações desafiadoras';
COMMENT ON COLUMN public.people_kids_links.kids_food_restriction    IS 'Restrições ou alergias alimentares';
COMMENT ON COLUMN public.people_kids_links.kids_language_difficulty IS 'Dificuldades de linguagem';
COMMENT ON COLUMN public.people_kids_links.kids_noise_sensitivity   IS 'Sensibilidade a barulhos';
COMMENT ON COLUMN public.people_kids_links.kids_material_allergy    IS 'Alergias a materiais';
COMMENT ON COLUMN public.people_kids_links.kids_ministry_network    IS 'Rede ministerial vinculada';
COMMENT ON COLUMN public.people_kids_links.kids_medication          IS 'Medicamentos em uso';
COMMENT ON COLUMN public.people_kids_links.kids_health_issues       IS 'Questões de saúde';
COMMENT ON COLUMN public.people_kids_links.kids_bathroom_use        IS 'Uso do banheiro';
