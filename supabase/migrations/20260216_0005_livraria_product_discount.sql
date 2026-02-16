-- Desconto no produto: por valor fixo ou por porcentagem
ALTER TABLE public.bookstore_products
  ADD COLUMN IF NOT EXISTS discount_type text CHECK (discount_type IS NULL OR discount_type IN ('value', 'percent')),
  ADD COLUMN IF NOT EXISTS discount_value numeric(12,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.bookstore_products.discount_type IS 'Tipo de desconto: value = valor fixo, percent = porcentagem';
COMMENT ON COLUMN public.bookstore_products.discount_value IS 'Valor do desconto (em reais se value, ou % se percent)';
