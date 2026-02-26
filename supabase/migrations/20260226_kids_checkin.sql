-- Tabela de check-in de crianças no culto Sara Kids
CREATE TABLE IF NOT EXISTS public.kids_checkin (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id        UUID        NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  service_id      TEXT        NOT NULL,            -- ID do culto (ex: 'domingo-manha')
  service_name    TEXT        NOT NULL,            -- Nome do culto no momento do registro
  checked_in_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  checked_out_at  TIMESTAMPTZ,
  registered_by   UUID        REFERENCES public.people(id) ON DELETE SET NULL,  -- pessoa do admin
  registered_by_name TEXT,                         -- nome snapshot (evita JOIN obrigatório)
  notes           TEXT,                            -- observações opcionais
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.kids_checkin                     IS 'Check-in de crianças nos cultos Sara Kids';
COMMENT ON COLUMN public.kids_checkin.child_id            IS 'Criança que fez check-in (is_child = true)';
COMMENT ON COLUMN public.kids_checkin.service_id          IS 'ID do culto conforme configuração do site';
COMMENT ON COLUMN public.kids_checkin.service_name        IS 'Nome do culto no momento do check-in';
COMMENT ON COLUMN public.kids_checkin.checked_in_at       IS 'Data/hora de entrada';
COMMENT ON COLUMN public.kids_checkin.checked_out_at      IS 'Data/hora de saída (opcional)';
COMMENT ON COLUMN public.kids_checkin.registered_by       IS 'ID do admin que fez o registro';
COMMENT ON COLUMN public.kids_checkin.registered_by_name  IS 'Nome do admin (snapshot)';
COMMENT ON COLUMN public.kids_checkin.notes               IS 'Observações do monitor';

-- Índices para consultas frequentes
CREATE INDEX IF NOT EXISTS idx_kids_checkin_child_id     ON public.kids_checkin(child_id);
CREATE INDEX IF NOT EXISTS idx_kids_checkin_service_id   ON public.kids_checkin(service_id);
CREATE INDEX IF NOT EXISTS idx_kids_checkin_checked_in   ON public.kids_checkin(checked_in_at DESC);

-- RLS: acesso total para admin
ALTER TABLE public.kids_checkin ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin full access kids checkin"
  ON public.kids_checkin
  FOR ALL
  USING (true)
  WITH CHECK (true);
