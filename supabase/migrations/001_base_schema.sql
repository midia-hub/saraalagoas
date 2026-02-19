-- =====================================================
-- BASE SCHEMA - People, Profiles, RBAC
-- =====================================================
-- Data: 2026-02-19
-- Consolidação das migrações base do sistema

-- =====================================================
-- 1. PEOPLE (Cadastro Central)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.people (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Relacionamentos
    leader_person_id UUID REFERENCES public.people(id) ON DELETE SET NULL,
    spouse_person_id UUID REFERENCES public.people(id) ON DELETE SET NULL,
    
    -- Dados Pessoais
    full_name TEXT NOT NULL,
    full_name_normalized TEXT GENERATED ALWAYS AS (
        lower(unaccent(full_name))
    ) STORED,
    sex TEXT CHECK (sex IN ('Masculino', 'Feminino')),
    birth_date DATE,
    marital_status TEXT CHECK (marital_status IN ('Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)')),
    marriage_date DATE,
    rg TEXT,
    cpf TEXT,
    special_needs TEXT,
    
    -- Endereço
    cep TEXT,
    city TEXT,
    state TEXT,
    neighborhood TEXT,
    address_line TEXT,
    address_number TEXT,
    address_complement TEXT,
    
    -- Contatos
    email TEXT,
    mobile_phone TEXT,
    phone TEXT,
    
    -- Igreja
    church_profile TEXT DEFAULT 'Visitante' CHECK (church_profile IN ('Membro', 'Frequentador', 'Visitante')),
    church_situation TEXT DEFAULT 'Ativo' CHECK (church_situation IN ('Ativo', 'Inativo')),
    church_role TEXT CHECK (church_role IN ('Nenhum', 'Obreiro', 'Voluntário', 'Diácono', 'Cooperador', 'Missionário', 'Pastor', 'Bispo')),
    entry_by TEXT CHECK (entry_by IN ('Batismo', 'Reconciliação', 'Transferência', 'Conversão', 'Outro')),
    entry_date DATE,
    status_in_church TEXT CHECK (status_in_church IN ('Ativo', 'Inativo')),
    conversion_date DATE,
    is_baptized BOOLEAN,
    baptism_date DATE,
    is_leader BOOLEAN DEFAULT false,
    is_pastor BOOLEAN DEFAULT false,
    
    -- Outros
    education_level TEXT,
    profession TEXT,
    nationality TEXT,
    birthplace TEXT,
    interviewed_by TEXT,
    registered_by TEXT,
    blood_type TEXT,
    avatar_url TEXT
);

CREATE INDEX IF NOT EXISTS idx_people_full_name_normalized ON public.people(full_name_normalized);
CREATE INDEX IF NOT EXISTS idx_people_email ON public.people(email);
CREATE INDEX IF NOT EXISTS idx_people_mobile_phone ON public.people(mobile_phone);
CREATE INDEX IF NOT EXISTS idx_people_cpf ON public.people(cpf);
CREATE INDEX IF NOT EXISTS idx_people_church_profile ON public.people(church_profile);
CREATE INDEX IF NOT EXISTS idx_people_leader_person_id ON public.people(leader_person_id);

-- RLS para people
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON public.people
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON public.people
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON public.people
    FOR UPDATE USING (auth.role() = 'authenticated');

-- =====================================================
-- 2. PROFILES (Ligação com Auth)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    email TEXT,
    role TEXT CHECK (role IN ('admin', 'editor', 'viewer')),
    access_profile_id UUID,
    role_id UUID,
    person_id UUID REFERENCES public.people(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_profiles_person_id ON public.profiles(person_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role_id ON public.profiles(role_id);

-- =====================================================
-- 3. RBAC SYSTEM
-- =====================================================

-- Resources (Módulos do sistema)
CREATE TABLE IF NOT EXISTS public.resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    key TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);

-- Permissions (Ações)
CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    action TEXT UNIQUE NOT NULL CHECK (action IN ('view', 'create', 'edit', 'delete', 'manage')),
    description TEXT
);

-- Roles (Funções)
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    key TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_admin BOOLEAN DEFAULT false,
    is_system BOOLEAN DEFAULT false,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);

-- Role Permissions (Relação Many-to-Many)
CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    UNIQUE(role_id, resource_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON public.role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_resource_id ON public.role_permissions(resource_id);

-- App Permissions (Permissões nomeadas)
CREATE TABLE IF NOT EXISTS public.app_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    code TEXT UNIQUE NOT NULL,
    resource_id UUID REFERENCES public.resources(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE,
    description TEXT
);

-- Função para obter permissões do usuário
CREATE OR REPLACE FUNCTION public.get_user_permissions(user_id UUID)
RETURNS TABLE (
    resource_key TEXT,
    permission_action TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT 
        r.key as resource_key,
        p.action as permission_action
    FROM public.profiles prof
    INNER JOIN public.roles ro ON prof.role_id = ro.id
    INNER JOIN public.role_permissions rp ON ro.id = rp.role_id
    INNER JOIN public.resources r ON rp.resource_id = r.id
    INNER JOIN public.permissions p ON rp.permission_id = p.id
    WHERE prof.id = user_id 
      AND ro.is_active = true 
      AND r.is_active = true;
END;
$$;

-- =====================================================
-- 4. SEED DATA
-- =====================================================

-- Inserir Permissions básicas
INSERT INTO public.permissions (action, description) VALUES
    ('view', 'Visualizar recursos'),
    ('create', 'Criar novos registros'),
    ('edit', 'Editar registros existentes'),
    ('delete', 'Deletar registros'),
    ('manage', 'Gerenciar completamente (todas ações)')
ON CONFLICT (action) DO NOTHING;

-- Inserir Resources principais
INSERT INTO public.resources (key, name, category, sort_order) VALUES
    ('dashboard', 'Dashboard', 'Principal', 1),
    ('configuracoes', 'Configurações', 'Principal', 2),
    ('pessoas', 'Pessoas', 'Cadastros', 10),
    ('usuarios', 'Usuários', 'Cadastros', 11),
    ('roles', 'Roles e Permissões', 'Cadastros', 12),
    ('consolidacao', 'Consolidação', 'Módulos', 20),
    ('celulas', 'Células', 'Módulos', 21),
    ('livraria_produtos', 'Livraria - Produtos', 'Módulos', 30),
    ('livraria_estoque', 'Livraria - Estoque', 'Módulos', 31),
    ('livraria_dashboard', 'Livraria - Dashboard', 'Módulos', 32),
    ('galeria', 'Galeria', 'Mídia', 40),
    ('upload', 'Upload', 'Mídia', 41),
    ('instagram', 'Instagram', 'Mídia', 42)
ON CONFLICT (key) DO NOTHING;

-- Role Admin padrão
INSERT INTO public.roles (key, name, description, is_admin, is_system) VALUES
    ('admin', 'Administrador', 'Acesso total ao sistema', true, true)
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- 5. STORAGE BUCKETS
-- =====================================================

-- Bucket para avatars
INSERT INTO storage.buckets (id, name, public) VALUES 
    ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas para avatars
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload avatars" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'avatars' 
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Users can update their own avatars" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'avatars' 
        AND auth.role() = 'authenticated'
    );
