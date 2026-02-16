-- Configuração da API de disparos (webhook) no módulo de consolidação
CREATE TABLE IF NOT EXISTS public.consolidation_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  disparos_api_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.consolidation_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "consolidation_settings_select" ON public.consolidation_settings;
CREATE POLICY "consolidation_settings_select"
  ON public.consolidation_settings FOR SELECT TO authenticated
  USING (public.current_user_can('consolidacao', 'view') OR public.current_user_can('consolidacao', 'manage'));

DROP POLICY IF EXISTS "consolidation_settings_update" ON public.consolidation_settings;
CREATE POLICY "consolidation_settings_update"
  ON public.consolidation_settings FOR UPDATE TO authenticated
  USING (public.current_user_can('consolidacao', 'manage'))
  WITH CHECK (public.current_user_can('consolidacao', 'manage'));

-- Service role precisa ler para a API pública de conversão chamar o webhook quando ativo
DROP POLICY IF EXISTS "consolidation_settings_service_select" ON public.consolidation_settings;
CREATE POLICY "consolidation_settings_service_select"
  ON public.consolidation_settings FOR SELECT TO service_role
  USING (true);

INSERT INTO public.consolidation_settings (id, disparos_api_enabled)
VALUES (1, false)
ON CONFLICT (id) DO NOTHING;
