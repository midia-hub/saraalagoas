# 🎯 Integração Meta (Facebook/Instagram) - Implementada ✅

## Resumo da Implementação

Implementação completa de OAuth e integração com Meta (Facebook/Instagram) para o sistema de mídia da igreja.

### ✅ O que está funcionando

1. **OAuth Flow completo**
   - Login via Facebook
   - Troca de tokens (short → long-lived)
   - State assinado (proteção CSRF)
   - Suporte a múltiplas páginas

2. **Gestão de Integrações**
   - Listar integrações conectadas
   - Ativar/desativar
   - Excluir
   - Status visual (ativa/inativa/expirada)

3. **Interface Admin**
   - Página principal: `/admin/instancias`
   - Seleção de página: `/admin/instancias/select`
   - Integrado na sidebar

4. **Segurança**
   - RLS no Supabase
   - Tokens server-side only
   - Validação de permissões
   - State CSRF protection

### 🔜 Preparado (Placeholders)

- `POST /api/meta/instagram/publish` - Publicar posts
- `GET/POST /api/meta/instagram/messages` - Mensagens

## 📁 Arquivos Criados

### Banco de Dados
- ✅ `supabase-meta.sql` - Migration completa

### Backend
- ✅ `lib/meta.ts` - Biblioteca Meta API
- ✅ `app/api/meta/oauth/start/route.ts`
- ✅ `app/api/meta/oauth/callback/route.ts`
- ✅ `app/api/meta/pages/route.ts`
- ✅ `app/api/meta/select-page/route.ts`
- ✅ `app/api/meta/integrations/route.ts`
- ✅ `app/api/meta/integrations/[id]/route.ts`
- ✅ `app/api/meta/instagram/publish/route.ts` (placeholder)
- ✅ `app/api/meta/instagram/messages/route.ts` (placeholder)

### Frontend
- ✅ `app/admin/instancias/page.tsx`
- ✅ `app/admin/instancias/select/page.tsx`
- ✏️ `app/admin/AdminSidebar.tsx` (atualizado)

### Documentação
- ✅ `docs/META-INTEGRATION.md` - Documentação completa
- ✅ `docs/META-SETUP-QUICKSTART.md` - Guia rápido
- ✏️ `.env` (exemplos adicionados)

## 🚀 Setup Rápido

### 1. Variáveis de Ambiente

**Desenvolvimento** (`.env`):
```env
META_APP_ID=1475677427606585
META_APP_SECRET=027eafd1b907a10ff5f0f91ee5165335
META_REDIRECT_URI=http://localhost:3000/api/meta/oauth/callback
META_SCOPES=pages_show_list,pages_read_engagement,instagram_basic,instagram_content_publish,pages_manage_metadata,instagram_manage_messages
META_STATE_SECRET=a7f8d9e2c4b1a6f5e8d7c3b2a9f1e4d8c6b5a3f2e1d9c8b7a6f5e4d3c2b1a0f9
```

**Produção** (Vercel - saraalagoas.com):
```env
META_APP_ID=1475677427606585
META_APP_SECRET=027eafd1b907a10ff5f0f91ee5165335
META_REDIRECT_URI=https://saraalagoas.com/api/meta/oauth/callback
META_SCOPES=pages_show_list,pages_read_engagement,instagram_basic,instagram_content_publish,pages_manage_metadata,instagram_manage_messages
META_STATE_SECRET=a7f8d9e2c4b1a6f5e8d7c3b2a9f1e4d8c6b5a3f2e1d9c8b7a6f5e4d3c2b1a0f9
```

### 2. Aplicar Migration

```bash
# Execute no Supabase SQL Editor ou via CLI
supabase db push
```

### 3. Configurar Meta App

1. [Facebook for Developers](https://developers.facebook.com/)
2. Criar App (tipo Business)
3. Adicionar Facebook Login e Instagram API
4. Configurar OAuth Redirect URI
5. Copiar App ID e Secret

### 4. Testar Localmente

```bash
npm run dev
# Acesse: http://localhost:3000/admin/instancias
```

### 5. Deploy na Vercel (saraalagoas.com)

**Opção A - Script Automático (Windows)**:
```powershell
.\scripts\setup-vercel-meta.ps1
```

**Opção B - Manual**:
Veja instruções completas em: `VERCEL-DEPLOY-META.md`

**Opção C - Via Dashboard**:
1. Vercel → Settings → Environment Variables
2. Adicione as 5 variáveis Meta
3. Marque **Production** e **Preview**
4. Redeploy

## 📊 Fluxo de Uso

```
Admin → Instâncias (Meta) → Conectar conta Meta
  ↓
OAuth no Facebook (autorização)
  ↓
[1 página] → Conectado automaticamente
[Múltiplas] → Selecionar página → Conectado
  ↓
Integração ativa e pronta para uso
```

## 🎯 Próximos Passos

### Curto Prazo
- [ ] Implementar publicação de posts
- [ ] UI para criar/agendar posts
- [ ] Implementar mensagens Instagram

### Médio Prazo
- [ ] Renovação automática de tokens
- [ ] Métricas e analytics
- [ ] Multi-conta (diferentes usuários)

### Longo Prazo
- [ ] Webhook para eventos em tempo real
- [ ] Histórico de publicações
- [ ] Relatórios e insights

## 🔗 Links Úteis

### Documentação
- **Documentação Completa**: [docs/META-INTEGRATION.md](docs/META-INTEGRATION.md)
- **Guia Rápido**: [docs/META-SETUP-QUICKSTART.md](docs/META-SETUP-QUICKSTART.md)
- **Deploy Vercel**: [VERCEL-DEPLOY-META.md](VERCEL-DEPLOY-META.md)
- **Configuração Facebook App**: [FACEBOOK-APP-SETUP.md](FACEBOOK-APP-SETUP.md)
- **Troubleshooting**: [docs/META-TROUBLESHOOTING.md](docs/META-TROUBLESHOOTING.md)

### Produção
- **Site**: https://saraalagoas.com
- **Admin**: https://saraalagoas.com/admin/instancias
- **Vercel**: https://vercel.com/dashboard

### Meta/Facebook
- **Meta Developers**: https://developers.facebook.com/
- **Instagram API**: https://developers.facebook.com/docs/instagram-api
- **OAuth Docs**: https://developers.facebook.com/docs/facebook-login/web

## ✨ Features Destacadas

### 1. OAuth Seguro
- State assinado com HMAC
- Tokens long-lived (60 dias)
- Proteção CSRF

### 2. Multi-Página
- Suporte a múltiplas páginas
- Seleção interativa
- Detecção automática de Instagram

### 3. RLS Granular
- Baseado em permissões existentes
- Reutiliza sistema de RBAC
- Função helper `can_manage_meta_integrations()`

### 4. UX Moderna
- Status visual claro
- Feedback imediato
- Integração fluida com admin existente

## 🛡️ Segurança

✅ Tokens server-side only  
✅ RLS habilitado  
✅ State CSRF protection  
✅ Validação de permissões  
✅ Nenhum secret exposto ao client  

## 📞 Suporte

Para dúvidas ou problemas:
1. Consulte [docs/META-INTEGRATION.md](docs/META-INTEGRATION.md)
2. Verifique troubleshooting no guia rápido
3. Revise logs da API Meta

---

**Status**: ✅ Completo e funcional  
**Data**: 2026-02-10  
**Versão**: 1.0.0
