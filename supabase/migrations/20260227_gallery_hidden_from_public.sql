-- Adiciona coluna para ocultar álbum da listagem pública da galeria.
-- Quando true, o álbum não aparece em /galeria, mas continua acessível
-- pelo link direto /galeria/[tipo]/[slug]/[data].
ALTER TABLE galleries
  ADD COLUMN IF NOT EXISTS hidden_from_public boolean NOT NULL DEFAULT false;
