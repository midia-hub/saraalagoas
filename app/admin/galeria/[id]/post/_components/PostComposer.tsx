'use client'

import Link from 'next/link'
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
  const selectedId = selectedInstanceIds[0] || ''
  const selectedInstance = instances.find((inst) => inst.id === selectedId) || null

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-slate-900">Postar em</h2>
        <p className="mt-1 text-sm text-slate-600">Selecione a conta liberada para publicar.</p>
        {instances.length === 0 ? (
          <p className="mt-3 text-sm text-amber-700">
            Nenhuma conta com checklist concluído. Conecte/reconecte em <strong>Instâncias (Meta)</strong> para liberar.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            <label className="block text-sm font-medium text-slate-700" htmlFor="post-target-account">
              Conta de destino
            </label>
            <select
              id="post-target-account"
              value={selectedId}
              onChange={(e) => onInstanceSelectionChange(e.target.value ? [e.target.value] : [])}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
            >
              <option value="">Selecione a conta</option>
              {instances.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.name}
                </option>
              ))}
            </select>
            {selectedInstance && (
              <p className="text-xs text-slate-500">
                Destino confirmado: <strong>{selectedInstance.name}</strong>
              </p>
            )}
            <p className="text-xs text-slate-500">
              Problemas ao publicar? Conecte ou reconecte em{' '}
              <Link href="/admin/instancias" className="font-medium text-[#c62737] hover:underline">
                Instâncias (Meta)
              </Link>
              .
            </p>
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
          disabled={publishing || !selectedId || !!instagramLimitError || media.length === 0}
          className="rounded-lg bg-[#c62737] px-4 py-2 text-sm text-white disabled:opacity-60"
        >
          {publishing ? 'Publicando...' : 'Publicar'}
        </button>
      </div>
    </div>
  )
}

