-- =====================================================================
-- CRON: Publicação de postagens programadas via pg_cron + pg_net
-- =====================================================================
-- Chama GET /api/social/run-scheduled a cada 5 minutos via pg_net.
-- Os valores de APP_URL e CRON_SECRET são lidos de public.cron_config
-- (tabela criada pela migração cron_config_table).
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pg_net;

-- Função que lê app_url e cron_secret de public.cron_config e chama
-- GET /api/social/run-scheduled via pg_net
CREATE OR REPLACE FUNCTION public.trigger_process_scheduled_posts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app_url     text;
  v_cron_secret text;
  v_endpoint    text;
BEGIN
  SELECT value INTO v_app_url     FROM public.cron_config WHERE key = 'app_url';
  SELECT value INTO v_cron_secret FROM public.cron_config WHERE key = 'cron_secret';

  IF v_app_url IS NULL OR v_app_url = '' THEN
    RAISE NOTICE '[process-scheduled-posts] app_url não configurado em cron_config — job ignorado.';
    RETURN;
  END IF;

  v_endpoint := rtrim(v_app_url, '/') || '/api/social/run-scheduled';

  PERFORM net.http_get(
    url     := v_endpoint,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || coalesce(v_cron_secret, ''),
      'Content-Type',  'application/json'
    )
  );
END;
$$;

-- Remove job anterior caso exista (idempotente)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'run-scheduled-social-posts') THEN
    PERFORM cron.unschedule('run-scheduled-social-posts');
  END IF;
END;
$$;

-- Cria o job: a cada 5 minutos, todos os dias
SELECT cron.schedule(
  'run-scheduled-social-posts',
  '*/5 * * * *',
  $$SELECT public.trigger_process_scheduled_posts()$$
);
