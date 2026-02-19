-- Descrição da página Galeria: deixa claro que "Excluir" permite excluir fotos dos álbuns
UPDATE public.access_pages
SET description = 'Listagem de galerias e exclusão de fotos dos álbuns'
WHERE key = 'galeria';
