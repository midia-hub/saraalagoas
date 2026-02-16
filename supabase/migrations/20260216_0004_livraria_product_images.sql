-- Múltiplas fotos por produto: tabela de imagens e migração da coluna única

CREATE TABLE IF NOT EXISTS public.bookstore_product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.bookstore_products(id) ON DELETE CASCADE,
  image_path text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookstore_product_images_product ON public.bookstore_product_images(product_id);

-- Migrar foto única existente (se a coluna ainda existir)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookstore_products' AND column_name = 'image_path'
  ) THEN
    INSERT INTO public.bookstore_product_images (product_id, image_path, sort_order)
    SELECT id, image_path, 0 FROM public.bookstore_products WHERE image_path IS NOT NULL AND image_path != '';
    ALTER TABLE public.bookstore_products DROP COLUMN image_path;
  END IF;
END $$;

ALTER TABLE public.bookstore_product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bookstore_product_images_select"
  ON public.bookstore_product_images FOR SELECT TO authenticated USING (true);
CREATE POLICY "bookstore_product_images_all"
  ON public.bookstore_product_images FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "bookstore_product_images_service_role"
  ON public.bookstore_product_images FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON TABLE public.bookstore_product_images IS 'Fotos do produto (múltiplas por produto)';
