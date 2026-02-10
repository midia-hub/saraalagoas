# ⚠️ Como Testar OAuth Meta (Facebook não permite localhost)

## O Problema

Facebook/Meta **NÃO permite OAuth redirect para localhost** por questões de segurança.

Apenas URLs HTTPS são aceitas:
- ✅ `https://saraalagoas.com/api/meta/oauth/callback`
- ✅ `https://preview-*.vercel.app/api/meta/oauth/callback`
- ❌ `http://localhost:3000/api/meta/oauth/callback` (não funciona!)

---

## 🎯 Opções para Testar

### Opção 1: Deploy direto em Produção (Recomendado)

**Mais simples e seguro**

1. Configurar variáveis na Vercel
2. Fazer deploy
3. Testar em: `https://saraalagoas.com/admin/instancias`

**Vantagens**:
- ✅ Ambiente real
- ✅ Não requer configuração extra
- ✅ É onde vai rodar de verdade

**Desvantagens**:
- ⚠️ Precisa fazer redeploy para cada mudança

---

### Opção 2: Preview Deployment (Vercel)

**Para testar antes de production**

#### A. Configurar branch de desenvolvimento

```bash
git checkout -b feature/meta-integration
git push origin feature/meta-integration
```

#### B. Vercel cria preview automaticamente

URL será algo como:
```
https://midia-igreja-git-feature-meta-integration-seu-user.vercel.app
```

#### C. Adicionar URL no Facebook App

**Facebook Login → Settings → Valid OAuth Redirect URIs**:
```
https://midia-igreja-git-feature-meta-integration-seu-user.vercel.app/api/meta/oauth/callback
```

Ou use wildcard (se Facebook permitir):
```
https://midia-igreja-git-*.vercel.app/api/meta/oauth/callback
```

#### D. Configurar variável para Preview

**Vercel → Settings → Environment Variables**

Adicione variável específica para Preview:

| Name | Value | Environment |
|------|-------|-------------|
| `META_REDIRECT_URI` | `https://${VERCEL_URL}/api/meta/oauth/callback` | ⬜ Production<br>✅ Preview<br>⬜ Development |

💡 `${VERCEL_URL}` é substituído automaticamente pela URL do preview.

#### E. Testar

```bash
# Fazer mudança
git add .
git commit -m "test: meta integration"
git push origin feature/meta-integration

# Acessar URL do preview
https://midia-igreja-git-feature-meta-integration-seu-user.vercel.app/admin/instancias
```

---

### Opção 3: Tunnel Local (ngrok) - Avançado

**Para desenvolvimento local com HTTPS**

⚠️ Requer configuração extra e não é oficial.

#### A. Instalar ngrok

```bash
# Windows (Chocolatey)
choco install ngrok

# Mac (Homebrew)
brew install ngrok

# Ou baixe de: https://ngrok.com/download
```

#### B. Criar túnel

```bash
# Iniciar servidor local
npm run dev

# Em outro terminal, criar túnel
ngrok http 3000
```

Você receberá uma URL tipo:
```
https://abc123.ngrok.io
```

#### C. Configurar Facebook App

Adicionar em **Valid OAuth Redirect URIs**:
```
https://abc123.ngrok.io/api/meta/oauth/callback
```

⚠️ **Problema**: URL muda toda vez que reinicia ngrok (versão gratuita).

#### D. Atualizar .env temporariamente

```env
META_REDIRECT_URI=https://abc123.ngrok.io/api/meta/oauth/callback
```

#### E. Testar

Acessar: `https://abc123.ngrok.io/admin/instancias`

**Desvantagens**:
- ❌ URL muda a cada sessão
- ❌ Precisa reconfigurar Facebook App
- ❌ Ngrok gratuito tem limites
- ❌ Não é ambiente oficial

---

## 💡 Recomendação

### Para Desenvolvimento Inicial:
**Use Opção 1 (Produção direta)**

1. Configure Vercel
2. Deploy
3. Teste em saraalagoas.com
4. Itere com git push (redeploy automático)

### Para Desenvolvimento Contínuo:
**Use Opção 2 (Preview Deployments)**

1. Trabalhe em branch `dev` ou `staging`
2. Push → Preview automático
3. Teste no preview
4. Merge para `main` quando pronto

### NÃO recomendamos:
❌ Opção 3 (ngrok) - Complexo e temporário

---

## 🚀 Workflow Recomendado

### Setup Inicial (uma vez)

```bash
# 1. Configurar Vercel
.\scripts\setup-vercel-meta.ps1

# 2. Deploy production
git add .
git commit -m "feat: add meta integration"
git push origin main

# 3. Testar
# https://saraalagoas.com/admin/instancias
```

### Desenvolvimento Contínuo

```bash
# 1. Criar branch
git checkout -b feature/melhorias-meta

# 2. Fazer mudanças
# ... editar código ...

# 3. Push para preview
git add .
git commit -m "feat: melhorias na UI"
git push origin feature/melhorias-meta

# 4. Testar no preview
# Vercel cria preview automaticamente
# URL aparece no dashboard ou no GitHub PR

# 5. Se OK, merge para main
git checkout main
git merge feature/melhorias-meta
git push origin main
```

---

## 📋 Checklist de Teste

### Antes de Testar

- [ ] Variáveis configuradas na Vercel
- [ ] OAuth Redirect configurado no Facebook
- [ ] Deploy feito (production ou preview)
- [ ] URL HTTPS (não localhost)

### Durante o Teste

- [ ] Acessar página de instâncias
- [ ] Clicar "Conectar conta Meta"
- [ ] Redireciona para Facebook (não erro)
- [ ] Autorizar o app
- [ ] Selecionar página
- [ ] Volta para o site com sucesso
- [ ] Integração aparece na lista

### Se Houver Erro

- [ ] Ver logs na Vercel (Functions)
- [ ] Verificar variáveis carregadas
- [ ] Confirmar URL no Facebook App
- [ ] Testar em aba anônima (cache)

---

## 🔍 Debug em Produção

### Ver Logs

**Vercel Dashboard** → Deployments → [último] → **Functions**

Procure por:
```
[META OAuth] DEBUG - Environment variables check:
```

### Teste Rápido de Variáveis

Crie rota temporária: `app/api/meta/test-config/route.ts`

```typescript
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    has_app_id: !!process.env.META_APP_ID,
    has_secret: !!process.env.META_APP_SECRET,
    redirect_uri: process.env.META_REDIRECT_URI,
    // NÃO retorne valores reais de secrets!
  })
}
```

Acesse: `https://saraalagoas.com/api/meta/test-config`

⚠️ **Remova essa rota depois!**

---

## ✅ Resumo

| Método | Complexidade | Quando usar |
|--------|--------------|-------------|
| **Produção direta** | ⭐ Fácil | Setup inicial, mudanças pequenas |
| **Preview Deployment** | ⭐⭐ Médio | Desenvolvimento contínuo |
| **ngrok/tunnel** | ⭐⭐⭐ Difícil | Não recomendado |

**Nossa recomendação**: 
1. Configure e teste em **produção** primeiro
2. Use **preview deployments** para iterações
3. Evite localhost (não funciona mesmo)

---

## 📚 Links Úteis

- **Vercel Previews**: https://vercel.com/docs/concepts/deployments/preview-deployments
- **Facebook OAuth Docs**: https://developers.facebook.com/docs/facebook-login/web
- **ngrok**: https://ngrok.com/ (se realmente precisar)

---

**TL;DR**: Localhost não funciona com Facebook OAuth. Use Vercel (production ou preview) para testar.

**Data**: 2026-02-10  
**Domínio**: saraalagoas.com
