-- =====================================================
-- MÓDULO DE CONSOLIDACAO
-- =====================================================
-- Data: 2026-02-19
-- Consolidação completa do módulo de conversões

-- =====================================================
-- 1. CHURCHES (Igrejas/Locais)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.churches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INT DEFAULT 0
);

-- Seed de igrejas
INSERT INTO public.churches (slug, name, sort_order, is_active) VALUES
    ('sede', 'Sede', 1, true),
    ('expansionista', 'Expansionista', 2, true),
    ('zona-oeste', 'Zona Oeste', 3, true),
    ('outros', 'Outros', 99, true)
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- 2. CELLS (Células)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.cells (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    name TEXT NOT NULL,
    description TEXT,
    day_of_week INT CHECK (day_of_week >= 0 AND day_of_week <= 6),
    time TIME,
    
    church_id UUID REFERENCES public.churches(id) ON DELETE SET NULL,
    leader_person_id UUID REFERENCES public.people(id) ON DELETE SET NULL,
    coleader_person_id UUID REFERENCES public.people(id) ON DELETE SET NULL,
    supervisor_person_id UUID REFERENCES public.people(id) ON DELETE SET NULL,
    
    address TEXT,
    cep TEXT,
    city TEXT,
    state TEXT,
    neighborhood TEXT,
    
    cell_type TEXT DEFAULT 'Comum' CHECK (cell_type IN ('Comum', 'Elite', 'Kids')),
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_cells_church_id ON public.cells(church_id);
CREATE INDEX IF NOT EXISTS idx_cells_leader_person_id ON public.cells(leader_person_id);
CREATE INDEX IF NOT EXISTS idx_cells_coleader_person_id ON public.cells(coleader_person_id);
CREATE INDEX IF NOT EXISTS idx_cells_is_active ON public.cells(is_active);

-- =====================================================
-- 3. CELL MEMBERS (Membros de Células)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.cell_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    cell_id UUID NOT NULL REFERENCES public.cells(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT now(),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(cell_id, person_id)
);

CREATE INDEX IF NOT EXISTS idx_cell_members_cell_id ON public.cell_members(cell_id);
CREATE INDEX IF NOT EXISTS idx_cell_members_person_id ON public.cell_members(person_id);

-- =====================================================
-- 4. TEAMS (Equipes de Consolidação)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    leader_person_id UUID REFERENCES public.people(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    sort_order INT DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Seed de equipes
INSERT INTO public.teams (slug, name, sort_order, is_active) VALUES
    ('equipe-a', 'Equipe A', 1, true),
    ('equipe-b', 'Equipe B', 2, true),
    ('equipe-c', 'Equipe C', 3, true),
    ('outros', 'Outros', 99, true)
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- 5. ARENAS (Locais de Consolidação)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.arenas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INT DEFAULT 0
);

-- Seed de arenas
INSERT INTO public.arenas (slug, name, sort_order, is_active) VALUES
    ('arena-principal', 'Arena Principal', 1, true),
    ('arena-secundaria', 'Arena Secundária', 2, true),
    ('outros', 'Outros', 99, true)
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- 6. CONVERSOES (Formulário de Conversão)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.conversoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Dados básicos
    nome TEXT NOT NULL,
    idade INT,
    genero TEXT CHECK (genero IN ('M', 'F')),
    telefone TEXT,
    email TEXT,
    
    -- Relacionamentos
    celula_id UUID REFERENCES public.cells(id) ON DELETE SET NULL,
    church_id UUID REFERENCES public.churches(id) ON DELETE SET NULL,
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    arena_id UUID REFERENCES public.arenas(id) ON DELETE SET NULL,
    consolidador_id UUID REFERENCES public.people(id) ON DELETE SET NULL,
    
    -- Endereço
    bairro TEXT,
    cidade TEXT,
    estado TEXT,
    cep TEXT,
    
    -- Escolaridade e contexto
    escolaridade TEXT,
    convidado_por TEXT,
    
    -- Informações espirituais
    ja_foi_em_igreja BOOLEAN,
    tem_oracao TEXT,
    tem_biblia BOOLEAN,
    quer_visita BOOLEAN,
    como_ficou_sabendo TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Status de processamento
    person_id UUID REFERENCES public.people(id) ON DELETE SET NULL,
    processed_at TIMESTAMPTZ,
    processed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_conversoes_celula_id ON public.conversoes(celula_id);
CREATE INDEX IF NOT EXISTS idx_conversoes_church_id ON public.conversoes(church_id);
CREATE INDEX IF NOT EXISTS idx_conversoes_consolidador_id ON public.conversoes(consolidador_id);
CREATE INDEX IF NOT EXISTS idx_conversoes_person_id ON public.conversoes(person_id);
CREATE INDEX IF NOT EXISTS idx_conversoes_created_at ON public.conversoes(created_at DESC);

-- RLS para conversões
ALTER TABLE public.conversoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON public.conversoes
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for all users" ON public.conversoes
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON public.conversoes
    FOR UPDATE USING (auth.role() = 'authenticated');

-- =====================================================
-- 7. CONSOLIDATION MESSAGES (Mensagens de Boas-Vindas)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.consolidation_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    sort_order INT DEFAULT 0
);

