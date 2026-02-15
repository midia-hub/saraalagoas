-- Remove campo texto "núcleo" da tabela cells (núcleo passa a ser apenas líder/co-líder/LT)
ALTER TABLE public.cells DROP COLUMN IF EXISTS nucleus;
