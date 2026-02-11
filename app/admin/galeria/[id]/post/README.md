# 📱 Sistema de Postagem para Instagram e Facebook

Sistema completo de criação, edição e publicação de posts para redes sociais, desenvolvido com Next.js 14, React 18 e as melhores bibliotecas do ecossistema.

---

## 📂 Estrutura de Arquivos

```
post/
├── _components/                    # Componentes reutilizáveis
│   ├── ImageUploader.tsx          # Upload com drag-and-drop
│   ├── EditPhotoModal.tsx         # Editor de imagem com Cropper.js
│   ├── SortableMediaGrid.tsx      # Grid reordenável com @dnd-kit
│   ├── ImageLightbox.tsx          # Visualizador de imagens
│   ├── MediaManager.tsx           # Gerenciador integrado de mídia
│   ├── PostComposer.tsx           # Compositor de postagem
│   ├── PostPreview.tsx            # Preview da postagem
│   ├── PhotoPickerGrid.tsx        # Grid de seleção de fotos
│   ├── PhotoPickerToolbar.tsx     # Barra de ferramentas
│   └── DirectUploadExample.tsx    # Exemplo de upload direto
│
├── _lib/                           # Utilitários e hooks
│   └── usePostDraft.ts            # Hook de gerenciamento de rascunho
│
├── create/                         # Página de criação
│   └── page.tsx                   # Editor de postagem
│
├── select/                         # Página de seleção
│   └── page.tsx                   # Seletor de fotos do álbum
│
├── FLUXO_POSTAGEM.md              # Documentação detalhada
└── README.md                       # Este arquivo
```

---

## 🎯 Funcionalidades Principais

### 1. **Upload e Seleção de Imagens**
- ✅ Drag-and-drop intuitivo
- ✅ Seleção múltipla de arquivos
- ✅ Preview instantâneo
- ✅ Validação de formato e tamanho

### 2. **Edição Avançada**
- ✅ Crop interativo com Cropper.js
- ✅ Proporções Instagram (1:1, 1.91:1, 4:5)
- ✅ Rotação de imagem
- ✅ Zoom in/out
- ✅ Texto alternativo para acessibilidade

### 3. **Organização de Conteúdo**
- ✅ Reordenação por drag-and-drop
- ✅ Remoção individual
- ✅ Visualização em lightbox
- ✅ Contador de itens

### 4. **Publicação**
- ✅ Suporte Instagram/Facebook
- ✅ Preview em tempo real
- ✅ Validação de limites (20 fotos para Instagram)
- ✅ Rascunhos locais (localStorage)

---

## 🚀 Como Usar

### Fluxo Básico

1. **Selecionar Fotos**
   ```
   /admin/galeria/[id]/post/select
   ```
   - Escolha as fotos do álbum
   - Clique em "Confirmar seleção"

2. **Editar e Compor**
   ```
   /admin/galeria/[id]/post/create
   ```
   - Reordene arrastando as imagens
   - Edite cada imagem individualmente
   - Escreva o texto da postagem
   - Selecione a conta de destino

3. **Publicar**
   - Revise o preview
   - Clique em "Publicar"

### Upload Direto (Opcional)

Para implementar upload direto sem álbum:

```tsx
import { DirectUploadExample } from './_components/DirectUploadExample'

export default function UploadPage() {
  return <DirectUploadExample />
}
```

---

## 🔧 Tecnologias Utilizadas

| Biblioteca | Versão | Propósito |
|-----------|---------|-----------|
| `react-dropzone` | Latest | Upload com drag-and-drop |
| `cropperjs` | Latest | Editor de imagem avançado |
| `@dnd-kit/core` | Latest | Sistema de drag-and-drop |
| `@dnd-kit/sortable` | Latest | Reordenação de listas |
| `yet-another-react-lightbox` | Latest | Visualizador de imagens |
| `framer-motion` | Latest | Animações fluidas |

---

## 📦 Instalação

As dependências já foram instaladas. Se precisar reinstalar:

```bash
npm install react-dropzone cropperjs framer-motion \
  yet-another-react-lightbox @dnd-kit/core \
  @dnd-kit/sortable @dnd-kit/utilities
```

---

## 🎨 Customização

### Alterar Proporções de Corte

Edite `EditPhotoModal.tsx`:

```typescript
const CROP_OPTIONS = [
  { value: '1:1', title: 'Quadrado', aspectRatio: 1 },
  { value: '16:9', title: 'Widescreen', aspectRatio: 16/9 }, // Nova
]
```

### Alterar Limite de Imagens

