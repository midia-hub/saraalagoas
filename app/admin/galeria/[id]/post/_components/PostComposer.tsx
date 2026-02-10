'use client'

import { MediaManager } from './MediaManager'
import type { PostDraft } from '../_lib/usePostDraft'

type DraftMedia = PostDraft['media'][number]

export type SocialInstance = {
  id: string
  name: string
  provider: string
  status: string
}

type PostComposerProps = {
  instances: SocialInstance[]
  selectedInstanceIds: string[]
  onInstanceSelectionChange: (instanceIds: string[]) => void
  text: string
  media: DraftMedia[]
  onTextChange: (value: string) => void
  onAddMedia: () => void
  onEditMedia: (media: DraftMedia) => void
  onRemoveMedia: (mediaId: string) => void
  onCancel: () => void
  onSaveForLater: () => void
  onPublish: () => void
  publishing?: boolean
  instagramLimitError?: string | null
}

export function PostComposer({
  instances,
  selectedInstanceIds,
  onInstanceSelectionChange,
  text,
  media,
  onTextChange,
  onAddMedia,
  onEditMedia,
  onRemoveMedia,
  onCancel,
  onSaveForLater,
  onPublish,
  publishing,
  instagramLimitError,
}: PostComposerProps) {
  const selectedSet = new Set(selectedInstanceIds)

  function toggleInstance(instanceId: string) {
    if (selectedSet.has(instanceId)) {
      onInstanceSelectionChange(selectedInstanceIds.filter((id) => id !== instanceId))
    } else {
      onInstanceSelectionChange([...selectedInstanceIds, instanceId])
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-slate-900">Postar em</h2>
        <p className="mt-1 text-sm text-slate-600">Selecione uma ou mais contas para publicar.</p>
        {instances.length === 0 ? (
          <p className="mt-3 text-sm text-amber-700">Nenhuma instância cadastrada. Cadastre em Instagram → Instâncias.</p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {instances.map((inst) => (
              <label
                key={inst.id}
                className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                  selectedSet.has(inst.id) ? 'border-[#c62737] bg-[#c62737]/5' : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedSet.has(inst.id)}
                  onChange={() => toggleInstance(inst.id)}
                  className="rounded border-slate-300 text-[#c62737] focus:ring-[#c62737]"
                />
                <span className="font-medium text-slate-800">{inst.name}</span>
                <span className="rounded bg-slate-200 px-1.5 py-0.5 text-xs text-slate-600">{inst.provider}</span>
              </label>
            ))}
          </div>
        )}
      </section>

      <MediaManager media={media} onAdd={onAddMedia} onEdit={onEditMedia} onRemove={onRemoveMedia} />

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-slate-900">Detalhes do post</h2>
        <label className="mt-3 inline-flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" />
          Personalizar post para o Facebook e o Instagram
        </label>
        <div className="mt-3">
          <label className="mb-1 block text-sm font-medium text-slate-700">Texto</label>
          <textarea
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            rows={6}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            placeholder="Escreva o conteúdo do post..."
          />
        </div>
      </section>

      {instagramLimitError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {instagramLimitError}
        </div>
      )}

      <div className="sticky bottom-0 z-10 flex flex-wrap justify-end gap-2 rounded-xl border border-slate-200 bg-white p-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onSaveForLater}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700"
        >
          Concluir mais tarde
        </button>
        <button
          type="button"
          onClick={onPublish}
          disabled={publishing || selectedInstanceIds.length === 0 || !!instagramLimitError || media.length === 0}
          className="rounded-lg bg-[#c62737] px-4 py-2 text-sm text-white disabled:opacity-60"
        >
          {publishing ? 'Publicando...' : 'Publicar'}
        </button>
      </div>
    </div>
  )
}

