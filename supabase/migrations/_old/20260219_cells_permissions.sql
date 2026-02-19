-- Cells app permissions

-- cells_approve_edit
insert into public.app_permissions (code, name, description, resource_id, permission_id, sort_order)
select 'cells_approve_edit', 'Aprovar edicao tardia', 'Aprovar edicao de realizacao fora da janela', r.id, p.id, 210
from public.resources r, public.permissions p
where r.key = 'celulas' and p.action = 'edit'
on conflict (code) do update set name = excluded.name, description = excluded.description, sort_order = excluded.sort_order;

-- cells_approve_pd
insert into public.app_permissions (code, name, description, resource_id, permission_id, sort_order)
select 'cells_approve_pd', 'Aprovar PD', 'Aprovar parceiro de Deus de realizacoes', r.id, p.id, 211
from public.resources r, public.permissions p
where r.key = 'celulas' and p.action = 'edit'
on conflict (code) do update set name = excluded.name, description = excluded.description, sort_order = excluded.sort_order;

-- cells_manage
insert into public.app_permissions (code, name, description, resource_id, permission_id, sort_order)
select 'cells_manage', 'Gerenciar celulas', 'Acesso administrativo completo ao modulo de celulas', r.id, p.id, 212
from public.resources r, public.permissions p
where r.key = 'celulas' and p.action = 'manage'
on conflict (code) do update set name = excluded.name, description = excluded.description, sort_order = excluded.sort_order;
