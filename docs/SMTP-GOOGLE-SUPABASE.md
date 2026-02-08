# Configurar SMTP do Google no Supabase

Use sua conta Google (Gmail ou Google Workspace com domínio) para enviar os e-mails de autenticação (confirmação de conta, convite, link mágico) pelo Supabase.

---

## 1. Senha de app do Google (obrigatório)

O Google não permite usar a senha normal da conta em aplicativos. É preciso criar uma **Senha de app**.  
**Importante:** “Senhas de app” **não** aparece como item no menu da esquerda. Ela só fica disponível **depois** de ativar a verificação em duas etapas.

### Passo a passo

1. Acesse [https://myaccount.google.com](https://myaccount.google.com) e vá em **Segurança** (menu da esquerda).
2. Clique em **Verificação em duas etapas** (está na seção **Autenticação**).
3. **Ative** a verificação em duas etapas (se ainda não estiver ativa). O Google vai pedir seu número de telefone e um código.
4. Depois de ativar, você pode ir direto para as senhas de app:
   - **Opção A:** Abra este link no navegador: **[https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)**  
   - **Opção B:** Em **Segurança** → **Verificação em duas etapas**, role a página até o final; lá aparece o link **“Senhas de app”**.
5. Na tela de Senhas de app: escolha **Outro (nome personalizado)** → digite **Supabase** → **Gerar**.
6. **Copie a senha de 16 caracteres** (formato xxxx xxxx xxxx xxxx). Use **essa** senha no campo **Password** do SMTP no Supabase (pode colar com ou sem espaços).

---

## 2. Valores para colar no Supabase (SMTP Settings)

No Supabase: **Authentication** → **Emails** → aba **SMTP Settings**.

| Campo | Valor |
|--------|--------|
| **Sender email address** | Seu e-mail completo (ex.: `noreply@seudominio.com` ou `contato@seudominio.com`). Tem que ser um e-mail da sua conta Google/Workspace. |
| **Sender name** | Nome que aparece na caixa de entrada (ex.: `Sara Sede Alagoas` ou `Admin - Sara`) |
| **Host** | `smtp.gmail.com` |
| **Port number** | `587` (recomendado, usa TLS) |
| **Username** | O **mesmo** e-mail do “Sender email address” (ex.: `noreply@seudominio.com`) |
| **Password** | A **senha de app** de 16 caracteres que você gerou no passo 1 (não use a senha normal da conta) |

---

## 3. Resumo rápido

- **Host:** `smtp.gmail.com`  
- **Porta:** `587`  
- **Remetente e usuário:** mesmo e-mail (@gmail.com ou do seu domínio no Google Workspace).  
- **Senha:** sempre a **Senha de app**, nunca a senha da conta.

Depois de preencher todos os campos, o aviso “All fields must be filled” some e o SMTP personalizado passa a ser usado. Os e-mails de confirmação, convite e magic link do Supabase serão enviados pelo seu Gmail/Google Workspace.

---

## 4. Se não aparecer “Senhas de app”

- **“Senhas de app” não fica no menu.** Ative primeiro **Verificação em duas etapas** (Segurança → Autenticação → Verificação em duas etapas) e depois use o link direto: [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords).
- Se ao abrir esse link aparecer “Esta página não está disponível”: a verificação em duas etapas ainda não está ativa ou sua conta (ex.: Google Workspace) pode restringir senhas de app. Ative a verificação em duas etapas e tente de novo.
- Em **Google Workspace**, o administrador do domínio às vezes precisa liberar “Senhas de app” em **Admin** → **Segurança** → **Configurações básicas**.

---

## 5. Testar

Depois de salvar:

1. No seu site, vá em **Admin** → **Login**.  
2. Use **“Enviar link de acesso por e-mail”** com um e-mail seu.  
3. Verifique a caixa de entrada (e o spam) – o e-mail deve vir do endereço e nome que você configurou no **Sender email** e **Sender name**.
