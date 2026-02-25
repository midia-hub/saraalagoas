-- 20260224_add_people_ministries.sql
-- Ministérios vinculados ao cadastro de pessoas

CREATE TABLE IF NOT EXISTS public.ministries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ministries_name_unique ON public.ministries(name);

CREATE TABLE IF NOT EXISTS public.people_ministries (
  person_id UUID NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  ministry_id UUID NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (person_id, ministry_id)
);

CREATE INDEX IF NOT EXISTS people_ministries_person_id_idx ON public.people_ministries(person_id);
CREATE INDEX IF NOT EXISTS people_ministries_ministry_id_idx ON public.people_ministries(ministry_id);
