-- Registra quem fez o upload de cada arquivo na galeria (usuário logado no admin).
alter table public.gallery_files
  add column if not exists uploaded_by_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists uploaded_by_name text;

comment on column public.gallery_files.uploaded_by_user_id is 'ID do usuário (profile) que fez o upload';
comment on column public.gallery_files.uploaded_by_name is 'Nome de exibição de quem fez o upload';

create index if not exists idx_gallery_files_uploaded_by on public.gallery_files(uploaded_by_user_id);
