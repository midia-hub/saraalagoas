# 🚀 Deploy Meta Integration na Vercel (saraalagoas.com)

## Guia Rápido de Deploy

### 📋 Pré-requisitos

- [x] Build local funciona: `npm run build`
- [ ] Facebook App configurado
- [ ] Acesso ao dashboard da Vercel
- [ ] Migration aplicada no Supabase

⚠️ **Nota**: OAuth não funciona em localhost. Teste direto na Vercel.

---

## 1️⃣ Configurar Facebook App para Produção

⚠️ **IMPORTANTE**: Facebook OAuth **NÃO funciona em localhost** (apenas HTTPS).  
Para testar, use Vercel (production ou preview). Veja: `TESTING-META-OAUTH.md`

### A. Adicionar URLs de Produção

**Facebook Developers** → Seu App → **Facebook Login** → **Settings**

Em **Valid OAuth Redirect URIs**, adicione:

```
https://saraalagoas.com/api/meta/oauth/callback
https://www.saraalagoas.com/api/meta/oauth/callback
```

💡 Para preview deployments (testes antes de produção):
```
https://midia-igreja-git-*.vercel.app/api/meta/oauth/callback
```

### B. Configurar App Domains

**Facebook Developers** → Seu App → **Settings** → **Basic**

Em **App Domains**, adicione:
```
saraalagoas.com
www.saraalagoas.com
```

### C. Salvar Changes

Clique em **Save Changes** no final da página.

---

## 2️⃣ Configurar Variáveis de Ambiente na Vercel

### Via Dashboard (Recomendado)

