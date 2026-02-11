# 🏗️ Arquitetura do Sistema de Postagem

Diagrama completo da arquitetura e fluxo de dados do sistema.

---

## 📊 Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                    Página: create/page.tsx                   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              usePostDraft Hook                        │  │
│  │  • Gerencia rascunho no localStorage                 │  │
│  │  • Sincroniza estado com persistência                │  │
│  └──────────────────────────────────────────────────────┘  │
│                            │                                 │
│                            ▼                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              PostComposer Component                   │  │
│  │  • Orquestra todos os componentes                    │  │
│  │  • Gerencia estado global                            │  │
│  └──────────────────────────────────────────────────────┘  │
│         │                  │                  │              │
│         ▼                  ▼                  ▼              │
│  ┌────────────┐   ┌──────────────┐   ┌──────────────┐     │
│  │ Instâncias │   │ MediaManager │   │ PostPreview  │     │
│  │   Sociais  │   │              │   │              │     │
│  └────────────┘   └──────────────┘   └──────────────┘     │
│                           │                                  │
│                           ▼                                  │
│              ┌────────────────────────┐                     │
│              │  SortableMediaGrid     │                     │
│              │  • Reordenação         │                     │
│              │  • Preview             │                     │
│              └────────────────────────┘                     │
│                │          │          │                       │
│       ┌────────┼──────────┼──────────┼────────┐            │
│       ▼        ▼          ▼          ▼        ▼            │
│  ┌────────┬────────┬────────┬────────┬────────┐           │
│  │ Item 1 │ Item 2 │ Item 3 │ Item 4 │ Item N │           │
│  │        │        │        │        │        │           │
│  │ [Edit] │ [Edit] │ [Edit] │ [Edit] │ [Edit] │           │
│  │ [Del]  │ [Del]  │ [Del]  │ [Del]  │ [Del]  │           │
│  └────────┴────────┴────────┴────────┴────────┘           │
│       │                                                      │
│       └──────────┐                                          │
│                  ▼                                          │
│       ┌──────────────────────┐                             │
│       │  EditPhotoModal      │                             │
│       │  • Cropper.js        │                             │
│       │  • Proporções        │                             │
│       │  • Ferramentas       │                             │
│       └──────────────────────┘                             │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 🔄 Fluxo de Dados

### 1. Seleção de Imagens

```
┌──────────────┐
│   Usuário    │
│  seleciona   │
│   imagens    │
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│  select/page.tsx     │
│  • Grid de fotos     │
│  • Checkboxes        │
└──────┬───────────────┘
       │
       │ Confirma seleção
       ▼
┌──────────────────────┐
│  usePostDraft        │
│  • Salva no draft    │
│  • localStorage      │
└──────┬───────────────┘
       │
       │ Redireciona
       ▼
┌──────────────────────┐
│  create/page.tsx     │
└──────────────────────┘
```

---

### 2. Edição de Imagem

```
┌─────────────────┐
│ SortableMedia   │
│ Grid            │
│  [Clica Editar] │
└────────┬────────┘
         │
         │ setEditingMedia(media)
         ▼
┌─────────────────────────┐
│  EditPhotoModal         │
│  ┌──────────────────┐   │
│  │  Cropper.js      │   │
│  │  • Corte         │   │
│  │  • Rotação       │   │
│  │  • Zoom          │   │
│  └──────────────────┘   │
│  ┌──────────────────┐   │
│  │  Controls        │   │
│  │  • Proporções    │   │
│  │  • Alt Text      │   │
│  │  • Aplicar       │   │
│  └──────────────────┘   │
└────────┬────────────────┘
         │
         │ onApply(updatedMedia)
         ▼
┌─────────────────────────┐
│  create/page.tsx        │
│  updateMedia()          │
│  • Atualiza estado      │
│  • Persiste draft       │
└─────────────────────────┘
```

---

### 3. Reordenação

```
┌─────────────────────┐
│  SortableMediaGrid  │
│  (com @dnd-kit)     │
└──────────┬──────────┘
           │
           │ Usuário arrasta Item A
           │ de posição 1 para 3
           ▼
┌─────────────────────────────┐
│  handleDragEnd              │
│  • Detecta mudança          │
│  • Calcula novos índices    │
│  • arrayMove(media, 1, 3)   │
└──────────┬──────────────────┘
           │
           │ onReorder(newMedia)
           ▼
┌─────────────────────────────┐
│  create/page.tsx            │
│  reorderMedia()             │
│  • Atualiza draft.media     │
│  • Persiste no localStorage │
└─────────────────────────────┘
```

