-- 20260220_06_lideranca_discipulado.sql
-- Implementa tabela de discipulados e suporte a frequência em cultos por sessões

-- =====================================================
-- 1. DISCIPULADOS (Relação líder/discípulo)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.discipulados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    discipulador_person_id UUID NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
    discipulo_person_id UUID NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(discipulador_person_id, discipulo_person_id)
);

CREATE INDEX IF NOT EXISTS idx_discipulados_discipulador ON public.discipulados(discipulador_person_id);
CREATE INDEX IF NOT EXISTS idx_discipulados_church ON public.discipulados(church_id);
CREATE INDEX IF NOT EXISTS idx_discipulados_active ON public.discipulados(active);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS trg_discipulados_updated_at ON public.discipulados;
CREATE TRIGGER trg_discipulados_updated_at
  BEFORE UPDATE ON public.discipulados
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================
-- 2. WORSHIP_SESSIONS (Instâncias de Cultos)
-- =====================================================
-- Representa a realização de um culto em um dia específico

CREATE TABLE IF NOT EXISTS public.worship_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.worship_services(id) ON DELETE CASCADE,
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(service_id, session_date)
);

CREATE INDEX IF NOT EXISTS idx_worship_sessions_church_date ON public.worship_sessions(church_id, session_date DESC);

-- =====================================================
-- 3. AJUSTE WORSHIP_ATTENDANCE
-- =====================================================
-- Adicionar coluna opcional para session_id para vínculo direto
ALTER TABLE public.worship_attendance
  ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.worship_sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_worship_attendance_session ON public.worship_attendance(session_id);

-- =====================================================
-- 4. RPC: GET_MY_DISCIPLES_ATTENDANCE
-- =====================================================
-- Retorna os discípulos de um líder com contagem de presenças e total de cultos

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
    -- Busca todos os discípulos ativos do líder
    SELECT 
      d.discipulo_person_id,
      p.full_name,
      p.church_profile,
      p.church_situation,
      d.church_id AS discipulado_church_id -- Igreja via discipulados (people não tem church_id)
    FROM public.discipulados d
    JOIN public.people p ON p.id = d.discipulo_person_id
    WHERE d.discipulador_person_id = p_leader_person_id
      AND d.active = true
  ),
  LeaderChurch AS (
    -- Determina a igreja do líder via tabela discipulados
    SELECT church_id
    FROM public.discipulados
    WHERE discipulador_person_id = p_leader_person_id
      AND active = true
    LIMIT 1
  ),
  ChurchSessions AS (
    -- Busca todas as sessões que ocorreram na igreja do lider/discípulo no período
    SELECT ws.id, ws.service_id, ws.session_date, ws.church_id
    FROM public.worship_sessions ws
    INNER JOIN LeaderChurch lc ON ws.church_id = lc.church_id
    WHERE ws.session_date >= p_start_date 
      AND ws.session_date <= p_end_date
      AND (p_service_id IS NULL OR ws.service_id = p_service_id)
  ),
  DisciplesAttendance AS (
    -- Conta presenças por discípulo
    SELECT 
      md.discipulo_person_id,
      COUNT(wa.id) FILTER (WHERE wa.attended = true) as present_count,
      MAX(wa.attended_on) FILTER (WHERE wa.attended = true) as last_attended
    FROM MyDisciples md
    LEFT JOIN public.worship_attendance wa ON wa.person_id = md.discipulo_person_id
      AND wa.attended_on >= p_start_date
      AND wa.attended_on <= p_end_date
      AND (p_service_id IS NULL OR wa.service_id = p_service_id)
    GROUP BY md.discipulo_person_id
  ),
  TotalSessions AS (
    -- Total de sessões na igreja do lider
    SELECT COUNT(*) as session_count FROM ChurchSessions
  )
  SELECT 
    md.discipulo_person_id,
    md.full_name,
    md.church_profile,
    md.church_situation,
    COALESCE(da.present_count, 0) as presencas,
    COALESCE(ts.session_count, 0) as total_cultos,
    CASE 
      WHEN ts.session_count > 0 THEN ROUND((COALESCE(da.present_count, 0)::NUMERIC / ts.session_count::NUMERIC) * 100, 2)
      ELSE 0::NUMERIC
    END as percentual,
    da.last_attended as ultimo_presente_em
  FROM MyDisciples md
  CROSS JOIN TotalSessions ts
  LEFT JOIN DisciplesAttendance da ON da.discipulo_person_id = md.discipulo_person_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. RLS POLICIES
-- =====================================================

-- Discipulados: Líderes podem ver seus discípulos, admins vêem tudo
ALTER TABLE public.discipulados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Líderes vêem seus discípulos" ON public.discipulados
    FOR SELECT USING (
        discipulador_person_id IN (SELECT person_id FROM public.profiles WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
    );

-- worship_sessions: Todos autenticados vêem, gestores editam
ALTER TABLE public.worship_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura sessões cultos" ON public.worship_sessions
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Gestão sessões cultos" ON public.worship_sessions
    FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'editor')));
