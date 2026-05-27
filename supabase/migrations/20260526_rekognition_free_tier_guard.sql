-- =====================================================
-- AWS Rekognition — guarda de cota gratuita
-- =====================================================
-- Reserva chamadas de forma atomica antes de chamar a AWS.
-- A aplicacao falha fechada se esta RPC nao existir.

CREATE TABLE IF NOT EXISTS public.rekognition_usage_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    year_month TEXT NOT NULL,
    api_call TEXT NOT NULL CHECK (api_call IN ('IndexFaces', 'SearchFacesByImage')),
    count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
    UNIQUE (year_month, api_call)
);

ALTER TABLE public.rekognition_usage_log
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now(),
    ADD COLUMN IF NOT EXISTS year_month TEXT,
    ADD COLUMN IF NOT EXISTS api_call TEXT,
    ADD COLUMN IF NOT EXISTS count INTEGER DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS rekognition_usage_log_year_month_api_call_key
    ON public.rekognition_usage_log (year_month, api_call);

ALTER TABLE public.rekognition_usage_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_rekognition_usage_log"
    ON public.rekognition_usage_log;

CREATE POLICY "service_role_all_rekognition_usage_log"
    ON public.rekognition_usage_log FOR ALL
    TO service_role USING (true) WITH CHECK (true);

DROP FUNCTION IF EXISTS public.rekognition_reserve_usage(TEXT, TEXT, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.rekognition_reserve_usage(
    p_year_month TEXT,
    p_api_call TEXT,
    p_count INTEGER,
    p_limit INTEGER
)
RETURNS TABLE (
    allowed BOOLEAN,
    current_total INTEGER,
    remaining INTEGER,
    index_faces INTEGER,
    search_faces_by_image INTEGER,
    error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_total INTEGER;
    v_next_total INTEGER;
    v_index_faces INTEGER;
    v_search_faces_by_image INTEGER;
BEGIN
    IF p_api_call NOT IN ('IndexFaces', 'SearchFacesByImage') THEN
        RAISE EXCEPTION 'Invalid Rekognition API call: %', p_api_call;
    END IF;

    IF p_count IS NULL OR p_count < 1 THEN
        RAISE EXCEPTION 'p_count must be greater than zero';
    END IF;

    IF p_limit IS NULL OR p_limit < 1 THEN
        RAISE EXCEPTION 'p_limit must be greater than zero';
    END IF;

    PERFORM pg_advisory_xact_lock(hashtext('rekognition_usage:' || p_year_month));

    SELECT COALESCE(SUM(count), 0)
      INTO v_current_total
      FROM public.rekognition_usage_log
     WHERE year_month = p_year_month
       AND api_call IN ('IndexFaces', 'SearchFacesByImage');

    v_next_total := v_current_total + p_count;

    IF v_next_total > p_limit THEN
        SELECT
            COALESCE(SUM(count) FILTER (WHERE api_call = 'IndexFaces'), 0),
            COALESCE(SUM(count) FILTER (WHERE api_call = 'SearchFacesByImage'), 0)
          INTO v_index_faces, v_search_faces_by_image
          FROM public.rekognition_usage_log
         WHERE year_month = p_year_month;

        RETURN QUERY SELECT
            false,
            v_current_total,
            GREATEST(0, p_limit - v_current_total),
            v_index_faces,
            v_search_faces_by_image,
            format(
                'Cota mensal do AWS Rekognition bloqueada (%s/%s chamadas usadas em %s). A operacao requer %s chamada(s).',
                v_current_total,
                p_limit,
                p_year_month,
                p_count
            );
        RETURN;
    END IF;

    INSERT INTO public.rekognition_usage_log (year_month, api_call, count)
    VALUES (p_year_month, p_api_call, p_count)
    ON CONFLICT (year_month, api_call)
    DO UPDATE SET
        count = public.rekognition_usage_log.count + EXCLUDED.count,
        updated_at = now();

    SELECT
        COALESCE(SUM(count) FILTER (WHERE api_call = 'IndexFaces'), 0),
        COALESCE(SUM(count) FILTER (WHERE api_call = 'SearchFacesByImage'), 0)
      INTO v_index_faces, v_search_faces_by_image
      FROM public.rekognition_usage_log
     WHERE year_month = p_year_month;

    v_current_total := v_index_faces + v_search_faces_by_image;

    RETURN QUERY SELECT
        true,
        v_current_total,
        GREATEST(0, p_limit - v_current_total),
        v_index_faces,
        v_search_faces_by_image,
        NULL::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rekognition_reserve_usage(TEXT, TEXT, INTEGER, INTEGER)
    TO service_role;

DROP FUNCTION IF EXISTS public.rekognition_increment_usage(TEXT, TEXT, INTEGER);

CREATE OR REPLACE FUNCTION public.rekognition_increment_usage(
    p_year_month TEXT,
    p_api_call TEXT,
    p_count INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.rekognition_usage_log (year_month, api_call, count)
    VALUES (p_year_month, p_api_call, p_count)
    ON CONFLICT (year_month, api_call)
    DO UPDATE SET
        count = public.rekognition_usage_log.count + EXCLUDED.count,
        updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.rekognition_increment_usage(TEXT, TEXT, INTEGER)
    TO service_role;
