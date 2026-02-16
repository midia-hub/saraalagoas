-- ============================================================
-- Módulo Livraria (Bookstore) - Schema + RBAC
-- ============================================================

-- ============================================================
-- 1. CATEGORIAS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bookstore_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. FORNECEDORES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bookstore_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  document text,
  phone text,
  email text,
  address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. PRODUTOS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bookstore_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text NOT NULL UNIQUE,
  barcode text,
  name text NOT NULL,
  description text,
  category_id uuid REFERENCES public.bookstore_categories(id) ON DELETE SET NULL,
  supplier_id uuid REFERENCES public.bookstore_suppliers(id) ON DELETE SET NULL,
  cost_price numeric(12,2) NOT NULL DEFAULT 0,
  sale_price numeric(12,2) NOT NULL DEFAULT 0,
  min_stock int NOT NULL DEFAULT 0,
  current_stock int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookstore_products_sku ON public.bookstore_products(sku);
CREATE INDEX IF NOT EXISTS idx_bookstore_products_barcode ON public.bookstore_products(barcode);
CREATE INDEX IF NOT EXISTS idx_bookstore_products_category ON public.bookstore_products(category_id);
CREATE INDEX IF NOT EXISTS idx_bookstore_products_active ON public.bookstore_products(active);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.bookstore_products_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS bookstore_products_updated_at ON public.bookstore_products;
CREATE TRIGGER bookstore_products_updated_at
  BEFORE UPDATE ON public.bookstore_products
  FOR EACH ROW EXECUTE FUNCTION public.bookstore_products_updated_at();

