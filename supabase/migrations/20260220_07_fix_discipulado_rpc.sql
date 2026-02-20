-- 20260220_07_fix_discipulado_rpc.sql
-- Corrige get_my_disciples_attendance: people não tem church_id
-- Derivamos a igreja do líder a partir da tabela discipulados (que tem church_id)
-- e removemos referência inexistente p.church_id

CREATE OR REPLACE FUNCTION public.get_my_disciples_attendance(
  p_leader_person_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_service_id UUID DEFAULT NULL
)
RETURNS TABLE (
  discipulo_person_id UUID,
  full_name TEXT,
  church_profile TEXT,
  church_situation TEXT,
  presencas BIGINT,
  total_cultos BIGINT,
  percentual NUMERIC,
  ultimo_presente_em DATE
) AS $$
BEGIN
  RETURN QUERY
  WITH MyDisciples AS (
    -- Discípulos ativos vinculados a este líder
    SELECT
      d.discipulo_person_id,
      p.full_name,
      p.church_profile,
      p.church_situation,
      d.church_id AS discipulado_church_id
    FROM public.discipulados d
    JOIN public.people p ON p.id = d.discipulo_person_id
    WHERE d.discipulador_person_id = p_leader_person_id
      AND d.active = true
  ),
  LeaderChurch AS (
    -- Igreja do líder derivada da tabela discipulados
    SELECT d.church_id
    FROM public.discipulados d
    WHERE d.discipulador_person_id = p_leader_person_id
      AND d.active = true
    LIMIT 1
  ),
  ChurchSessions AS (
    -- Sessões realizadas no período, na igreja do líder
    SELECT ws.id, ws.service_id, ws.session_date
    FROM public.worship_sessions ws
    INNER JOIN LeaderChurch lc ON ws.church_id = lc.church_id
    WHERE ws.session_date >= p_start_date
      AND ws.session_date <= p_end_date
      AND (p_service_id IS NULL OR ws.service_id = p_service_id)
  ),
  DisciplesAttendance AS (
    -- Presenças de cada discípulo no período
    SELECT
      md.discipulo_person_id,
      COUNT(wa.id) FILTER (WHERE wa.attended = true)        AS present_count,
      MAX(wa.attended_on) FILTER (WHERE wa.attended = true) AS last_attended
    FROM MyDisciples md
    LEFT JOIN public.worship_attendance wa
      ON  wa.person_id   = md.discipulo_person_id
      AND wa.attended_on >= p_start_date
      AND wa.attended_on <= p_end_date
      AND (p_service_id IS NULL OR wa.service_id = p_service_id)
    GROUP BY md.discipulo_person_id
  ),
  TotalSessions AS (
    SELECT COUNT(*) AS session_count FROM ChurchSessions
  )
  SELECT
    md.discipulo_person_id,
    md.full_name,
    md.church_profile,
    md.church_situation,
    COALESCE(da.present_count, 0)   AS presencas,
    COALESCE(ts.session_count, 0)   AS total_cultos,
    CASE
      WHEN ts.session_count > 0
        THEN ROUND((COALESCE(da.present_count, 0)::NUMERIC / ts.session_count::NUMERIC) * 100, 2)
      ELSE 0::NUMERIC
    END AS percentual,
    da.last_attended AS ultimo_presente_em
  FROM MyDisciples md
  CROSS JOIN TotalSessions ts
  LEFT JOIN DisciplesAttendance da ON da.discipulo_person_id = md.discipulo_person_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
