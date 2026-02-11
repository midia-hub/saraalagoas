# Modelos de e-mail (Supabase Auth)

Todos os arquivos seguem o padrão visual da **Sara Sede Alagoas**: cabeçalho vermelho `#c62737`, logo, corpo branco e rodapé "Sara Sede Alagoas · Igreja Sara Nossa Terra".

## Onde configurar no Supabase

1. Acesse o [Dashboard Supabase](https://supabase.com/dashboard) → seu projeto.
2. Vá em **Authentication** → **Email Templates**.
3. Para cada tipo abaixo, selecione o template correspondente e cole o HTML do arquivo.

## Templates disponíveis

| Arquivo | Template no Supabase | Quando é usado |
|--------|-----------------------|----------------|
| `confirm-signup.html` | **Confirm signup** | Usuário se cadastra e precisa confirmar o e-mail. |
| `invite-user.html` | **Invite user** | Admin convida alguém (convite enviado pelo painel em Usuários). |
| `magic-link.html` | **Magic link** | Usuário solicita "Enviar link de acesso por e-mail" na tela de login. |
| `change-email.html` | **Change email address** | Usuário altera o e-mail em "Minha conta"; confirmação enviada ao **novo** e-mail. |
| `reset-password.html` | **Reset password** | Admin envia "Enviar reset de senha" em Usuários ou usuário esquece a senha. |
| `reauthentication.html` | **Reauthentication** | Ação sensível que exige reautenticação (código ou link no e-mail). |

## Variáveis dos templates (GoTrue)

- `{{ .ConfirmationURL }}` — link principal de confirmação (usado na maioria).
- `{{ .Token }}` — código de 6 dígitos (usado em **Reauthentication**).
- `{{ .Email }}` — e-mail atual do usuário.
- `{{ .NewEmail }}` — novo e-mail (apenas em **Change email address**).
- `{{ .RedirectTo }}` — URL de redirecionamento passada na chamada da API.
- `{{ .SiteURL }}` — URL do site configurada no projeto.

Não remova essas variáveis ao colar o HTML no Supabase.

## Redirect URLs obrigatórias

Em **Authentication** → **URL Configuration** → **Redirect URLs**, adicione:

- Produção: `https://seusite.com/admin`, `https://seusite.com/admin/completar-cadastro`, `https://seusite.com/redefinir-senha`, `https://seusite.com/admin/conta`
- Desenvolvimento: `http://localhost:3000/admin`, `http://localhost:3000/admin/completar-cadastro`, `http://localhost:3000/redefinir-senha`, `http://localhost:3000/admin/conta`

Assim os links dos e-mails (convite, magic link, reset de senha, alteração de e-mail) redirecionam corretamente para o app.

## Fluxos na aplicação

- **Convite:** Admin → Usuários → "Enviar convite" → usuário recebe `invite-user` → clica e vai para `/admin/completar-cadastro` para definir senha e nome.
- **Magic link:** Login → "Enviar link de acesso por e-mail" → usuário recebe `magic-link` → clica e vai para `/admin/completar-cadastro` (ou admin se já tiver conta).
- **Alterar e-mail:** Admin → Minha conta (menu) → "Alterar e-mail" → Supabase envia `change-email` para o **novo** e-mail → usuário clica no link e o e-mail é atualizado.
- **Reset de senha:** Admin → Usuários → "Enviar reset de senha" (ícone chave) → usuário recebe `reset-password` → clica e vai para `/redefinir-senha` para definir nova senha.