Edite `ImageUploader.tsx`:

```typescript
<ImageUploader
  maxFiles={20} // Altere aqui
  onDrop={handleDrop}
/>
```

### Mudar Cores do Tema

Os componentes usam classes Tailwind. Para alterar cores:

```tsx
// De:
className="bg-[#c62737]"

// Para:
className="bg-blue-600"
```

---

## 🧪 Testando

### Teste Manual

1. Navegue até um álbum
2. Clique em "Criar post"
3. Selecione 3-5 imagens
4. Teste cada funcionalidade:
   - ✅ Reordenação (arrastar)
   - ✅ Edição (crop, rotação)
   - ✅ Visualização (lightbox)
   - ✅ Remoção
   - ✅ Publicação

### Teste de Responsividade

```
Mobile: 375px width
Tablet: 768px width
Desktop: 1280px width
```

---

## 🐛 Solução de Problemas Comuns

### Problema: Cropper.js não carrega

**Solução:**
```tsx
// Certifique-se de importar o CSS
import 'cropperjs/dist/cropper.css'
```

### Problema: Drag-and-drop não funciona

**Solução:**
```tsx
// Verifique se os sensores estão configurados
const sensors = useSensors(
  useSensor(PointerSensor),
  useSensor(KeyboardSensor)
)
```

### Problema: Imagens não aparecem

**Solução:**
```tsx
// Verifique as URLs das imagens
console.log('Media URLs:', media.map(m => m.url))
```

---

## 📊 Performance

### Otimizações Implementadas

- ✅ Lazy loading de imagens
- ✅ Thumbnails para preview
- ✅ Debounce em operações pesadas
- ✅ Memoização de componentes
- ✅ Virtual scrolling (se necessário)

### Métricas Esperadas

- **Tempo de carregamento**: < 2s
- **Tempo de processamento de imagem**: < 1s
- **Animações**: 60 FPS

---

## 🔒 Segurança

### Validações Implementadas

- ✅ Tipo de arquivo (imagens apenas)
- ✅ Tamanho máximo por arquivo
- ✅ Número máximo de arquivos
- ✅ Sanitização de nomes de arquivo

### Recomendações

1. Sempre valide no backend
2. Use HTTPS para upload
3. Implemente rate limiting
4. Escaneie arquivos para malware

---

## 📱 API de Postagem

### Endpoint de Publicação

```typescript
POST /api/social/publish

Body:
{
  "albumId": "string",
  "instanceIds": ["string"],
  "text": "string",
  "mediaEdits": [
    {
      "id": "string",
      "cropMode": "1:1",
      "altText": "string"
    }
  ]
}

Response:
{
  "message": "string",
  "draftId": "string",
  "jobCount": number,
  "metaResults": [
    {
      "instanceId": "string",
      "provider": "instagram",
      "ok": boolean,
      "error": "string?"
    }
  ]
}
```

---

## 🎓 Exemplos de Uso Avançado

### Integração com API Externa

```typescript
const publishPost = async (media: DraftMedia[], text: string) => {
  const formData = new FormData()
  
  // Converte base64 para Blob
  media.forEach((item, index) => {
    const blob = dataURLToBlob(item.url)
    formData.append(`image_${index}`, blob, item.filename)
  })
  
  formData.append('caption', text)
  
  const response = await fetch('/api/social/publish', {
    method: 'POST',
    body: formData,
  })
  
  return response.json()
}
```

### Adicionar Watermark

```typescript
const addWatermark = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  
  ctx.font = '20px Arial'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
  ctx.fillText('© Sara Alagoas', 10, canvas.height - 10)
}
```

---

## 📚 Recursos Adicionais

- [Documentação Cropper.js](https://github.com/fengyuanchen/cropperjs)
- [Documentação @dnd-kit](https://docs.dndkit.com/)
- [Documentação Framer Motion](https://www.framer.com/motion/)
- [API do Instagram](https://developers.facebook.com/docs/instagram-api/)

---

## 🤝 Contribuindo

Para adicionar novas funcionalidades:

1. Crie um novo componente em `_components/`
2. Adicione testes
3. Documente no FLUXO_POSTAGEM.md
4. Atualize este README

---

## 📄 Licença

Este código faz parte do projeto **Sara Sede Alagoas**.

---

## 👨‍💻 Suporte

Para dúvidas ou problemas:
1. Consulte FLUXO_POSTAGEM.md
2. Verifique os logs do navegador
3. Teste em modo de desenvolvimento

---

**Última atualização:** Fevereiro 2026  
**Versão:** 1.0.0  
**Status:** ✅ Produção