-- ============================================================
-- 4. VENDAS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bookstore_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_number text NOT NULL UNIQUE,
  customer_name text,
  payment_method text,
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bookstore_sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.bookstore_sales(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.bookstore_products(id) ON DELETE RESTRICT,
  quantity int NOT NULL CHECK (quantity > 0),
  unit_price numeric(12,2) NOT NULL,
  total_price numeric(12,2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bookstore_sale_items_sale ON public.bookstore_sale_items(sale_id);

-- ============================================================
-- 5. MOVIMENTAÇÕES DE ESTOQUE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bookstore_stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.bookstore_products(id) ON DELETE RESTRICT,
  movement_type text NOT NULL CHECK (movement_type IN (
    'ENTRY_PURCHASE',
    'ENTRY_ADJUSTMENT',
    'EXIT_SALE',
    'EXIT_LOSS',
    'EXIT_DONATION',
    'EXIT_INTERNAL_USE',
    'EXIT_ADJUSTMENT'
  )),
  quantity int NOT NULL CHECK (quantity > 0),
  reference_type text,
  reference_id uuid,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookstore_stock_movements_product ON public.bookstore_stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_bookstore_stock_movements_created_at ON public.bookstore_stock_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookstore_stock_movements_type ON public.bookstore_stock_movements(movement_type);

-- ============================================================
-- 6. SEQUÊNCIA PARA NÚMERO DE VENDA
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS public.bookstore_sale_number_seq START 1;

-- ============================================================
-- 7. RLS
-- ============================================================
ALTER TABLE public.bookstore_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookstore_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookstore_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookstore_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookstore_sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookstore_stock_movements ENABLE ROW LEVEL SECURITY;

-- Políticas: apenas usuários com permissão livraria_* (via current_user_can)
-- O projeto usa service role nas APIs admin; RLS para acesso direto ao Supabase por usuários autenticados.

CREATE POLICY "bookstore_categories_select"
  ON public.bookstore_categories FOR SELECT TO authenticated
  USING (public.user_has_permission(auth.uid(), 'livraria_produtos', 'view') OR public.user_has_permission(auth.uid(), 'livraria_produtos', 'manage'));

CREATE POLICY "bookstore_categories_all"
  ON public.bookstore_categories FOR ALL TO authenticated
  USING (public.user_has_permission(auth.uid(), 'livraria_produtos', 'manage'))
  WITH CHECK (public.user_has_permission(auth.uid(), 'livraria_produtos', 'manage'));

CREATE POLICY "bookstore_suppliers_select"
  ON public.bookstore_suppliers FOR SELECT TO authenticated
  USING (public.user_has_permission(auth.uid(), 'livraria_produtos', 'view') OR public.user_has_permission(auth.uid(), 'livraria_produtos', 'manage'));

CREATE POLICY "bookstore_suppliers_all"
  ON public.bookstore_suppliers FOR ALL TO authenticated
  USING (public.user_has_permission(auth.uid(), 'livraria_produtos', 'manage'))
  WITH CHECK (public.user_has_permission(auth.uid(), 'livraria_produtos', 'manage'));

CREATE POLICY "bookstore_products_select"
  ON public.bookstore_products FOR SELECT TO authenticated
  USING (public.user_has_permission(auth.uid(), 'livraria_produtos', 'view') OR public.user_has_permission(auth.uid(), 'livraria_produtos', 'manage'));

CREATE POLICY "bookstore_products_all"
  ON public.bookstore_products FOR ALL TO authenticated
  USING (public.user_has_permission(auth.uid(), 'livraria_produtos', 'manage'))
  WITH CHECK (public.user_has_permission(auth.uid(), 'livraria_produtos', 'manage'));

CREATE POLICY "bookstore_sales_select"
  ON public.bookstore_sales FOR SELECT TO authenticated
  USING (public.user_has_permission(auth.uid(), 'livraria_estoque', 'view') OR public.user_has_permission(auth.uid(), 'livraria_estoque', 'manage'));

CREATE POLICY "bookstore_sales_all"
  ON public.bookstore_sales FOR ALL TO authenticated
  USING (public.user_has_permission(auth.uid(), 'livraria_estoque', 'manage'))
  WITH CHECK (public.user_has_permission(auth.uid(), 'livraria_estoque', 'manage'));

CREATE POLICY "bookstore_sale_items_select"
  ON public.bookstore_sale_items FOR SELECT TO authenticated
  USING (public.user_has_permission(auth.uid(), 'livraria_estoque', 'view') OR public.user_has_permission(auth.uid(), 'livraria_estoque', 'manage'));

CREATE POLICY "bookstore_sale_items_all"
  ON public.bookstore_sale_items FOR ALL TO authenticated
  USING (public.user_has_permission(auth.uid(), 'livraria_estoque', 'manage'))
  WITH CHECK (public.user_has_permission(auth.uid(), 'livraria_estoque', 'manage'));

CREATE POLICY "bookstore_stock_movements_select"
  ON public.bookstore_stock_movements FOR SELECT TO authenticated
  USING (public.user_has_permission(auth.uid(), 'livraria_movimentacoes', 'view') OR public.user_has_permission(auth.uid(), 'livraria_movimentacoes', 'manage'));

CREATE POLICY "bookstore_stock_movements_all"
  ON public.bookstore_stock_movements FOR ALL TO authenticated
  USING (public.user_has_permission(auth.uid(), 'livraria_estoque', 'manage') OR public.user_has_permission(auth.uid(), 'livraria_movimentacoes', 'manage'))
  WITH CHECK (public.user_has_permission(auth.uid(), 'livraria_estoque', 'manage') OR public.user_has_permission(auth.uid(), 'livraria_movimentacoes', 'manage'));

-- Service role pode tudo (APIs admin usam service role)
CREATE POLICY "bookstore_service_role"
  ON public.bookstore_categories FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "bookstore_suppliers_service_role"
  ON public.bookstore_suppliers FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "bookstore_products_service_role"
  ON public.bookstore_products FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "bookstore_sales_service_role"
  ON public.bookstore_sales FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "bookstore_sale_items_service_role"
  ON public.bookstore_sale_items FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "bookstore_stock_movements_service_role"
  ON public.bookstore_stock_movements FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- 8. RECURSOS RBAC (Livraria)
-- ============================================================
INSERT INTO public.resources (key, name, description, category, sort_order) VALUES
  ('livraria_produtos', 'Livraria - Produtos', 'Cadastro de produtos da livraria', 'admin', 72),
  ('livraria_estoque', 'Livraria - Estoque', 'Controle de estoque e movimentações', 'admin', 73),
  ('livraria_movimentacoes', 'Livraria - Movimentações', 'Histórico de movimentações', 'admin', 74),
  ('livraria_importacao', 'Livraria - Importação/Exportação', 'Importação e exportação em massa', 'admin', 75),
  ('livraria_dashboard', 'Livraria - Dashboard', 'Relatórios e indicadores da livraria', 'admin', 76)
ON CONFLICT (key) DO UPDATE SET
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  sort_order = excluded.sort_order;

-- Conceder manage ao role admin nos novos recursos
INSERT INTO public.role_permissions (role_id, resource_id, permission_id)
SELECT r.id, res.id, p.id
FROM public.roles r
CROSS JOIN public.resources res
CROSS JOIN public.permissions p
WHERE r.key = 'admin' AND r.is_active = true
  AND p.action = 'manage'
  AND res.key IN ('livraria_produtos', 'livraria_estoque', 'livraria_movimentacoes', 'livraria_importacao', 'livraria_dashboard')
ON CONFLICT (role_id, resource_id, permission_id) DO NOTHING;
