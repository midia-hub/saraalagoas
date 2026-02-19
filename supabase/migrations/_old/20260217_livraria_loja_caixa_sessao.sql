-- ============================================================
-- Livraria: loja e caixa Mercado Pago + sessões de abertura/fechamento
-- ============================================================

-- 1) Loja (espelho da loja criada no MP)
CREATE TABLE IF NOT EXISTS public.livraria_mp_store (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mp_store_id bigint NOT NULL UNIQUE,
  name text NOT NULL,
  external_id text,
  address_line text,
  location jsonb,
  collector_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_livraria_mp_store_collector ON public.livraria_mp_store(collector_id);

-- 2) Caixa / POS (espelho do caixa criado no MP)
CREATE TABLE IF NOT EXISTS public.livraria_mp_pos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.livraria_mp_store(id) ON DELETE CASCADE,
  mp_pos_id bigint NOT NULL UNIQUE,
  name text NOT NULL,
  external_id text NOT NULL,
  external_store_id text NOT NULL,
  qr_image_url text,
  uuid text,
  status text DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_livraria_mp_pos_store ON public.livraria_mp_pos(store_id);

-- 3) Sessão de caixa (abertura e fechamento na plataforma)
CREATE TABLE IF NOT EXISTS public.livraria_caixa_sessao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pos_id uuid NOT NULL REFERENCES public.livraria_mp_pos(id) ON DELETE CASCADE,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  opening_balance numeric(12,2) NOT NULL DEFAULT 0,
  closing_balance numeric(12,2),
  status text NOT NULL DEFAULT 'OPENED' CHECK (status IN ('OPENED', 'CLOSED')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_livraria_caixa_sessao_pos ON public.livraria_caixa_sessao(pos_id);
CREATE INDEX IF NOT EXISTS idx_livraria_caixa_sessao_status ON public.livraria_caixa_sessao(status);

-- Trigger updated_at (função já existe em outras migrations)
DROP TRIGGER IF EXISTS livraria_mp_store_updated_at ON public.livraria_mp_store;
CREATE TRIGGER livraria_mp_store_updated_at
  BEFORE UPDATE ON public.livraria_mp_store
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS livraria_mp_pos_updated_at ON public.livraria_mp_pos;
CREATE TRIGGER livraria_mp_pos_updated_at
  BEFORE UPDATE ON public.livraria_mp_pos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS livraria_caixa_sessao_updated_at ON public.livraria_caixa_sessao;
CREATE TRIGGER livraria_caixa_sessao_updated_at
  BEFORE UPDATE ON public.livraria_caixa_sessao
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS: mesmo critério da livraria (quem tem livraria_pdv ou dashboard pode ver)
ALTER TABLE public.livraria_mp_store ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.livraria_mp_pos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.livraria_caixa_sessao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "livraria_mp_store_select" ON public.livraria_mp_store;
CREATE POLICY "livraria_mp_store_select" ON public.livraria_mp_store FOR SELECT TO authenticated
  USING (
    public.current_user_can('livraria_pdv', 'view') OR public.current_user_can('livraria_pdv', 'create') OR public.current_user_can('livraria_pdv', 'manage')
    OR public.current_user_can('livraria_dashboard', 'view') OR public.current_user_can('livraria_dashboard', 'manage')
    OR EXISTS (SELECT 1 FROM public.profiles p JOIN public.roles r ON r.id = p.role_id WHERE p.id = auth.uid() AND r.is_admin = true)
  );

DROP POLICY IF EXISTS "livraria_mp_store_insert" ON public.livraria_mp_store;
CREATE POLICY "livraria_mp_store_insert" ON public.livraria_mp_store FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_can('livraria_pdv', 'create') OR public.current_user_can('livraria_pdv', 'manage')
    OR EXISTS (SELECT 1 FROM public.profiles p JOIN public.roles r ON r.id = p.role_id WHERE p.id = auth.uid() AND r.is_admin = true)
  );

DROP POLICY IF EXISTS "livraria_mp_store_update" ON public.livraria_mp_store;
CREATE POLICY "livraria_mp_store_update" ON public.livraria_mp_store FOR UPDATE TO authenticated
  USING (
    public.current_user_can('livraria_pdv', 'create') OR public.current_user_can('livraria_pdv', 'manage')
    OR EXISTS (SELECT 1 FROM public.profiles p JOIN public.roles r ON r.id = p.role_id WHERE p.id = auth.uid() AND r.is_admin = true)
  );

