-- ============================================================
-- Livraria: Clientes + Compra Fiado (Conta Corrente) + Pagamentos
-- ============================================================

-- 1) Tabela de clientes
CREATE TABLE IF NOT EXISTS public.bookstore_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NULL,
  email text NULL,
  document text NULL,
  notes text NULL,
  can_buy_on_credit boolean NOT NULL DEFAULT false,
  credit_limit numeric(12,2) NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookstore_customers_name ON public.bookstore_customers(name);
CREATE INDEX IF NOT EXISTS idx_bookstore_customers_phone ON public.bookstore_customers(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookstore_customers_active ON public.bookstore_customers(active);

COMMENT ON TABLE public.bookstore_customers IS 'Cadastro de clientes da livraria (fiado/conta corrente)';

-- 2) Ajustes em bookstore_sales: cliente + tipo de venda + valores pago/pendente
ALTER TABLE public.bookstore_sales
  ADD COLUMN IF NOT EXISTS customer_id uuid NULL REFERENCES public.bookstore_customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sale_type text NULL,
  ADD COLUMN IF NOT EXISTS paid_amount numeric(12,2) NULL,
  ADD COLUMN IF NOT EXISTS pending_amount numeric(12,2) NULL,
  ADD COLUMN IF NOT EXISTS due_date timestamptz NULL;

-- Garantir default e constraint para sale_type (PAID = à vista, CREDIT = fiado)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns c WHERE c.table_schema = 'public' AND c.table_name = 'bookstore_sales' AND c.column_name = 'sale_type') THEN
    ALTER TABLE public.bookstore_sales ADD COLUMN sale_type text NOT NULL DEFAULT 'PAID';
  END IF;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

ALTER TABLE public.bookstore_sales DROP CONSTRAINT IF EXISTS bookstore_sales_sale_type_check;
ALTER TABLE public.bookstore_sales ADD CONSTRAINT bookstore_sales_sale_type_check
  CHECK (sale_type IN ('PAID', 'CREDIT'));

UPDATE public.bookstore_sales
SET sale_type = COALESCE(sale_type, 'PAID'),
    paid_amount = COALESCE(paid_amount, total_amount - COALESCE(discount_amount, 0)),
    pending_amount = COALESCE(pending_amount, 0)
WHERE sale_type IS NULL OR paid_amount IS NULL OR pending_amount IS NULL;

ALTER TABLE public.bookstore_sales
  ALTER COLUMN sale_type SET DEFAULT 'PAID',
  ALTER COLUMN paid_amount SET DEFAULT 0,
  ALTER COLUMN pending_amount SET DEFAULT 0;

ALTER TABLE public.bookstore_sales ALTER COLUMN paid_amount SET NOT NULL;
ALTER TABLE public.bookstore_sales ALTER COLUMN pending_amount SET NOT NULL;
-- sale_type: allow NULL for legacy rows, new rows get default

-- 3) Pagamentos do cliente (baixa da dívida)
CREATE TABLE IF NOT EXISTS public.bookstore_customer_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.bookstore_customers(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  payment_method text NULL,
  notes text NULL,
  created_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookstore_customer_payments_customer ON public.bookstore_customer_payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookstore_customer_payments_created ON public.bookstore_customer_payments(created_at);

-- 4) Alocação do pagamento em vendas (rateio)
CREATE TABLE IF NOT EXISTS public.bookstore_payment_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES public.bookstore_customer_payments(id) ON DELETE CASCADE,
  sale_id uuid NOT NULL REFERENCES public.bookstore_sales(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookstore_payment_allocations_payment ON public.bookstore_payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_bookstore_payment_allocations_sale ON public.bookstore_payment_allocations(sale_id);

-- 5) View: saldo por venda (total, pago, pendente)
CREATE OR REPLACE VIEW public.bookstore_sales_balance_view AS
SELECT
  s.id,
  s.sale_number,
  s.customer_id,
  s.sale_type,
  s.total_amount,
  COALESCE(s.discount_amount, 0) AS discount_amount,
  (s.total_amount - COALESCE(s.discount_amount, 0)) AS net_total,
  COALESCE(s.paid_amount, 0) AS paid_amount,
  COALESCE(s.pending_amount, 0) AS pending_amount,
  s.created_at,
  s.due_date
