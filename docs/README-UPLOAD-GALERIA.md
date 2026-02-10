# Upload + Galeria (Cultos/Eventos)

Este módulo usa:
- **Next.js App Router**
- **Supabase** para metadados (galerias, cultos, settings)
- **Google Drive API** para armazenar imagens

## 1) Variáveis de ambiente

No `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

GOOGLE_SERVICE_ACCOUNT_EMAIL=...
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_DRIVE_ROOT_FOLDER_ID=...
```

Opcional:

```env
ADMIN_SECRET=...
```

## 2) Compartilhar pasta do Drive com a Service Account

1. Abra a pasta raiz no Google Drive (ID = `GOOGLE_DRIVE_ROOT_FOLDER_ID`).
2. Compartilhe com o e-mail de `GOOGLE_SERVICE_ACCOUNT_EMAIL`.
3. Permissão: **Editor**.

Sem isso, a API não consegue criar subpastas e enviar arquivos.

## 3) Migração no banco

Execute no SQL Editor do Supabase:

- `supabase-admin.sql` (se ainda não executou)
- `supabase-gallery.sql`

## 4) Rotas principais

- `/upload` → formulário em etapas (tipo, culto/evento, data, descrição, imagens)
- `/galeria` → índice com filtros
- `/galeria/[tipo]/[slug]/[date]` → fotos da galeria
- `/admin/settings` → home route + CRUD de cultos

## 5) Home route dinâmica

A rota `/` lê `settings.home_route`:
- se for `/`, exibe home institucional
- se for outra rota (ex.: `/upload`, `/galeria`), redireciona automaticamente

