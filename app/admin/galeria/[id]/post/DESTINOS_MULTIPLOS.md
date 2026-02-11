# 📱 Sistema de Destinos Múltiplos (Instagram e Facebook)

Permite publicar o mesmo post no **Instagram** e **Facebook** simultaneamente a partir de uma única conta Meta.

---

## 🎯 Funcionalidade

Ao selecionar uma conta Meta (integração com Facebook/Instagram), o usuário pode escolher onde publicar:
- ✅ **Apenas Instagram**
- ✅ **Apenas Facebook**
- ✅ **Ambos simultaneamente**

---

## 🎨 Interface

### Seleção de Destinos

Após selecionar a conta, aparecem checkboxes:

```
┌─────────────────────────────────────┐
│ Postar em                           │
│ [Selecionar conta ▼]                │
├─────────────────────────────────────┤
│ Onde deseja publicar?               │
│                                     │
│ ☑ 📷 Instagram                     │
│ ☐ 📘 Facebook                      │
│                                     │
│ Destino: Minha Conta • Instagram   │
└─────────────────────────────────────┘
```

### Estados Possíveis

1. **Apenas Instagram marcado**
```
☑ Instagram
☐ Facebook
→ Destino: Apenas Instagram
```

2. **Apenas Facebook marcado**
```
☐ Instagram
☑ Facebook
→ Destino: Apenas Facebook
```

3. **Ambos marcados**
```
☑ Instagram
☑ Facebook
→ Destino: Instagram e Facebook
```

4. **Nenhum marcado (erro)**
```
☐ Instagram
☐ Facebook
⚠️ Selecione ao menos uma plataforma
```

---

## 🔧 Implementação

### 1. Tipo `destinations` no PostDraft

```typescript
type PostDraft = {
  // ...outros campos
  destinations?: {
    instagram: boolean
    facebook: boolean
  }
}
```

**Padrão:** `{ instagram: true, facebook: false }`

### 2. Persistência (localStorage)

Os destinos são salvos junto com o rascunho:

```json
{
  "albumId": "abc123",
  "selectedInstanceIds": ["meta_ig:xyz"],
  "destinations": {
    "instagram": true,
    "facebook": true
  },
  "text": "Meu post",
  "media": [...]
}
```

### 3. Validação

**Client-side (PostComposer):**
- Impede desmarcar ambas as opções
- Se tentar desmarcar a última, o checkbox não muda
- Botão "Publicar" fica desabilitado se nenhum destino selecionado

**Server-side (API):**
```typescript
if (!destinations.instagram && !destinations.facebook) {
  return NextResponse.json({ 
    error: 'Selecione ao menos Instagram ou Facebook como destino.' 
  }, { status: 400 })
}
```

### 4. Lógica de Publicação

A API cria seleções Meta baseadas nos destinos:

```typescript
const metaSelections: MetaSelection[] = []
for (const integrationId of uniqueIntegrationIds) {
  if (destinations.instagram) {
    metaSelections.push({ type: 'instagram', integrationId })
  }
  if (destinations.facebook) {
    metaSelections.push({ type: 'facebook', integrationId })
  }
}
```

Resultado:
- **Instagram marcado** → Publica no Instagram
- **Facebook marcado** → Publica no Facebook
- **Ambos marcados** → Publica nos dois

---

## 📊 Fluxo Completo

### Cenário: Publicar em Ambos

```
1. Usuário seleciona conta Meta
   ↓
2. Checkboxes aparecem
   ☑ Instagram (padrão)
   ☐ Facebook
   ↓
3. Usuário marca Facebook também
   ☑ Instagram
   ☑ Facebook
   ↓
4. Cria o post normalmente
   ↓
5. Clica "Publicar"
   ↓
6. API valida destinations
   ✓ Instagram: true
   ✓ Facebook: true
   ↓
7. Cria 2 seleções Meta:
   - { type: 'instagram', integrationId }
   - { type: 'facebook', integrationId }
   ↓
8. Publica em ambos
   ↓
9. Mensagem de sucesso:
   "Publicado em: Instagram e Facebook. 10 imagens."
   ↓
10. ✅ Post aparece em ambas plataformas!
```

---

## 🎯 Regras de Negócio

### Colaboradores

Os colaboradores (campo `collaborators`) são **específicos do Instagram**:
- ✅ Aparecem apenas se Instagram está marcado
- ✅ Se desmarcar Instagram, campo desaparece
- ✅ Se marcar Instagram novamente, campo retorna com dados salvos

### Limite de Imagens

- **Instagram:** 20 imagens máximo
- **Facebook:** Sem limite documentado (usa mesmo limite)
- **Validação:** Se Instagram marcado e > 20 imagens → erro

