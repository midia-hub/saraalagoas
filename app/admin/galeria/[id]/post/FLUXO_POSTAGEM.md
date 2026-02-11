# 📸 Fluxo de Postagem de Imagens (Instagram/Facebook)

## 📋 Visão Geral

Sistema completo de postagem de imagens para Instagram e Facebook com recursos avançados de edição, reordenação e visualização.

## 🎯 Componentes Implementados

### 1. **ImageUploader** - Upload de Imagens

Componente de upload com React Dropzone que permite:

- ✅ Seleção múltipla de imagens
- ✅ Drag-and-drop intuitivo
- ✅ Validação de tipos de arquivo (JPG, PNG, GIF, WEBP)
- ✅ Limite configurável de imagens (padrão: 10)
- ✅ Feedback visual com animações (Framer Motion)

**Uso:**
```tsx
import { ImageUploader } from './_components/ImageUploader'

<ImageUploader
  onDrop={(files) => handleUpload(files)}
  maxFiles={10}
  disabled={false}
/>
```

---

### 2. **EditPhotoModal** - Edição de Imagem com Cropper.js

Editor avançado de imagens com funcionalidades:

- ✅ Corte interativo com Cropper.js
- ✅ Proporções predefinidas (1:1, 1.91:1, 4:5, Original)
- ✅ Ferramentas de rotação (90° esquerda/direita)
- ✅ Zoom in/out
- ✅ Reset para estado original
- ✅ Campo de texto alternativo para acessibilidade
- ✅ Preview em tempo real

**Proporções disponíveis:**
- **1:1** - Quadrado (recomendado para Instagram)
- **1.91:1** - Horizontal
- **4:5** - Vertical
- **Original** - Mantém proporção original

**Uso:**
```tsx
import { EditPhotoModal } from './_components/EditPhotoModal'

<EditPhotoModal
  open={isModalOpen}
  media={selectedMedia}
  onClose={() => setIsModalOpen(false)}
  onApply={(updatedMedia) => handleApplyChanges(updatedMedia)}
/>
```

---

### 3. **SortableMediaGrid** - Reordenação de Imagens

Grid de imagens com drag-and-drop usando @dnd-kit:

- ✅ Reordenação por arrastar e soltar
- ✅ Animações suaves (Framer Motion)
- ✅ Preview de cada imagem
- ✅ Botões de ação (Editar, Remover)
- ✅ Visualização em lightbox ao clicar
- ✅ Layout responsivo (grid adaptativo)

**Uso:**
```tsx
import { SortableMediaGrid } from './_components/SortableMediaGrid'

<SortableMediaGrid
  media={mediaList}
  onReorder={(newOrder) => setMediaList(newOrder)}
  onEdit={(media) => openEditModal(media)}
  onRemove={(mediaId) => removeFromList(mediaId)}
  onView={(media) => openLightbox(media)}
/>
```

---

### 4. **ImageLightbox** - Visualização em Tela Cheia

Visualizador de imagens com yet-another-react-lightbox:

- ✅ Navegação entre imagens (prev/next)
- ✅ Exibição de títulos e descrições
- ✅ Fechamento com ESC ou clique no backdrop
- ✅ Controles intuitivos
- ✅ Animações suaves

**Uso:**
```tsx
import { ImageLightbox } from './_components/ImageLightbox'

<ImageLightbox
  media={mediaList}
  currentMedia={selectedMedia}
  isOpen={lightboxOpen}
  onClose={() => setLightboxOpen(false)}
/>
```

---

### 5. **MediaManager** - Gerenciador de Mídia (Integrado)

Componente principal que integra todos os recursos:

- ✅ Grid de imagens reordenável
- ✅ Contador de itens
- ✅ Botão de adicionar nova mídia
- ✅ Integração com lightbox
- ✅ Animações de entrada/saída
- ✅ Dicas de uso

**Uso:**
```tsx
import { MediaManager } from './_components/MediaManager'

<MediaManager
  media={draft.media}
  onAdd={() => router.push('/select')}
  onEdit={(media) => setEditingMedia(media)}
  onRemove={(id) => removeMedia(id)}
  onReorder={(newMedia) => patchDraft({ media: newMedia })}
/>
```

