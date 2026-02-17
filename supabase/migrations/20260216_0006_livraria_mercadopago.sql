-- ============================================================
-- Mercado Pago: ajustes em bookstore_sales + transações + RLS
-- ============================================================

-- 1) bookstore_sales: ampliar status e campos de pagamento
ALTER TABLE public.bookstore_sales
  ADD COLUMN IF NOT EXISTS payment_provider text NULL,
  ADD COLUMN IF NOT EXISTS payment_provider_ref text NULL,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS provider_payload jsonb NULL;

ALTER TABLE public.bookstore_sales DROP CONSTRAINT IF EXISTS bookstore_sales_payment_provider_check;
ALTER TABLE public.bookstore_sales ADD CONSTRAINT bookstore_sales_payment_provider_check
  CHECK (payment_provider IS NULL OR payment_provider IN ('MERCADOPAGO', 'PIX_MANUAL', 'CASH', 'CARD', 'CREDIT'));

-- Ampliar status: PENDING, PAID, CANCELLED, FAILED
ALTER TABLE public.bookstore_sales DROP CONSTRAINT IF EXISTS bookstore_sales_status_check;
ALTER TABLE public.bookstore_sales ADD CONSTRAINT bookstore_sales_status_check
  CHECK (status IN ('PENDING', 'PAID', 'CANCELLED', 'FAILED'));

COMMENT ON COLUMN public.bookstore_sales.payment_provider IS 'Provedor de pagamento: MERCADOPAGO, PIX_MANUAL, CASH, CARD, CREDIT';
COMMENT ON COLUMN public.bookstore_sales.payment_provider_ref IS 'ID da preferência ou pagamento no provedor';
COMMENT ON COLUMN public.bookstore_sales.paid_at IS 'Data/hora da confirmação do pagamento';
COMMENT ON COLUMN public.bookstore_sales.provider_payload IS 'Snapshot do retorno do provedor (auditoria)';

-- 2) Tabela de transações de pagamento (rastreio Mercado Pago)
CREATE TABLE IF NOT EXISTS public.bookstore_payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.bookstore_sales(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('MERCADOPAGO')),
  preference_id text NULL,
  payment_id text NULL,
  merchant_order_id text NULL,
  status text NOT NULL DEFAULT 'CREATED' CHECK (status IN (
    'CREATED', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'REFUNDED', 'CHARGED_BACK'
  )),
  amount numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BRL',
  idempotency_key text NULL,
  external_reference text NULL,
  raw_notification jsonb NULL,
  raw_payment jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookstore_payment_tx_preference
  ON public.bookstore_payment_transactions (provider, preference_id)
  WHERE preference_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookstore_payment_tx_payment
  ON public.bookstore_payment_transactions (provider, payment_id)
  WHERE payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookstore_payment_tx_sale ON public.bookstore_payment_transactions(sale_id);
CREATE INDEX IF NOT EXISTS idx_bookstore_payment_tx_created ON public.bookstore_payment_transactions(created_at);

-- Trigger updated_at
DROP TRIGGER IF EXISTS bookstore_payment_transactions_updated_at ON public.bookstore_payment_transactions;
CREATE TRIGGER bookstore_payment_transactions_updated_at
  BEFORE UPDATE ON public.bookstore_payment_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) RLS: somente usuários com permissão livraria (vendas/dashboard) podem ver transações
ALTER TABLE public.bookstore_payment_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bookstore_payment_transactions_select" ON public.bookstore_payment_transactions;
CREATE POLICY "bookstore_payment_transactions_select" ON public.bookstore_payment_transactions
  FOR SELECT TO authenticated
  USING (
    public.current_user_can('livraria_vendas', 'view') OR public.current_user_can('livraria_vendas', 'manage')
    OR public.current_user_can('livraria_dashboard', 'view') OR public.current_user_can('livraria_dashboard', 'manage')
    OR public.current_user_can('livraria_pdv', 'create') OR public.current_user_can('livraria_pdv', 'manage')
    OR EXISTS (SELECT 1 FROM public.profiles p JOIN public.roles r ON r.id = p.role_id WHERE p.id = auth.uid() AND r.is_admin = true)
  );

DROP POLICY IF EXISTS "bookstore_payment_transactions_insert" ON public.bookstore_payment_transactions;
CREATE POLICY "bookstore_payment_transactions_insert" ON public.bookstore_payment_transactions
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_can('livraria_pdv', 'create') OR public.current_user_can('livraria_pdv', 'manage')
    OR EXISTS (SELECT 1 FROM public.profiles p JOIN public.roles r ON r.id = p.role_id WHERE p.id = auth.uid() AND r.is_admin = true)
  );

DROP POLICY IF EXISTS "bookstore_payment_transactions_update" ON public.bookstore_payment_transactions;
CREATE POLICY "bookstore_payment_transactions_update" ON public.bookstore_payment_transactions
  FOR UPDATE TO authenticated
  USING (
    public.current_user_can('livraria_vendas', 'manage') OR public.current_user_can('livraria_pdv', 'manage')
    OR EXISTS (SELECT 1 FROM public.profiles p JOIN public.roles r ON r.id = p.role_id WHERE p.id = auth.uid() AND r.is_admin = true)
  )
  WITH CHECK (
    public.current_user_can('livraria_vendas', 'manage') OR public.current_user_can('livraria_pdv', 'manage')
    OR EXISTS (SELECT 1 FROM public.profiles p JOIN public.roles r ON r.id = p.role_id WHERE p.id = auth.uid() AND r.is_admin = true)
  );

-- Service role pode fazer tudo (webhook roda com service role no backend)
DROP POLICY IF EXISTS "bookstore_payment_transactions_service_all" ON public.bookstore_payment_transactions;
CREATE POLICY "bookstore_payment_transactions_service_all" ON public.bookstore_payment_transactions
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
