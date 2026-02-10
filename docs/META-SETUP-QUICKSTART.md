# Meta Integration - Guia Rápido de Setup

## ✅ O que foi implementado

### 1. Banco de Dados
- ✅ `supabase-meta.sql` - Migration completa com:
  - Tabela `meta_integrations`
  - Função `can_manage_meta_integrations()`
  - Políticas RLS baseadas em permissões do Instagram
  - Índices otimizados

### 2. Backend (API)
- ✅ `lib/meta.ts` - Biblioteca completa com:
  - OAuth (state assinado, troca de tokens)
  - Gestão de tokens long-lived
  - APIs para buscar perfil, páginas e Instagram
  - Funções para publicação (preparadas)
  
- ✅ Rotas OAuth:
  - `/api/meta/oauth/start` - Inicia OAuth
  - `/api/meta/oauth/callback` - Processa callback
  
- ✅ Rotas de gestão:
  - `GET /api/meta/integrations` - Lista integrações
  - `PATCH /api/meta/integrations/[id]` - Ativa/desativa
  - `DELETE /api/meta/integrations/[id]` - Remove
  
- ✅ Rotas de seleção:
  - `GET /api/meta/pages` - Lista páginas disponíveis
  - `POST /api/meta/select-page` - Finaliza vínculo
  
- ✅ Placeholders (501):
  - `POST /api/meta/instagram/publish` - Publicar posts
  - `GET/POST /api/meta/instagram/messages` - Mensagens

### 3. Frontend (Admin)
- ✅ `app/admin/instancias/page.tsx` - Página principal:
  - Lista integrações conectadas
  - Botão conectar Meta
  - Status visual (ativa/inativa/expirada)
  - Ações: ativar/desativar/excluir
  
- ✅ `app/admin/instancias/select/page.tsx` - Seleção de página:
  - Grid com páginas disponíveis
  - Detecção automática de Instagram Business
  - Visual moderno e intuitivo
  
- ✅ Sidebar atualizada com "Instâncias (Meta)"

### 4. Documentação
- ✅ `docs/META-INTEGRATION.md` - Documentação completa
- ✅ `docs/META-SETUP-QUICKSTART.md` - Este arquivo
- ✅ `.env` atualizado com exemplos comentados

## 🚀 Como usar (Desenvolvimento)

### 1. Configurar App Meta

```bash
# 1. Acesse https://developers.facebook.com/
# 2. Crie novo App (tipo Business)
# 3. Adicione produtos: Facebook Login, Instagram API
# 4. Configure OAuth redirect: http://localhost:3000/api/meta/oauth/callback
# 5. Copie App ID e App Secret
```

### 2. Configurar Variáveis de Ambiente

Edite `.env.local` (ou `.env`):

```env
META_APP_ID=123456789
META_APP_SECRET=abc123def456
META_REDIRECT_URI=http://localhost:3000/api/meta/oauth/callback
META_SCOPES=pages_show_list,pages_read_engagement,instagram_basic,instagram_content_publish
META_STATE_SECRET=seu_segredo_aleatorio_32_chars_minimo
```

**IMPORTANTE**: Gere `META_STATE_SECRET` aleatório:
```bash
# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# OpenSSL
openssl rand -hex 32
```

### 3. Aplicar Migration

```bash
# Se usando Supabase CLI
supabase db push

# OU execute manualmente no Supabase SQL Editor:
# Cole o conteúdo de supabase-meta.sql
```

### 4. Testar

```bash
npm run dev
# ou
yarn dev
```

1. Acesse `http://localhost:3000/admin/instancias`
2. Clique "Conectar conta Meta"
3. Autorize no Facebook
4. Selecione página
5. Pronto!

## 📦 Deploy (Produção - Vercel)

### 1. Configurar variáveis na Vercel

```bash
vercel env add META_APP_ID
vercel env add META_APP_SECRET
vercel env add META_REDIRECT_URI
vercel env add META_SCOPES
vercel env add META_STATE_SECRET
```

**CRÍTICO**: `META_REDIRECT_URI` deve ser:
```
https://seu-dominio.vercel.app/api/meta/oauth/callback
```