DROP POLICY IF EXISTS "livraria_mp_pos_select" ON public.livraria_mp_pos;
CREATE POLICY "livraria_mp_pos_select" ON public.livraria_mp_pos FOR SELECT TO authenticated
  USING (
    public.current_user_can('livraria_pdv', 'view') OR public.current_user_can('livraria_pdv', 'create') OR public.current_user_can('livraria_pdv', 'manage')
    OR public.current_user_can('livraria_dashboard', 'view') OR public.current_user_can('livraria_dashboard', 'manage')
    OR EXISTS (SELECT 1 FROM public.profiles p JOIN public.roles r ON r.id = p.role_id WHERE p.id = auth.uid() AND r.is_admin = true)
  );

DROP POLICY IF EXISTS "livraria_mp_pos_insert" ON public.livraria_mp_pos;
CREATE POLICY "livraria_mp_pos_insert" ON public.livraria_mp_pos FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_can('livraria_pdv', 'create') OR public.current_user_can('livraria_pdv', 'manage')
    OR EXISTS (SELECT 1 FROM public.profiles p JOIN public.roles r ON r.id = p.role_id WHERE p.id = auth.uid() AND r.is_admin = true)
  );

DROP POLICY IF EXISTS "livraria_mp_pos_update" ON public.livraria_mp_pos;
CREATE POLICY "livraria_mp_pos_update" ON public.livraria_mp_pos FOR UPDATE TO authenticated
  USING (
    public.current_user_can('livraria_pdv', 'create') OR public.current_user_can('livraria_pdv', 'manage')
    OR EXISTS (SELECT 1 FROM public.profiles p JOIN public.roles r ON r.id = p.role_id WHERE p.id = auth.uid() AND r.is_admin = true)
  );

DROP POLICY IF EXISTS "livraria_caixa_sessao_select" ON public.livraria_caixa_sessao;
CREATE POLICY "livraria_caixa_sessao_select" ON public.livraria_caixa_sessao FOR SELECT TO authenticated
  USING (
    public.current_user_can('livraria_pdv', 'view') OR public.current_user_can('livraria_pdv', 'create') OR public.current_user_can('livraria_pdv', 'manage')
    OR public.current_user_can('livraria_dashboard', 'view') OR public.current_user_can('livraria_dashboard', 'manage')
    OR EXISTS (SELECT 1 FROM public.profiles p JOIN public.roles r ON r.id = p.role_id WHERE p.id = auth.uid() AND r.is_admin = true)
  );

DROP POLICY IF EXISTS "livraria_caixa_sessao_insert" ON public.livraria_caixa_sessao;
CREATE POLICY "livraria_caixa_sessao_insert" ON public.livraria_caixa_sessao FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_can('livraria_pdv', 'create') OR public.current_user_can('livraria_pdv', 'manage')
    OR EXISTS (SELECT 1 FROM public.profiles p JOIN public.roles r ON r.id = p.role_id WHERE p.id = auth.uid() AND r.is_admin = true)
  );

DROP POLICY IF EXISTS "livraria_caixa_sessao_update" ON public.livraria_caixa_sessao;
CREATE POLICY "livraria_caixa_sessao_update" ON public.livraria_caixa_sessao FOR UPDATE TO authenticated
  USING (
    public.current_user_can('livraria_pdv', 'create') OR public.current_user_can('livraria_pdv', 'manage')
    OR EXISTS (SELECT 1 FROM public.profiles p JOIN public.roles r ON r.id = p.role_id WHERE p.id = auth.uid() AND r.is_admin = true)
  );

-- Service role para webhooks/backend
DROP POLICY IF EXISTS "livraria_mp_store_service" ON public.livraria_mp_store;
CREATE POLICY "livraria_mp_store_service" ON public.livraria_mp_store FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "livraria_mp_pos_service" ON public.livraria_mp_pos;
CREATE POLICY "livraria_mp_pos_service" ON public.livraria_mp_pos FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "livraria_caixa_sessao_service" ON public.livraria_caixa_sessao;
CREATE POLICY "livraria_caixa_sessao_service" ON public.livraria_caixa_sessao FOR ALL TO service_role USING (true) WITH CHECK (true);
