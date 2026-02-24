-- =====================================================
-- Módulo: Reservas de Salas
-- =====================================================

CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  capacity INTEGER,
  available_days INTEGER[] NOT NULL DEFAULT '{}',
  available_start_time TIME NOT NULL DEFAULT '08:00',
  available_end_time TIME NOT NULL DEFAULT '22:00',
  approval_person_id UUID REFERENCES public.people(id) ON DELETE SET NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rooms_active ON public.rooms(active);
CREATE INDEX IF NOT EXISTS idx_rooms_approval_person_id ON public.rooms(approval_person_id);

CREATE TABLE IF NOT EXISTS public.room_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  requester_person_id UUID NULL REFERENCES public.people(id) ON DELETE SET NULL,
  requester_name TEXT NOT NULL,
  requester_phone TEXT,
  team_id UUID NULL REFERENCES public.teams(id) ON DELETE SET NULL,
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ NOT NULL,
  people_count INTEGER,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  approved_by UUID NULL REFERENCES public.people(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  cancelled_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT room_reservations_end_after_start CHECK (end_datetime > start_datetime)
);

CREATE INDEX IF NOT EXISTS idx_room_reservations_room_id ON public.room_reservations(room_id);
CREATE INDEX IF NOT EXISTS idx_room_reservations_status ON public.room_reservations(status);
CREATE INDEX IF NOT EXISTS idx_room_reservations_start_end ON public.room_reservations(start_datetime, end_datetime);
CREATE INDEX IF NOT EXISTS idx_room_reservations_requester_person_id ON public.room_reservations(requester_person_id);
CREATE INDEX IF NOT EXISTS idx_room_reservations_team_id ON public.room_reservations(team_id);

CREATE TABLE IF NOT EXISTS public.room_message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  message_id TEXT NOT NULL,
  variables TEXT[] NOT NULL DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_room_message_templates_active ON public.room_message_templates(active);

-- RBAC: recurso reservas
INSERT INTO public.resources (key, name, description, category, sort_order)
VALUES ('reservas', 'Reservas', 'Reservas de Salas', 'admin', 65)
ON CONFLICT (key) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category;

DO $$
DECLARE
  admin_role_id UUID;
  reservas_resource_id UUID;
BEGIN
  SELECT id INTO admin_role_id FROM public.roles WHERE key = 'admin' LIMIT 1;
  SELECT id INTO reservas_resource_id FROM public.resources WHERE key = 'reservas' LIMIT 1;

  IF admin_role_id IS NOT NULL AND reservas_resource_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, resource_id, permission_id)
    SELECT admin_role_id, reservas_resource_id, p.id
    FROM public.permissions p
    WHERE p.action IN ('view', 'create', 'edit', 'delete', 'manage')
    ON CONFLICT (role_id, resource_id, permission_id) DO NOTHING;
  END IF;
END $$;

INSERT INTO public.app_permissions (code, name, description, resource_id, permission_id, sort_order)
SELECT
  codes.code,
  codes.name,
  codes.description,
  r.id,
  p.id,
  codes.sort_order
FROM (
  VALUES
    ('view_reservas', 'Visualizar Reservas', 'Permite visualizar reservas', 'view', 510),
    ('create_reservas', 'Criar Reservas', 'Permite criar reservas', 'create', 511),
    ('edit_reservas', 'Editar Reservas', 'Permite editar/aprovar/rejeitar reservas', 'edit', 512),
    ('delete_reservas', 'Excluir Reservas', 'Permite excluir reservas', 'delete', 513),
    ('manage_reservas', 'Gerenciar Reservas', 'Permite gerenciamento completo das reservas', 'manage', 514)
) AS codes(code, name, description, action, sort_order)
JOIN public.resources r ON r.key = 'reservas'
JOIN public.permissions p ON p.action = codes.action
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  resource_id = EXCLUDED.resource_id,
  permission_id = EXCLUDED.permission_id,
  is_active = true;

