-- =========================
-- Adicionar papel Secretário de Revisão de Vidas
-- =========================

-- 1) Criar novo role 'secretario_revisao'
INSERT INTO public.access_profiles (key, name, description, is_system, is_active, sort_order)
VALUES (
  'secretario_revisao',
  'Secretário de Revisão de Vidas',
  'Autorizado a validar pagamentos no processo de Revisão de Vidas',
  FALSE,
  TRUE,
  50
)
ON CONFLICT (key) DO UPDATE
SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = TRUE;

-- 2) Se a tabela app_permissions existe, criar a permissão
-- Se não existe, a app criará via seed no init
INSERT INTO app_permissions (code, name, description, is_active)
VALUES (
  'validar_pagamento_revisao',
  'Validar Pagamento Revisão',
  'Autorizado a validar pagamentos no fluxo de Revisão de Vidas',
  TRUE
)
ON CONFLICT (code) DO UPDATE
SET is_active = TRUE;

-- 3) Nota sobre associação
-- A associação entre role e permissão será feita através da table:
-- access_profile_permissions (access_profile_id, permission_code)
-- Isso deve ser gerenciado via interface de admin ou manual insert:
-- INSERT INTO access_profile_permissions (access_profile_id, permission_code)
-- SELECT id, 'validar_pagamento_revisao' FROM access_profiles WHERE key = 'secretario_revisao'
-- ON CONFLICT DO NOTHING;

-- 4) Para fins de documentação: usuários com este role terão a permissão
-- e poderão usar o endpoint PATCH para validar pagamentos em inscrições
COMMENT ON TABLE app_permissions IS 
'Permissões do aplicativo, como validar_pagamento_revisao';
