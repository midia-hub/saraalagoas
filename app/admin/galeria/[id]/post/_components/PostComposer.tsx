'use client'

import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { CustomSelect } from '@/components/ui/CustomSelect'
import { MediaManager } from './MediaManager'
import type { PostDraft } from '../_lib/usePostDraft'

type DraftMedia = PostDraft['media'][number]

export type SocialInstance = {
  id: string
  name: string
  provider: string
  status: string
  has_instagram?: boolean
  has_facebook?: boolean
}

type PostComposerProps = {
  instances: SocialInstance[]
  selectedInstanceIds: string[]
  onInstanceSelectionChange: (instanceIds: string[]) => void
  destinations?: {
    instagram: boolean
    facebook: boolean
  }
  onDestinationsChange?: (destinations: { instagram: boolean; facebook: boolean }) => void
  text: string
  media: DraftMedia[]
  onTextChange: (value: string) => void
  onAddMedia: () => void
  onEditMedia: (media: DraftMedia) => void
  onRemoveMedia: (mediaId: string) => void
  onReorderMedia: (newMedia: DraftMedia[]) => void
  onCancel: () => void
  onSaveForLater: () => void
  onPublish: () => void
  postType: 'feed' | 'reel' | 'story'
  onPostTypeChange: (type: 'feed' | 'reel' | 'story') => void
  publishing?: boolean
  instagramLimitError?: string | null
}

export function PostComposer({
  instances,
  selectedInstanceIds,
  onInstanceSelectionChange,
  destinations = { instagram: true, facebook: false },
  onDestinationsChange,
  text,
  media,
  onTextChange,
  onAddMedia,
  onEditMedia,
  onRemoveMedia,
  onReorderMedia,
  onCancel,
  onSaveForLater,
  onPublish,
  postType,
  onPostTypeChange,
  publishing,
  instagramLimitError,
}: PostComposerProps) {
  const selectedId = selectedInstanceIds[0] || ''
  const selectedInstance = instances.find((inst) => inst.id === selectedId) || null
  const hasInstagram = destinations.instagram
  const hasFacebook = destinations.facebook

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-slate-900">Postar em</h2>
        <p className="mt-1 text-sm text-slate-600">Selecione a conta liberada para publicar.</p>
        {instances.length === 0 ? (
          <p className="mt-3 text-sm text-amber-700">
            Nenhuma conta com checklist concluído. Conecte/reconecte em <strong>Configurações do Instagram/Facebook</strong> para liberar.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            <label className="block text-sm font-medium text-slate-700" htmlFor="post-target-account">
              Conta de destino
            </label>
            <CustomSelect
              value={selectedId}
              onChange={(v) => onInstanceSelectionChange(v ? [v] : [])}
              placeholder="Selecione a conta"
              options={instances.map((inst) => ({ value: inst.id, label: inst.name }))}
            />
            {selectedInstance && (
              <>
                {/* Destinos disponíveis para publicação */}
                {(selectedInstance.has_instagram || selectedInstance.has_facebook) && (
                  <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="mb-3 text-sm font-medium text-slate-800">
                      Onde deseja publicar?
                    </p>
                    <div className="flex flex-wrap gap-6">
                      <div className="space-y-2">
                        {selectedInstance.has_instagram && (
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={hasInstagram}
                              onChange={(e) => {
                                if (onDestinationsChange) {
                                  const newDest = { ...destinations, instagram: e.target.checked }
                                  // Garante que pelo menos um está marcado
                                  if (!newDest.instagram && !newDest.facebook) {
                                    return
                                  }
                                  onDestinationsChange(newDest)
                                }
                              }}
                              disabled={publishing}
                              className="h-4 w-4 rounded border-slate-300 text-[#c62737] focus:ring-2 focus:ring-[#c62737] focus:ring-offset-0"
                            />
                            <span className="text-sm text-slate-700">
                              📷 Instagram
                            </span>
                          </label>
                        )}
                        {selectedInstance.has_facebook && (
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={hasFacebook}
                              onChange={(e) => {
                                if (onDestinationsChange) {
                                  const newDest = { ...destinations, facebook: e.target.checked }
                                  // Garante que pelo menos um está marcado
                                  if (!newDest.instagram && !newDest.facebook) {
                                    return
                                  }
                                  onDestinationsChange(newDest)
                                }
                              }}
                              disabled={publishing}
                              className="h-4 w-4 rounded border-slate-300 text-[#c62737] focus:ring-2 focus:ring-[#c62737] focus:ring-offset-0"
                            />
                            <span className="text-sm text-slate-700">
                              📘 Facebook
                            </span>
                          </label>
                        )}
                      </div>

                      {hasInstagram && (
                        <div className="border-l border-slate-200 pl-6 space-y-2">
                          <p className="text-xs font-bold uppercase text-slate-400">Tipo (Instagram)</p>
                          <div className="flex flex-wrap gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="postType"
                                value="feed"
                                checked={postType === 'feed'}
                                onChange={() => onPostTypeChange('feed')}
                                className="h-4 w-4 border-slate-300 text-[#c62737] focus:ring-[#c62737]"
                              />
                              <span className="text-sm text-slate-700">Feed</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="postType"
                                value="reel"
                                checked={postType === 'reel'}
                                onChange={() => onPostTypeChange('reel')}
                                className="h-4 w-4 border-slate-300 text-[#c62737] focus:ring-[#c62737]"
                              />
                              <span className="text-sm text-slate-700">Reel</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="postType"
                                value="story"
                                checked={postType === 'story'}
                                onChange={() => onPostTypeChange('story')}
                                className="h-4 w-4 border-slate-300 text-[#c62737] focus:ring-[#c62737]"
                              />
                              <span className="text-sm text-slate-700">Story</span>
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                    {!hasInstagram && !hasFacebook && (
                      <p className="mt-2 text-xs text-red-600">
                        Selecione ao menos uma plataforma
                      </p>
                    )}
                  </div>
                )}
                <p className="mt-3 text-xs text-slate-500">
                  Destino confirmado: <strong>{selectedInstance.name}</strong>
                  {(selectedInstance.has_instagram || selectedInstance.has_facebook) && (
                    <>
                      {' • '}
                      {hasInstagram && hasFacebook && 'Instagram e Facebook'}
                      {hasInstagram && !hasFacebook && 'Apenas Instagram'}
                      {!hasInstagram && hasFacebook && 'Apenas Facebook'}
                    </>
                  )}
                </p>
              </>
            )}
            <p className="text-xs text-slate-500">
              Problemas ao publicar? Conecte ou reconecte em{' '}
              <Link href="/admin/instancias" className="font-medium text-[#c62737] hover:underline">
                Configurações do Instagram/Facebook
              </Link>
              .
            </p>
          </div>
        )}
      </section>

      <MediaManager media={media} onAdd={onAddMedia} onEdit={onEditMedia} onRemove={onRemoveMedia} onReorder={onReorderMedia} />

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
          disabled={
            publishing || 
            !selectedId || 
            !!instagramLimitError || 
            media.length === 0 ||
            (!hasInstagram && !hasFacebook)
          }
          className="rounded-lg bg-[#c62737] px-4 py-2 text-sm text-white disabled:opacity-60 flex items-center gap-2"
        >
          {publishing && <Loader2 className="w-4 h-4 animate-spin" />}
          {publishing ? 'Publicando...' : 'Publicar'}
        </button>
      </div>
    </div>
  )
}