---

### 4. Visualização (Lightbox)

```
┌──────────────────┐
│  MediaItem       │
│  [Clica Imagem]  │
└────────┬─────────┘
         │
         │ onView(media)
         ▼
┌──────────────────────────┐
│  MediaManager            │
│  setViewingMedia(media)  │
│  setLightboxOpen(true)   │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│  ImageLightbox           │
│  (yet-another-react-     │
│   lightbox)              │
│  ┌────────────────────┐  │
│  │  ◄ Prev    Next ►  │  │
│  │                    │  │
│  │   [Grande Imagem]  │  │
│  │                    │  │
│  │   Título           │  │
│  │   Alt Text         │  │
│  └────────────────────┘  │
└──────────────────────────┘
```

---

### 5. Publicação

```
┌──────────────────────┐
│  PostComposer        │
│  [Clica Publicar]    │
└──────────┬───────────┘
           │
           │ onPublish()
           ▼
┌──────────────────────────────┐
│  create/page.tsx             │
│  handlePublish()             │
│  • Valida dados              │
│  • Prepara payload           │
└──────────┬───────────────────┘
           │
           │ POST /api/social/publish
           ▼
┌──────────────────────────────┐
│  API Route                   │
│  • Processa imagens          │
│  • Envia para Meta API       │
│  • Retorna resultado         │
└──────────┬───────────────────┘
           │
           │ Response
           ▼
┌──────────────────────────────┐
│  create/page.tsx             │
│  • Mostra sucesso/erro       │
│  • Limpa draft (opcional)    │
└──────────────────────────────┘
```

---

## 🗂️ Estrutura de Dados

### PostDraft

```typescript
{
  albumId: string
  selectedInstanceIds: string[]
  text: string
  media: [
    {
      id: string
      url: string
      thumbnailUrl?: string
      filename?: string
      cropMode?: 'original' | '1:1' | '1.91:1' | '4:5'
      altText?: string
      croppedUrl?: string  // URL da imagem cortada
    }
  ]
  updatedAt: string  // ISO timestamp
}
```

---

### DraftMedia

```typescript
{
  id: string           // Identificador único
  url: string          // URL da imagem original
  thumbnailUrl?: string // URL do thumbnail
  filename?: string    // Nome do arquivo
  cropMode?: CropMode  // Modo de corte aplicado
  altText?: string     // Texto alternativo
  croppedUrl?: string  // URL da versão cortada
}
```

---

### SocialInstance

```typescript
{
  id: string        // ID da instância
  name: string      // Nome de exibição
  provider: string  // 'instagram' | 'facebook'
  status: string    // Status da conexão
}
```

---

## 🎯 Hierarquia de Componentes

```
create/page.tsx
├── PostComposer
│   ├── Seção: Postar em
│   │   └── Select (Instâncias)
│   │
│   ├── MediaManager
│   │   ├── SortableMediaGrid
│   │   │   └── SortableMediaItem[]
│   │   │       ├── [Imagem Preview]
│   │   │       ├── [Botão Editar]
│   │   │       ├── [Botão Remover]
│   │   │       └── [Overlay Drag]
│   │   │
│   │   ├── ImageLightbox
│   │   │   └── Lightbox Component
│   │   │
│   │   └── [Botão Adicionar]
│   │
│   ├── Seção: Detalhes
│   │   ├── [Checkbox Personalizar]
│   │   └── [Textarea Texto]
│   │
│   └── Seção: Ações
│       ├── [Botão Cancelar]
│       ├── [Botão Concluir depois]
│       └── [Botão Publicar]
│
├── PostPreview
│   ├── [Mockup Instagram]
│   ├── [Texto da postagem]
│   └── [Carrossel de imagens]
│
└── EditPhotoModal (condicional)
    ├── Coluna: Controles
    │   ├── [Proporções]
    │   ├── [Ferramentas]
    │   └── [Alt Text]
    │
    └── Coluna: Editor
        ├── [Cropper.js Canvas]
        └── [Botões Aplicar/Cancelar]
```

