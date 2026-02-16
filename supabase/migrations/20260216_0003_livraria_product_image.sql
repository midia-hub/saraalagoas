-- Foto do produto (Livraria): path no bucket de imagens
ALTER TABLE public.bookstore_products
  ADD COLUMN IF NOT EXISTS image_path text;

COMMENT ON COLUMN public.bookstore_products.image_path IS 'Caminho no storage (bucket imagens), ex: livraria/produtos/{id}/foto.jpg';
