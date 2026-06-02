-- Corrige permissões de acesso por módulo (page_keys erradas em perfis Acesso:*)

-- Revisão de Vidas: consolidacao → revisao_vidas
UPDATE public.access_profile_permissions app
SET page_key = 'revisao_vidas'
FROM public.access_profiles ap
WHERE app.profile_id = ap.id
  AND ap.name = 'Acesso:revisao-vidas'
  AND app.page_key = 'consolidacao';

-- Sara Kids: pessoas → sara_kids
UPDATE public.access_profile_permissions app
SET page_key = 'sara_kids'
FROM public.access_profiles ap
WHERE app.profile_id = ap.id
  AND ap.name = 'Acesso:sara-kids'
  AND app.page_key = 'pessoas';

-- Liderança: pessoas → lideranca (cultos é inserido abaixo)
UPDATE public.access_profile_permissions app
SET page_key = 'lideranca'
FROM public.access_profiles ap
WHERE app.profile_id = ap.id
  AND ap.name = 'Acesso:lideranca'
  AND app.page_key = 'pessoas';

-- Liderança: garante permissão cultos (APIs do módulo)
INSERT INTO public.access_profile_permissions (profile_id, page_key, can_view, can_create, can_edit, can_delete)
SELECT ap.id, 'cultos', true, false, true, false
FROM public.access_profiles ap
WHERE ap.name = 'Acesso:lideranca'
  AND NOT EXISTS (
    SELECT 1 FROM public.access_profile_permissions p
    WHERE p.profile_id = ap.id AND p.page_key = 'cultos'
  );

-- Livraria: expande permissões além de livraria_pdv
INSERT INTO public.access_profile_permissions (profile_id, page_key, can_view, can_create, can_edit, can_delete)
SELECT ap.id, keys.page_key, true, false, true, false
FROM public.access_profiles ap
CROSS JOIN (
  VALUES
    ('livraria_produtos'),
    ('livraria_dashboard'),
    ('livraria_vendas'),
    ('livraria_estoque'),
    ('livraria_movimentacoes'),
    ('livraria_importacao'),
    ('livraria_clientes'),
    ('livraria_fiado'),
    ('livraria_reservas'),
    ('livraria_cupons')
) AS keys(page_key)
WHERE ap.name = 'Acesso:livraria'
  AND EXISTS (
    SELECT 1 FROM public.access_profile_permissions p
    WHERE p.profile_id = ap.id AND p.page_key = 'livraria_pdv' AND p.can_view = true
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.access_profile_permissions p
    WHERE p.profile_id = ap.id AND p.page_key = keys.page_key
  );

-- Mídia e Social (galeria): garante instagram
INSERT INTO public.access_profile_permissions (profile_id, page_key, can_view, can_create, can_edit, can_delete)
SELECT ap.id, 'instagram', true, false, true, false
FROM public.access_profiles ap
WHERE ap.name = 'Acesso:galeria'
  AND EXISTS (
    SELECT 1 FROM public.access_profile_permissions p
    WHERE p.profile_id = ap.id AND p.page_key = 'galeria' AND p.can_view = true
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.access_profile_permissions p
    WHERE p.profile_id = ap.id AND p.page_key = 'instagram'
  );
