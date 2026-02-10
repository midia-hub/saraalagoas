# ✅ Checklist de Deploy - Meta Integration

## Para: saraalagoas.com

Use este checklist para garantir um deploy bem-sucedido.

---

## 📋 Pré-Deploy

### 1. Build Local
- [ ] Build funciona: `npm run build`
- [ ] Sem erros TypeScript
- [ ] Sem erros ESLint
- [ ] Código commitado no Git

⚠️ **Nota**: Facebook não permite OAuth em localhost. Teste direto em produção (Vercel).

### 2. Supabase
- [ ] Migration aplicada: `supabase-meta.sql`
- [ ] Tabela `meta_integrations` criada
- [ ] Políticas RLS configuradas
- [ ] Testado insert/select funciona

### 3. Código
- [ ] Todos arquivos commitados
- [ ] Build local funciona: `npm run build`
- [ ] Sem erros TypeScript
- [ ] Sem erros ESLint

---

## 🎯 Facebook App

### Settings → Basic
- [ ] App ID: `1475677427606585`
- [ ] App Domains: `saraalagoas.com`, `www.saraalagoas.com`
- [ ] Site URL: `https://saraalagoas.com`
- [ ] Changes salvos

### Facebook Login → Settings
- [ ] OAuth Redirect: `https://saraalagoas.com/api/meta/oauth/callback`
- [ ] OAuth Redirect: `https://www.saraalagoas.com/api/meta/oauth/callback`
- [ ] Web OAuth Login: ON
- [ ] Enforce HTTPS: ON
- [ ] Changes salvos

⚠️ **Importante**: Apenas URLs HTTPS são permitidas (localhost não funciona).

### Produtos
- [ ] Facebook Login adicionado
- [ ] Instagram API adicionado

### Roles (Development Mode)
- [ ] Você está como Admin
- [ ] Usuários de teste adicionados (se necessário)

---

## 🚀 Vercel Deploy

### Opção A: Script Automático

Windows PowerShell:
```powershell
.\scripts\setup-vercel-meta.ps1
```

- [ ] Script executado
- [ ] 5 variáveis adicionadas
- [ ] Redeploy feito

### Opção B: Manual

#### Adicionar Variáveis

Vercel → Projeto → Settings → Environment Variables

| Nome | Valor | Env |
|------|-------|-----|
| META_APP_ID | `1475677427606585` | ✅ Production, ✅ Preview |
| META_APP_SECRET | `027eafd1b907a10ff5f0f91ee5165335` | ✅ Production, ✅ Preview |
| META_REDIRECT_URI | `https://saraalagoas.com/api/meta/oauth/callback` | ✅ Production |
| META_SCOPES | `pages_show_list,pages_read_engagement,instagram_basic,instagram_content_publish,pages_manage_metadata,instagram_manage_messages` | ✅ Production, ✅ Preview |
| META_STATE_SECRET | `a7f8d9e2c4b1a6f5e8d7c3b2a9f1e4d8c6b5a3f2e1d9c8b7a6f5e4d3c2b1a0f9` | ✅ Production, ✅ Preview |

**Checklist:**
- [ ] Todas as 5 variáveis adicionadas
- [ ] Marcado Production em cada uma
- [ ] Marcado Preview em cada uma (exceto REDIRECT_URI)
- [ ] Nenhuma variável com `NEXT_PUBLIC_`

#### Redeploy

- [ ] Vercel → Deployments → ... → Redeploy
- [ ] OU executado: `vercel --prod`
- [ ] Build completou com sucesso
- [ ] Sem erros nos logs

---

## ✅ Teste em Produção

### 1. Acessar Admin
- [ ] Abrir: https://saraalagoas.com/admin/instancias
- [ ] Fazer login como admin
- [ ] Se o login não funcionar na Vercel: veja **docs/LOGIN-VERCEL.md** (variáveis NEXT_PUBLIC_SUPABASE_*, SUPABASE_SERVICE_ROLE_KEY e Redeploy)

### 2. Conectar Meta
- [ ] Clicar "Conectar conta Meta"
- [ ] Redireciona para Facebook (não dá erro)
- [ ] Autorizar o app
- [ ] Selecionar página (se múltiplas)
- [ ] Volta para: `/admin/instancias?connected=1`

### 3. Verificar Integração
- [ ] Integração aparece na lista
- [ ] Nome da página correto
- [ ] Instagram username aparece (se vinculado)
- [ ] Status: "Ativa"
- [ ] Badge verde com ícone ✓

### 4. Testar Ações
- [ ] Desativar integração
- [ ] Status muda para "Inativa"
- [ ] Reativar integração
- [ ] Status volta para "Ativa"
- [ ] Excluir funciona (se quiser testar)

### 5. Verificar Logs (se houver erro)
- [ ] Vercel → Deployments → [último] → Functions
- [ ] Procurar por `[META OAuth]`
- [ ] Verificar se variáveis estão carregadas

---

## 🐛 Se Algo Falhar

### Erro: PLATFORM_INVALID_APP_ID
**Causa**: Variáveis não carregadas ou redeploy não feito.

**Solução**:
1. Vercel → Settings → Environment Variables
2. Verificar se existem as 5 variáveis
3. Fazer **Redeploy**
4. Ver logs da function

### Erro: redirect_uri_mismatch
**Causa**: URL não está no Facebook App.

**Solução**:
1. Facebook Login → Settings
2. Adicionar: `https://saraalagoas.com/api/meta/oauth/callback`
3. Exatamente igual, sem `/` no final
4. Salvar changes

### Erro: App em Development Mode
**Causa**: Usuário não é testador.

**Solução**:
- Adicionar usuário em Roles → Test Users
- OU colocar app em Live Mode

### Deploy falha
**Causa**: Erro de build.

**Solução**:
1. Ver logs do deployment
2. Rodar `npm run build` localmente
3. Corrigir erros TypeScript/ESLint
4. Fazer novo deploy

---

## 📝 Documentação de Referência

Se precisar de ajuda detalhada:

| Documento | Quando usar |
|-----------|-------------|
| `VERCEL-DEPLOY-META.md` | Instruções completas de deploy |
| `FACEBOOK-APP-SETUP.md` | Configurar Facebook App passo a passo |
| `docs/META-TROUBLESHOOTING.md` | Resolver problemas e erros |
| `docs/META-INTEGRATION.md` | Documentação técnica completa |

---

## 🎉 Deploy Concluído!

Quando todos os itens acima estiverem ✅:

- [x] Meta Integration está rodando em produção
- [x] OAuth funcionando em saraalagoas.com
- [x] Pronto para conectar páginas e Instagram
- [x] Preparado para próxima fase (publicar posts)

**Próximos passos**:
1. Conectar conta Meta de produção
2. Documentar qual página foi conectada
3. Monitorar expiração de token (60 dias)
4. Implementar publicação de posts

---

**Domínio**: saraalagoas.com  
**App ID**: 1475677427606585  
**Última atualização**: 2026-02-10
