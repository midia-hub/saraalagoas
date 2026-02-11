'use client'

import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion } from 'framer-motion'
import type { PostDraft } from '../_lib/usePostDraft'

type DraftMedia = PostDraft['media'][number]

type SortableMediaItemProps = {
  media: DraftMedia
  onEdit: (media: DraftMedia) => void
  onRemove: (mediaId: string) => void
  onView: (media: DraftMedia) => void
}

function SortableMediaItem({ media, onEdit, onRemove, onView }: SortableMediaItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: media.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className={`group relative rounded-lg border ${
        isDragging ? 'border-blue-500 shadow-lg' : 'border-slate-200'
      } bg-white p-2 transition-all`}
    >
      <div className="relative aspect-square overflow-hidden rounded-md">
        <img
          src={media.thumbnailUrl || media.url}
          alt={media.filename || 'Mídia'}
          className="h-full w-full cursor-pointer object-cover transition-transform group-hover:scale-105"
          onClick={() => onView(media)}
        />
        
        {/* Overlay de arraste */}
        <div
          {...attributes}
          {...listeners}
          className="absolute inset-0 flex cursor-move items-center justify-center bg-black/0 opacity-0 transition-all hover:bg-black/20 hover:opacity-100"
        >
          <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-slate-700 shadow-lg">
            ⋮⋮ Arrastar
          </span>
        </div>
      </div>

      <div className="mt-2">
        <p className="truncate text-xs font-medium text-slate-800">{media.filename || media.id}</p>
        <p className="text-xs text-slate-500">Corte: {media.cropMode || 'original'}</p>
      </div>

      <div className="mt-2 flex gap-1">
        <button
          type="button"
          onClick={() => onEdit(media)}
          className="flex-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
          title="Editar foto"
        >
          ✏️ Editar
        </button>
        <button
          type="button"
          onClick={() => onRemove(media.id)}
          className="rounded-md border border-red-300 bg-white px-2 py-1 text-xs text-red-600 hover:bg-red-50"
          title="Remover"
        >
          🗑️
        </button>
      </div>
    </motion.div>
  )
}

type SortableMediaGridProps = {
  media: DraftMedia[]
  onReorder: (newMedia: DraftMedia[]) => void
  onEdit: (media: DraftMedia) => void
  onRemove: (mediaId: string) => void
  onView: (media: DraftMedia) => void
}

export function SortableMediaGrid({ media, onReorder, onEdit, onRemove, onView }: SortableMediaGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Requer movimento de 8px antes de iniciar o arraste
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = media.findIndex((item) => item.id === active.id)
      const newIndex = media.findIndex((item) => item.id === over.id)
      
      const newMedia = arrayMove(media, oldIndex, newIndex)
      onReorder(newMedia)
    }
  }

  if (media.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center">
        <p className="text-slate-600">Nenhuma mídia adicionada ainda</p>
        <p className="mt-1 text-sm text-slate-500">Clique em "Adicionar foto/vídeo" para começar</p>
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={media.map((m) => m.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {media.map((item) => (
            <SortableMediaItem
              key={item.id}
              media={item}
              onEdit={onEdit}
              onRemove={onRemove}
              onView={onView}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
