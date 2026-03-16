-- ============================================================
-- Álbuns criados ficam visíveis por padrão
-- Reverte o DEFAULT de hidden_from_public para FALSE
-- ============================================================

ALTER TABLE galleries
  ALTER COLUMN hidden_from_public SET DEFAULT false;
