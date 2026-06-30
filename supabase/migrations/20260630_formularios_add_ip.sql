-- Add IP column to formulario_respostas for per-IP submission limiting
ALTER TABLE formulario_respostas ADD COLUMN IF NOT EXISTS ip text;

CREATE INDEX IF NOT EXISTS idx_formulario_respostas_ip
  ON formulario_respostas (formulario_id, ip)
  WHERE ip IS NOT NULL;
