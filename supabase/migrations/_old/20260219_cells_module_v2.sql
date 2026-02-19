-- =========================================
-- MÓDULO CÉLULAS 2.0
-- =========================================

-- 1. Alterar tabela cells para incluir endereço e metadados
ALTER TABLE public.cells
ADD COLUMN IF NOT EXISTS cep TEXT,
ADD COLUMN IF NOT EXISTS street TEXT,
ADD COLUMN IF NOT EXISTS number TEXT,
ADD COLUMN IF NOT EXISTS neighborhood TEXT,
ADD COLUMN IF NOT EXISTS city TEXT DEFAULT 'Maceió',
ADD COLUMN IF NOT EXISTS state TEXT DEFAULT 'AL',
ADD COLUMN IF NOT EXISTS latitude NUMERIC,
ADD COLUMN IF NOT EXISTS longitude NUMERIC,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativa' CHECK (status IN ('ativa', 'inativa')),
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.profiles(id);

-- 2. Criar tabela cell_realizations (Gestão mensal de realização)
CREATE TABLE IF NOT EXISTS public.cell_realizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cell_id UUID NOT NULL REFERENCES public.cells(id) ON DELETE CASCADE,
  reference_month DATE NOT NULL, -- Primeiro dia do mês de referência
  realization_date DATE NOT NULL,
  pd_value NUMERIC DEFAULT 0,
  pd_confirmed BOOLEAN DEFAULT false,
  pd_confirmed_by UUID REFERENCES public.profiles(id),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Garantir uma realização por data por célula
  UNIQUE(cell_id, realization_date)
);

-- 3. Criar tabela cell_attendances (Registro de presença)
CREATE TABLE IF NOT EXISTS public.cell_attendances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  realization_id UUID NOT NULL REFERENCES public.cell_realizations(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('V','X')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(realization_id, person_id)
);

-- 4. Criar tabela cell_visitors (Cadastro rápido de visitantes)
CREATE TABLE IF NOT EXISTS public.cell_visitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  realization_id UUID NOT NULL REFERENCES public.cell_realizations(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. RBAC: Adicionar novo recurso em resources
INSERT INTO public.resources (key, name, category)
VALUES ('celulas', 'Células', 'Consolidação')
ON CONFLICT (key) DO NOTHING;

-- 6. RLS: Habilitar e criar políticas para as novas tabelas
ALTER TABLE public.cell_realizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cell_attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cell_visitors ENABLE ROW LEVEL SECURITY;

-- Políticas para cell_realizations
DROP POLICY IF EXISTS "cell_realizations_select" ON public.cell_realizations;
CREATE POLICY "cell_realizations_select" ON public.cell_realizations FOR SELECT TO authenticated
  USING (public.current_user_can('celulas', 'view') OR public.current_user_can('celulas', 'manage'));

DROP POLICY IF EXISTS "cell_realizations_all" ON public.cell_realizations;
CREATE POLICY "cell_realizations_all" ON public.cell_realizations FOR ALL TO authenticated
  USING (public.current_user_can('celulas', 'manage'))
  WITH CHECK (public.current_user_can('celulas', 'manage'));

-- Políticas para cell_attendances
DROP POLICY IF EXISTS "cell_attendances_select" ON public.cell_attendances;
CREATE POLICY "cell_attendances_select" ON public.cell_attendances FOR SELECT TO authenticated
  USING (public.current_user_can('celulas', 'view') OR public.current_user_can('celulas', 'manage'));

DROP POLICY IF EXISTS "cell_attendances_all" ON public.cell_attendances;
CREATE POLICY "cell_attendances_all" ON public.cell_attendances FOR ALL TO authenticated
  USING (public.current_user_can('celulas', 'manage'))
  WITH CHECK (public.current_user_can('celulas', 'manage'));

-- Políticas para cell_visitors
DROP POLICY IF EXISTS "cell_visitors_select" ON public.cell_visitors;
CREATE POLICY "cell_visitors_select" ON public.cell_visitors FOR SELECT TO authenticated
  USING (public.current_user_can('celulas', 'view') OR public.current_user_can('celulas', 'manage'));

DROP POLICY IF EXISTS "cell_visitors_all" ON public.cell_visitors;
CREATE POLICY "cell_visitors_all" ON public.cell_visitors FOR ALL TO authenticated
  USING (public.current_user_can('celulas', 'manage'))
  WITH CHECK (public.current_user_can('celulas', 'manage'));

-- 7. Índices para performance
CREATE INDEX IF NOT EXISTS idx_cell_realizations_cell_id ON public.cell_realizations(cell_id);
CREATE INDEX IF NOT EXISTS idx_cell_realizations_ref_month ON public.cell_realizations(reference_month);
CREATE INDEX IF NOT EXISTS idx_cell_attendances_realization_id ON public.cell_attendances(realization_id);
CREATE INDEX IF NOT EXISTS idx_cell_visitors_realization_id ON public.cell_visitors(realization_id);
