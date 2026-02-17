-- ============================================================
-- PDV Livraria: reservas, ajustes em vendas, recursos RBAC
-- ============================================================

-- 1) bookstore_products: imagem (URL ou path) para exibição rápida no PDV
ALTER TABLE public.bookstore_products
  ADD COLUMN IF NOT EXISTS image_url text NULL,
  ADD COLUMN IF NOT EXISTS image_path text NULL;

COMMENT ON COLUMN public.bookstore_products.image_url IS 'URL pública da imagem principal (Storage ou CDN)';
COMMENT ON COLUMN public.bookstore_products.image_path IS 'Path no Storage (bucket imagens) para gerar URL';

-- 2) bookstore_sales: campos adicionais para PDV e recibo
ALTER TABLE public.bookstore_sales
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'PAID' CHECK (status IN ('PAID', 'CANCELLED')),
  ADD COLUMN IF NOT EXISTS receipt_json jsonb NULL,
  ADD COLUMN IF NOT EXISTS customer_phone text NULL,
  ADD COLUMN IF NOT EXISTS discount_amount numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes text NULL;

-- Se a coluna status já existir com outro default, ajustar
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookstore_sales' AND column_name = 'status') THEN
    ALTER TABLE public.bookstore_sales ALTER COLUMN status SET DEFAULT 'PAID';
  END IF;
END $$;

-- 3) Reservas (não reduzem estoque)
CREATE TABLE IF NOT EXISTS public.bookstore_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CANCELLED', 'CONVERTED')),
  customer_name text NULL,
  customer_phone text NULL,
  notes text NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookstore_reservations_status ON public.bookstore_reservations(status);
CREATE INDEX IF NOT EXISTS idx_bookstore_reservations_created_at ON public.bookstore_reservations(created_at);

CREATE TABLE IF NOT EXISTS public.bookstore_reservation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES public.bookstore_reservations(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.bookstore_products(id) ON DELETE RESTRICT,
  quantity int NOT NULL CHECK (quantity > 0),
  unit_price numeric(12,2) NOT NULL,
  total_price numeric(12,2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bookstore_reservation_items_reservation ON public.bookstore_reservation_items(reservation_id);

-- 4) Recursos RBAC: PDV, Vendas, Reservas
INSERT INTO public.resources (key, name, description, category, sort_order) VALUES
  ('livraria_pdv', 'PDV (Ponto de Venda)', 'Tela de vendas da livraria', 'admin', 48),
  ('livraria_vendas', 'Histórico de Vendas', 'Listagem e recibos de vendas', 'admin', 49),
  ('livraria_reservas', 'Reservas', 'Reservas para compra futura', 'admin', 50)
ON CONFLICT (key) DO UPDATE SET
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  sort_order = excluded.sort_order;

-- 5) Permissões para admin (manage em livraria_pdv, livraria_vendas, livraria_reservas)
DO $$
DECLARE
  role_admin_id uuid;
  perm_manage_id uuid;
  res_id uuid;
BEGIN
  SELECT id INTO role_admin_id FROM public.roles WHERE key = 'admin' LIMIT 1;
  SELECT id INTO perm_manage_id FROM public.permissions WHERE action = 'manage' LIMIT 1;
  IF role_admin_id IS NULL OR perm_manage_id IS NULL THEN
    RETURN;
  END IF;
  FOR res_id IN SELECT id FROM public.resources WHERE key IN ('livraria_pdv', 'livraria_vendas', 'livraria_reservas')
  LOOP
    INSERT INTO public.role_permissions (role_id, resource_id, permission_id)
    VALUES (role_admin_id, res_id, perm_manage_id)
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- 6) RLS nas tabelas de reserva
ALTER TABLE public.bookstore_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookstore_reservation_items ENABLE ROW LEVEL SECURITY;

-- Políticas: view/create/manage via consolidacao ou livraria (usar livraria_vendas e livraria_reservas)
-- Helper: usuário admin (role is_admin) ou com permissão no recurso
DROP POLICY IF EXISTS "bookstore_reservations_select" ON public.bookstore_reservations;
CREATE POLICY "bookstore_reservations_select" ON public.bookstore_reservations
  FOR SELECT TO authenticated
  USING (
    public.current_user_can('livraria_reservas', 'view') OR public.current_user_can('livraria_reservas', 'manage')
    OR EXISTS (SELECT 1 FROM public.profiles p JOIN public.roles r ON r.id = p.role_id WHERE p.id = auth.uid() AND r.is_admin = true)
  );

DROP POLICY IF EXISTS "bookstore_reservations_all" ON public.bookstore_reservations;
CREATE POLICY "bookstore_reservations_all" ON public.bookstore_reservations
  FOR ALL TO authenticated
  USING (
    public.current_user_can('livraria_reservas', 'manage') OR public.current_user_can('livraria_reservas', 'create')
    OR EXISTS (SELECT 1 FROM public.profiles p JOIN public.roles r ON r.id = p.role_id WHERE p.id = auth.uid() AND r.is_admin = true)
  )
  WITH CHECK (
    public.current_user_can('livraria_reservas', 'manage') OR public.current_user_can('livraria_reservas', 'create')
    OR EXISTS (SELECT 1 FROM public.profiles p JOIN public.roles r ON r.id = p.role_id WHERE p.id = auth.uid() AND r.is_admin = true)
  );

DROP POLICY IF EXISTS "bookstore_reservation_items_select" ON public.bookstore_reservation_items;
CREATE POLICY "bookstore_reservation_items_select" ON public.bookstore_reservation_items
  FOR SELECT TO authenticated
  USING (
    public.current_user_can('livraria_reservas', 'view') OR public.current_user_can('livraria_reservas', 'manage')
    OR EXISTS (SELECT 1 FROM public.profiles p JOIN public.roles r ON r.id = p.role_id WHERE p.id = auth.uid() AND r.is_admin = true)
  );

DROP POLICY IF EXISTS "bookstore_reservation_items_all" ON public.bookstore_reservation_items;
CREATE POLICY "bookstore_reservation_items_all" ON public.bookstore_reservation_items
  FOR ALL TO authenticated
  USING (
    public.current_user_can('livraria_reservas', 'manage') OR public.current_user_can('livraria_reservas', 'create')
    OR EXISTS (SELECT 1 FROM public.profiles p JOIN public.roles r ON r.id = p.role_id WHERE p.id = auth.uid() AND r.is_admin = true)
  )
  WITH CHECK (
    public.current_user_can('livraria_reservas', 'manage') OR public.current_user_can('livraria_reservas', 'create')
    OR EXISTS (SELECT 1 FROM public.profiles p JOIN public.roles r ON r.id = p.role_id WHERE p.id = auth.uid() AND r.is_admin = true)
  );
