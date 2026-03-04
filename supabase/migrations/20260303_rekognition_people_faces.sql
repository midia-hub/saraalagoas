-- =====================================================
-- MÓDULO REKOGNITION — Reconhecimento Facial
-- =====================================================
-- Data: 2026-03-03
-- Tabelas para o módulo de identificação facial com AWS Rekognition

-- Tabela de pessoas de referência para reconhecimento
CREATE TABLE IF NOT EXISTS public.rekognition_people (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    -- Nome da pessoa
    name TEXT NOT NULL,

    -- Imagem de referência armazenada no Supabase Storage (bucket: rekognition-references)
    reference_storage_path TEXT,
    reference_url TEXT,

    -- AWS Rekognition
    collection_id TEXT NOT NULL DEFAULT 'sara-midia-fotos',
    face_id TEXT,                           -- FaceId retornado pelo IndexFaces
    external_image_id TEXT,                 -- ExternalImageId usado no IndexFaces

    -- Status do indexamento
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'indexed', 'error')),
    status_message TEXT,

    -- Metadados
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_rekognition_people_status ON public.rekognition_people(status);
CREATE INDEX IF NOT EXISTS idx_rekognition_people_face_id ON public.rekognition_people(face_id);

-- =====================================================
-- Tabela de correspondências foto × pessoa
-- =====================================================
CREATE TABLE IF NOT EXISTS public.rekognition_face_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),

    -- Pessoa reconhecida
    person_id UUID NOT NULL REFERENCES public.rekognition_people(id) ON DELETE CASCADE,

    -- Arquivo da galeria
    drive_file_id TEXT NOT NULL,
    gallery_id UUID REFERENCES public.galleries(id) ON DELETE CASCADE,

    -- Score Rekognition (0-100)
    similarity NUMERIC(5,2) NOT NULL DEFAULT 0,

    -- Evita duplicatas
    UNIQUE (person_id, drive_file_id)
);

CREATE INDEX IF NOT EXISTS idx_rekognition_matches_person_id ON public.rekognition_face_matches(person_id);
CREATE INDEX IF NOT EXISTS idx_rekognition_matches_drive_file ON public.rekognition_face_matches(drive_file_id);

-- =====================================================
-- RLS
-- =====================================================
ALTER TABLE public.rekognition_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rekognition_face_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_rekognition_people"
    ON public.rekognition_people FOR ALL
    TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_rekognition_matches"
    ON public.rekognition_face_matches FOR ALL
    TO service_role USING (true) WITH CHECK (true);
