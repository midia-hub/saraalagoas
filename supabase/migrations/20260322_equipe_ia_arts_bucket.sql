-- Bucket público para imagens geradas pela Equipe de IA (DALL-E).
-- As URLs do OpenAI expiram; o backend faz download e persiste aqui para agendamento.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'equipe_ia_arts',
  'equipe_ia_arts',
  true,
  10485760, -- 10 MB
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
  public             = true,
  file_size_limit    = 10485760,
  allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp'];

-- Leitura pública (necessário para que o Instagram possa baixar a imagem via URL)
drop policy if exists "equipe_ia_arts_public_read" on storage.objects;
create policy "equipe_ia_arts_public_read"
on storage.objects for select
to public
using (bucket_id = 'equipe_ia_arts');

-- Upload apenas via service_role (backend — supabaseServer)
-- Não criamos policy para authenticated/anon; o backend usa service role que bypassa RLS.
