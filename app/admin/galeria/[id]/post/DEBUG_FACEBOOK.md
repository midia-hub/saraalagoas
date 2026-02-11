# 🐛 Debug: Facebook não está publicando

Guia para diagnosticar problemas de publicação no Facebook.

---

## 🔍 Checklist de Verificação

### 1. ✅ Verificar se a conta tem Facebook vinculado

**No Console do Browser:**
```javascript
// Após carregar a página de criação de post
console.log('Instances:', instances)
// Verificar se tem has_facebook: true
```

**Verificar na API:**
```bash
GET /api/admin/instagram/instances?forPosting=1
```

**Resposta esperada:**
```json
[
  {
    "id": "meta_ig:abc123",
    "name": "Minha Conta (@username)",
    "provider": "meta",
    "has_instagram": true,
    "has_facebook": true,  ← DEVE SER TRUE
    "page_id": "123456789"  ← DEVE EXISTIR
  }
]
```

### 2. ✅ Verificar se o checkbox do Facebook aparece

**No browser:**
- Selecione a conta no dropdown
- Verifique se aparecem 2 checkboxes:
  - ☑ 📷 Instagram
  - ☐ 📘 Facebook

**Se não aparecer:**
- A conta não tem `has_facebook: true`
- Precisa reconectar a conta em Instâncias (Meta)

### 3. ✅ Verificar se ambos checkboxes estão marcados

Antes de clicar "Publicar":
```
☑ 📷 Instagram
☑ 📘 Facebook  ← DEVE ESTAR MARCADO
```

### 4. ✅ Verificar destinations enviados para API

**No Console (Network tab):**
```
POST /api/social/publish

Body:
{
  "albumId": "...",
  "instanceIds": ["meta_ig:abc123"],
  "destinations": {
    "instagram": true,
    "facebook": true  ← DEVE SER TRUE
  },
  "text": "...",
  "mediaEdits": [...]
}
```

### 5. ✅ Verificar logs do servidor

**No terminal do servidor (console):**
```
[publish] Destinations: { instagram: true, facebook: true }
[publish] Meta Selections: [
  { type: 'instagram', integrationId: 'abc123' },
  { type: 'facebook', integrationId: 'abc123' }  ← DEVE TER FACEBOOK
]
[publish] Processing instagram for integration abc123
[publish] Processing facebook for integration abc123  ← DEVE APARECER
[publish] Publishing to Facebook page 123456789
[publish] Publishing X images to Facebook
[publish] Facebook post created: 987654321
[publish] facebook published successfully
```

---

## 🔧 Diagnóstico por Sintoma

### Sintoma 1: Checkbox do Facebook não aparece

**Causa:** Conta não tem Facebook vinculado

**Solução:**
1. Ir em `/admin/instancias`
2. Verificar se a página do Facebook está vinculada
3. Se não, reconectar a conta
4. Aceitar todas as permissões do Facebook

### Sintoma 2: Checkbox aparece mas não marca

**Causa:** Bug no JavaScript (raro)

**Solução:**
1. Abrir DevTools (F12)
2. Console → verificar erros
3. Recarregar a página (Ctrl+F5)

### Sintoma 3: Checkbox marcado mas não publica

**Causa provável:** `destinations` não está sendo enviado

**Debug:**
```javascript
// No handlePublish, antes do fetch
console.log('Draft destinations:', draft.destinations)
console.log('Sending:', {
  destinations: draft.destinations,
  instanceIds: draft.selectedInstanceIds
})
```

**Verificar:**
- `draft.destinations.facebook === true`
- Body do POST inclui `destinations`

### Sintoma 4: API recebe mas não processa Facebook

**Causa provável:** Erro na integração ou permissões

**Debug no servidor:**
```
[publish] Processing facebook for integration abc123
Erro: Integração sem página do Facebook
```

**Solução:**
1. Verificar `page_id` na tabela `meta_integrations`
2. Se null, reconectar conta
3. Verificar permissões:
   - `pages_show_list`
   - `pages_read_engagement`
   - `pages_manage_posts`

---

## 🧪 Teste Manual

### Passo a Passo

1. **Abrir página de postagem:**
   ```
   /admin/galeria/[id]/post/create
   ```

2. **Abrir DevTools (F12)**
   - Aba Console
   - Aba Network

3. **Selecionar conta Meta**

4. **Verificar checkboxes aparecem:**
   ```
   ☑ Instagram
   ☐ Facebook
   ```

5. **Marcar ambos:**
   ```
   ☑ Instagram
   ☑ Facebook
   ```

6. **Verificar estado no console:**
   ```javascript
   // No React DevTools
   destinations: { instagram: true, facebook: true }
   ```

