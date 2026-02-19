-- Script SQL para adicionar permissões do módulo de Consolidação
-- Execute este script no Supabase SQL Editor

-- 1. Criar a tabela de conversões (se ainda não existir)
CREATE TABLE IF NOT EXISTS conversoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  telefone VARCHAR(20) NOT NULL,
  data_nascimento DATE,
  endereco TEXT,
  cidade VARCHAR(100),
  estado VARCHAR(2),
  cep VARCHAR(10),
  data_conversao DATE NOT NULL,
  culto VARCHAR(50),
  quem_indicou VARCHAR(255),
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- 2. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_conversoes_nome ON conversoes(nome);
CREATE INDEX IF NOT EXISTS idx_conversoes_data_conversao ON conversoes(data_conversao);
CREATE INDEX IF NOT EXISTS idx_conversoes_cidade ON conversoes(cidade);
CREATE INDEX IF NOT EXISTS idx_conversoes_created_at ON conversoes(created_at);

-- 3. Adicionar trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql'
SET search_path = public;

CREATE TRIGGER update_conversoes_updated_at 
  BEFORE UPDATE ON conversoes 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- 4. Adicionar permissão de consolidação na tabela de permissões
-- (Ajuste conforme a estrutura do seu banco de dados)

-- Exemplo: Se você tem uma tabela 'permissions' ou similar
-- INSERT INTO permissions (name, description) 
-- VALUES ('consolidacao', 'Acesso ao módulo de Consolidação')
-- ON CONFLICT (name) DO NOTHING;

-- 5. Adicionar a permissão ao perfil de Admin (exemplo)
-- UPDATE profiles 
-- SET permissions = jsonb_set(
--   COALESCE(permissions, '{}'::jsonb),
--   '{consolidacao}',
--   '{"view": true, "create": true, "edit": true, "delete": true}'::jsonb
-- )
-- WHERE role = 'admin';

-- 6. Row Level Security (RLS) - Opcional mas recomendado
ALTER TABLE conversoes ENABLE ROW LEVEL SECURITY;

-- Política: Admins podem ver tudo
CREATE POLICY "Admins podem ver todas as conversões"
  ON conversoes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Política: Usuários com permissão podem ver
CREATE POLICY "Usuários com permissão podem ver conversões"
  ON conversoes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND (profiles.permissions->>'consolidacao')::jsonb->>'view' = 'true'
    )
  );

-- Política: Usuários com permissão podem criar
CREATE POLICY "Usuários com permissão podem criar conversões"
  ON conversoes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND (
        profiles.role = 'admin' 
        OR (profiles.permissions->>'consolidacao')::jsonb->>'create' = 'true'
      )
    )
  );

-- Política: Usuários com permissão podem editar
CREATE POLICY "Usuários com permissão podem editar conversões"
  ON conversoes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND (
        profiles.role = 'admin' 
        OR (profiles.permissions->>'consolidacao')::jsonb->>'edit' = 'true'
      )
    )
  );

-- Política: Usuários com permissão podem deletar
CREATE POLICY "Usuários com permissão podem deletar conversões"
  ON conversoes
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND (
        profiles.role = 'admin' 
        OR (profiles.permissions->>'consolidacao')::jsonb->>'delete' = 'true'
      )
    )
  );

-- 7. Inserir dados de exemplo (opcional - para testes)
INSERT INTO conversoes (
  nome, 
  email, 
  telefone, 
  data_nascimento,
  cidade,
  estado,
  data_conversao,
  culto,
  quem_indicou,
  observacoes
) VALUES 
  (
    'João Silva',
    'joao@email.com',
    '(82) 99999-9999',
    '1990-05-15',
    'Maceió',
    'AL',
    CURRENT_DATE,
    'Domingo - Manhã',
    'Maria Santos',
    'Primeira conversão de exemplo'
  ),
  (
    'Ana Paula Costa',
    'ana@email.com',
    '(82) 98888-8888',
    '1985-08-20',
    'Maceió',
    'AL',
    CURRENT_DATE - INTERVAL '2 days',
    'Domingo - Noite',
    'Pedro Oliveira',
    'Segunda conversão de exemplo'
  ),
  (
    'Carlos Eduardo',
    'carlos@email.com',
    '(82) 97777-7777',
    '1995-03-10',
    'Arapiraca',
    'AL',
    CURRENT_DATE - INTERVAL '5 days',
    'Quarta-feira',
    'José Lima',
    'Terceira conversão de exemplo'
  );

-- Verificar se os dados foram inseridos
SELECT * FROM conversoes ORDER BY created_at DESC;
