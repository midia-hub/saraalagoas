# Integração Meta (Facebook/Instagram)

Este documento descreve a configuração e uso da integração Meta para OAuth e publicação no Instagram.

## Visão Geral

A integração permite:
- ✅ Conectar contas Meta via OAuth (Facebook Login)
- ✅ Selecionar Página e Conta Instagram Business
- ✅ Armazenar tokens de longa duração no Supabase
- 🔄 Publicar no Instagram (preparado, implementação futura)
- 🔄 Ler/enviar mensagens Instagram (preparado, implementação futura)

## Configuração

### 1. Criar App Meta (Facebook for Developers)

1. Acesse [Facebook for Developers](https://developers.facebook.com/)
2. Crie um novo App do tipo "Business"
3. Adicione os seguintes produtos:
   - Facebook Login
   - Instagram Basic Display (ou Instagram Graph API)
   
4. Configure OAuth Redirect URIs:
   - Desenvolvimento: `http://localhost:3000/api/meta/oauth/callback`
   - Produção: `https://SEU-DOMINIO.com/api/meta/oauth/callback`

5. Obtenha:
   - App ID
   - App Secret

### 2. Variáveis de Ambiente

Adicione as seguintes variáveis ao arquivo `.env`:

```env
# Meta (Facebook/Instagram) Integration
META_APP_ID=seu_app_id_aqui
META_APP_SECRET=seu_app_secret_aqui
META_REDIRECT_URI=https://SEU-DOMINIO.com/api/meta/oauth/callback
META_SCOPES=pages_show_list,pages_read_engagement,instagram_basic,instagram_content_publish,pages_manage_metadata,instagram_manage_messages
META_STATE_SECRET=gere_um_segredo_aleatorio_aqui
```

#### Descrição das variáveis:

- **META_APP_ID**: ID do app Meta
- **META_APP_SECRET**: Secret do app Meta (NUNCA exponha no client!)
- **META_REDIRECT_URI**: URL completa do callback OAuth (deve corresponder ao configurado no Meta App)
- **META_SCOPES**: Permissões solicitadas (separadas por vírgula)
- **META_STATE_SECRET**: Secret para assinar o state OAuth (proteção CSRF)

#### Scopes recomendados:

| Scope | Descrição |
|-------|-----------|
| `pages_show_list` | Listar páginas do usuário |
| `pages_read_engagement` | Ler métricas da página |
| `instagram_basic` | Informações básicas da conta IG |
| `instagram_content_publish` | Publicar posts no Instagram |
| `pages_manage_metadata` | Gerenciar metadados da página |
| `instagram_manage_messages` | Ler/enviar mensagens IG |

### 3. Aplicar Migration

Execute a migration SQL no Supabase:

```bash
# Via CLI do Supabase
supabase db push

# Ou execute manualmente o arquivo:
# supabase-meta.sql
```

Isso criará:
- Tabela `meta_integrations`
- Função `can_manage_meta_integrations()`
- Políticas RLS

### 4. Deploy na Vercel

1. Configure as variáveis de ambiente no painel da Vercel
2. Certifique-se de que `META_REDIRECT_URI` aponta para o domínio de produção
3. Faça deploy

## Uso

### Conectar Conta Meta

1. Acesse `/admin/instancias` no Admin
2. Clique em "Conectar conta Meta"
3. Autorize o app no Facebook
4. Selecione a Página desejada
5. Pronto! A conta Instagram Business vinculada será detectada automaticamente

### Estrutura de Dados

Tabela `meta_integrations`:

```sql
{
  id: uuid
  created_at: timestamp
  updated_at: timestamp
  created_by: uuid (referência ao perfil)
  
  provider: 'meta'
  facebook_user_id: string
  facebook_user_name: string
  
  page_id: string
  page_name: string
  page_access_token: string (token da página)
  
  instagram_business_account_id: string
  instagram_username: string
  
  scopes: string[] (permissões concedidas)
  access_token: string (token long-lived do usuário)
  token_expires_at: timestamp
  
  is_active: boolean
  metadata: jsonb
}
```

## Fluxo OAuth

```
1. Usuário clica "Conectar conta Meta"
   ↓
2. GET /api/meta/oauth/start
   - Gera state assinado
   - Redireciona para Facebook
   ↓
3. Usuário autoriza no Facebook
   ↓
4. GET /api/meta/oauth/callback
   - Valida state (CSRF)
   - Troca code por token
   - Troca por long-lived token
   - Busca perfil do usuário
   - Lista páginas
   ↓
5a. Se 1 página: conecta automaticamente
    ↓
    Redireciona para /admin/instancias?connected=1
    
5b. Se múltiplas páginas: redireciona para seleção
    ↓
    /admin/instancias/select?integration_id=xxx
    ↓
    Usuário seleciona página
    ↓
    POST /api/meta/select-page
    ↓
    Redireciona para /admin/instancias?connected=1
```

## Próximos Passos

### Publicar no Instagram

Implementar `POST /api/meta/instagram/publish`:

1. Buscar integração ativa
2. Upload de mídia para storage público
3. Criar container no Instagram: `createInstagramMediaContainer()`
4. Aguardar processamento
5. Publicar: `publishInstagramMedia()`
6. Salvar resultado

### Mensagens Instagram

Implementar `/api/meta/instagram/messages`:

**GET**: Listar conversas
1. `GET /{ig_business_account_id}/conversations`
2. Para cada conversa, buscar mensagens recentes
3. Retornar threads com preview

**POST**: Enviar mensagem
1. `POST /{ig_business_account_id}/messages`
2. Body: `{ recipient: { thread_key }, message: { text } }`
3. Confirmar envio

## Segurança

- ✅ Tokens armazenados no Supabase (nunca expostos ao client)
- ✅ RLS habilitado (apenas admins/editores)
- ✅ State assinado com HMAC (proteção CSRF)
- ✅ Rotas protegidas com `requireAccess`
- ✅ Validação de permissões granulares

## Limitações e Considerações

1. **Instagram Business**: Conta precisa ser Business/Creator e vinculada a Página
2. **Tokens**: Long-lived tokens expiram em ~60 dias (implementar renovação)
3. **Rate Limits**: API Meta tem limites por app/usuário
4. **Revisão do App**: Para uso em produção, app precisa ser revisado pela Meta
5. **Mensagens**: Podem ter restrições de horário e tipo de conta

## Troubleshooting

### Erro "Token expirado"

Reautentique clicando em "Conectar conta Meta" novamente.

### Erro "Nenhuma página encontrada"

Certifique-se de ter uma Página do Facebook criada.

### Instagram não detectado

- Verifique se a conta Instagram é Business/Creator
- Confirme que está vinculada à Página no app Instagram
- Verifique se as permissões `instagram_basic` foram concedidas

### Erro "invalid_state"

O state OAuth expirou (máx 10 min). Tente novamente.

## Referências

- [Meta for Developers - Instagram API](https://developers.facebook.com/docs/instagram-api)
- [Content Publishing](https://developers.facebook.com/docs/instagram-api/guides/content-publishing)
- [Messaging](https://developers.facebook.com/docs/messenger-platform/instagram)
- [OAuth](https://developers.facebook.com/docs/facebook-login/web)