7. **Clicar "Publicar"**

8. **Na aba Network:**
   - Encontrar requisição `POST /api/social/publish`
   - Aba "Payload" → verificar `destinations`
   - Aba "Response" → verificar `metaResults`

9. **Verificar resposta:**
   ```json
   {
     "ok": true,
     "message": "Publicado em: Instagram e Facebook. X imagens.",
     "metaResults": [
       { "provider": "instagram", "ok": true },
       { "provider": "facebook", "ok": true }  ← DEVE EXISTIR
     ]
   }
   ```

10. **Verificar logs do servidor:**
    - Ver console do terminal
    - Procurar por `[publish] Publishing to Facebook`

---

## 🔍 Comandos de Debug SQL

### Verificar integração Meta

```sql
SELECT 
  id,
  page_name,
  page_id,
  instagram_business_account_id,
  instagram_username,
  is_active,
  scopes
FROM meta_integrations
WHERE created_by = 'USER_ID'
  AND is_active = true;
```

**Verificar:**
- `page_id` não é NULL (necessário para Facebook)
- `instagram_business_account_id` não é NULL (necessário para Instagram)
- `scopes` inclui `pages_manage_posts` ou similar

---

## 🛠️ Soluções Comuns

### Solução 1: Reconectar Conta Meta

Se `page_id` está NULL ou permissões faltando:

1. Ir em `/admin/instancias`
2. Deletar integração existente
3. Clicar "Conectar Instagram via Meta"
4. **Importante:** Aceitar TODAS as permissões:
   - Acesso às páginas do Facebook ✓
   - Publicar em páginas ✓
   - Acesso ao Instagram Business ✓
   - Publicar no Instagram ✓

### Solução 2: Limpar Cache e Rascunho

```javascript
// No console do browser
localStorage.removeItem('postDraft:ALBUM_ID')
location.reload()
```

### Solução 3: Verificar URLs das Imagens

As imagens precisam ser **publicamente acessíveis**:

```javascript
// Testar URL da imagem
fetch('URL_DA_IMAGEM').then(r => console.log('Status:', r.status))
// Deve retornar 200
```

Se retornar 403/404:
- Verificar bucket `instagram_posts`
- Verificar política de acesso público
- Verificar CORS

---

## 📊 Logs Esperados (Sucesso)

```
[publish] Destinations: { instagram: true, facebook: true }
[publish] Meta Selections: [
  { type: 'instagram', integrationId: 'abc123' },
  { type: 'facebook', integrationId: 'abc123' }
]
[publish] Integration IDs: [ 'abc123' ]
[publish] Processing instagram for integration abc123
[publish] Publishing single image to Instagram
[publish] instagram published successfully
[publish] Processing facebook for integration abc123
[publish] Publishing to Facebook page 123456789
[publish] Publishing 1 images to Facebook
[publish] Facebook post created: 987654321
[publish] facebook published successfully
```

---

## ⚠️ Erros Comuns

### Erro: "Integração sem página do Facebook"

**Causa:** `page_id` é NULL

**Solução:** Reconectar conta

### Erro: "OAuthException"

**Causa:** Token expirado ou permissões insuficientes

**Solução:** 
1. Verificar `token_expires_at`
2. Reconectar se expirado
3. Verificar `scopes` incluem permissões Facebook

### Erro: "Invalid parameter"

**Causa:** URL da imagem inacessível ou formato inválido

**Solução:**
1. Testar URL manualmente
2. Verificar CORS
3. Verificar formato (JPG, PNG, WebP)

---

## 🎯 Teste Rápido

Execute este teste para confirmar funcionamento:

```bash
# 1. Verificar integrações
curl http://localhost:3000/api/admin/instagram/instances?forPosting=1 \
  -H "Authorization: Bearer YOUR_TOKEN"

# 2. Publicar teste
curl -X POST http://localhost:3000/api/social/publish \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "albumId": "ALBUM_ID",
    "instanceIds": ["meta_ig:INTEGRATION_ID"],
    "destinations": {
      "instagram": true,
      "facebook": true
    },
    "text": "Teste",
    "mediaEdits": [{"id": "FILE_ID"}]
  }'
```

---

## 📞 Próximos Passos

Se o problema persistir:

1. ✅ Executar checklist acima
2. ✅ Coletar logs do servidor
3. ✅ Verificar Network tab no DevTools
4. ✅ Verificar integração Meta no banco
5. ✅ Tentar reconectar conta
6. ✅ Verificar se página do Facebook existe e está ativa

---

**Última atualização:** Fevereiro 2026
