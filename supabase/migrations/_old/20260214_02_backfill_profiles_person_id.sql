-- ============================================================
-- Backfill profiles.person_id (opcional - executar após 20260214_01)
-- ============================================================
-- Para cada profile que ainda não tem person_id, cria uma Pessoa
-- mínima (nome + email se existir) e seta profiles.person_id.
-- Depois pode-se tornar person_id NOT NULL (fase 2).
-- ============================================================

DO $$
DECLARE
  rec RECORD;
  new_person_id uuid;
BEGIN
  FOR rec IN
    SELECT p.id AS profile_id, p.full_name, p.email
    FROM public.profiles p
    WHERE p.person_id IS NULL
  LOOP
    INSERT INTO public.people (
      full_name,
      church_profile,
      church_situation,
      email
    ) VALUES (
      COALESCE(NULLIF(trim(rec.full_name), ''), 'Usuário'),
      'Visitante',
      'Ativo',
      NULLIF(trim(rec.email), '')
    )
    RETURNING id INTO new_person_id;

    UPDATE public.profiles
    SET person_id = new_person_id
    WHERE id = rec.profile_id;
  END LOOP;
END $$;

-- Opcional: tornar person_id NOT NULL (descomente após validar o backfill)
-- ALTER TABLE public.profiles
--   ALTER COLUMN person_id SET NOT NULL;
