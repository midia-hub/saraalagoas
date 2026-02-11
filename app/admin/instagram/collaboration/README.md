# 🤝 Sistema de Colaboração do Instagram

Sistema completo para gerenciar convites de colaboração (Collab Posts) do Instagram via API.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Recursos Disponíveis](#recursos-disponíveis)
- [Como Funciona](#como-funciona)
- [Limitações da API](#limitações-da-api)
- [Uso](#uso)
- [API Routes](#api-routes)
- [Componentes](#componentes)

---

## 🎯 Visão Geral

Posts de colaboração (Collab Posts) permitem que duas ou mais contas do Instagram compartilhem a autoria de um post. O conteúdo aparece nos feeds de ambas as contas e o engajamento é somado.

### O que este sistema faz:

✅ **Lista convites recebidos** - Veja todos os convites pendentes de colaboração
✅ **Aceita convites** - Aceite colaborações programaticamente
✅ **Recusa convites** - Recuse convites que não deseja aceitar
✅ **Visualiza colaboradores** - Veja quem colaborou em posts específicos

❌ **Não suportado pela API:**
- Criar/enviar convites ao publicar (só pode ser feito no app do Instagram)

---

## 🚀 Recursos Disponíveis

### 1. Listagem de Convites

Lista todos os convites de colaboração pendentes para uma conta Instagram.

**Endpoint:** `GET /api/meta/collaboration?action=list_invites`

**Parâmetros:**
- `integrationId` - ID da integração Meta
- `limit` (opcional) - Número de resultados (padrão: 20, máx: 50)
- `after` (opcional) - Cursor para paginação
- `before` (opcional) - Cursor para paginação reversa

**Rate Limit:** 300 chamadas/dia por usuário Instagram

**Resposta:**
```json
{
  "ok": true,
  "invites": [
    {
      "media_id": "18078920227752107",
      "media_owner_username": "katrina",
      "caption": "Making memories all over the map",
      "media_url": "https://..."
    }
  ],
  "paging": {
    "cursors": {
      "before": "...",
      "after": "..."
    }
  }
}
```

### 2. Aceitar/Recusar Convites

Responde a um convite de colaboração específico.

**Endpoint:** `POST /api/meta/collaboration`

**Body:**
```json
{
  "integrationId": "uuid",
  "mediaId": "18078920227752107",
  "accept": true
}
```

**Rate Limit:** 50 chamadas/dia por usuário Instagram

**Resposta:**
```json
{
  "ok": true,
  "success": true,
  "message": "Convite de colaboração aceito com sucesso!"
}
```

### 3. Listar Colaboradores de um Post

Visualiza quem colaborou em um post específico e o status dos convites.

**Endpoint:** `GET /api/meta/collaboration?action=list_collaborators`

**Parâmetros:**
- `integrationId` - ID da integração Meta
- `mediaId` - ID do post do Instagram

**Resposta:**
```json
{
  "ok": true,
  "collaborators": [
    {
      "id": "90010775360791",
      "username": "realtest1",
      "invite_status": "Accepted"
    },
    {
      "id": "17841449208283139",
      "username": "realtest2",
      "invite_status": "Pending"
    }
  ]
}
```

---

## 📖 Como Funciona

### Fluxo de Colaboração

1. **Outro usuário cria um post e te marca como colaborador** (no app do Instagram)
2. **Você recebe um convite** que aparece na lista de convites pendentes
3. **Você aceita ou recusa** o convite via sistema
4. **Se aceito:** O post aparece no seu feed também e o engajamento é compartilhado
5. **Se recusado:** O convite é removido e o post não aparece no seu feed

### Regras de Colaboração

- ✅ Até **5 contas** podem colaborar em um único post
- ✅ Funciona com: **Feed (imagens/carrosséis)** e **Reels**
- ❌ Não funciona com: **Stories**
- 📌 O **autor original** sempre mantém controle total do post
- 📌 Se o autor original deletar, o post é removido para todos
- 📌 Colaboradores podem sair da colaboração a qualquer momento

---

## ⚠️ Limitações da API

### O que você PODE fazer:

✅ Ver convites recebidos
✅ Aceitar convites
✅ Recusar convites
✅ Listar colaboradores de posts

### O que você NÃO PODE fazer via API:

❌ **Criar/enviar convites ao publicar um post**
   - Isso só pode ser feito no aplicativo do Instagram
   - Ao criar um post no app, vá em "Marcar Pessoas" → "Convidar Colaborador"

❌ **Remover colaboradores de posts já publicados**
   - Colaboradores podem sair por conta própria
   - O autor original pode deletar o post inteiro

---

## 💻 Uso

### Interface Administrativa

Acesse a página de gerenciamento:

```
/admin/instagram/collaboration
```

**Funcionalidades da interface:**

1. **Seletor de conta** - Escolha qual conta Instagram gerenciar
2. **Lista de convites** - Veja todos os convites pendentes com:
   - Thumbnail do post
   - Nome do autor (@username)
   - Legenda
   - Link para visualizar o post original
3. **Ações rápidas:**
   - Botão "Aceitar" (verde)
   - Botão "Recusar" (vermelho)
4. **Atualização** - Botão para recarregar convites

### Usando via API

#### Exemplo: Listar convites

```typescript
const response = await fetch(
  `/api/meta/collaboration?action=list_invites&integrationId=${integrationId}&limit=20`
)
const data = await response.json()
console.log(data.invites)
```

#### Exemplo: Aceitar convite

```typescript
const response = await fetch('/api/meta/collaboration', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    integrationId: 'uuid-da-integracao',
    mediaId: '18078920227752107',
    accept: true
  })
})
const data = await response.json()
```

#### Exemplo: Ver colaboradores

```typescript
const response = await fetch(
  `/api/meta/collaboration?action=list_collaborators&integrationId=${integrationId}&mediaId=${mediaId}`
)
const data = await response.json()
console.log(data.collaborators)
```

---

## 🔧 API Routes

### GET `/api/meta/collaboration`

**Query Parameters:**
- `action` - Ação a executar:
  - `list_invites` - Lista convites recebidos
  - `list_collaborators` - Lista colaboradores de um post
- `integrationId` - ID da integração Meta (obrigatório)
- `mediaId` - ID do post (obrigatório para `list_collaborators`)
- `limit` - Limite de resultados (opcional, padrão: 20)
- `after` - Cursor de paginação (opcional)
- `before` - Cursor de paginação reversa (opcional)

**Permissão necessária:** `instagram:view`

### POST `/api/meta/collaboration`

**Body:**
```json
{
  "integrationId": "string",
  "mediaId": "string",
  "accept": boolean
}
```

**Permissão necessária:** `instagram:create`

---

## 🧩 Componentes

### `CollaboratorsModal`

Modal para visualizar colaboradores de um post.

**Props:**
```typescript
{
  mediaId: string        // ID do post do Instagram
  integrationId: string  // ID da integração Meta
  onClose: () => void    // Callback ao fechar
}
```

**Uso:**
```tsx
import { CollaboratorsModal } from '@/app/admin/instagram/_components/CollaboratorsModal'

<CollaboratorsModal
  mediaId="18078920227752107"
  integrationId="uuid-da-integracao"
  onClose={() => setShowModal(false)}
/>
```

---

## 📊 Funções da Biblioteca

### `lib/meta.ts`

#### `fetchCollaborationInvites()`

Lista convites de colaboração recebidos.

```typescript
const invites = await fetchCollaborationInvites({
  igUserId: 'instagram-business-account-id',
  accessToken: 'page-access-token',
  limit: 20,
  after: 'cursor-string'
})
```

#### `respondToCollaborationInvite()`

Aceita ou recusa um convite.

```typescript
const result = await respondToCollaborationInvite({
  igUserId: 'instagram-business-account-id',
  mediaId: '18078920227752107',
  accept: true,
  accessToken: 'page-access-token'
})
```

#### `fetchMediaCollaborators()`

Lista colaboradores de um post.

```typescript
const collaborators = await fetchMediaCollaborators({
  mediaId: '18078920227752107',
  accessToken: 'page-access-token'
})
```

---

## 🔒 Permissões Necessárias

### Escopos OAuth da Meta:

- `instagram_basic` - Acesso básico ao Instagram
- `pages_read_engagement` - Leitura de engajamento

Esses escopos já estão incluídos no fluxo de autenticação Meta do sistema.

### Permissões RBAC:

- **Listar convites:** `instagram:view`
- **Aceitar/recusar:** `instagram:create`
- **Ver colaboradores:** `instagram:view`

---

## 📚 Referências

- [Instagram Collaboration API - Meta Developers](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/collaboration)
- [Collaborators Reference](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-media/collaborators/)
- [Instagram Collab Posts Help](https://help.instagram.com/291200585956732/)

---

## 🎨 Interface

A página de gerenciamento (`/admin/instagram/collaboration`) oferece:

- 🎯 **Design limpo e intuitivo**
- 📱 **Responsivo** - funciona em desktop e mobile
- 🔄 **Atualização em tempo real** - recarregue convites a qualquer momento
- 🎨 **Visual atrativo** - thumbnails dos posts, avatares, badges de status
- ⚡ **Rápido** - feedback instantâneo nas ações

---

## 💡 Dicas

1. **Verifique regularmente** os convites pendentes para não perder oportunidades de colaboração
2. **Aceite rapidamente** convites de colaboradores confiáveis para maximizar engajamento
3. **Use o filtro de conta** se você gerencia múltiplas contas Instagram
4. **Visualize o post original** antes de aceitar para garantir que está alinhado com seu conteúdo

---

**Última atualização:** Fevereiro 2026
**Versão da API:** v23.0
