-- =====================================================
-- MÓDULOS AUXILIARES E CONFIGURAÇÕES
-- =====================================================
-- Data: 2026-02-19
-- XP26 Feedback, Disparos Webhook, Site Config

-- =====================================================
-- 1. XP26 FEEDBACK (Pesquisa de Experiência)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.xp26_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Nome (opcional)
    name TEXT,
    
    -- Respostas da pesquisa
    overall_experience INT CHECK (overall_experience >= 1 AND overall_experience <= 5),
    worship_quality INT CHECK (worship_quality >= 1 AND worship_quality <= 5),
    message_quality INT CHECK (message_quality >= 1 AND message_quality <= 5),
    hospitality_quality INT CHECK (hospitality_quality >= 1 AND hospitality_quality <= 5),
    would_recommend BOOLEAN,
    
    -- Comentários
    what_liked TEXT,
    what_improve TEXT,
    suggestions TEXT,
    
    -- Contato
    email TEXT,
    phone TEXT,
    wants_contact BOOLEAN DEFAULT false,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_xp26_feedback_created_at ON public.xp26_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_xp26_feedback_overall_experience ON public.xp26_feedback(overall_experience);

-- RLS para xp26_feedback
ALTER TABLE public.xp26_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit feedback" ON public.xp26_feedback
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated can view feedback" ON public.xp26_feedback
    FOR SELECT USING (auth.role() = 'authenticated');

-- =====================================================
-- 2. SITE CONFIG (Configurações do Site)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.site_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Chave única para configuração
    key TEXT UNIQUE NOT NULL,
    
    -- Valor (pode ser JSON)
    value JSONB NOT NULL,
    
    -- Tipo de dado
    value_type TEXT DEFAULT 'json' CHECK (value_type IN ('string', 'number', 'boolean', 'json', 'array')),
    
    -- Descrição
    description TEXT,
    
    -- Categoria
    category TEXT DEFAULT 'geral' CHECK (category IN ('geral', 'social', 'contato', 'horarios', 'enderecos', 'outros')),
    
    -- Validação
    is_public BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_site_config_key ON public.site_config(key);
CREATE INDEX IF NOT EXISTS idx_site_config_category ON public.site_config(category);
CREATE INDEX IF NOT EXISTS idx_site_config_is_public ON public.site_config(is_public);

-- RLS para site_config
ALTER TABLE public.site_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view public configs" ON public.site_config
    FOR SELECT USING (is_public = true AND is_active = true);

CREATE POLICY "Authenticated can view all configs" ON public.site_config
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can manage configs" ON public.site_config
    FOR ALL USING (auth.role() = 'authenticated');

