-- Bucket temporário para upload de imagens grandes (evita limite 4,5 MB da Vercel).
-- Fluxo: cliente envia arquivo direto ao Supabase Storage → API lê, envia ao Drive e remove do bucket.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'temp-gallery-uploads',
  'temp-gallery-uploads',
  false,
  52428800,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  file_size_limit = 52428800,
  allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

-- Apenas usuários autenticados podem fazer upload; path deve começar com o id do usuário.
drop policy if exists "temp_gallery_uploads_authenticated_insert" on storage.objects;
create policy "temp_gallery_uploads_authenticated_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'temp-gallery-uploads'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Leitura e exclusão: apenas via service_role (API backend). Sem policy para authenticated = só backend acessa.
-- O backend usa createSupabaseServiceClient() que ignora RLS.
