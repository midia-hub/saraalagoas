-- =====================================================
-- MÓDULO DE GALERIA E REDES SOCIAIS
-- =====================================================
-- Data: 2026-02-19
-- Sistema de galeria de fotos e integração com Instagram/Meta

-- =====================================================
-- 1. GALLERIES (Álbuns de Fotos)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.galleries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Informações do álbum
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    
    -- Drive
    drive_folder_id TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    
    -- Data do evento
    event_date DATE,
    
    -- Organização
    sort_order INT DEFAULT 0,
    
    -- Thumbnail
    thumbnail_url TEXT,
    
    -- Contadores (cache)
    photos_count INT DEFAULT 0,
    
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_galleries_slug ON public.galleries(slug);
CREATE INDEX IF NOT EXISTS idx_galleries_is_active ON public.galleries(is_active);
CREATE INDEX IF NOT EXISTS idx_galleries_event_date ON public.galleries(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_galleries_drive_folder_id ON public.galleries(drive_folder_id);

-- =====================================================
-- 2. GALLERY FILES (Arquivos da Galeria)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.gallery_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    gallery_id UUID NOT NULL REFERENCES public.galleries(id) ON DELETE CASCADE,
    
    -- Google Drive
    drive_file_id TEXT NOT NULL,
    drive_web_view_link TEXT,
    drive_thumbnail_link TEXT,
    
    -- Informações do arquivo
    file_name TEXT,
    mime_type TEXT,
    file_size BIGINT,
    
    -- Cache de URLs (renovados periodicamente)
    cached_url TEXT,
    cached_thumbnail_url TEXT,
    cache_expires_at TIMESTAMPTZ,
    
    -- Organização
    sort_order INT DEFAULT 0,
    
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_gallery_files_gallery_id ON public.gallery_files(gallery_id);
CREATE INDEX IF NOT EXISTS idx_gallery_files_drive_file_id ON public.gallery_files(drive_file_id);
CREATE INDEX IF NOT EXISTS idx_gallery_files_cache_expires ON public.gallery_files(cache_expires_at);

-- =====================================================
-- 3. INSTAGRAM ACCOUNTS (Contas do Instagram)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.instagram_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Identificadores
    instagram_user_id TEXT UNIQUE NOT NULL,
    username TEXT NOT NULL,
    
    -- Tokens
    access_token TEXT NOT NULL,
    token_type TEXT DEFAULT 'USER',
    expires_at TIMESTAMPTZ,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_instagram_accounts_instagram_user_id ON public.instagram_accounts(instagram_user_id);
CREATE INDEX IF NOT EXISTS idx_instagram_accounts_is_active ON public.instagram_accounts(is_active);

-- =====================================================
-- 4. INSTAGRAM POSTS (Posts do Instagram)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.instagram_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Relacionamento
    instagram_account_id UUID REFERENCES public.instagram_accounts(id) ON DELETE CASCADE,
    
    -- Identificadores do Instagram
    instagram_post_id TEXT UNIQUE NOT NULL,
    permalink TEXT,
    
    -- Tipo de mídia
    media_type TEXT CHECK (media_type IN ('IMAGE', 'VIDEO', 'CAROUSEL_ALBUM')),
    media_url TEXT,
    thumbnail_url TEXT,
    
    -- Conteúdo
    caption TEXT,
    
    -- Métricas
    like_count INT DEFAULT 0,
    comments_count INT DEFAULT 0,
    
    -- Data do post no Instagram
    timestamp TIMESTAMPTZ,
    
    -- Status
    is_visible BOOLEAN DEFAULT true,
    
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_instagram_posts_instagram_post_id ON public.instagram_posts(instagram_post_id);
CREATE INDEX IF NOT EXISTS idx_instagram_posts_account_id ON public.instagram_posts(instagram_account_id);
CREATE INDEX IF NOT EXISTS idx_instagram_posts_timestamp ON public.instagram_posts(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_instagram_posts_is_visible ON public.instagram_posts(is_visible);

-- =====================================================
-- 5. SOCIAL POSTS (Posts de Redes Sociais - Geral)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.social_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Plataforma
    platform TEXT NOT NULL CHECK (platform IN ('instagram', 'facebook', 'youtube', 'twitter')),
    
    -- Identificadores
    external_id TEXT NOT NULL,
    permalink TEXT,
    
    -- Conteúdo
    title TEXT,
    caption TEXT,
    media_type TEXT,
    media_url TEXT,
    thumbnail_url TEXT,
    
    -- Métricas
    likes_count INT DEFAULT 0,
    comments_count INT DEFAULT 0,
    shares_count INT DEFAULT 0,
    views_count INT DEFAULT 0,
    
    -- Data original
    published_at TIMESTAMPTZ,
    
    -- Status
    is_visible BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    
    metadata JSONB DEFAULT '{}'::jsonb,
    
    UNIQUE(platform, external_id)
);

CREATE INDEX IF NOT EXISTS idx_social_posts_platform ON public.social_posts(platform);
CREATE INDEX IF NOT EXISTS idx_social_posts_published_at ON public.social_posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_posts_is_visible ON public.social_posts(is_visible);

-- =====================================================
-- 6. META TOKENS (Tokens do Meta/Facebook)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.meta_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Identificador
    key TEXT UNIQUE NOT NULL,
    
    -- Token
    access_token TEXT NOT NULL,
    token_type TEXT DEFAULT 'PAGE',
    
    -- IDs
    page_id TEXT,
    instagram_business_account_id TEXT,
    
    -- Expiração
    expires_at TIMESTAMPTZ,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_meta_tokens_key ON public.meta_tokens(key);
CREATE INDEX IF NOT EXISTS idx_meta_tokens_is_active ON public.meta_tokens(is_active);

-- =====================================================
-- 7. STORAGE BUCKET: gallery-images
-- =====================================================

INSERT INTO storage.buckets (id, name, public) VALUES 
    ('gallery-images', 'gallery-images', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas para gallery-images
CREATE POLICY "Gallery images are publicly accessible" ON storage.objects
    FOR SELECT USING (bucket_id = 'gallery-images');

CREATE POLICY "Authenticated users can upload gallery images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'gallery-images' 
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Authenticated users can update gallery images" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'gallery-images' 
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Authenticated users can delete gallery images" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'gallery-images' 
        AND auth.role() = 'authenticated'
    );

-- =====================================================
-- 8. STORAGE BUCKET: social-media
-- =====================================================

INSERT INTO storage.buckets (id, name, public) VALUES 
    ('social-media', 'social-media', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas para social-media
CREATE POLICY "Social media are publicly accessible" ON storage.objects
    FOR SELECT USING (bucket_id = 'social-media');

CREATE POLICY "Authenticated users can upload social media" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'social-media' 
        AND auth.role() = 'authenticated'
    );

-- =====================================================
-- 9. RLS PARA GALERIA E REDES SOCIAIS
-- =====================================================

-- Galleries
ALTER TABLE public.galleries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view active galleries" ON public.galleries 
    FOR SELECT USING (is_active = true);
CREATE POLICY "Authenticated can manage galleries" ON public.galleries 
    FOR ALL USING (auth.role() = 'authenticated');

-- Gallery Files
ALTER TABLE public.gallery_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view gallery files" ON public.gallery_files 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.galleries 
            WHERE id = gallery_files.gallery_id 
            AND is_active = true
        )
    );
CREATE POLICY "Authenticated can manage gallery files" ON public.gallery_files 
    FOR ALL USING (auth.role() = 'authenticated');

-- Instagram Posts
ALTER TABLE public.instagram_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view visible posts" ON public.instagram_posts 
    FOR SELECT USING (is_visible = true);
CREATE POLICY "Authenticated can manage posts" ON public.instagram_posts 
    FOR ALL USING (auth.role() = 'authenticated');

-- Social Posts
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view visible social posts" ON public.social_posts 
    FOR SELECT USING (is_visible = true);
CREATE POLICY "Authenticated can manage social posts" ON public.social_posts 
    FOR ALL USING (auth.role() = 'authenticated');

-- Instagram Accounts (admin only)
ALTER TABLE public.instagram_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read accounts" ON public.instagram_accounts 
    FOR SELECT USING (auth.role() = 'authenticated');

-- Meta Tokens (admin only)
ALTER TABLE public.meta_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read tokens" ON public.meta_tokens 
    FOR SELECT USING (auth.role() = 'authenticated');
