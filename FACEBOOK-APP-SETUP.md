# 📱 Facebook App - Checklist de Configuração

## Para: saraalagoas.com

### ✅ Checklist Completo

Use este documento para garantir que seu Facebook App está configurado corretamente.

---

## 1️⃣ Basic Settings

**Facebook Developers** → Seu App → **Settings** → **Basic**

### App ID
- [ ] App ID copiado: `1475677427606585`
- [ ] Este é o App ID (não Business ID, não Page ID)

### App Domains
Adicione os domínios (sem `https://`):

```
saraalagoas.com
www.saraalagoas.com
```

- [ ] `saraalagoas.com` adicionado
- [ ] `www.saraalagoas.com` adicionado

### Site URL (opcional mas recomendado)

```
https://saraalagoas.com
```

- [ ] Site URL configurada

### Save Changes
- [ ] Clicou em **Save Changes** no final da página

---

## 2️⃣ Facebook Login

**Facebook Developers** → Seu App → **Facebook Login** → **Settings**

### Valid OAuth Redirect URIs

**CRÍTICO**: As URLs devem ser EXATAMENTE iguais às configuradas no código.

#### Produção (OBRIGATÓRIO):
```
https://saraalagoas.com/api/meta/oauth/callback
https://www.saraalagoas.com/api/meta/oauth/callback
```

#### Preview Deployments (Vercel - opcional, para testes):
```
https://midia-igreja-git-*.vercel.app/api/meta/oauth/callback
```

⚠️ **IMPORTANTE**: 
- Facebook **NÃO permite** `http://localhost` (apenas HTTPS)
- Para testar, use Vercel (production ou preview)
- Veja: `TESTING-META-OAUTH.md` para opções de teste