-- Seed de mensagens
INSERT INTO public.consolidation_messages (slug, title, message, is_active, sort_order) VALUES
    ('boas-vindas', 'Boas-Vindas', 'Seja bem-vindo à nossa igreja! Estamos muito felizes com sua decisão.', true, 1),
    ('primeira-visita', 'Primeira Visita', 'Obrigado por nos visitar! Esperamos vê-lo novamente.', true, 2),
    ('conversao', 'Conversão', 'Parabéns pela sua decisão! Este é o início de uma nova vida em Cristo.', true, 3)
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- 8. CELL REALIZATIONS (Realizações de Células)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.cell_realizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    cell_id UUID NOT NULL REFERENCES public.cells(id) ON DELETE CASCADE,
    realization_date DATE NOT NULL,
    
    -- Contagens
    num_members INT DEFAULT 0,
    num_visitors INT DEFAULT 0,
    num_conversions INT DEFAULT 0,
    
    -- Ofertas
    offering_amount DECIMAL(10,2) DEFAULT 0,
    
    -- Observações
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Quem registrou
    registered_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    
    UNIQUE(cell_id, realization_date)
);

CREATE INDEX IF NOT EXISTS idx_cell_realizations_cell_id ON public.cell_realizations(cell_id);
CREATE INDEX IF NOT EXISTS idx_cell_realizations_date ON public.cell_realizations(realization_date DESC);

-- =====================================================
-- 9. CELL ATTENDANCES (Presenças em Células)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.cell_attendances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    
    cell_realization_id UUID NOT NULL REFERENCES public.cell_realizations(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
    
    attendance_type TEXT DEFAULT 'present' CHECK (attendance_type IN ('present', 'absent', 'visitor')),
    notes TEXT,
    
    UNIQUE(cell_realization_id, person_id)
);

CREATE INDEX IF NOT EXISTS idx_cell_attendances_realization ON public.cell_attendances(cell_realization_id);
CREATE INDEX IF NOT EXISTS idx_cell_attendances_person ON public.cell_attendances(person_id);

-- =====================================================
-- 10. RLS BÁSICO PARA TABELAS AUXILIARES
-- =====================================================

-- Churches
ALTER TABLE public.churches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON public.churches FOR SELECT USING (true);

-- Cells
ALTER TABLE public.cells ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read access" ON public.cells FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated write access" ON public.cells FOR ALL USING (auth.role() = 'authenticated');

-- Teams
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON public.teams FOR SELECT USING (true);

-- Arenas
ALTER TABLE public.arenas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON public.arenas FOR SELECT USING (true);

-- Messages
ALTER TABLE public.consolidation_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON public.consolidation_messages FOR SELECT USING (true);