-- Seed de configurações básicas
INSERT INTO public.site_config (key, value, value_type, category, is_public, description) VALUES
    ('site_name', '"Igreja Mídia"', 'string', 'geral', true, 'Nome do site'),
    ('site_description', '"Comunidade de fé e transformação"', 'string', 'geral', true, 'Descrição do site'),
    ('contact_email', '"contato@midia.church"', 'string', 'contato', true, 'Email de contato'),
    ('contact_phone', '"(11) 99999-9999"', 'string', 'contato', true, 'Telefone de contato'),
    ('contact_whatsapp', '"5511999999999"', 'string', 'contato', true, 'WhatsApp'),
    ('address', '{"street": "Rua Principal", "number": "123", "neighborhood": "Centro", "city": "São Paulo", "state": "SP", "cep": "01000-000"}', 'json', 'enderecos', true, 'Endereço da igreja'),
    ('social_instagram', '"@midia.church"', 'string', 'social', true, 'Instagram'),
    ('social_facebook', '"midia.church"', 'string', 'social', true, 'Facebook'),
    ('social_youtube', '"@midiachannel"', 'string', 'social', true, 'YouTube'),
    ('service_times', '{"domingo": ["09:00", "18:00"], "quarta": ["19:30"]}', 'json', 'horarios', true, 'Horários dos cultos')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- 3. DISPAROS WEBHOOK (Logs de Disparos)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.disparos_webhook (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- Origem
    source TEXT NOT NULL,
    event_type TEXT,
    
    -- Payload
    payload JSONB NOT NULL,
    headers JSONB,
    
    -- Processamento
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMPTZ,
    
    -- Resultado
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'error')),
    error_message TEXT,
    response JSONB,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_disparos_webhook_created_at ON public.disparos_webhook(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_disparos_webhook_source ON public.disparos_webhook(source);
CREATE INDEX IF NOT EXISTS idx_disparos_webhook_processed ON public.disparos_webhook(processed);
CREATE INDEX IF NOT EXISTS idx_disparos_webhook_status ON public.disparos_webhook(status);

-- RLS para disparos_webhook
ALTER TABLE public.disparos_webhook ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view webhooks" ON public.disparos_webhook
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can insert webhooks" ON public.disparos_webhook
    FOR INSERT WITH CHECK (true);

-- =====================================================
-- 4. OFFERINGS (Ofertas/Dízimos)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.offerings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Doador
    person_id UUID REFERENCES public.people(id) ON DELETE SET NULL,
    donor_name TEXT,
    donor_email TEXT,
    donor_phone TEXT,
    
    -- Tipo
    offering_type TEXT DEFAULT 'dizimo' CHECK (offering_type IN ('dizimo', 'oferta', 'missoes', 'construcao', 'outro')),
    
    -- Valor
    amount DECIMAL(10,2) NOT NULL,
    
    -- Forma de pagamento
    payment_method TEXT NOT NULL CHECK (payment_method IN ('dinheiro', 'pix', 'transferencia', 'debito', 'credito', 'online')),
    
    -- Data
    offering_date DATE NOT NULL,
    
    -- Igreja/Local
    church_id UUID REFERENCES public.churches(id) ON DELETE SET NULL,
    
    -- Status
    status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    
    -- Observações
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Responsável pelo registro
    registered_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_offerings_person_id ON public.offerings(person_id);
CREATE INDEX IF NOT EXISTS idx_offerings_offering_date ON public.offerings(offering_date DESC);
CREATE INDEX IF NOT EXISTS idx_offerings_offering_type ON public.offerings(offering_type);
CREATE INDEX IF NOT EXISTS idx_offerings_church_id ON public.offerings(church_id);
CREATE INDEX IF NOT EXISTS idx_offerings_created_at ON public.offerings(created_at DESC);

-- RLS para offerings
ALTER TABLE public.offerings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view offerings" ON public.offerings
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can create offerings" ON public.offerings
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can update offerings" ON public.offerings
    FOR UPDATE USING (auth.role() = 'authenticated');

-- =====================================================
-- 5. PRAYER REQUESTS (Pedidos de Oração)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.prayer_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Solicitante
    person_id UUID REFERENCES public.people(id) ON DELETE SET NULL,
    requester_name TEXT NOT NULL,
    requester_email TEXT,
    requester_phone TEXT,
    
    -- Pedido
    prayer_request TEXT NOT NULL,
    is_anonymous BOOLEAN DEFAULT false,
    is_urgent BOOLEAN DEFAULT false,
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'praying', 'answered', 'archived')),
    
    -- Privacidade
    is_public BOOLEAN DEFAULT false,
    
    -- Categoria
    category TEXT CHECK (category IN ('saude', 'familia', 'financeiro', 'trabalho', 'espiritual', 'outro')),
    
    -- Resposta
    prayer_notes TEXT,
    answered_at TIMESTAMPTZ,
    testimony TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_prayer_requests_person_id ON public.prayer_requests(person_id);
CREATE INDEX IF NOT EXISTS idx_prayer_requests_status ON public.prayer_requests(status);
CREATE INDEX IF NOT EXISTS idx_prayer_requests_created_at ON public.prayer_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prayer_requests_is_public ON public.prayer_requests(is_public);

-- RLS para prayer_requests
ALTER TABLE public.prayer_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit prayer requests" ON public.prayer_requests
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can view public prayer requests" ON public.prayer_requests
    FOR SELECT USING (is_public = true AND status IN ('praying', 'answered'));

CREATE POLICY "Authenticated can view all prayer requests" ON public.prayer_requests
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can update prayer requests" ON public.prayer_requests
    FOR UPDATE USING (auth.role() = 'authenticated');

-- =====================================================
-- 6. FUNCTION: Updated_at Trigger
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger em todas as tabelas relevantes
CREATE TRIGGER update_people_updated_at BEFORE UPDATE ON public.people 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_churches_updated_at BEFORE UPDATE ON public.churches 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cells_updated_at BEFORE UPDATE ON public.cells 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversoes_updated_at BEFORE UPDATE ON public.conversoes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON public.sales 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_galleries_updated_at BEFORE UPDATE ON public.galleries 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_offerings_updated_at BEFORE UPDATE ON public.offerings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prayer_requests_updated_at BEFORE UPDATE ON public.prayer_requests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 7. FUNCTION: Unaccent (para buscas normalizadas)
-- =====================================================

CREATE EXTENSION IF NOT EXISTS unaccent;

-- =====================================================
-- FIM DAS MIGRAÇÕES
-- =====================================================