**Checklist:**
- [ ] `https://saraalagoas.com/api/meta/oauth/callback` adicionado
- [ ] `https://www.saraalagoas.com/api/meta/oauth/callback` adicionado
- [ ] **Sem barra `/` no final**
- [ ] **Apenas HTTPS** (http://localhost não funciona)

### Client OAuth Login
- [ ] **Web OAuth Login**: Ligado (ON)
- [ ] **Enforce HTTPS**: Ligado (ON) para produção

### Login from Devices
- [ ] Desligado (OFF) - não é necessário para web app

### Save Changes
- [ ] Clicou em **Save Changes**

---

## 3️⃣ Instagram Basic Display / Graph API

**Facebook Developers** → Seu App → **Add Product** → **Instagram**

### Qual produto adicionar?

- **Instagram Basic Display**: Para apps básicos
- **Instagram Graph API**: Para apps avançados (preferível)

**Recomendação**: Use **Instagram Graph API** se disponível.

- [ ] Produto Instagram adicionado
- [ ] Configuração básica concluída

### Configuração do Instagram Graph API

Se usar Graph API:

1. Vá em **Instagram** → **Basic Display** ou **Graph API**
2. Configure:
   - [ ] **Valid OAuth Redirect URIs**: mesmas do Facebook Login
   - [ ] **Deauthorize Callback URL**: `https://saraalagoas.com` (opcional)
   - [ ] **Data Deletion Request URL**: `https://saraalagoas.com` (opcional)

---

## 4️⃣ Permissions & Features

**Facebook Developers** → Seu App → **App Review** → **Permissions and Features**

### Permissões Necessárias

Para o fluxo básico funcionar:

| Permission | Status | Descrição |
|------------|--------|-----------|
| `public_profile` | ✅ Padrão | Informações básicas do usuário |
| `pages_show_list` | 📋 Solicitar | Listar páginas do usuário |
| `pages_read_engagement` | 📋 Solicitar | Ler engagement das páginas |
| `instagram_basic` | 📋 Solicitar | Informações básicas IG |
| `instagram_content_publish` | 📋 Solicitar | Publicar no Instagram |
| `pages_manage_metadata` | 📋 Solicitar | Gerenciar metadados |
| `instagram_manage_messages` | 📋 Solicitar | Mensagens IG |

**Checklist:**
- [ ] Verificou quais permissões estão disponíveis
- [ ] Solicitou permissões avançadas (se necessário)

### Modo do App

#### Development Mode (padrão)
- Apenas admins/desenvolvedores/testadores podem usar
- [ ] Adicionou usuários de teste em **Roles** → **Test Users**

#### Live Mode (produção)
- Qualquer pessoa pode usar
- Requer **App Review** do Facebook
- [ ] App revisado e aprovado (se aplicável)

---

## 5️⃣ App Review (Para Live Mode)

**Só necessário se quiser que qualquer pessoa use o app.**

### Quando solicitar

- ✅ App em Development Mode: não precisa (apenas testadores)
- ⚠️ App em Live Mode: precisa review

### Como solicitar

1. **App Review** → **Permissions and Features**
2. Para cada permissão, clique **Request**
3. Preencha formulário:
   - Descreva como usa a permissão
   - Forneça screencast/capturas
   - Explique fluxo do usuário

**Checklist:**
- [ ] Review solicitado (se necessário)
- [ ] Review aprovado (aguardando)
- [ ] App em Live Mode

---

## 6️⃣ Roles (Usuários e Testes)

**Facebook Developers** → Seu App → **Roles**

### Administrators
- [ ] Você está listado como admin
- [ ] Outros admins adicionados (se necessário)

### Developers
- [ ] Desenvolvedores adicionados (se trabalhar em equipe)

### Testers
- [ ] Usuários de teste adicionados (para Development Mode)
- [ ] Testadores aceitaram convite

💡 **Dica**: Em Development Mode, apenas pessoas listadas aqui podem testar o OAuth.

---

## 7️⃣ Verificação Final

### URLs de Teste

#### Desenvolvimento:
```
http://localhost:3000/admin/instancias
```

#### Produção:
```
https://saraalagoas.com/admin/instancias
```

### Fluxo de Teste

1. Acesse a página de instâncias
2. Clique "Conectar conta Meta"
3. Deve redirecionar para Facebook
4. Autorize o app
5. Selecione página (se múltiplas)
6. Deve voltar para o site com sucesso

**Checklist de Teste:**
- [ ] Testado localmente (localhost)
- [ ] Testado em produção (saraalagoas.com)
- [ ] OAuth funciona sem erros
- [ ] Integração aparece na lista
- [ ] Instagram detectado (se vinculado)

---

## 🚨 Erros Comuns e Soluções

### Erro: "Can't Load URL"

**Causa**: Domínio não está em App Domains.

**Solução**: Adicione `saraalagoas.com` em **Settings** → **Basic** → **App Domains**

### Erro: "redirect_uri_mismatch"

**Causa**: URL não está em Valid OAuth Redirect URIs.

**Solução**: 
1. Copie a URL exata do erro
2. Adicione em **Facebook Login** → **Settings**
3. Sem `/` no final
4. Protocolo correto

### Erro: "App Not Setup"

**Causa**: Facebook Login não foi adicionado como produto.

**Solução**: **Add Product** → **Facebook Login** → **Set Up**

### Erro: "App is in Development Mode"

**Causa**: Usuário não é admin/developer/tester.

**Solução**: 
- Adicione usuário em **Roles** → **Test Users**
- OU coloque app em Live Mode (requer review)

### Erro: "This app is not available"

**Causa**: App foi desabilitado ou suspenso.

**Solução**: Verifique dashboard do app, pode haver algum aviso ou violação.

---

## 📋 Resumo Rápido

### URLs Configuradas

| Local | URL |
|-------|-----|
| **App Domains** | `saraalagoas.com`, `www.saraalagoas.com` |
| **Site URL** | `https://saraalagoas.com` |
| **OAuth Redirect (prod)** | `https://saraalagoas.com/api/meta/oauth/callback` |
| **OAuth Redirect (www)** | `https://www.saraalagoas.com/api/meta/oauth/callback` |
| **OAuth Redirect (dev)** | `http://localhost:3000/api/meta/oauth/callback` |

### Produtos Adicionados
- ✅ Facebook Login
- ✅ Instagram Basic Display / Graph API

### Permissões
- `pages_show_list`
- `pages_read_engagement`
- `instagram_basic`
- `instagram_content_publish`

---

## 🔗 Links Úteis

- **Facebook Developers**: https://developers.facebook.com/
- **Seu App**: https://developers.facebook.com/apps/{APP_ID}
- **Documentação OAuth**: https://developers.facebook.com/docs/facebook-login/web
- **Instagram API**: https://developers.facebook.com/docs/instagram-api

---

## ✅ Quando está 100% pronto?

- [x] App ID: `1475677427606585`
- [ ] App Domains configurados
- [ ] Facebook Login adicionado
- [ ] Instagram produto adicionado
- [ ] OAuth Redirect URIs corretos
- [ ] Testado e funcionando
- [ ] Variáveis configuradas na Vercel
- [ ] Deploy feito em produção

**Quando todos os itens estiverem ✅, você está pronto para usar em produção!**

---

**Última atualização**: 2026-02-10  
**Domínio**: saraalagoas.com  
**App ID**: 1475677427606585
