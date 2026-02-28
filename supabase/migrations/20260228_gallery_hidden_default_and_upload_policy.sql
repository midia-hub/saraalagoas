-- ============================================================
-- Álbuns criados via upload ficam ocultos por padrão
-- O admin pode tornar visível manualmente em /admin/galeria
-- ============================================================

-- 1. Muda o DEFAULT da coluna hidden_from_public para TRUE.
--    Assim, mesmo inserções diretas no banco ficam ocultas.
ALTER TABLE galleries
  ALTER COLUMN hidden_from_public SET DEFAULT true;

-- ============================================================
-- 2. Garante o bucket temp-gallery-uploads com as políticas
--    corretas para upload externo (app localhost:3001 ou mobile).
-- ============================================================

-- Cria bucket se não existir
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'temp-gallery-uploads',
  'temp-gallery-uploads',
  false,
  52428800,   -- 50 MB
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit    = 52428800,
  allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

-- Política de INSERT: qualquer usuário autenticado pode enviar
-- arquivos desde que o primeiro segmento do path seja o próprio auth.uid().
DROP POLICY IF EXISTS "temp_gallery_uploads_authenticated_insert" ON storage.objects;
CREATE POLICY "temp_gallery_uploads_authenticated_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'temp-gallery-uploads'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Política de SELECT: apenas o service_role (backend) pode ler.
-- Sem policy para "authenticated" = RLS bloqueia acesso público por design.
-- O backend usa createSupabaseServiceClient() que ignora RLS.

-- Política de DELETE: backend (service_role) pode apagar depois de copiar para o Drive.
DROP POLICY IF EXISTS "temp_gallery_uploads_service_delete" ON storage.objects;
CREATE POLICY "temp_gallery_uploads_service_delete"
ON storage.objects
FOR DELETE
TO service_role
USING (bucket_id = 'temp-gallery-uploads');
