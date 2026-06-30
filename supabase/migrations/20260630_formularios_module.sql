-- ============================================================
-- Módulo de Formulários — midia.saraalagoas.com
-- ============================================================

create table if not exists formularios (
  id          uuid primary key default gen_random_uuid(),
  titulo      text not null,
  descricao   text,
  slug        text not null unique,
  schema      jsonb not null default '{"campos": []}',
  config      jsonb not null default '{"limite_respostas": null, "data_encerramento": null, "mensagem_sucesso": "Obrigado pela sua resposta!"}',
  ativo       boolean not null default true,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists formulario_respostas (
  id             uuid primary key default gen_random_uuid(),
  formulario_id  uuid not null references formularios(id) on delete cascade,
  dados          jsonb not null default '{}',
  created_at     timestamptz not null default now()
);

create index if not exists formularios_slug_idx        on formularios (slug);
create index if not exists formularios_ativo_idx       on formularios (ativo);
create index if not exists form_respostas_form_id_idx  on formulario_respostas (formulario_id);
create index if not exists form_respostas_created_idx  on formulario_respostas (created_at);

-- updated_at automático
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger formularios_updated_at
  before update on formularios
  for each row execute function set_updated_at();

-- RLS
alter table formularios          enable row level security;
alter table formulario_respostas enable row level security;

-- Formulários: autenticados podem gerenciar
create policy "Admin gerencia formularios" on formularios
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Respostas: qualquer um pode inserir (formulário público); autenticados leem
create policy "Publico insere respostas" on formulario_respostas
  for insert
  with check (true);

create policy "Admin le respostas" on formulario_respostas
  for select
  using (auth.role() = 'authenticated');

create policy "Admin deleta respostas" on formulario_respostas
  for delete
  using (auth.role() = 'authenticated');

-- Bucket de uploads de formulário (idempotente)
insert into storage.buckets (id, name, public)
values ('formulario-uploads', 'formulario-uploads', false)
on conflict (id) do nothing;

create policy "Admin acessa uploads formulario" on storage.objects
  for all
  using (bucket_id = 'formulario-uploads' and auth.role() = 'authenticated')
  with check (bucket_id = 'formulario-uploads' and auth.role() = 'authenticated');

create policy "Publico envia uploads formulario" on storage.objects
  for insert
  with check (bucket_id = 'formulario-uploads');
