# Meta: variáveis na Vercel (erro PLATFORM_INVALID_APP_ID)

Se o site na Vercel mostra **"ID do app inválido"** ao clicar em "Conectar conta Meta", as variáveis de ambiente **não estão configuradas** ou estão **incorretas** no projeto da Vercel.

## 1. Conferir variáveis na Vercel

1. Acesse **[Vercel Dashboard](https://vercel.com/dashboard)** → seu projeto **saraalagoas** (ou nome do projeto).
2. Aba **Settings** → **Environment Variables**.
3. Confira se existem **exatamente** estas 5 variáveis:

| Nome | Exemplo de valor | Ambiente |
|------|------------------|----------|
| `META_APP_ID` | `1475677427606585` | Production (e Preview se quiser) |
| `META_APP_SECRET` | `027eafd1b907a10ff5f0f91ee5165335` | Production (e Preview) |
| `META_REDIRECT_URI` | `https://saraalagoas.com/api/meta/oauth/callback` | Production |
| `META_SCOPES` | Use **apenas** estes (não inclua pages_manage_metadata nem instagram_manage_messages): `pages_show_list,pages_read_engagement,instagram_basic` ou, se publicação estiver aprovada: `pages_show_list,pages_read_engagement,instagram_basic,instagram_content_publish`. Veja [META-INVALID-SCOPES.md](META-INVALID-SCOPES.md). | Production, Preview |
| `META_STATE_SECRET` | Um texto longo aleatório (32+ caracteres) | Production, Preview |

### Regras importantes

- **Nomes**: exatamente como acima (sem `NEXT_PUBLIC_`).
- **META_APP_ID**: só números, sem espaços. Use o **App ID** de **Meta for Developers → Seu app → Settings → Basic**. Não use "ID do app do Instagram" de outra tela.
- **META_REDIRECT_URI**: em produção deve ser `https://saraalagoas.com/api/meta/oauth/callback` (HTTPS, sem barra no final).
- Ao criar/editar cada variável, marque pelo menos **Production**.

## 2. Redeploy obrigatório

Variáveis novas ou alteradas **só valem após um novo deploy**.

1. Aba **Deployments**.
2. No último deployment, menu **⋯** → **Redeploy**.
3. Marque **Use existing Build Cache** (opcional) e confirme.

Ou, pelo Git:

```bash
git commit --allow-empty -m "trigger redeploy for env"
git push origin main
```

## 3. Testar se a config está ok (produção)

Foi criada uma rota de diagnóstico (remova depois de resolver):

```
https://saraalagoas.com/api/meta/check-config
```

Abra no navegador. A resposta indica:

- `ok: true` → variáveis presentes e formato aceito.
- `ok: false` e `checks` → qual variável está faltando ou inválida (ex.: App ID não numérico, redirect não HTTPS).

Se `META_APP_ID` aparecer como não numérico ou vazio, corrija o valor na Vercel e faça **Redeploy** de novo.

## 4. Checklist rápido

- [ ] As 5 variáveis existem em **Settings → Environment Variables**.
- [ ] `META_APP_ID` é só números (App ID de Settings → Basic do app Meta).
- [ ] `META_REDIRECT_URI` = `https://saraalagoas.com/api/meta/oauth/callback`.
- [ ] Nenhuma variável com nome `NEXT_PUBLIC_META_*`.
- [ ] Depois de alterar, foi feito **Redeploy**.
- [ ] `/api/meta/check-config` retorna `ok: true`.

## 5. Depois de corrigir

1. Acesse de novo: `https://saraalagoas.com/admin/instancias`.
2. Clique em **Conectar conta Meta**.
3. A autorização deve abrir no Facebook sem "ID do app inválido".

---

## 6. Conectou sem erro mas não aparece no painel

Se o fluxo termina sem mensagem de erro e mesmo assim **"Integrações conectadas"** continua vazio:

### A) Migration no Supabase em produção

A tabela **meta_integrations** precisa existir no **mesmo** projeto Supabase que o site usa em produção.

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard) do projeto.
2. Vá em **SQL Editor** e rode o conteúdo do arquivo **`supabase-meta.sql`** (cria a tabela e as políticas RLS).
3. Depois disso, conecte de novo em **Conectar conta Meta** e verifique se a integração aparece.

### B) Várias páginas – concluir a seleção

Se você tem **mais de uma página** no Facebook, após autorizar você é enviado para **"Selecionar página"**.  
É preciso clicar em **"Selecionar esta página"** em uma delas. Só depois a integração aparece em **Instâncias (Meta)**. Se você sair dessa tela sem escolher, a integração fica pendente e pode não aparecer como ativa.

### C) Conferir no Supabase

No Supabase → **Table Editor** → **meta_integrations**: veja se existe alguma linha depois de conectar.  
- Se **não** houver linhas: o insert falhou (tabela inexistente ou permissão/RLS). Aplique o **supabase-meta.sql** e tente de novo.  
- Se o erro for **"new row violates row-level security policy"**: (1) O callback OAuth é chamado por redirecionamento do Facebook (sem JWT). A aplicação usa **`SUPABASE_SERVICE_ROLE_KEY`** no callback para gravar a integração — configure essa variável na Vercel e faça **redeploy**. (2) No Supabase, confira se a tabela e as políticas RLS estão aplicadas: execute o script **`supabase/migrations/20260210_meta_integrations_rls.sql`** no SQL Editor (Dashboard → SQL Editor → New query → colar → Run). Veja [META-RLS.md](META-RLS.md).  
- Se **houver** linhas: a listagem usa service role após checagem de acesso (qualquer usuário que vê a página Instâncias consegue ver as integrações). Se ainda não aparecer, faça um redeploy e limpe o cache do navegador.

---

## 7. Logs do OAuth (erro oauth_failed)

Se a URL voltar com **`error=oauth_failed`**, a mensagem detalhada aparece na própria página (caixa vermelha). Para acompanhar passo a passo no servidor:

1. Vercel Dashboard → seu projeto → aba **Logs** (ou **Deployments** → último deploy → **Functions** / **Logs**).
2. Conecte de novo em "Conectar conta Meta" e, ao falhar, veja os logs em tempo real.
3. Procure por **`[Meta OAuth]`** para encontrar cada etapa:
   - `1/6 Validando state...` → `2/6 State OK` → `3/6 Trocando code por token...` → `4/6 Long-lived token` → `5/6 Perfil e páginas` → `6/6 Salvando integração`.
   - Se falhar, aparece **`[Meta OAuth] Falha:`** com a mensagem e **`Detalhes:`** com o stack.

Assim você descobre se o erro foi em: state, troca de code, token long-lived, perfil/páginas da API Meta ou insert no Supabase.

---

Quando tudo estiver estável, apague a rota de diagnóstico:

- Remova o arquivo: `app/api/meta/check-config/route.ts`
- Faça commit e push (ou um redeploy).