---

## 🚀 Fluxo Completo de Uso

### 1️⃣ **Seleção de Imagens**

Na página `/admin/galeria/[id]/post/select`:
- O usuário visualiza todas as imagens do álbum
- Pode selecionar múltiplas imagens (checkbox)
- Confirma a seleção e vai para o editor

### 2️⃣ **Edição e Composição**

Na página `/admin/galeria/[id]/post/create`:

1. **Reordene as imagens**: Arraste e solte para mudar a ordem
2. **Edite cada imagem**: Clique em "Editar" para abrir o modal
   - Escolha a proporção de corte
   - Ajuste o enquadramento arrastando a imagem
   - Rotacione se necessário
   - Adicione zoom
   - Preencha o texto alternativo
3. **Visualize em tela cheia**: Clique na imagem para abrir o lightbox
4. **Adicione mais imagens**: Clique em "Adicionar foto/vídeo"
5. **Remova imagens**: Clique no ícone de lixeira

### 3️⃣ **Configuração da Postagem**

- Selecione a conta de destino (Instagram/Facebook)
- Escreva o texto da postagem
- Visualize o preview em tempo real

### 4️⃣ **Publicação**

- Clique em "Publicar" para enviar para as plataformas
- Ou "Concluir mais tarde" para salvar o rascunho

---

## 📦 Dependências Utilizadas

```json
{
  "react-dropzone": "Upload com drag-and-drop",
  "cropperjs": "Editor de imagem avançado",
  "@dnd-kit/core": "Sistema de drag-and-drop",
  "@dnd-kit/sortable": "Reordenação de listas",
  "@dnd-kit/utilities": "Utilitários para dnd-kit",
  "yet-another-react-lightbox": "Visualizador de imagens",
  "framer-motion": "Animações fluidas"
}
```

---

## 🎨 Recursos de UX

### Animações (Framer Motion)
- Entrada suave de elementos
- Feedback visual ao arrastar
- Transições entre estados
- Scale em hover/tap

### Feedback Visual
- Indicador de drag ativo
- Overlay ao arrastar imagens
- Destaque de imagem sendo editada
- Contador de itens selecionados

### Acessibilidade
- Campo de texto alternativo para todas as imagens
- Suporte a teclado para reordenação
- Controles claros e descritivos
- Mensagens de erro amigáveis

---

## ⚠️ Limitações

1. **Instagram**: Máximo de 10 imagens por post
2. **Formatos aceitos**: JPG, JPEG, PNG, GIF, WEBP
3. **Drag-and-drop**: Requer movimento mínimo de 8px para ativar

---

## 🔧 Configuração

As proporções de corte e limites podem ser ajustados nos componentes:

**EditPhotoModal.tsx** - Proporções:
```typescript
const CROP_OPTIONS = [
  { value: '1:1', aspectRatio: 1 },
  { value: '1.91:1', aspectRatio: 1.91 },
  { value: '4:5', aspectRatio: 4/5 },
]
```

**ImageUploader.tsx** - Limite de arquivos:
```typescript
maxFiles={10} // Altere conforme necessário
```

---

## 📱 Responsividade

Todos os componentes são totalmente responsivos:

- **Mobile**: Grid de 2 colunas
- **Tablet**: Grid de 3 colunas
- **Desktop**: Grid de 4 colunas
- **Editor de imagem**: Layout adaptativo (stack em mobile, lado a lado em desktop)

---

## 🐛 Solução de Problemas

### Imagens não carregam
- Verifique se as URLs das imagens estão corretas
- Confirme que o servidor está retornando as imagens corretamente

### Cropper não inicializa
- Certifique-se de que o CSS do Cropper.js está importado
- Verifique se a imagem tem dimensões válidas

### Drag-and-drop não funciona
- Confirme que os sensores do @dnd-kit estão configurados
- Verifique se não há conflitos com outros event handlers

---

## 📄 Licença

Este código faz parte do projeto **Sara Sede Alagoas**.

---

**Desenvolvido com ❤️ usando React, Next.js e as melhores bibliotecas do ecossistema.**
