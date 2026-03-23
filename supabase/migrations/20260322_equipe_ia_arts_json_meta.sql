-- Permite arquivos .json de metadados (descrições) ao lado das imagens no repositório.

update storage.buckets
set allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'application/json']
where id = 'equipe_ia_arts';