FROM public.bookstore_sales s
WHERE s.status <> 'CANCELLED';

-- 6) View: saldo consolidado por cliente
CREATE OR REPLACE VIEW public.bookstore_customer_balance_view AS
SELECT
  c.id AS customer_id,
  c.name,
  c.can_buy_on_credit,
  COALESCE(SUM(s.total_amount - COALESCE(s.discount_amount, 0)), 0) AS total_compras,
  COALESCE(SUM(s.paid_amount), 0) AS total_pago,
  COALESCE(SUM(s.pending_amount), 0) AS total_pendente,
  COUNT(s.id) FILTER (WHERE s.status <> 'CANCELLED') AS qtd_vendas,
  COUNT(s.id) FILTER (WHERE s.status <> 'CANCELLED' AND COALESCE(s.pending_amount, 0) > 0) AS qtd_vendas_pendentes
FROM public.bookstore_customers c
LEFT JOIN public.bookstore_sales s ON s.customer_id = c.id AND s.status <> 'CANCELLED'
GROUP BY c.id, c.name, c.can_buy_on_credit;

-- 7) Trigger updated_at para bookstore_customers (usa função existente do projeto)
DROP TRIGGER IF EXISTS bookstore_customers_updated_at ON public.bookstore_customers;
CREATE TRIGGER bookstore_customers_updated_at
  BEFORE UPDATE ON public.bookstore_customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger updated_at para bookstore_sales (adiciona coluna se não existir)
ALTER TABLE public.bookstore_sales ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
DROP TRIGGER IF EXISTS bookstore_sales_updated_at ON public.bookstore_sales;
CREATE TRIGGER bookstore_sales_updated_at
  BEFORE UPDATE ON public.bookstore_sales
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8) Recursos RBAC: livraria_clientes, livraria_fiado
INSERT INTO public.resources (key, name, description, category, sort_order) VALUES
  ('livraria_clientes', 'Clientes (Livraria)', 'Cadastro e gestão de clientes', 'admin', 51),
  ('livraria_fiado', 'Fiado (Conta Corrente)', 'Pendências e pagamentos fiado', 'admin', 52)
ON CONFLICT (key) DO UPDATE SET
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  sort_order = excluded.sort_order;

-- Permissões para role admin
DO $$
DECLARE
  role_admin_id uuid;
  perm_manage_id uuid;
  res_id uuid;
BEGIN
  SELECT id INTO role_admin_id FROM public.roles WHERE key = 'admin' LIMIT 1;
  SELECT id INTO perm_manage_id FROM public.permissions WHERE action = 'manage' LIMIT 1;
  IF role_admin_id IS NOT NULL AND perm_manage_id IS NOT NULL THEN
    FOR res_id IN SELECT id FROM public.resources WHERE key IN ('livraria_clientes', 'livraria_fiado')
    LOOP
      INSERT INTO public.role_permissions (role_id, resource_id, permission_id)
      VALUES (role_admin_id, res_id, perm_manage_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
END $$;

-- 9) RLS nas tabelas de clientes e pagamentos
ALTER TABLE public.bookstore_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookstore_customer_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookstore_payment_allocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bookstore_customers_select" ON public.bookstore_customers;
CREATE POLICY "bookstore_customers_select" ON public.bookstore_customers
  FOR SELECT TO authenticated
  USING (
    public.current_user_can('livraria_clientes', 'view') OR public.current_user_can('livraria_clientes', 'manage')
    OR public.current_user_can('livraria_fiado', 'view') OR public.current_user_can('livraria_fiado', 'manage')
    OR EXISTS (SELECT 1 FROM public.profiles p JOIN public.roles r ON r.id = p.role_id WHERE p.id = auth.uid() AND r.is_admin = true)
  );

