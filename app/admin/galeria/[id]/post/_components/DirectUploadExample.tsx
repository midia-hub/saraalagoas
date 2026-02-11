'use client'

import { useState } from 'react'
import { ImageUploader } from './ImageUploader'
import { SortableMediaGrid } from './SortableMediaGrid'
import { EditPhotoModal } from './EditPhotoModal'
import { ImageLightbox } from './ImageLightbox'
import type { PostDraft } from '../_lib/usePostDraft'

/**
 * Exemplo de componente que permite upload direto de imagens
 * em vez de selecionar de um álbum existente.
 * 
 * Para usar este componente:
 * 1. Importe-o em sua página
 * 2. Configure as funções de callback conforme necessário
 * 3. Integre com seu sistema de upload (API)
 */

type DraftMedia = PostDraft['media'][number]

export function DirectUploadExample() {
  const [media, setMedia] = useState<DraftMedia[]>([])
  const [uploading, setUploading] = useState(false)
  const [editingMedia, setEditingMedia] = useState<DraftMedia | null>(null)
  const [viewingMedia, setViewingMedia] = useState<DraftMedia | null>(null)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  /**
   * Processa os arquivos selecionados pelo usuário
   * Converte para base64 ou envia para API de upload
   */
  const handleDrop = async (acceptedFiles: File[]) => {
    setUploading(true)
    
    try {
      // Converte cada arquivo para base64 (para preview)
      const newMediaPromises = acceptedFiles.map((file) => {
        return new Promise<DraftMedia>((resolve) => {
          const reader = new FileReader()
          
          reader.onload = (e) => {
            const dataUrl = e.target?.result as string
            
            resolve({
              id: `${Date.now()}-${Math.random()}`,
              url: dataUrl,
              thumbnailUrl: dataUrl,
              filename: file.name,
              cropMode: 'original',
              altText: '',
            })
          }
          
          reader.readAsDataURL(file)
        })
      })

      const newMedia = await Promise.all(newMediaPromises)
      
      // Adiciona as novas imagens ao estado
      setMedia((prev) => [...prev, ...newMedia])
      
      // OPCIONAL: Envie para API de upload real
      // await uploadToServer(acceptedFiles)
      
    } catch (error) {
      console.error('Erro ao processar imagens:', error)
      alert('Erro ao carregar imagens. Tente novamente.')
    } finally {
      setUploading(false)
    }
  }

  /**
   * OPCIONAL: Função para enviar para servidor
   */
  const uploadToServer = async (files: File[]) => {
    const formData = new FormData()
    
    files.forEach((file, index) => {
      formData.append(`file-${index}`, file)
    })

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      throw new Error('Falha no upload')
    }

    return response.json()
  }

  const handleReorder = (newMedia: DraftMedia[]) => {
    setMedia(newMedia)
  }

  const handleEdit = (mediaItem: DraftMedia) => {
    setEditingMedia(mediaItem)
  }

  const handleApplyEdit = (updatedMedia: DraftMedia, options?: { switchToMediaId?: string }) => {
    setMedia((prev) =>
      prev.map((item) => (item.id === updatedMedia.id ? updatedMedia : item))
    )
    if (options?.switchToMediaId) {
      const nextMedia = media.find((m) => m.id === options.switchToMediaId)
      if (nextMedia) setEditingMedia(nextMedia)
    } else {
      setEditingMedia(null)
    }
  }

  const handleRemove = (mediaId: string) => {
    setMedia((prev) => prev.filter((item) => item.id !== mediaId))
  }

  const handleView = (mediaItem: DraftMedia) => {
    setViewingMedia(mediaItem)
    setLightboxOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Upload area */}
      <div>
        <h2 className="mb-3 text-xl font-semibold text-slate-900">
          Upload de Imagens
        </h2>
        <ImageUploader
          onDrop={handleDrop}
          maxFiles={20}
          disabled={uploading}
        />
        {uploading && (
          <p className="mt-2 text-sm text-blue-600">
            Processando imagens...
          </p>
        )}
      </div>

      {/* Grid de imagens */}
      {media.length > 0 && (
        <div>
          <h2 className="mb-3 text-xl font-semibold text-slate-900">
            Imagens Carregadas ({media.length})
          </h2>
          <SortableMediaGrid
            media={media}
            onReorder={handleReorder}
            onEdit={handleEdit}
            onRemove={handleRemove}
            onView={handleView}
          />
        </div>
      )}

      {/* Modal de edição */}
      <EditPhotoModal
        open={!!editingMedia}
        media={editingMedia}
        allMedia={media}
        onClose={() => setEditingMedia(null)}
        onApply={handleApplyEdit}
        onSwitchMedia={(mediaId) => {
          const nextMedia = media.find((m) => m.id === mediaId)
          if (nextMedia) {
            setEditingMedia(nextMedia)
          }
        }}
      />

      {/* Lightbox para visualização */}
      <ImageLightbox
        media={media}
        currentMedia={viewingMedia}
        isOpen={lightboxOpen}
        onClose={() => {
          setLightboxOpen(false)
          setViewingMedia(null)
        }}
      />

      {/* Botões de ação */}
      {media.length > 0 && (
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setMedia([])}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Limpar tudo
          </button>
          <button
            type="button"
            onClick={() => {
              console.log('Publicando...', media)
              alert('Imagens prontas para publicação!')
            }}
            className="rounded-lg bg-[#c62737] px-4 py-2 text-sm text-white hover:bg-[#a01f2d]"
          >
            Publicar
          </button>
        </div>
      )}
    </div>
  )
}
