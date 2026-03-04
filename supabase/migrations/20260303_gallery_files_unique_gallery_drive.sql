-- Adiciona UNIQUE constraint (gallery_id, drive_file_id) em gallery_files.
-- Necessário para que upsert com onConflict='gallery_id,drive_file_id' funcione
-- corretamente nas rotas /api/gallery/[id]/files e /api/rekognition/.../scan.
-- Remove duplicatas antes de adicionar o constraint.

DELETE FROM public.gallery_files gf
WHERE gf.id NOT IN (
  SELECT DISTINCT ON (gallery_id, drive_file_id) id
  FROM public.gallery_files
  ORDER BY gallery_id, drive_file_id, created_at DESC NULLS LAST
);

ALTER TABLE public.gallery_files
  ADD CONSTRAINT gallery_files_gallery_drive_unique UNIQUE (gallery_id, drive_file_id);
