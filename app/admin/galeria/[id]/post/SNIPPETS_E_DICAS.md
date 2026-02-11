# 💡 Snippets Úteis e Boas Práticas

Coleção de código reutilizável e dicas para trabalhar com o sistema de postagem.

---

## 🎨 Componentes Reutilizáveis

### 1. Botão com Loading

```tsx
import { motion } from 'framer-motion'

type LoadingButtonProps = {
  loading: boolean
  onClick: () => void
  children: React.ReactNode
  disabled?: boolean
}

export function LoadingButton({ loading, onClick, children, disabled }: LoadingButtonProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      whileHover={{ scale: disabled || loading ? 1 : 1.02 }}
      whileTap={{ scale: disabled || loading ? 1 : 0.98 }}
      className={`
        rounded-lg px-4 py-2 text-sm font-medium text-white
        ${loading ? 'bg-slate-400 cursor-not-allowed' : 'bg-[#c62737] hover:bg-[#a01f2d]'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Processando...
        </span>
      ) : (
        children
      )}
    </motion.button>
  )
}
```

---

### 2. Toast de Notificação

```tsx
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'

type ToastProps = {
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
  duration?: number
  onClose: () => void
}

export function Toast({ message, type = 'info', duration = 3000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(onClose, 300)
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  const colors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-amber-500',
    info: 'bg-blue-500',
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className={`fixed bottom-4 right-4 z-50 rounded-lg ${colors[type]} px-6 py-3 text-white shadow-xl`}
        >
          <div className="flex items-center gap-2">
            <span>{message}</span>
            <button
              onClick={() => setIsVisible(false)}
              className="ml-2 rounded hover:bg-white/20"
            >
              ✕
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

---

### 3. Progress Bar para Upload

```tsx
import { motion } from 'framer-motion'

type ProgressBarProps = {
  progress: number // 0-100
  label?: string
}

export function ProgressBar({ progress, label }: ProgressBarProps) {
  return (
    <div className="w-full">
      {label && (
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-slate-700">{label}</span>
          <span className="font-medium text-slate-900">{progress}%</span>
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
          className="h-full bg-[#c62737]"
        />
      </div>
    </div>
  )
}
```

---

## 🔧 Funções Utilitárias

### 1. Converter Base64 para Blob

```typescript
export function dataURLToBlob(dataURL: string): Blob {
  const parts = dataURL.split(',')
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png'
  const bstr = atob(parts[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }

  return new Blob([u8arr], { type: mime })
}
```

---

### 2. Redimensionar Imagem

```typescript
export async function resizeImage(
  file: File,
  maxWidth: number,
  maxHeight: number
): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        // Calcula novas dimensões mantendo proporção
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height
            height = maxHeight
          }
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0, width, height)

        resolve(canvas.toDataURL('image/jpeg', 0.9))
      }

      img.src = e.target?.result as string
    }

    reader.readAsDataURL(file)
  })
}
```

---

### 3. Validar Imagem

```typescript
export function validateImage(file: File): { valid: boolean; error?: string } {
  // Valida tipo
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
  if (!validTypes.includes(file.type)) {
    return { valid: false, error: 'Formato de arquivo inválido' }
  }

  // Valida tamanho (10MB)
  const maxSize = 10 * 1024 * 1024
  if (file.size > maxSize) {
    return { valid: false, error: 'Arquivo muito grande (máx: 10MB)' }
  }

  return { valid: true }
}
```

---

### 4. Extrair Cores Dominantes

```typescript
export async function extractDominantColor(imageUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'Anonymous'

    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      canvas.width = img.width
      canvas.height = img.height
      ctx?.drawImage(img, 0, 0)

      const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height)
      if (!imageData) return resolve('#000000')

      // Calcula cor média
      let r = 0, g = 0, b = 0
      const pixels = imageData.data.length / 4

      for (let i = 0; i < imageData.data.length; i += 4) {
        r += imageData.data[i]
        g += imageData.data[i + 1]
        b += imageData.data[i + 2]
      }

      r = Math.floor(r / pixels)
      g = Math.floor(g / pixels)
      b = Math.floor(b / pixels)

      resolve(`rgb(${r}, ${g}, ${b})`)
    }

    img.src = imageUrl
  })
}
```

---

### 5. Formatar Tamanho de Arquivo

```typescript
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}
```

---

## 🎯 Hooks Customizados

### 1. useImageUpload

```typescript
import { useState } from 'react'

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error'

export function useImageUpload() {
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const upload = async (files: File[]) => {
    setStatus('uploading')
    setError(null)
    setProgress(0)

    try {
      const formData = new FormData()
      files.forEach((file, index) => {
        formData.append(`file_${index}`, file)
      })

      const xhr = new XMLHttpRequest()

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentage = (e.loaded / e.total) * 100
          setProgress(Math.round(percentage))
        }
      })

      await new Promise((resolve, reject) => {
        xhr.onload = () => resolve(xhr.response)
        xhr.onerror = () => reject(new Error('Upload failed'))
        xhr.open('POST', '/api/upload')
        xhr.send(formData)
      })

      setStatus('success')
      setProgress(100)
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Upload failed')
    }
  }

  const reset = () => {
    setStatus('idle')
    setProgress(0)
    setError(null)
  }

  return { upload, status, progress, error, reset }
}
```

---

### 2. useDebounce

```typescript
import { useEffect, useState } from 'react'

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// Uso:
// const debouncedSearchTerm = useDebounce(searchTerm, 500)
```

---

### 3. useMediaQuery

```typescript
import { useEffect, useState } from 'react'

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(query)
    
    if (media.matches !== matches) {
      setMatches(media.matches)
    }

    const listener = () => setMatches(media.matches)
    media.addEventListener('change', listener)

    return () => media.removeEventListener('change', listener)
  }, [matches, query])

  return matches
}

// Uso:
// const isMobile = useMediaQuery('(max-width: 768px)')
```

---

## 🎨 Animações com Framer Motion

### 1. Fade In

```tsx
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  transition={{ duration: 0.3 }}
>
  Conteúdo
</motion.div>
```

---

### 2. Slide Up

```tsx
<motion.div
  initial={{ y: 20, opacity: 0 }}
  animate={{ y: 0, opacity: 1 }}
  transition={{ duration: 0.4, ease: 'easeOut' }}
>
  Conteúdo
</motion.div>
```

---

### 3. Scale Pop

```tsx
<motion.button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
>
  Clique aqui
</motion.button>
```

---

### 4. Stagger Children

```tsx
<motion.div
  initial="hidden"
  animate="visible"
  variants={{
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }}
>
  {items.map(item => (
    <motion.div
      key={item.id}
      variants={{
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
      }}
    >
      {item.content}
    </motion.div>
  ))}
</motion.div>
```

---

## 📝 Padrões de Código

### 1. Estrutura de Componente

```tsx
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

// Types
type ComponentProps = {
  // Props aqui
}

// Component
export function Component({ ...props }: ComponentProps) {
  // States
  const [state, setState] = useState()

  // Handlers
  const handleAction = () => {
    // Lógica aqui
  }

  // Effects
  useEffect(() => {
    // Side effects aqui
  }, [])

  // Render
  return (
    <motion.div>
      {/* JSX aqui */}
    </motion.div>
  )
}
```

---

### 2. Tratamento de Erros

```typescript
async function handleAction() {
  try {
    setLoading(true)
    setError(null)

    const result = await apiCall()
    
    if (!result.ok) {
      throw new Error(result.message)
    }

    setSuccess('Ação realizada com sucesso!')
  } catch (err) {
    console.error('Error:', err)
    setError(err instanceof Error ? err.message : 'Erro desconhecido')
  } finally {
    setLoading(false)
  }
}
```

---

## 🔒 Boas Práticas de Segurança

### 1. Sanitizar Nome de Arquivo

```typescript
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase()
}
```

---

### 2. Validar URL de Imagem

```typescript
export function isValidImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return ['http:', 'https:'].includes(parsed.protocol)
  } catch {
    return false
  }
}
```

---

## 🎓 Dicas de Performance

### 1. Lazy Load de Imagens

```tsx
<img
  src={thumbnail}
  data-src={fullImage}
  loading="lazy"
  alt="Descrição"
  onLoad={(e) => {
    if (e.currentTarget.dataset.src) {
      e.currentTarget.src = e.currentTarget.dataset.src
    }
  }}
/>
```

---

### 2. Memoização de Componentes Pesados

```tsx
import { memo } from 'react'

export const ImageItem = memo(({ image, onEdit, onRemove }) => {
  return (
    <div>
      {/* Componente pesado aqui */}
    </div>
  )
}, (prevProps, nextProps) => {
  // Retorna true se as props não mudaram
  return prevProps.image.id === nextProps.image.id
})
```

---

## 📱 Responsividade

### Breakpoints Tailwind

```typescript
const breakpoints = {
  sm: '640px',   // Mobile large
  md: '768px',   // Tablet
  lg: '1024px',  // Desktop
  xl: '1280px',  // Desktop large
  '2xl': '1536px' // Desktop XL
}
```

---

### Grid Responsivo

```tsx
<div className="
  grid
  grid-cols-1
  sm:grid-cols-2
  md:grid-cols-3
  lg:grid-cols-4
  gap-4
">
  {/* Items aqui */}
</div>
```

---

## 🧪 Testes

### Teste de Componente

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ImageUploader } from './ImageUploader'

describe('ImageUploader', () => {
  it('should accept dropped files', async () => {
    const onDrop = jest.fn()
    render(<ImageUploader onDrop={onDrop} />)

    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' })
    const input = screen.getByRole('button')

    await userEvent.upload(input, file)

    expect(onDrop).toHaveBeenCalledWith([file])
  })
})
```

---

**💡 Dica Final:** Sempre teste suas alterações em múltiplos dispositivos e navegadores antes de fazer deploy!
