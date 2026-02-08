# Painel Admin – Configuração

Este projeto inclui uma área **Admin** para editar as informações do site e gerenciar usuários de acesso, usando **Supabase Auth** e tabelas no banco.

## O que foi criado

- **Página Admin** em `/admin` (ou `/saraalagoas/admin` se usar basePath):
  - **Configurações do site**: edição de nome, descrição, WhatsApp, redes sociais, **menu**, endereço, cultos, textos das seções (missão, célula, kids, ofertas, imersão).
  - **Usuários**: convite por e-mail (envio de link para definir senha).

- **Autenticação**: login com e-mail/senha ou “link mágico” por e-mail (Supabase Auth).

- **Banco**: tabelas `site_config` (configuração em JSON) e `profiles` (perfil e role: admin/editor/viewer). A página inicial lê a config do Supabase e usa como padrão o `config/site.ts` se não houver nada salvo.

## Passo a passo

### 1. Variáveis de ambiente (Next.js)

No **.env.local** (raiz do projeto), use as mesmas credenciais do Supabase com o prefixo `NEXT_PUBLIC_`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key
```

### 2. Rodar a migração no Supabase

1. No [Dashboard do Supabase](https://supabase.com/dashboard), abra o projeto.
2. Vá em **SQL Editor** e execute o conteúdo do arquivo **supabase-admin.sql** (cria `site_config`, `profiles`, RLS e trigger).

### 3. Criar o primeiro usuário admin

1. Em **Authentication** > **Users**, crie um usuário (e-mail e senha) ou use “Sign up” na página `/admin/login`.
2. No **SQL Editor**, defina esse usuário como admin (substitua `USER_UUID` pelo id do usuário em Authentication):

```sql
UPDATE public.profiles SET role = 'admin' WHERE id = 'USER_UUID';
```

Se o trigger `on_auth_user_created` estiver ativo, todo novo usuário já ganha uma linha em `profiles` com role `viewer`; basta alterar para `admin` no SQL acima.

### 4. (Opcional) Convite de usuários

Para que a aba **Usuários** do Admin consiga **convidar por e-mail** (link para definir senha), é preciso publicar a **Edge Function** `admin-invite-user`:

1. Instale o [Supabase CLI](https://supabase.com/docs/guides/cli) e faça login.
2. No projeto, execute:

```bash
supabase functions deploy admin-invite-user
```

A função usa a variável `SUPABASE_SERVICE_ROLE_KEY` (já disponível no projeto Supabase). Ela verifica se quem chama é um usuário com `profiles.role = 'admin'` e, em caso positivo, chama `auth.admin.inviteUserByEmail`.

Se não publicar a função, o restante do Admin (login e configurações do site) continua funcionando; apenas o botão “Enviar convite” não funcionará.

## URLs

- **Login**: `/admin/login`
- **Painel (após login)**: `/admin`

Com `basePath` em produção (ex.: `/saraalagoas`), use `/saraalagoas/admin` e `/saraalagoas/admin/login`.

## Segurança

- Acesso à rota `/admin` (exceto `/admin/login`) exige sessão Supabase Auth.
- Escrita em `site_config` é permitida apenas para usuários autenticados (RLS).
- Convite de usuários é feito pela Edge Function, que verifica se o usuário logado é **admin** em `profiles`; apenas então chama a API de convite do Supabase (que usa a service role no servidor).
