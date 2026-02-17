-- ============================================================
-- Livraria: Cupons + desconto em valor ou porcentagem na venda
-- ============================================================

-- 1) Tabela de cupons
CREATE TABLE IF NOT EXISTS public.bookstore_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  description text NULL,
  discount_type text NOT NULL CHECK (discount_type IN ('value', 'percent')),
  discount_value numeric(12,2) NOT NULL CHECK (discount_value >= 0),
  min_purchase numeric(12,2) NOT NULL DEFAULT 0,
  valid_from timestamptz NULL,
  valid_until timestamptz NULL,
  usage_limit int NULL,
  used_count int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookstore_coupons_code ON public.bookstore_coupons(UPPER(TRIM(code)));
CREATE INDEX IF NOT EXISTS idx_bookstore_coupons_active ON public.bookstore_coupons(active);

COMMENT ON TABLE public.bookstore_coupons IS 'Cupons de desconto da livraria (valor ou porcentagem)';

DROP TRIGGER IF EXISTS bookstore_coupons_updated_at ON public.bookstore_coupons;
CREATE TRIGGER bookstore_coupons_updated_at
  BEFORE UPDATE ON public.bookstore_coupons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Campos em bookstore_sales para tipo de desconto e cupom
ALTER TABLE public.bookstore_sales
  ADD COLUMN IF NOT EXISTS discount_type text NULL,
  ADD COLUMN IF NOT EXISTS coupon_id uuid NULL REFERENCES public.bookstore_coupons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS coupon_code text NULL;

-- discount_type na venda: 'value' = valor fixo (discount_amount já é o valor), 'percent' = percentual (guardar % em discount_value se quiser; senão só discount_amount)
ALTER TABLE public.bookstore_sales DROP CONSTRAINT IF EXISTS bookstore_sales_discount_type_check;
ALTER TABLE public.bookstore_sales ADD CONSTRAINT bookstore_sales_discount_type_check
  CHECK (discount_type IS NULL OR discount_type IN ('value', 'percent'));

-- 3) Recursos RBAC
INSERT INTO public.resources (key, name, description, category, sort_order) VALUES
  ('livraria_cupons', 'Cupons', 'Cupons de desconto da livraria', 'admin', 53)
ON CONFLICT (key) DO UPDATE SET
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  sort_order = excluded.sort_order;

DO $$
DECLARE
  role_admin_id uuid;
  perm_manage_id uuid;
  res_id uuid;
BEGIN
  SELECT id INTO role_admin_id FROM public.roles WHERE key = 'admin' LIMIT 1;
  SELECT id INTO perm_manage_id FROM public.permissions WHERE action = 'manage' LIMIT 1;
  IF role_admin_id IS NOT NULL AND perm_manage_id IS NOT NULL THEN
    FOR res_id IN SELECT id FROM public.resources WHERE key = 'livraria_cupons'
    LOOP
      INSERT INTO public.role_permissions (role_id, resource_id, permission_id)
      VALUES (role_admin_id, res_id, perm_manage_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
END $$;

-- 4) RLS
ALTER TABLE public.bookstore_coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bookstore_coupons_select" ON public.bookstore_coupons;
CREATE POLICY "bookstore_coupons_select" ON public.bookstore_coupons
  FOR SELECT TO authenticated
  USING (
    public.current_user_can('livraria_cupons', 'view') OR public.current_user_can('livraria_cupons', 'manage')
    OR public.current_user_can('livraria_pdv', 'create')
    OR EXISTS (SELECT 1 FROM public.profiles p JOIN public.roles r ON r.id = p.role_id WHERE p.id = auth.uid() AND r.is_admin = true)
  );

DROP POLICY IF EXISTS "bookstore_coupons_all" ON public.bookstore_coupons;
CREATE POLICY "bookstore_coupons_all" ON public.bookstore_coupons
  FOR ALL TO authenticated
  USING (
    public.current_user_can('livraria_cupons', 'manage') OR public.current_user_can('livraria_cupons', 'create')
    OR public.current_user_can('livraria_cupons', 'edit')
    OR EXISTS (SELECT 1 FROM public.profiles p JOIN public.roles r ON r.id = p.role_id WHERE p.id = auth.uid() AND r.is_admin = true)
  )
  WITH CHECK (
    public.current_user_can('livraria_cupons', 'manage') OR public.current_user_can('livraria_cupons', 'create')
    OR public.current_user_can('livraria_cupons', 'edit')
    OR EXISTS (SELECT 1 FROM public.profiles p JOIN public.roles r ON r.id = p.role_id WHERE p.id = auth.uid() AND r.is_admin = true)
  );
