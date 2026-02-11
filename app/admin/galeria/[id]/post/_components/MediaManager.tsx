'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SortableMediaGrid } from './SortableMediaGrid'
import { ImageLightbox } from './ImageLightbox'
import type { PostDraft } from '../_lib/usePostDraft'

type DraftMedia = PostDraft['media'][number]

type MediaManagerProps = {
  media: DraftMedia[]
  onAdd: () => void
  onEdit: (media: DraftMedia) => void
  onRemove: (mediaId: string) => void
  onReorder: (newMedia: DraftMedia[]) => void
}

export function MediaManager({ media, onAdd, onEdit, onRemove, onReorder }: MediaManagerProps) {
  const [viewingMedia, setViewingMedia] = useState<DraftMedia | null>(null)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const handleView = (media: DraftMedia) => {
    setViewingMedia(media)
    setLightboxOpen(true)
  }

  const handleCloseLightbox = () => {
    setLightboxOpen(false)
    setTimeout(() => setViewingMedia(null), 300) // Aguarda animação de fechamento
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Mídia</h2>
          <p className="mt-1 text-sm text-slate-600">
            Compartilhe fotos e vídeos. Os posts do Instagram não podem ter mais de 10 fotos (carrossel).
          </p>
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700"
        >
          {media.length} {media.length === 1 ? 'item' : 'itens'}
        </motion.div>
      </div>

      <AnimatePresence mode="wait">
        {media.length > 0 && (
          <motion.div
            key="media-grid"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="mt-4"
          >
            <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
              <p className="text-sm text-blue-800">
                💡 <strong>Dica:</strong> Arraste as imagens para reordená-las. Clique em uma imagem para visualizar em
                tela cheia.
              </p>
            </div>
            <SortableMediaGrid
              media={media}
              onReorder={onReorder}
              onEdit={onEdit}
              onRemove={onRemove}
              onView={handleView}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={onAdd}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        <span className="text-lg">➕</span>
        Adicionar foto/vídeo
      </motion.button>

      {/* Lightbox para visualização */}
      <ImageLightbox
        media={media}
        currentMedia={viewingMedia}
        isOpen={lightboxOpen}
        onClose={handleCloseLightbox}
      />
    </section>
  )
}

