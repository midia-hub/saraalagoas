-- Log de chamadas ao webhook de disparos (consolidação)
CREATE TABLE IF NOT EXISTS public.disparos_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  nome text NOT NULL,
  conversion_type text NOT NULL CHECK (conversion_type IN ('accepted', 'reconciled')),
  status_code int,
  source text NOT NULL CHECK (source IN ('public', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS disparos_log_created_at_idx ON public.disparos_log (created_at DESC);

ALTER TABLE public.disparos_log ENABLE ROW LEVEL SECURITY;

-- Inserção: service_role (API pública e admin)
DROP POLICY IF EXISTS "disparos_log_insert_service" ON public.disparos_log;
CREATE POLICY "disparos_log_insert_service"
  ON public.disparos_log FOR INSERT TO service_role
  WITH CHECK (true);

-- Leitura: administradores com permissão de configurações
DROP POLICY IF EXISTS "disparos_log_select_configuracoes" ON public.disparos_log;
CREATE POLICY "disparos_log_select_configuracoes"
  ON public.disparos_log FOR SELECT TO authenticated
  USING (public.current_user_can('configuracoes', 'view') OR public.current_user_can('configuracoes', 'edit'));

COMMENT ON TABLE public.disparos_log IS 'Registro de cada chamada ao webhook de disparos (consolidação) para exibição no admin.';
