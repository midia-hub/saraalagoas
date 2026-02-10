# Meta integrations: RLS e segurança

## Por que aparece "new row violates row-level security policy"?

A tabela `meta_integrations` tem **RLS (Row Level Security)** ativado. As políticas permitem:

- **SELECT**: usuários autenticados que tenham permissão de **ver** a página Instagram (admin, editor ou perfil com `can_view` em Instagram).
- **INSERT**: apenas quem tem permissão de **criar** em Instagram (`can_manage_meta_integrations('create')`).
- **UPDATE/DELETE**: quem tem permissão de **editar** ou **deletar** em Instagram.

O **callback do OAuth** (`/api/meta/oauth/callback`) é acessado por **redirecionamento do Facebook**. Nessa requisição **não vem o JWT do usuário** (nem cookie de sessão). Por isso, do ponto de vista do Supabase, não há `auth.uid()` e a política de INSERT bloqueia o insert.

## Solução na aplicação

A rota do callback usa um cliente Supabase com **service role** (`SUPABASE_SERVICE_ROLE_KEY`), que **ignora RLS**. O usuário que está conectando já foi identificado de forma segura pelo **state assinado** (validado no servidor). Assim:

1. **Configure `SUPABASE_SERVICE_ROLE_KEY`** na Vercel (Settings → Environment Variables).
2. **Faça redeploy** para a API usar esse cliente no callback.

## Validar tabela e RLS no Supabase

Para garantir que a tabela e as políticas estão corretas:

1. Abra o **Supabase Dashboard** do projeto.
2. Vá em **SQL Editor** → **New query**.
3. Copie todo o conteúdo de **`supabase/migrations/20260210_meta_integrations_rls.sql`**.
4. Cole na query e clique em **Run**.

O script é idempotente: cria a tabela e índices se não existirem, recria a função `can_manage_meta_integrations` e as quatro políticas RLS (select, insert, update, delete).

## Dependências

A função `can_manage_meta_integrations` usa:

- **`public.profiles`** (colunas `id`, `role`, `access_profile_id`)
- **`public.access_profiles`** (coluna `is_admin`)
- **`public.access_profile_permissions`** (colunas `profile_id`, `page_key`, `can_view`, `can_create`, `can_edit`, `can_delete`)
- **`public.access_pages`** deve ter uma linha com **`key = 'instagram'`** (inserida pela migração `20260210_instagram.sql`).

Se o projeto já tem o admin (supabase-admin.sql) e a migração do Instagram aplicadas, não é preciso fazer mais nada além do script acima e da env na Vercel.