DROP POLICY IF EXISTS "bookstore_customers_all" ON public.bookstore_customers;
CREATE POLICY "bookstore_customers_all" ON public.bookstore_customers
  FOR ALL TO authenticated
  USING (
    public.current_user_can('livraria_clientes', 'manage') OR public.current_user_can('livraria_clientes', 'create')
    OR public.current_user_can('livraria_clientes', 'edit')
    OR EXISTS (SELECT 1 FROM public.profiles p JOIN public.roles r ON r.id = p.role_id WHERE p.id = auth.uid() AND r.is_admin = true)
  )
  WITH CHECK (
    public.current_user_can('livraria_clientes', 'manage') OR public.current_user_can('livraria_clientes', 'create')
    OR public.current_user_can('livraria_clientes', 'edit')
    OR EXISTS (SELECT 1 FROM public.profiles p JOIN public.roles r ON r.id = p.role_id WHERE p.id = auth.uid() AND r.is_admin = true)
  );

DROP POLICY IF EXISTS "bookstore_customer_payments_select" ON public.bookstore_customer_payments;
CREATE POLICY "bookstore_customer_payments_select" ON public.bookstore_customer_payments
  FOR SELECT TO authenticated
  USING (
    public.current_user_can('livraria_clientes', 'view') OR public.current_user_can('livraria_clientes', 'manage')
    OR public.current_user_can('livraria_fiado', 'view') OR public.current_user_can('livraria_fiado', 'manage')
    OR EXISTS (SELECT 1 FROM public.profiles p JOIN public.roles r ON r.id = p.role_id WHERE p.id = auth.uid() AND r.is_admin = true)
  );

DROP POLICY IF EXISTS "bookstore_customer_payments_all" ON public.bookstore_customer_payments;
CREATE POLICY "bookstore_customer_payments_all" ON public.bookstore_customer_payments
  FOR ALL TO authenticated
  USING (
    public.current_user_can('livraria_clientes', 'manage') OR public.current_user_can('livraria_clientes', 'edit')
    OR public.current_user_can('livraria_fiado', 'manage') OR public.current_user_can('livraria_fiado', 'create')
    OR EXISTS (SELECT 1 FROM public.profiles p JOIN public.roles r ON r.id = p.role_id WHERE p.id = auth.uid() AND r.is_admin = true)
  )
  WITH CHECK (
    public.current_user_can('livraria_clientes', 'manage') OR public.current_user_can('livraria_clientes', 'edit')
    OR public.current_user_can('livraria_fiado', 'manage') OR public.current_user_can('livraria_fiado', 'create')
    OR EXISTS (SELECT 1 FROM public.profiles p JOIN public.roles r ON r.id = p.role_id WHERE p.id = auth.uid() AND r.is_admin = true)
  );

DROP POLICY IF EXISTS "bookstore_payment_allocations_select" ON public.bookstore_payment_allocations;
CREATE POLICY "bookstore_payment_allocations_select" ON public.bookstore_payment_allocations
  FOR SELECT TO authenticated
  USING (
    public.current_user_can('livraria_clientes', 'view') OR public.current_user_can('livraria_fiado', 'view')
    OR EXISTS (SELECT 1 FROM public.profiles p JOIN public.roles r ON r.id = p.role_id WHERE p.id = auth.uid() AND r.is_admin = true)
  );

DROP POLICY IF EXISTS "bookstore_payment_allocations_all" ON public.bookstore_payment_allocations;
CREATE POLICY "bookstore_payment_allocations_all" ON public.bookstore_payment_allocations
  FOR ALL TO authenticated
  USING (
    public.current_user_can('livraria_clientes', 'manage') OR public.current_user_can('livraria_fiado', 'manage')
    OR EXISTS (SELECT 1 FROM public.profiles p JOIN public.roles r ON r.id = p.role_id WHERE p.id = auth.uid() AND r.is_admin = true)
  )
  WITH CHECK (
    public.current_user_can('livraria_clientes', 'manage') OR public.current_user_can('livraria_fiado', 'manage')
    OR EXISTS (SELECT 1 FROM public.profiles p JOIN public.roles r ON r.id = p.role_id WHERE p.id = auth.uid() AND r.is_admin = true)
  );