### 2. Atualizar OAuth Redirect no Meta App

No painel do Facebook Developers:
- Vá em Facebook Login > Settings
- Adicione: `https://seu-dominio.vercel.app/api/meta/oauth/callback`

### 3. Deploy

```bash
vercel --prod
```

## 🔐 Segurança

✅ **Implementado**:
- Tokens nunca expostos ao client (server-only)
- State OAuth assinado (CSRF protection)
- RLS habilitado no Supabase
- Validação de permissões em todas rotas
- Tokens long-lived (60 dias)

⚠️ **Próximos passos**:
- Implementar renovação automática de tokens
- Monitorar expiração e alertar usuários
- Rate limiting nas rotas públicas

## 🎯 Critérios de Aceite

✅ Admin vê menu "Instâncias (Meta)"  
✅ Admin clica "Conectar conta Meta" e faz OAuth  
✅ Ao voltar, integração aparece listada com Página + Instagram  
✅ Tokens ficam no Supabase, inacessíveis ao client  
✅ Rotas estão protegidas por permissões admin  
✅ Suporte a múltiplas páginas (seleção)  
✅ Status visual (ativa/inativa/expirada)  
✅ Ações: ativar/desativar/excluir  

## 🔜 Próximos Passos (fora do escopo atual)

### Publicar no Instagram
1. Implementar upload de mídia para storage público
2. Completar `POST /api/meta/instagram/publish`
3. Criar UI para agendar posts
4. Integrar com sistema de jobs/queue

### Mensagens Instagram
1. Completar `GET /api/meta/instagram/messages`
2. Criar UI de inbox
3. Implementar envio de mensagens
4. Webhook para mensagens em tempo real

### Melhorias
1. Renovação automática de tokens
2. Métricas e analytics
3. Multi-conta (usuários diferentes)
4. Histórico de publicações

## 📚 Referências

- [Documentação completa](./META-INTEGRATION.md)
- [Meta for Developers](https://developers.facebook.com/)
- [Instagram API](https://developers.facebook.com/docs/instagram-api)
- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)

## 🆘 Troubleshooting

| Erro | Solução |
|------|---------|
| "invalid_state" | State OAuth expirou (10min). Tente novamente. |
| "Nenhuma página encontrada" | Crie uma Página no Facebook primeiro. |
| "Instagram não detectado" | Conta precisa ser Business/Creator e vinculada à Página. |
| "Token expirado" | Reautentique clicando "Conectar conta Meta" novamente. |
| Erro CORS | Verifique META_REDIRECT_URI no .env e no Meta App. |

## ✨ Estrutura de Arquivos Criados

```
c:\midia_igreja\
├── supabase-meta.sql                          # Migration banco
├── lib/
│   └── meta.ts                                # Biblioteca Meta API
├── app/
│   ├── admin/
│   │   ├── AdminSidebar.tsx                   # ✏️ Atualizado
│   │   └── instancias/
│   │       ├── page.tsx                       # Página principal
│   │       └── select/
│   │           └── page.tsx                   # Seleção de página
│   └── api/
│       └── meta/
│           ├── oauth/
│           │   ├── start/route.ts             # Inicia OAuth
│           │   └── callback/route.ts          # Callback OAuth
│           ├── pages/route.ts                 # Lista páginas
│           ├── select-page/route.ts           # Seleciona página
│           ├── integrations/
│           │   ├── route.ts                   # CRUD integrações
│           │   └── [id]/route.ts              # Operações individuais
│           └── instagram/
│               ├── publish/route.ts           # 🔜 Placeholder
│               └── messages/route.ts          # 🔜 Placeholder
├── docs/
│   ├── META-INTEGRATION.md                    # Documentação completa
│   └── META-SETUP-QUICKSTART.md              # Este arquivo
└── .env                                       # ✏️ Atualizado com exemplos
```

---

**Status**: ✅ Implementação completa e funcional  
**Última atualização**: 2026-02-10  
**Próximo milestone**: Implementar publicação de posts
