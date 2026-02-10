# Meta Integration - Troubleshooting Guide

## ⚠️ Erro: `PLATFORM_INVALID_APP_ID`

Este erro acontece quando o **App ID enviado para o Facebook OAuth não é válido**.

### Causa Principal

O Facebook está recebendo:
- `client_id=undefined`
- `client_id=` (vazio)
- `client_id=[texto]` (não é número)
- App ID incorreto (não é o App ID do Meta App)

---

## 🔍 Diagnóstico Passo a Passo

### 1. Verificar o App ID Correto

⚠️ **IMPORTANTE**: O "ID do app do Instagram" NÃO é o mesmo que "App ID do Meta App"

✅ Use o App ID correto:

1. Acesse [Facebook for Developers](https://developers.facebook.com/)
2. Selecione seu App
3. Vá em **Settings → Basic**
4. Copie o **App ID** (é um número, ex: `123456789012345`)

❌ **NÃO use**:
- ID do produto Instagram
- Business ID
- Page ID
- Qualquer outro ID

### 2. Verificar `.env` (Desenvolvimento Local)

Arquivo: `c:\midia_igreja\.env`

✅ **Correto**:
```env
META_APP_ID=1475677427606585
META_APP_SECRET=027eafd1b907a10ff5f0f91ee5165335
META_REDIRECT_URI=http://localhost:3000/api/meta/oauth/callback
META_SCOPES=pages_show_list,pages_read_engagement,instagram_basic,instagram_content_publish
META_STATE_SECRET=a7f8d9e2c4b1a6f5e8d7c3b2a9f1e4d8c6b5a3f2e1d9c8b7a6f5e4d3c2b1a0f9
```

❌ **Erros comuns**:
```env
# ERRO: Espaço antes do nome da variável
 META_APP_SECRET=...

# ERRO: Placeholder não substituído
META_STATE_SECRET=gere_um_segredo_aleatorio...

# ERRO: URL de produção em desenvolvimento
META_REDIRECT_URI=https://seu-dominio.vercel.app/...
```

### 3. Testar Localmente

#### A. Ver logs no terminal:

```bash
npm run dev
```

#### B. Acessar a página:

```
http://localhost:3000/admin/instancias
```

#### C. Clicar "Conectar conta Meta"

#### D. Verificar logs no terminal:

Você deve ver algo assim:

```
[META OAuth] DEBUG - Environment variables check:
  META_APP_ID: 1475677427606585
  META_APP_SECRET: ***SET***
  META_REDIRECT_URI: http://localhost:3000/api/meta/oauth/callback
  META_STATE_SECRET: ***SET***
  META_SCOPES: pages_show_list,pages_read_engagement...
[META OAuth] Generated auth URL: https://www.facebook.com/v21.0/dialog/oauth?client_id=1475677427606585...
```

✅ Se aparecer assim, as variáveis estão OK.

❌ Se aparecer `UNDEFINED`, as variáveis não estão sendo lidas.

#### E. Verificar URL gerada:

Copie a URL que abre no navegador. Deve ter:

```
...client_id=1475677427606585&redirect_uri=http%3A%2F%2Flocalhost%3A3000...
```

### 4. Configurar Facebook App (OAuth Redirect URIs)

1. **Facebook Developers** → Seu App → **Facebook Login** → **Settings**
2. Em **Valid OAuth Redirect URIs**, adicione:

**Desenvolvimento**:
```
http://localhost:3000/api/meta/oauth/callback
```

**Produção** (Vercel):
```
https://seu-dominio.vercel.app/api/meta/oauth/callback
https://seu-dominio-*.vercel.app/api/meta/oauth/callback
```

💡 O wildcard (`*`) permite preview deployments.

3. Clique **Save Changes**

---

## 🚀 Deploy na Vercel

### 1. Configurar Environment Variables

**Vercel Dashboard** → Seu Projeto → **Settings** → **Environment Variables**

Adicione TODAS as variáveis:

| Nome | Valor | Environment |
|------|-------|-------------|
| `META_APP_ID` | `1475677427606585` | Production, Preview |
| `META_APP_SECRET` | `027eafd1b907a10ff5f0f91ee5165335` | Production, Preview |
| `META_REDIRECT_URI` | `https://seu-dominio.vercel.app/api/meta/oauth/callback` | Production |
| `META_REDIRECT_URI` | `https://seu-dominio-git-*.vercel.app/api/meta/oauth/callback` | Preview |
| `META_SCOPES` | `pages_show_list,pages_read_engagement,instagram_basic,instagram_content_publish` | Production, Preview |
| `META_STATE_SECRET` | `a7f8d9e2c4b1a6f5e8d7c3b2a9f1e4d8c6b5a3f2e1d9c8b7a6f5e4d3c2b1a0f9` | Production, Preview |

⚠️ **IMPORTANTE**: 
- **NÃO** use `NEXT_PUBLIC_` no nome das variáveis
- Marque as checkboxes: **Production** e **Preview**

### 2. Redeploy

Após adicionar as variáveis:

```bash
vercel --prod
```

Ou no dashboard:
**Deployments** → **...** (três pontos) → **Redeploy**

⚠️ **CRITICAL**: Se você só adicionar as variáveis sem fazer redeploy, elas **não estarão disponíveis** no runtime!

### 3. Verificar Logs na Vercel

**Vercel Dashboard** → Seu Projeto → **Deployments** → [último deploy] → **Functions**

Procure por:
```
[META OAuth] DEBUG - Environment variables check:
```

---

## 🔧 Troubleshooting Específico

### Problema: `META_APP_ID: undefined`

**Causa**: Variável não está setada ou não está sendo lida.

**Soluções**:

#### Desenvolvimento:
1. Verifique o arquivo `.env` (não `.env.example`)
2. Reinicie o servidor: `Ctrl+C` e `npm run dev`
3. Não use `.env.production` para desenvolvimento local

#### Produção (Vercel):
1. Verifique se adicionou as variáveis no dashboard
2. Verifique se selecionou **Production** e **Preview**
3. Faça **Redeploy**

### Problema: `client_id=[object Object]`

**Causa**: Você está passando um objeto em vez de string.

**Solução**: Verifique `lib/meta.ts` → função `getMetaOAuthUrl`:

```typescript
const params = new URLSearchParams({
  client_id: config.appId, // ✅ Deve ser string
  // ...
})
```

### Problema: URL redireciona mas erro persiste

**Causa**: Facebook App não tem a URL configurada.

**Solução**:
1. Facebook Developers → App → Facebook Login → Settings
2. Adicione a URL exata em **Valid OAuth Redirect URIs**
3. Deve ser exatamente igual ao `META_REDIRECT_URI`

### Problema: "App não disponível para este usuário"

**Causa**: App está em modo Development.

**Soluções**:
1. Adicione usuário de teste: **Roles** → **Test Users**
2. OU coloque app em **Live Mode** (requer revisão do Facebook)

---

## ✅ Checklist Completo

### Desenvolvimento Local

- [ ] `.env` existe (não `.env.example`)
- [ ] `META_APP_ID` tem número de 15 dígitos
- [ ] `META_APP_SECRET` está preenchido
- [ ] `META_REDIRECT_URI` aponta para `http://localhost:3000/api/meta/oauth/callback`
- [ ] `META_STATE_SECRET` tem 32+ caracteres aleatórios
- [ ] Servidor reiniciado após mudar `.env`
- [ ] Logs mostram variáveis carregadas (não `UNDEFINED`)
- [ ] URL gerada tem `client_id=NUMERO`

### Facebook App

- [ ] App ID copiado de **Settings → Basic**
- [ ] Facebook Login adicionado ao app
- [ ] Instagram Basic Display (ou Graph API) adicionado
- [ ] OAuth Redirect URI configurado: `http://localhost:3000/api/meta/oauth/callback`
- [ ] Usuário de teste adicionado (se app em Development)

### Vercel (Produção)

- [ ] Todas as variáveis adicionadas no dashboard
- [ ] Checkboxes **Production** e **Preview** marcadas
- [ ] `META_REDIRECT_URI` aponta para domínio de produção
- [ ] Redeploy feito após adicionar variáveis
- [ ] OAuth Redirect URI no Facebook inclui domínio de produção
- [ ] Logs da função mostram variáveis carregadas

---

## 🆘 Ainda não funciona?

### 1. Teste a URL manualmente

Copie e cole no navegador (substitua `{APP_ID}`):

```
https://www.facebook.com/v21.0/dialog/oauth?client_id={APP_ID}&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Fmeta%2Foauth%2Fcallback&state=test&scope=pages_show_list&response_type=code
```

- ✅ Se funcionar: problema está na geração da URL no código
- ❌ Se não funcionar: problema está no App ID ou configuração do Facebook

### 2. Verifique App Status

**Facebook Developers** → Seu App → **Dashboard**

- Status deve ser **Development** (teste) ou **Live** (produção)
- Se mostrar **Suspended** ou **Restricted**: entre em contato com suporte do Facebook

### 3. Limpe cache

```bash
# Limpar .next (Next.js)
rm -rf .next
npm run dev
```

### 4. Teste com outro usuário

Se você é admin do app, teste com:
1. **Test User** (criado no Facebook App)
2. OU outro usuário adicionado em **Roles → Roles**

---

## 📞 Suporte

Se o problema persistir após seguir todos os passos:

1. ✅ Confirme: logs mostram `META_APP_ID: [NUMERO]`
2. ✅ Confirme: URL tem `client_id=[NUMERO]`
3. ✅ Confirme: App ID é de **Settings → Basic**
4. ✅ Confirme: Redirect URI está configurado no Facebook
5. ✅ Confirme: Fez redeploy após adicionar variáveis (Vercel)

Se todos os ✅ estiverem OK e ainda não funcionar, o problema pode ser:
- Restrições regionais no Facebook App
- App suspenso/bloqueado
- Cache do navegador (teste em aba anônima)

---

**Última atualização**: 2026-02-10  
**Versão**: 1.0
