-- Remove CHECK constraint no page_key de access_profile_permissions.
-- A constraint foi adicionada via Supabase Dashboard e impede inserir
-- page_keys de módulos novos (ex.: revisao_vidas, sara_kids, escalas...).
-- Como o sistema adiciona módulos dinamicamente, page_key não deve ter
-- uma lista fixa de valores permitidos.

DO $$
DECLARE
  v_constraint text;
BEGIN
  SELECT conname INTO v_constraint
  FROM pg_constraint
  WHERE conrelid = 'public.access_profile_permissions'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%page_key%'
  LIMIT 1;

  IF v_constraint IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.access_profile_permissions DROP CONSTRAINT %I', v_constraint);
    RAISE NOTICE 'Dropped constraint: %', v_constraint;
  ELSE
    RAISE NOTICE 'No page_key CHECK constraint found — nothing to drop.';
  END IF;
END $$;
