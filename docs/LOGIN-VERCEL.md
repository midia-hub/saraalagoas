# Login não funciona na Vercel – Diagnóstico e correção

Se o login funciona em desenvolvimento mas **não na versão publicada na Vercel**, siga este guia.

---

## 1. Variáveis de ambiente na Vercel

O Next.js **insere** as variáveis `NEXT_PUBLIC_*` no momento do **build**. Se elas não existirem na Vercel no momento do deploy, o cliente fica sem URL/chave do Supabase e o login quebra.

### Obrigatórias no projeto Vercel

Em **Vercel → Seu projeto → Settings → Environment Variables**, confira:

| Variável | Onde usar | Observação |
|----------|-----------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview | Ex.: `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview | Chave **anon** (pública) do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview | Chave **service_role** (Dashboard → Settings → API) |
| `NEXT_PUBLIC_APP_URL` | Production (recomendado) | URL do site (ex.: `https://saraalagoas.com`). Garante que o link do e-mail (magic link/convite) redirecione para produção e não para localhost. |

- Marque **Production** (e Preview se usar branch preview).
- **Depois de adicionar ou alterar** qualquer variável, faça um **novo deploy** (Redeploy). Só assim o Next.js gera de novo o bundle com os valores corretos.

---

## 2. Supabase – URL Configuration

No **Supabase Dashboard** do projeto:

1. **Authentication → URL Configuration**
2. **Site URL**: use a URL de produção (ex.: `https://seu-app.vercel.app` ou `https://saraalagoas.com`).
3. **Redirect URLs**: inclua as URLs onde o usuário pode voltar após login/link mágico/convite, por exemplo:
   - `https://seu-app.vercel.app/**`
   - `https://seu-app.vercel.app/admin/**`
   - `https://seu-app.vercel.app/admin/completar-cadastro` (página de completar cadastro após e-mail de validação)
   - Se usar domínio próprio: `https://saraalagoas.com/**` e `https://www.saraalagoas.com/**`

Isso é essencial para link mágico (e-mail) e para sessão em produção.

**Se o link do e-mail (magic link ou convite) redirecionar para localhost:** defina na Vercel a variável `NEXT_PUBLIC_APP_URL` com a URL de produção (ex.: `https://saraalagoas.com`) e faça um novo deploy. O código usa essa URL explicitamente no link enviado por e-mail.

---

## 3. “Erros” que aparecem depois do login – são de extensões

Se **depois do login** o Console mostra muitos erros, na maioria das vezes **não são do seu app**:

| O que aparece | De onde vem | O que fazer |
|---------------|-------------|-------------|
| `background.js` – WASM, Migrator Ul/ja/…, Fido2, WebPush | Extensão (ex.: gerenciador de senhas com WebAuthn) | Pode ignorar. Para não ver: filtre o Console pelo domínio do site ou teste em janela anônima sem extensões. |
| `Duplicate script ID 'fido2-page-script-registration'` | Mesma extensão (Fido2/WebAuthn) | Ignorar. |
| `bootstrap-autofill-overlay.js` – `insertBefore` / “node is not a child” | Extensão de autopreenchimento (formulários/senhas) | A extensão guarda referência ao DOM; após o login o Next.js troca a página e o nó some – a extensão quebra. **Não é bug do seu código.** Teste em janela anônima ou desative a extensão nesse site. |
| Arquivos `fd9d1056-….js`, `117-….js` no stack | São chunks do Next.js; o **gatilho** foi o MutationObserver da extensão, não seu app | Ignorar. |

**Conclusão:** Se o login **funciona** (você é redirecionado para `/admin` e vê o painel), esses erros podem ser ignorados. Para ter certeza de que o site está ok, abra o site em **janela anônima/privada** (onde extensões costumam estar desativadas) e faça login de novo; se funcionar, o problema era só das extensões.

---

## 4. Ver o erro real (não o da extensão)

Para ver o que o **seu site** está fazendo:

1. Abra o site publicado (ex.: `https://seu-app.vercel.app/admin/login`).
2. Abra **F12** → aba **Console**.
3. No filtro do Console, digite o domínio do seu site (ex.: `vercel.app` ou `saraalagoas`) ou selecione apenas o contexto do seu domínio, para ocultar mensagens de extensões.
4. Tente fazer login e veja a mensagem que aparece (ex.: “Supabase não configurado”, “Failed to fetch”, “401”, “500”).
5. Na aba **Network**, tente o login de novo e verifique:
   - Requisição para o Supabase (auth): status e resposta.
   - Requisição para `/api/auth/admin-check`: status (200, 401, 500) e corpo da resposta.

Com isso você descobre se o problema é:
- cliente sem URL/chave (`supabase` null),
- erro de rede/Supabase,
- ou resposta de erro da API (401/500).

---

## 5. Resumo rápido

| Sintoma | Provável causa | O que fazer |
|--------|-----------------|-------------|
| “Supabase não configurado” | `NEXT_PUBLIC_*` faltando ou não usadas no build | Adicionar na Vercel e fazer **Redeploy** |
| “Não foi possível conectar ao servidor” / “Failed to fetch” | Rede ou URL errada; ou API não encontrada | Conferir Network (URL da API, status). Garantir env na Vercel e Redeploy |
| “Erro ao verificar permissão (500)” | Backend sem `SUPABASE_SERVICE_ROLE_KEY` ou Supabase URL | Adicionar `SUPABASE_SERVICE_ROLE_KEY` (e `NEXT_PUBLIC_*`) na Vercel e Redeploy |
| “Sessão inválida” / 401 | Token inválido ou expirado; ou Site URL/Redirect errados no Supabase | Ajustar **Site URL** e **Redirect URLs** no Supabase (ver item 2) |
| Login ok mas redireciona de volta ao login | Cookie `admin_access` não gravado (domínio/path) | Verificar se está em HTTPS e se o domínio do cookie é o mesmo do site |

---

## 6. Checklist antes de testar de novo

- [ ] `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` configuradas na Vercel (Production/Preview).
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configurada na Vercel.
- [ ] `NEXT_PUBLIC_APP_URL` na Vercel (ex.: `https://saraalagoas.com`) para o link do e-mail ir para produção.
- [ ] **Redeploy** feito depois de alterar qualquer variável.
- [ ] No Supabase: **Site URL** = URL de produção; **Redirect URLs** incluem a URL do app (ex.: `https://seu-app.vercel.app/**` ou `https://saraalagoas.com/**`).
- [ ] Se usar convite por e-mail: no Supabase (Project Settings → Edge Functions), variável **APP_URL** = `https://saraalagoas.com` (ou seu domínio).
- [ ] Teste com Console/Network abertos no **seu domínio** para ver o erro exato.

Depois disso, se ainda falhar, use a mensagem exata do Console e o status da requisição em **Network** (e, se possível, o corpo da resposta de `/api/auth/admin-check`) para afinar o diagnóstico.
