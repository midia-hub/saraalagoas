-- Política de Storage para o bucket "faces"
-- Execute este SQL no Supabase: Dashboard → SQL Editor → New query → Cole e rode (Run).
--
-- Permite que o frontend (anon key) faça UPLOAD no bucket "faces", apenas na pasta "pending/*".

create policy "Allow anon insert into faces bucket"
on storage.objects
for insert
to anon
with check (
  bucket_id = 'faces'
  and (storage.foldername(name))[1] = 'pending'
);
