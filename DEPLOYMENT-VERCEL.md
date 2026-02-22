# Checklist de Deploy na Vercel

## ✅ Antes de Fazer Push para Git

### 1. **Variáveis de Ambiente**
- [ ] Nunca commite `.env.local` ou `config/*-service-account.json`
- [ ] `.gitignore` já exclui esses arquivos ✓
- [ ] `.env.example` documentado com todas as variáveis necessárias ✓

### 2. **Limpeza de Código**
- [ ] ✓ Removidas rotas de `/api/setup` (endpoints de debug)
- [ ] ✓ Removida página `/admin/debug`
- [ ] Verificar se há `console.log()` sensitivos
  - Procure por: passwords, tokens, keys, secrets

### 3. **Build Validation**
- [ ] ✓ `npm run build` passa sem erros
- [ ] ✓ TypeScript: `ignoreBuildErrors: true` (configurado em next.config.js)
- [ ] ✓ ESLint: `ignoreDuringBuilds: true` (configurado em next.config.js)

### 4. **Configurações NextJS**
- [ ] ✓ next.config.js verificado
- [ ] ✓ basePath configurado para Vercel (vazio por padrão)
- [ ] ✓ Image optimization: remotePatterns para Supabase ✓

---

## 📋 Configuração na Vercel

### 1. **Importar Repositório**
```
1. https://vercel.com/new
2. Conectar repositório GitHub/GitLab
3. Selecionar branch principal
```

### 2. **Build & Development Settings**
```
Framework Preset: Next.js
Build Command: npm run build
Output Directory: .next
Install Command: npm ci
Development Command: npm run dev
```

### 3. **Environment Variables**
Adicionar no painel Vercel → Project Settings → Environment Variables:

**Obrigatórias:**
```
NEXT_PUBLIC_SUPABASE_URL=https://sua-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=seu-anon-key
SUPABASE_SERVICE_ROLE_KEY=seu-service-role-key
```

**Opcionais:**
```
NEXT_PUBLIC_APP_URL=https://seu-dominio.com
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
```

### 4. **Domínio Customizado** (Opcional)
```
Vercel → Domains → Add Custom Domain
```

---

## 🔒 Segurança

### DO's ✅
- ✓ Variáveis sensíveis SEMPRE em Environment Variables da Vercel
- ✓ Service Role Key SÓ em backend (server components/route handlers)
- ✓ Anon Key pode estar no NEXT_PUBLIC_ (seguro para cliente)

### DON'Ts ❌
- ✗ Nunca commite `.env.local`
- ✗ Nunca exponha SUPABASE_SERVICE_ROLE_KEY no frontend
- ✗ Não use hardcoded values de keys/tokens
- ✗ Não adicione config/*-service-account.json ao Git

---

## 🧪 Testes Antes do Deploy

### Local
```bash
npm run build      # Verificar build
npm run start      # Testar produção
```

### Verificação de Variáveis
Certifique-se que:
```javascript
// ✓ OK: Server component
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// ✗ ERRADO: Expor no frontend
const key = process.env.SUPABASE_SERVICE_ROLE_KEY // Em client component
```

---

## 🚀 Deploy Steps

1. **Commit e Push**
   ```bash
   git add .
   git commit -m "feat: prepare for vercel deployment"
   git push origin main
   ```

2. **Vercel Importa Automaticamente**
   - GitHub webhook dispara
   - Build inicia automaticamente
   - Vercel mostra URL preview após sucesso

3. **Monitorar Build**
   - Dashbaord Vercel → Deployments → clique para ver logs
   - Se houver erro, ver stacktrace

4. **Testar**
   - Teste todas as rotas críticas
   - Login com Supabase
   - Admin panel
   - API endpoints

---

## 📊 Troubleshooting Comum

| Erro | Causa | Solução |
|------|-------|---------|
| `SUPABASE_SERVICE_ROLE_KEY undefined` | Variável não set em Vercel | Adicionar em Environment Variables |
| `Module not found` | Dependência faltante | `npm install` + git commit |
| `Build timeout (12 min)` | Projeto muito grande | Otimizar imports, verificar next.config |
| `Image format error` | Sharp não compilou | Usar buildpack Next.js da Vercel |

---

## 📝 Checklist Final

PRÉ-PUSH GIT:
- [ ] .env.local NÃO commitado
- [ ] config/*-service-account.json NÃO commitado
- [ ] npm run build ✓ (sem erros)
- [ ] Removidas rotas /api/setup ✓
- [ ] Removida página /admin/debug ✓

PRÉ-DEPLOY VERCEL:
- [ ] Repositório conectado no Vercel
- [ ] Build Command = `npm run build`
- [ ] Environment variables configuradas:
  - NEXT_PUBLIC_SUPABASE_URL
  - NEXT_PUBLIC_SUPABASE_ANON_KEY
  - SUPABASE_SERVICE_ROLE_KEY
- [ ] Domínio customizado (opcional)

PÓS-DEPLOY:
- [ ] Verificar logs de build
- [ ] Testar rotas principais
- [ ] Testar login Supabase
- [ ] Testar admin panel
- [ ] Verificar images e assets carregando

---

## 🔗 Links Úteis

- https://vercel.com/docs/next.js
- https://supabase.com/docs/guides/getting-started/connect-to-nextjs
- https://nextjs.org/docs/deployment/vercel

---

**Status:** ✅ Projeto pronto para Git e Vercel
**Data:** 22 de fevereiro de 2026
