'use client'

import type { PostDraft } from '../_lib/usePostDraft'

type DraftMedia = PostDraft['media'][number]

type MediaManagerProps = {
  media: DraftMedia[]
  onAdd: () => void
  onEdit: (media: DraftMedia) => void
  onRemove: (mediaId: string) => void
}

export function MediaManager({ media, onAdd, onEdit, onRemove }: MediaManagerProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-semibold text-slate-900">Mídia</h2>
      <p className="mt-1 text-sm text-slate-600">
        Compartilhe fotos e vídeos. Os posts do Instagram não podem ter mais de 10 fotos.
      </p>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {media.map((item) => (
          <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-2">
            <div className="flex items-center gap-2">
              <img
                src={item.thumbnailUrl || item.url}
                alt={item.filename || 'Mídia'}
                className="h-16 w-16 rounded-md object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">{item.filename || item.id}</p>
                <p className="text-xs text-slate-500">Corte: {item.cropMode || 'original'}</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onEdit(item)}
                  className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700"
                  title="Editar foto"
                >
                  ✏️
                </button>
                <button
                  type="button"
                  className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700"
                  title="Marcar"
                >
                  🏷️
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(item.id)}
                  className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700"
                  title="Remover"
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onAdd}
        className="mt-3 inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        Adicionar foto/vídeo
      </button>
    </section>
  )
}

