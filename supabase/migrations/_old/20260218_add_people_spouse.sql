-- Vínculo de cônjuge em people (casado(a) → selecionar marido ou mulher)
ALTER TABLE public.people
ADD COLUMN IF NOT EXISTS spouse_person_id uuid
REFERENCES public.people(id)
ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_people_spouse_person_id
ON public.people(spouse_person_id);

COMMENT ON COLUMN public.people.spouse_person_id IS 'Cônjuge (pessoa casada): homem → mulher, mulher → homem; vínculo bidirecional';

-- Opcional: garantir que só casado(a) pode ter cônjuge (podemos validar na app também)
-- ALTER TABLE public.people ADD CONSTRAINT chk_spouse_only_if_casado
--   CHECK ((spouse_person_id IS NULL) OR (marital_status = 'Casado(a)'));
