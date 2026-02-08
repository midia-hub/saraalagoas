# Não recebi o e-mail de criação de conta (Supabase Auth)

Se você não recebeu o e-mail de confirmação de cadastro, de convite ou o link mágico, siga estes passos.

## 1. Verificar spam e lixo eletrônico

- Procure na pasta **Spam** / **Lixo eletrônico** por remetentes como `noreply@mail.app.supabase.io` ou o domínio do Supabase.
- Adicione o remetente aos contatos ou marque como “Não é spam”.

## 2. Configuração no Dashboard do Supabase

Acesse o [Dashboard do Supabase](https://supabase.com/dashboard) → seu projeto → **Authentication**.

### 2.1 URLs (Site URL e Redirect URLs)

- Vá em **URL Configuration** (ou **Auth** > **URL Configuration**).
- **Site URL**: deve ser a URL do seu site (ex.: `https://seusite.com` ou em desenvolvimento `http://localhost:3000`).
- **Redirect URLs**: adicione todas as URLs para onde o usuário pode ser redirecionado após clicar no link do e-mail, por exemplo:
  - `http://localhost:3000/admin`
  - `https://seusite.com/admin`
  - Se usar basePath: `https://seusite.com/saraalagoas/admin`

Sem isso, o link do e-mail pode ser rejeitado ou redirecionar para um endereço errado.

### 2.2 Desativar “Confirm email” (acesso imediato com senha)

Se o objetivo é apenas criar a conta e entrar com **e-mail + senha** sem depender do e-mail de confirmação:

1. Em **Authentication** → **Providers** → **Email**.
2. Desative a opção **“Confirm email”** (ou equivalente).
3. Salve.

Depois disso, ao se cadastrar com e-mail e senha, o usuário poderá entrar **assim que criar a conta**, sem precisar clicar em nenhum link no e-mail.  
Use isso com cuidado em produção (qualquer um que souber a URL de cadastro pode criar conta).

### 2.3 E-mail padrão do Supabase

O Supabase envia os e-mails usando o serviço deles. Em alguns provedores (Gmail, Outlook, etc.) esses e-mails podem:

- Cair em spam.
- Ter limite de envio (rate limit).

Se mesmo após verificar spam e URLs o e-mail não chegar, use **SMTP customizado** (próximo passo).

## 3. Usar SMTP customizado (recomendado em produção)

Para melhor entrega e menos problemas de spam:

1. No Dashboard: **Authentication** → **Emails** → aba **SMTP Settings**.
2. Ative **Enable custom SMTP** e preencha os dados do seu provedor.
3. **Usando conta Google (Gmail/Workspace):** veja o guia **`docs/SMTP-GOOGLE-SUPABASE.md`** com todos os valores (Host, Porta, Senha de app, etc.).
4. Salve.

A partir daí, confirmação, convite e magic link passam a ser enviados pelo seu SMTP.

## 4. Convite por outro admin

Se você já tem um usuário admin logado no painel:

1. Acesse **Admin** → aba **Usuários**.
2. Use **“Convidar usuário”** com o e-mail desejado.
3. O convidado receberá um e-mail (do Supabase ou do seu SMTP, conforme configurado) para definir a senha.

Certifique-se de que a Edge Function `admin-invite-user` está publicada e que as **Redirect URLs** no Supabase incluem a URL do Admin (ex.: `https://seusite.com/admin`).

## 5. Criar usuário direto no Dashboard (sem e-mail)

Para ter acesso rápido sem depender de e-mail:

1. No Supabase: **Authentication** → **Users** → **Add user**.
2. Preencha **Email** e **Password** e crie o usuário.
3. No **SQL Editor**, torne esse usuário admin (substitua `USER_UUID` pelo id do usuário):

```sql
INSERT INTO public.profiles (id, email, role)
VALUES ('USER_UUID', 'email@exemplo.com', 'admin')
ON CONFLICT (id) DO UPDATE SET role = 'admin';
```

Depois, entre no site em **Admin** com esse e-mail e senha.

---

**Resumo:**  
- Confira **spam** e **URL Configuration** no Supabase.  
- Para não depender do e-mail: desative **Confirm email** ou crie o usuário em **Authentication** > **Users** e defina o role no SQL.  
- Para receber e-mails de forma estável: configure **SMTP customizado** no projeto.
