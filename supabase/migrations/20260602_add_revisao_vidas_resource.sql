-- Recurso RBAC para Revisão de Vidas (alinha menu, API e painel de acesso por módulo)
INSERT INTO public.resources (key, name, description, category, sort_order, is_active)
VALUES (
  'revisao_vidas',
  'Revisão de Vidas',
  'Eventos, inscrições e anamneses pastorais',
  'pastoral',
  45,
  true
)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  sort_order = EXCLUDED.sort_order,
  is_active = true;