1. Acesse [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecione o projeto
3. Vá em **Settings** → **Environment Variables**
4. Adicione cada variável abaixo:

#### Variáveis Meta

| Name | Value | Environment |
|------|-------|-------------|
| `META_APP_ID` | `1475677427606585` | ✅ Production<br>✅ Preview<br>⬜ Development |
| `META_APP_SECRET` | `027eafd1b907a10ff5f0f91ee5165335` | ✅ Production<br>✅ Preview<br>⬜ Development |
| `META_REDIRECT_URI` | `https://saraalagoas.com/api/meta/oauth/callback` | ✅ Production<br>⬜ Preview<br>⬜ Development |
| `META_SCOPES` | `pages_show_list,pages_read_engagement,instagram_basic,instagram_content_publish,pages_manage_metadata,instagram_manage_messages` | ✅ Production<br>✅ Preview<br>⬜ Development |
| `META_STATE_SECRET` | `a7f8d9e2c4b1a6f5e8d7c3b2a9f1e4d8c6b5a3f2e1d9c8b7a6f5e4d3c2b1a0f9` | ✅ Production<br>✅ Preview<br>⬜ Development |

⚠️ **IMPORTANTE**: 
- **NÃO** use `NEXT_PUBLIC_` no nome
- Marque **Production** e **Preview**
- **NÃO** marque Development (use `.env` local)

#### Para Preview Deployments (opcional)

Se quiser testar em preview branches, adicione variável extra:

| Name | Value | Environment |
|------|-------|-------------|
| `META_REDIRECT_URI` | `https://${VERCEL_URL}/api/meta/oauth/callback` | ⬜ Production<br>✅ Preview<br>⬜ Development |

### Via CLI (Alternativo)

```bash
# Entrar na Vercel
vercel login

# Ir para o diretório do projeto
cd c:\midia_igreja

# Adicionar variáveis
vercel env add META_APP_ID production
# Cole: 1475677427606585

vercel env add META_APP_SECRET production
# Cole: 027eafd1b907a10ff5f0f91ee5165335

vercel env add META_REDIRECT_URI production
# Cole: https://saraalagoas.com/api/meta/oauth/callback

vercel env add META_SCOPES production
# Cole: pages_show_list,pages_read_engagement,instagram_basic,instagram_content_publish,pages_manage_metadata,instagram_manage_messages

vercel env add META_STATE_SECRET production
# Cole: a7f8d9e2c4b1a6f5e8d7c3b2a9f1e4d8c6b5a3f2e1d9c8b7a6f5e4d3c2b1a0f9
```

---

## 3️⃣ Fazer Deploy

### Opção A: Via Dashboard

1. **Deployments** → **...** (três pontos no último deploy) → **Redeploy**
2. Aguarde o build completar

### Opção B: Via CLI

```bash
# Deploy para produção
vercel --prod
```

### Opção C: Via Git (automático)

```bash
git add .
git commit -m "feat: adicionar integração Meta"
git push origin main
```

⚠️ **CRÍTICO**: Após adicionar variáveis, você DEVE fazer redeploy para elas ficarem disponíveis!

---

## 4️⃣ Testar em Produção

### A. Acessar Admin

```
https://saraalagoas.com/admin/instancias
```

### B. Fazer login

Use suas credenciais de admin.

### C. Conectar Meta

1. Clique em **"Conectar conta Meta"**
2. Deve redirecionar para Facebook
3. Autorize o app
4. Selecione a página (se tiver múltiplas)
5. Deve voltar para `/admin/instancias?connected=1`

### D. Verificar Logs (se houver erro)

**Vercel Dashboard** → **Deployments** → [último deploy] → **Functions** → Busque por `[META OAuth]`

---

## 5️⃣ Checklist de Verificação

### Facebook App

- [ ] App ID copiado de Settings → Basic
- [ ] OAuth Redirect URI incluindo: `https://saraalagoas.com/api/meta/oauth/callback`
- [ ] App Domain incluindo: `saraalagoas.com`
- [ ] Facebook Login produto adicionado
- [ ] Instagram Basic Display ou Graph API adicionado
- [ ] Changes salvos

### Vercel

- [ ] Todas as 5 variáveis Meta adicionadas
- [ ] Marcado **Production** em cada uma
- [ ] `META_REDIRECT_URI` aponta para `https://saraalagoas.com/...`
- [ ] Redeploy feito após adicionar variáveis
- [ ] Build completou com sucesso
- [ ] Não há erros nos logs de build

### Supabase

- [ ] Migration `supabase-meta.sql` aplicada
- [ ] Tabela `meta_integrations` existe
- [ ] Políticas RLS criadas
- [ ] Função `can_manage_meta_integrations()` existe

### Teste

- [ ] Página `/admin/instancias` carrega
- [ ] Botão "Conectar conta Meta" aparece
- [ ] OAuth redireciona para Facebook (não dá erro)
- [ ] Após autorizar, volta para o site
- [ ] Integração aparece na lista
- [ ] Instagram é detectado (se vinculado)

---

## 🔍 Troubleshooting

### Erro: "PLATFORM_INVALID_APP_ID"

**Causa**: Variáveis não foram carregadas ou redeploy não foi feito.

**Solução**:
1. Verifique variáveis no dashboard
2. Faça **Redeploy** (critical!)
3. Verifique logs da function

### Erro: "redirect_uri_mismatch"

**Causa**: URL no `.env` não está no Facebook App.

**Solução**:
1. Verifique se é **exatamente**: `https://saraalagoas.com/api/meta/oauth/callback`
2. Sem `/` no final
3. Mesmo protocolo (https)
4. Salve changes no Facebook

### Erro: "This app is in development mode"

**Solução**: Adicione usuário de teste ou coloque app em Live Mode.

### Variáveis não carregam

**Solução**:
```bash
# Ver variáveis configuradas
vercel env ls

# Se estiver vazio, adicione novamente
vercel env add META_APP_ID production
```

---

## 📊 Estrutura de URLs

| Ambiente | URL Base | OAuth Callback |
|----------|----------|----------------|
| **Local** | `http://localhost:3000` | `http://localhost:3000/api/meta/oauth/callback` |
| **Produção** | `https://saraalagoas.com` | `https://saraalagoas.com/api/meta/oauth/callback` |
| **Preview** | `https://midia-igreja-*.vercel.app` | `https://midia-igreja-*.vercel.app/api/meta/oauth/callback` |

---

## 🎯 Comandos Úteis

### Ver logs em tempo real (CLI)

```bash
vercel logs --follow
```

### Ver variáveis configuradas

```bash
vercel env ls
```

### Remover variável (se errou)

```bash
vercel env rm META_REDIRECT_URI production
```

### Deploy específico de branch

```bash
vercel --prod --yes
```

---

## ✨ Após Deploy Bem-Sucedido

1. **Teste completo**:
   - Conectar conta Meta
   - Verificar detecção do Instagram
   - Ativar/desativar integração
   - Remover e reconectar

2. **Documente**:
   - Anote qual conta Facebook está conectada
   - Anote qual página está vinculada
   - Salve data de expiração do token

3. **Monitore**:
   - Configure alertas na Vercel
   - Monitore logs de erro
   - Verifique expiração de tokens (60 dias)

---

## 🔗 Links Importantes

- **Site Produção**: https://saraalagoas.com
- **Admin**: https://saraalagoas.com/admin/instancias
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Facebook Developers**: https://developers.facebook.com/apps

---

## 📝 Valores de Referência Rápida

```env
# Copie estes valores para a Vercel:

META_APP_ID=1475677427606585
META_APP_SECRET=027eafd1b907a10ff5f0f91ee5165335
META_REDIRECT_URI=https://saraalagoas.com/api/meta/oauth/callback
META_SCOPES=pages_show_list,pages_read_engagement,instagram_basic,instagram_content_publish,pages_manage_metadata,instagram_manage_messages
META_STATE_SECRET=a7f8d9e2c4b1a6f5e8d7c3b2a9f1e4d8c6b5a3f2e1d9c8b7a6f5e4d3c2b1a0f9
```

---

**Status**: Pronto para deploy  
**Domínio**: saraalagoas.com  
**Última atualização**: 2026-02-10
