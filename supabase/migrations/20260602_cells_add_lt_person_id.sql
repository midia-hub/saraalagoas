-- Adiciona o campo lt_person_id (Líder em Treinamento) na tabela cells
ALTER TABLE cells
  ADD COLUMN IF NOT EXISTS lt_person_id UUID REFERENCES people(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cells_lt_person_id ON cells(lt_person_id);
