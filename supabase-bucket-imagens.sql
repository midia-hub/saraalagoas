-- Bucket "imagens" para mídia da página inicial (público para leitura).
-- Execute no Supabase: Dashboard → SQL Editor → Cole e rode (Run).
-- Depois, na pasta do projeto: npm run upload:imagens

-- Criar bucket público (se não existir)
insert into storage.buckets (id, name, public)
values ('imagens', 'imagens', true)
on conflict (id) do update set public = true;

-- Remover políticas antigas se existirem (para poder reexecutar este script)
drop policy if exists "Imagens são públicas (leitura)" on storage.objects;
drop policy if exists "Permitir upload inicial no bucket imagens" on storage.objects;

-- Leitura pública: qualquer um pode ver os arquivos
create policy "Imagens são públicas (leitura)"
on storage.objects for select
to public
using (bucket_id = 'imagens');

-- Upload permitido para anon (para o script de upload inicial; opcional remover depois)
create policy "Permitir upload inicial no bucket imagens"
on storage.objects for insert
to anon
with check (bucket_id = 'imagens');
