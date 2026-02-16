-- SKU automático para produtos da livraria (formato PROD-000001, PROD-000002, ...)
CREATE SEQUENCE IF NOT EXISTS public.bookstore_sku_seq START 1;

CREATE OR REPLACE FUNCTION public.get_next_product_sku()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 'PROD-' || lpad(nextval('public.bookstore_sku_seq')::text, 6, '0');
$$;

COMMENT ON FUNCTION public.get_next_product_sku() IS 'Retorna o próximo SKU disponível para bookstore_products (Livraria).';
