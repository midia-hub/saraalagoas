-- Cells PD Configuration

-- Tabela para configurações gerais do módulo de células
CREATE TABLE IF NOT EXISTS public.cell_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT NOT NULL UNIQUE,
  config_value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id)
);

-- Inserir configuração inicial da data de corte do PD
-- Por padrão, define como último dia do mês atual
INSERT INTO public.cell_configs (config_key, config_value)
VALUES (
  'pd_deadline',
  jsonb_build_object(
    'deadline_date', to_char(date_trunc('month', CURRENT_DATE) + interval '1 month' - interval '1 day', 'YYYY-MM-DD'),
    'description', 'Data limite para preenchimento do Parceiro de Deus'
  )
)
ON CONFLICT (config_key) DO NOTHING;

-- RLS para cell_configs
ALTER TABLE public.cell_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cell_configs_select" ON public.cell_configs;
CREATE POLICY "cell_configs_select" ON public.cell_configs FOR SELECT TO authenticated
  USING (public.current_user_can('celulas', 'view') OR public.current_user_can('celulas', 'manage'));

DROP POLICY IF EXISTS "cell_configs_update" ON public.cell_configs;
CREATE POLICY "cell_configs_update" ON public.cell_configs FOR UPDATE TO authenticated
  USING (public.current_user_can('celulas', 'manage'))
  WITH CHECK (public.current_user_can('celulas', 'manage'));

-- Função helper para obter a data de corte do PD
CREATE OR REPLACE FUNCTION public.get_pd_deadline()
RETURNS DATE AS $$
DECLARE
  deadline_value JSONB;
BEGIN
  SELECT config_value INTO deadline_value
  FROM public.cell_configs
  WHERE config_key = 'pd_deadline';
  
  IF deadline_value IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN (deadline_value->>'deadline_date')::DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