### Mensagens de Retorno

A API retorna informações sobre onde foi publicado:

```typescript
{
  ok: true,
  message: "Publicação Meta: 2 sucesso(s), 0 falha(s). Publicado em: Instagram e Facebook. 10 imagens.",
  metaResults: [
    { provider: 'instagram', ok: true },
    { provider: 'facebook', ok: true }
  ],
  mediaCount: 10
}
```

---

## 💾 Compatibilidade

### Rascunhos Antigos

Rascunhos salvos antes desta feature:
- ✅ Carregam com `destinations: { instagram: true, facebook: false }`
- ✅ Comportamento padrão: apenas Instagram
- ✅ Sem quebra de compatibilidade

### Migração Automática

O parser detecta e normaliza:

```typescript
const destinations = data.destinations && typeof data.destinations === 'object'
  ? { 
      instagram: Boolean(data.destinations.instagram), 
      facebook: Boolean(data.destinations.facebook) 
    }
  : { instagram: true, facebook: false } // fallback
```

---

## 🎨 Design

### Cores

- **Instagram:** 📷 (emoji câmera)
- **Facebook:** 📘 (emoji livro azul)
- **Checkbox ativo:** #c62737 (vermelho da marca)
- **Background:** Slate-50 (cinza claro)
- **Border:** Slate-200

### Layout

```css
.destinations-selector {
  padding: 1rem;
  background: slate-50;
  border: 1px solid slate-200;
  border-radius: 0.5rem;
  margin-top: 1rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}
```

---

## ⚡ Performance

### Otimizações

1. **Upload único de imagens:**
   - Mesmo conjunto de URLs para Instagram e Facebook
   - Não duplica upload de arquivos

2. **Publicação paralela:**
   - Instagram e Facebook são processados em sequência
   - Possibilidade de paralelização futura

3. **Fallback inteligente:**
   - Se Instagram falhar, Facebook ainda é tentado
   - Vice-versa

---

## 🔍 Debugging

### Logs da API

```javascript
console.log('Destinations:', destinations)
// { instagram: true, facebook: true }

console.log('Meta Selections:', metaSelections)
// [
//   { type: 'instagram', integrationId: 'abc123' },
//   { type: 'facebook', integrationId: 'abc123' }
// ]
```

### Headers de Resposta

```json
{
  "metaResults": [
    {
      "instanceId": "meta_ig:abc123",
      "provider": "instagram",
      "ok": true
    },
    {
      "instanceId": "meta_fb:abc123",
      "provider": "facebook",
      "ok": true
    }
  ]
}
```

---

## ✅ Checklist de Implementação

- [x] Tipo `destinations` adicionado ao PostDraft
- [x] Checkboxes de Instagram/Facebook no PostComposer
- [x] Validação client-side (pelo menos um marcado)
- [x] Validação server-side na API
- [x] Lógica de criação de seleções baseada em destinations
- [x] Persistência em localStorage
- [x] Compatibilidade com rascunhos antigos
- [x] Mensagens de retorno descritivas
- [x] Campo de colaboradores condicional
- [x] Limite de imagens para Instagram
- [x] Zero erros de lint
- [x] Documentação completa

---

## 📊 Arquivos Modificados

1. **usePostDraft.ts**
   - Tipo `destinations` adicionado
   - Parseamento e fallback

2. **PostComposer.tsx**
   - Checkboxes de seleção
   - Validação client-side
   - Exibição condicional de colaboradores

3. **create/page.tsx**
   - Props `destinations` e `onDestinationsChange`
   - Validação antes de publicar

4. **publish/route.ts**
   - Parseamento de `destinations` do body
   - Criação de seleções Meta baseadas em destinations
   - Validação server-side
   - Mensagens de retorno melhoradas

---

## 🚀 Casos de Uso

### 1. Empresa com presença em ambas plataformas
- Marca ambos checkboxes
- Publica uma vez
- Conteúdo aparece nas duas plataformas
- **Economia de tempo:** 50%

### 2. Conteúdo específico para Instagram
- Marca apenas Instagram
- Post com filtros/estética Instagram
- Colaboradores específicos

### 3. Conteúdo profissional para Facebook
- Marca apenas Facebook
- Comunicado corporativo
- Mais formal

---

## 💡 Melhorias Futuras

- [ ] Texto diferente para cada plataforma
- [ ] Preview lado a lado (Instagram vs Facebook)
- [ ] Agendamento diferente por plataforma
- [ ] Insights consolidados de ambas
- [ ] Suporte para LinkedIn e Twitter

---

**Status:** ✅ **Produção**  
**Última atualização:** Fevereiro 2026  
**Versão:** 1.0
