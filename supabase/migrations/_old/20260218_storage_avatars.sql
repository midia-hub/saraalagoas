-- Criar bucket de avatars se não existir
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 1048576, '{image/*}')
ON CONFLICT (id) DO NOTHING;

-- Políticas de armazenamento para avatars
CREATE POLICY "Avatars publicos para leitura"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Usuarios autenticados podem enviar avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Usuarios podem atualizar seus proprios avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars');

CREATE POLICY "Usuarios podem deletar seus proprios avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');
