'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { adminFetchJson } from '@/lib/admin-client'
import { EditPhotoModal } from '../_components/EditPhotoModal'
import { PostComposer, type SocialInstance } from '../_components/PostComposer'
import { PostPreview } from '../_components/PostPreview'
import { usePostDraft, type PostDraft } from '../_lib/usePostDraft'

type Gallery = {
  id: string
  title: string
}

export default function AlbumPostCreatePage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const albumId = params?.id || ''

  const { ready, draft, patchDraft } = usePostDraft(albumId)

  const [album, setAlbum] = useState<Gallery | null>(null)
  const [instances, setInstances] = useState<SocialInstance[]>([])
  const [publishing, setPublishing] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [publishFailureReasons, setPublishFailureReasons] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [editingMedia, setEditingMedia] = useState<PostDraft['media'][number] | null>(null)

  useEffect(() => {
    if (!albumId) return
    adminFetchJson<Gallery>(`/api/gallery/${albumId}`)
      .then(setAlbum)
      .catch(() => setAlbum(null))
  }, [albumId])

  useEffect(() => {
    adminFetchJson<SocialInstance[]>('/api/admin/instagram/instances?forPosting=1&metaOnly=1&instagramOnly=1')
      .then((data) => setInstances(Array.isArray(data) ? data : []))
      .catch(() => setInstances([]))
  }, [])

  useEffect(() => {
    if (!ready || instances.length === 0 || draft.selectedInstanceIds.length === 0) return
    const available = new Set(instances.map((instance) => instance.id))
    const validIds = draft.selectedInstanceIds.filter((id) => available.has(id)).slice(0, 1)
    const unchanged =
      validIds.length === draft.selectedInstanceIds.length &&
      validIds.every((id, index) => id === draft.selectedInstanceIds[index])
    if (unchanged) return

    patchDraft({ selectedInstanceIds: validIds })
    setNotice((prev) => prev ?? 'Algumas contas selecionadas não estão mais disponíveis e foram removidas.')
  }, [ready, instances, draft.selectedInstanceIds, patchDraft])

  useEffect(() => {
    if (!ready) return
    if (draft.media.length === 0) {
      router.replace(`/admin/galeria/${albumId}/post/select`)
    }
  }, [ready, draft.media.length, albumId, router])

  const selectedInstances = useMemo(() => {
    const set = new Set(draft.selectedInstanceIds)
    return instances.filter((i) => set.has(i.id))
  }, [instances, draft.selectedInstanceIds])

  const hasInstagramSelected = selectedInstances.some((i) => i.provider === 'instagram')
  const instagramLimitError = useMemo(() => {
    if (hasInstagramSelected && draft.media.length > 10) {
      return 'Para Instagram, o limite é de 10 mídias por post.'
    }
    return null
  }, [hasInstagramSelected, draft.media.length])

  function updateMedia(mediaId: string, updater: (item: PostDraft['media'][number]) => PostDraft['media'][number]) {
    patchDraft({
      media: draft.media.map((item) => (item.id === mediaId ? updater(item) : item)),
    })
  }

  function removeMedia(mediaId: string) {
    patchDraft({ media: draft.media.filter((item) => item.id !== mediaId) })
  }

  async function handlePublish() {
    setNotice(null)
    setPublishFailureReasons([])
    setError(null)
    if (draft.selectedInstanceIds.length === 0) {
      setError('Selecione uma conta liberada em "Postar em".')
      return
    }
    if (instagramLimitError) {
      setError(instagramLimitError)
      return
    }
    setPublishing(true)
    try {
      const res = await adminFetchJson<{
        message?: string
        draftId?: string
        jobCount?: number
        ok?: boolean
        metaResults?: Array<{ instanceId: string; provider: string; ok: boolean; error?: string }>
      }>('/api/social/publish', {
        method: 'POST',
        body: JSON.stringify({
          albumId,
          instanceIds: draft.selectedInstanceIds,
          text: draft.text,
          mediaEdits: draft.media.map((item) => ({
            id: item.id,
            cropMode: item.cropMode || 'original',
            altText: item.altText || '',
          })),
        }),
      })
      setNotice(res?.message ?? 'Post enviado. Confira no Painel de publicações.')
      const failed = (res?.metaResults ?? []).filter((r) => !r.ok && r.error)
      if (failed.length > 0) {
        setPublishFailureReasons(failed.map((r) => r.error!).filter(Boolean))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível publicar. Tente novamente.')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <PageAccessGuard pageKey="galeria">
      <div className="p-6 md:p-8">
        <div className="mb-4">
          <Link href={`/admin/galeria/${albumId}/post/select`} className="text-sm text-slate-600 hover:text-slate-900">
            ← Voltar para seleção de fotos
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Criar post</h1>
        <p className="mt-1 text-slate-600">{album?.title || 'Álbum'} — editor de postagem.</p>

        {notice && (
          <div
            className={`mt-4 rounded-lg border p-3 ${
              publishFailureReasons.length > 0
                ? 'border-amber-200 bg-amber-50 text-amber-800'
                : 'border-green-200 bg-green-50 text-green-700'
            }`}
          >
            <p>{notice}</p>
            {publishFailureReasons.length > 0 && (
              <div className="mt-3 border-t border-amber-200/60 pt-3">
                <p className="font-medium text-amber-900">Motivo da falha na postagem:</p>
                <ul className="mt-1 list-inside list-disc text-sm text-amber-900">
                  {publishFailureReasons.map((reason, i) => (
                    <li key={i}>{reason}</li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-amber-700">
                  Conecte ou reconecte a conta em <strong>Instâncias (Meta)</strong> no menu ao lado para liberar as postagens.
                </p>
                <Link
                  href="/admin/instancias"
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#c62737] px-4 py-2 text-sm font-medium text-white hover:bg-[#a01f2d]"
                >
                  Ir para Instâncias (Meta) e conectar
                </Link>
              </div>
            )}
          </div>
        )}
        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>
        )}

        {ready && draft.media.length > 0 && (
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr]">
            <PostComposer
              instances={instances}
              selectedInstanceIds={draft.selectedInstanceIds}
              onInstanceSelectionChange={(ids) => patchDraft({ selectedInstanceIds: ids })}
              text={draft.text}
              media={draft.media}
              onTextChange={(value) => patchDraft({ text: value })}
              onAddMedia={() => router.push(`/admin/galeria/${albumId}/post/select`)}
              onEditMedia={(media) => setEditingMedia(media)}
              onRemoveMedia={removeMedia}
              onCancel={() => router.push(`/admin/galeria/${albumId}`)}
              onSaveForLater={() => setNotice('Rascunho salvo localmente.')}
              onPublish={handlePublish}
              publishing={publishing}
              instagramLimitError={instagramLimitError}
            />

            <PostPreview
              selectedInstances={selectedInstances}
              pageName={selectedInstances.length === 1 ? selectedInstances[0].name : 'Sara Alagoas'}
              text={draft.text}
              media={draft.media}
            />
          </div>
        )}
      </div>

      <EditPhotoModal
        open={!!editingMedia}
        media={editingMedia}
        onClose={() => setEditingMedia(null)}
        onApply={(next) => {
          updateMedia(next.id, () => next)
          setEditingMedia(null)
        }}
      />
    </PageAccessGuard>
  )
}