---

## 🔌 Integrações Externas

### Bibliotecas Principais

```typescript
// Upload
import { useDropzone } from 'react-dropzone'

// Crop
import Cropper from 'cropperjs'
import 'cropperjs/dist/cropper.css'

// Drag-and-Drop
import {
  DndContext,
  useSensor,
  useSensors,
} from '@dnd-kit/core'

import {
  SortableContext,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'

// Lightbox
import Lightbox from 'yet-another-react-lightbox'
import 'yet-another-react-lightbox/styles.css'

// Animações
import { motion, AnimatePresence } from 'framer-motion'
```

---

## 📡 API Endpoints

### POST /api/social/publish

Publica conteúdo nas redes sociais.

**Request:**
```json
{
  "albumId": "abc-123",
  "instanceIds": ["inst-1", "inst-2"],
  "text": "Texto da postagem",
  "mediaEdits": [
    {
      "id": "file-1",
      "cropMode": "1:1",
      "altText": "Descrição"
    }
  ]
}
```

**Response:**
```json
{
  "message": "Postagem criada",
  "draftId": "draft-123",
  "jobCount": 2,
  "ok": true,
  "metaResults": [
    {
      "instanceId": "inst-1",
      "provider": "instagram",
      "ok": true
    }
  ]
}
```

---

## 🎨 Temas e Estilos

### Paleta de Cores

```css
/* Primárias */
--primary: #c62737      /* Vermelho Sara */
--primary-dark: #a01f2d

/* Neutras */
--slate-50: #f8fafc
--slate-100: #f1f5f9
--slate-200: #e2e8f0
--slate-300: #cbd5e1
--slate-700: #334155
--slate-900: #0f172a

/* Status */
--success: #10b981
--error: #ef4444
--warning: #f59e0b
--info: #3b82f6
```

---

### Breakpoints

```typescript
const breakpoints = {
  sm: '640px',   // Mobile
  md: '768px',   // Tablet
  lg: '1024px',  // Desktop
  xl: '1280px',  // Desktop XL
}
```

---

## 🔐 Segurança e Validação

### Validações Client-Side

```typescript
// Tipo de arquivo
accept: {
  'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp']
}

// Número de arquivos
maxFiles: 20

// Limite Instagram (atualizado em 2026)
if (hasInstagram && media.length > 20) {
  throw new Error('Instagram: máx 20 imagens')
}
```

### Validações Server-Side

```typescript
// Na API route
- Validar formato de arquivo
- Validar tamanho (máx 10MB)
- Validar permissões do usuário
- Sanitizar inputs
- Rate limiting
```

---

## 📊 Estado e Persistência

### localStorage

```typescript
// Key pattern
`postDraft:${albumId}`

// Estrutura salva
{
  albumId,
  selectedInstanceIds,
  text,
  media: [...],
  updatedAt: ISO_STRING
}

// Auto-save
- Ao adicionar/remover mídia
- Ao editar texto
- Ao reordenar
- Ao editar imagem
```

---

## ⚡ Otimizações

### Performance

1. **Lazy Loading**
   - Imagens carregam sob demanda
   - Thumbnails primeiro

2. **Memoização**
   - useMemo para cálculos pesados
   - memo() em componentes grandes

3. **Debounce**
   - Auto-save com delay
   - Busca com delay

4. **Virtual Scrolling**
   - Render apenas itens visíveis (futuro)

---

## 🧪 Estratégia de Testes

### Unitários
- [ ] Hooks customizados
- [ ] Funções utilitárias
- [ ] Validações

### Integração
- [ ] Fluxo completo de postagem
- [ ] Upload de múltiplas imagens
- [ ] Edição e reordenação

### E2E
- [ ] Jornada completa do usuário
- [ ] Múltiplos navegadores
- [ ] Múltiplos dispositivos

---

## 📈 Métricas de Sucesso

```
✅ Tempo de criação de post: < 2 minutos
✅ Taxa de sucesso de publicação: > 95%
✅ Performance (LCP): < 2.5s
✅ Acessibilidade (Score): > 90
✅ Satisfação do usuário: Alta
```

---

**Documentação completa da arquitetura do Sistema de Postagem**  
**Versão:** 1.0.0  
**Data:** Fevereiro 2026
