'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { adminFetchJson } from '@/lib/admin-client'
import { supabase } from '@/lib/supabase'
import { Crop, Filter, Pencil, Sticker, Type, X } from 'lucide-react'

type InstagramInstance = {
  id: string
  name: string
  status: 'connected' | 'disconnected'
}

type DraftData = {
  id: string
  caption: string
  preset: string
  instagram_post_assets?: Array<{
    id: string
    source_url: string
    final_url: string | null
    sort_order: number
  }>
}

type GalleryFile = {
  id: string
  name: string
  viewUrl: string
}

type MediaPreview = {
  id: string
  label: string
  source_url: string
  final_url: string | null
  url: string
  sort_order: number
  preset: MediaPreset
  zoom: number
  offsetX: number
  offsetY: number
}

type MediaPreset = 'original' | '1:1' | '1.91:1' | '4:5' | '3:4'

const PRESET_OPTIONS: Record<MediaPreset, { label: string; ratioLabel: string; width: number; height: number }> = {
  original: { label: 'Original', ratioLabel: 'original', width: 1080, height: 1080 },
  '1:1': { label: 'Quadrado', ratioLabel: '1:1', width: 1080, height: 1080 },
  '1.91:1': { label: 'Horizontal', ratioLabel: '1,91:1', width: 1080, height: 566 },
  '4:5': { label: 'Vertical', ratioLabel: '4:5', width: 1080, height: 1350 },
  '3:4': { label: 'Retrato', ratioLabel: '3:4', width: 1080, height: 1440 },
}

function getCssAspectRatio(preset: MediaPreset) {
  if (preset === 'original') return '16 / 9'
  const p = PRESET_OPTIONS[preset]
  return `${p.width} / ${p.height}`
}

function imageStyle(media: MediaPreview) {
  return {
    transform: `translate(${media.offsetX}px, ${media.offsetY}px) scale(${media.zoom})`,
    transformOrigin: 'center center',
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Falha ao carregar imagem para edição.'))
    image.src = url
  })
}

async function renderEditedImage(media: MediaPreview): Promise<{ blob: Blob; width: number; height: number }> {
  const image = await loadImage(media.source_url)

  const width = media.preset === 'original' ? image.width : PRESET_OPTIONS[media.preset].width
  const height = media.preset === 'original' ? image.height : PRESET_OPTIONS[media.preset].height

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Não foi possível inicializar o editor da imagem.')

  const baseScale = Math.max(width / image.width, height / image.height)
  const scale = baseScale * media.zoom
  const drawWidth = image.width * scale
  const drawHeight = image.height * scale
  const x = (width - drawWidth) / 2 + media.offsetX
  const y = (height - drawHeight) / 2 + media.offsetY

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(image, x, y, drawWidth, drawHeight)

  // Qualidade alta para publicação (evitar perda visível na rede)
  const JPEG_QUALITY_PUBLISH = 0.97
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((value) => resolve(value), 'image/jpeg', JPEG_QUALITY_PUBLISH)
  })
  if (!blob) throw new Error('Erro ao gerar imagem final.')
  return { blob, width, height }
}

export default function AdminInstagramPostPublishPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const draftIdFromQuery = searchParams?.get('draftId') || ''
  const galleryId = searchParams?.get('galleryId') || ''
  const selectedParam = searchParams?.get('selected') || ''
  const selectedFileIds = useMemo(
    () => selectedParam.split(',').map((item) => item.trim()).filter(Boolean),
    [selectedParam]
  )
  const [draftId, setDraftId] = useState(draftIdFromQuery)

  const [instances, setInstances] = useState<InstagramInstance[]>([])
  const [draft, setDraft] = useState<DraftData | null>(null)
  const [media, setMedia] = useState<MediaPreview[]>([])
  const [instanceId, setInstanceId] = useState('')
  const [caption, setCaption] = useState('')
  const [mode, setMode] = useState<'now' | 'scheduled'>('now')
  const [scheduledAt, setScheduledAt] = useState('')
  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [creatingDraft, setCreatingDraft] = useState(false)
  const [editingMediaId, setEditingMediaId] = useState<string | null>(null)
  const [editingDraftMedia, setEditingDraftMedia] = useState<MediaPreview | null>(null)
  const [savingEdits, setSavingEdits] = useState(false)

  useEffect(() => {
    if (draftIdFromQuery && draftIdFromQuery !== draftId) {
      setDraftId(draftIdFromQuery)
    }
  }, [draftIdFromQuery, draftId])

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setError(null)
      let activeDraftId = draftId

      if (!activeDraftId && galleryId && selectedFileIds.length > 0) {
        setCreatingDraft(true)
        try {
          const filesRes = await fetch(`/api/gallery/${galleryId}/files`)
          const filesData = await filesRes.json().catch(() => [])
          const files = Array.isArray(filesData) ? (filesData as GalleryFile[]) : []
          const selectedFiles = selectedFileIds
            .map((id) => files.find((file) => file.id === id))
            .filter(Boolean) as GalleryFile[]

          if (!selectedFiles.length) {
            throw new Error('Nenhuma imagem válida foi selecionada na galeria.')
          }

          const created = await adminFetchJson<{ draft: { id: string } }>('/api/admin/instagram/drafts', {
            method: 'POST',
            body: JSON.stringify({
              galleryId,
              preset: '4:5',
              assets: selectedFiles.map((file, index) => ({
                source_url: `/api/gallery/image?fileId=${encodeURIComponent(file.id)}&mode=full`,
                sort_order: index,
              })),
            }),
          })

          activeDraftId = created.draft.id
          setDraftId(activeDraftId)
          router.replace(`/admin/instagram/post/publish?draftId=${activeDraftId}`)
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Erro ao preparar mídia selecionada.')
          setLoading(false)
          setCreatingDraft(false)
          return
        } finally {
          setCreatingDraft(false)
        }
      }

      if (!activeDraftId) {
        setLoading(false)
        return
      }

      try {
        const [instancesData, draftData] = await Promise.all([
          adminFetchJson<InstagramInstance[]>('/api/admin/instagram/instances'),
          adminFetchJson<DraftData>(`/api/admin/instagram/drafts/${activeDraftId}`),
        ])
        // Esta tela usa a fila legada (instagram_post_jobs), que aceita apenas IDs da tabela instagram_instances.
        const legacyOnly = (instancesData || []).filter((item) => !item.id.startsWith('meta_'))
        const connectedFirst = legacyOnly.slice().sort((a, b) => {
          if (a.status === b.status) return 0
          return a.status === 'connected' ? -1 : 1
        })
        setInstances(connectedFirst)
        setInstanceId(connectedFirst[0]?.id || '')
        setDraft(draftData)
        setCaption(draftData.caption || '')
        const mediaRows = (draftData.instagram_post_assets || [])
          .slice()
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((item, index) => ({
            id: item.id,
            label: `Mídia ${index + 1}`,
            source_url: item.source_url,
            final_url: item.final_url,
            url: item.final_url || item.source_url,
            sort_order: item.sort_order,
            preset: '4:5' as MediaPreset,
            zoom: 1,
            offsetX: 0,
            offsetY: 0,
          }))
        setMedia(mediaRows)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao carregar dados de publicação.')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [draftId, galleryId, selectedFileIds, router])

  function openEditor(item: MediaPreview) {
    setEditingMediaId(item.id)
    setEditingDraftMedia({ ...item })
  }

  function closeEditor() {
    setEditingMediaId(null)
    setEditingDraftMedia(null)
  }

  function applyEditor() {
    if (!editingDraftMedia) return
    setMedia((prev) => prev.map((item) => (item.id === editingDraftMedia.id ? editingDraftMedia : item)))
    closeEditor()
  }

  async function persistEditedAssets(): Promise<void> {
    if (!draftId) throw new Error('Draft inválido para salvar edições.')
    if (!supabase) throw new Error('Supabase não configurado para upload.')
    if (!media.length) throw new Error('Nenhuma mídia selecionada para publicar.')

    setSavingEdits(true)
    try {
      const updates: Array<{
        id: string
        sort_order: number
        storage_path: string
        final_url: string
        width: number
        height: number
        status: 'processed'
      }> = []

      for (let i = 0; i < media.length; i++) {
        const item = media[i]
        const rendered = await renderEditedImage(item)
        const storagePath = `${draftId}/${String(i + 1).padStart(2, '0')}.jpg`

        const { error: uploadError } = await supabase.storage.from('instagram_posts').upload(storagePath, rendered.blob, {
          upsert: true,
          contentType: 'image/jpeg',
        })
        if (uploadError) throw new Error(uploadError.message)

        const { data } = supabase.storage.from('instagram_posts').getPublicUrl(storagePath)
        updates.push({
          id: item.id,
          sort_order: i,
          storage_path: storagePath,
          final_url: data.publicUrl,
          width: rendered.width,
          height: rendered.height,
          status: 'processed',
        })
      }

      await adminFetchJson(`/api/admin/instagram/drafts/${draftId}/assets`, {
        method: 'PUT',
        body: JSON.stringify({ assets: updates }),
      })

      setMedia((prev) =>
        prev.map((item, index) => {
          const update = updates[index]
          return update
            ? {
                ...item,
                final_url: update.final_url,
                url: update.final_url,
                sort_order: update.sort_order,
              }
            : item
        })
      )
    } finally {
      setSavingEdits(false)
    }
  }

  async function handlePublish() {
    if (!draftId) {
      setError('draftId não informado.')
      return
    }
    if (!instanceId) {
      setError('Selecione uma instância do Instagram.')
      return
    }
    if (mode === 'scheduled' && !scheduledAt) {
      setError('Informe data e hora para agendamento.')
      return
    }

    setPublishing(true)
    setError(null)
    try {
      await persistEditedAssets()

      await adminFetchJson(`/api/admin/instagram/drafts/${draftId}`, {
        method: 'PUT',
        body: JSON.stringify({
          caption,
          publish_mode: mode,
          scheduled_at: mode === 'scheduled' ? new Date(scheduledAt).toISOString() : null,
          status: mode === 'scheduled' ? 'scheduled' : 'ready',
        }),
      })

      await adminFetchJson('/api/admin/instagram/jobs', {
        method: 'POST',
        body: JSON.stringify({
          draftId,
          instanceId,
          mode,
          scheduledAt: mode === 'scheduled' ? new Date(scheduledAt).toISOString() : null,
        }),
      })

      router.push('/admin/instagram/posts')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao criar job de publicação.')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <PageAccessGuard pageKey="instagram">
      <div className="p-6 md:p-8">
        <h1 className="text-2xl font-bold text-slate-900">Criar post</h1>
        <p className="mt-1 text-slate-600">Componha o post com mídias da galeria e publique no Instagram.</p>

        {!draftId && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-700">
            Selecione imagens em uma galeria para iniciar o post.
          </div>
        )}
        {creatingDraft && (
          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-blue-700">
            Preparando rascunho com as mídias selecionadas...
          </div>
        )}
        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <p className="mt-4 text-slate-600">Carregando...</p>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="space-y-4">
              <section className="rounded-xl border border-slate-200 bg-white p-4">
                <h2 className="text-sm font-semibold text-slate-800">Postar em</h2>
                <select
                  value={instanceId}
                  onChange={(e) => setInstanceId(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  {instances.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.status})
                    </option>
                  ))}
                </select>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-4">
                <h2 className="text-sm font-semibold text-slate-800">Mídia</h2>
                <p className="mt-1 text-xs text-slate-600">O Instagram permite até 10 mídias por postagem.</p>
                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                  {media.map((item) => (
                    <div key={item.id} className="space-y-1">
                      <img
                        src={item.url}
                        alt={item.label}
                        className="h-20 w-full rounded-md border border-slate-200 object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => openEditor(item)}
                        className="inline-flex w-full items-center justify-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700"
                      >
                        <Pencil size={12} />
                        Editar
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-4">
                <h2 className="text-sm font-semibold text-slate-800">Texto</h2>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={6}
                  placeholder="Escreva a legenda..."
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-4">
                <h2 className="text-sm font-semibold text-slate-800">Agendamento</h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setMode('now')}
                    className={`rounded-lg px-3 py-2 text-sm ${mode === 'now' ? 'bg-[#c62737] text-white' : 'border border-slate-300'}`}
                  >
                    Postar agora
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('scheduled')}
                    className={`rounded-lg px-3 py-2 text-sm ${mode === 'scheduled' ? 'bg-[#c62737] text-white' : 'border border-slate-300'}`}
                  >
                    Agendar
                  </button>
                </div>
                {mode === 'scheduled' && (
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 md:max-w-sm"
                  />
                )}
              </section>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={publishing || !draft || savingEdits}
                  className="rounded-lg bg-[#c62737] px-4 py-2 text-white disabled:opacity-60"
                >
                  {publishing ? 'Publicando...' : savingEdits ? 'Salvando edições...' : 'Publicar'}
                </button>
                {draft && (
                  <button
                    type="button"
                    onClick={() => router.push(`/admin/instagram/post/editor?draftId=${draft.id}`)}
                    className="rounded-lg border border-slate-300 px-4 py-2"
                  >
                    Editar imagens
                  </button>
                )}
              </div>
            </div>

            <aside className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-800">Prévia da postagem</p>
              <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-slate-300" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {instances.find((item) => item.id === instanceId)?.name || 'Conta do Instagram'}
                    </p>
                    <p className="text-xs text-slate-500">Agora mesmo</p>
                  </div>
                </div>
                {media[0] && (
                  <img
                    src={media[0].url}
                    alt="Prévia"
                    className="mt-3 h-64 w-full rounded-lg border border-slate-200 object-cover"
                  />
                )}
                <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">
                  {caption || 'Sua legenda aparecerá aqui.'}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  {media.length} mídia(s) selecionada(s)
                </p>
              </div>
            </aside>
          </div>
        )}
      </div>
      {editingMediaId && editingDraftMedia && (
        <div className="fixed inset-0 z-50 bg-black/50 p-4">
          <div className="mx-auto h-full max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-xl border border-slate-300 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h3 className="text-xl font-semibold text-slate-900">Editar foto</h3>
              <button
                type="button"
                onClick={closeEditor}
                className="rounded border border-slate-300 p-1 text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid h-[calc(90vh-65px)] grid-cols-1 md:grid-cols-[260px_320px_1fr]">
              <aside className="border-r border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-800">Ferramentas de criação</p>
                <div className="mt-3 space-y-2">
                  <div className="rounded-md bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700">Cortar</div>
                  <div className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-600"><Filter size={16} /> Filtrar</div>
                  <div className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-600"><Type size={16} /> Texto</div>
                  <div className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-600"><Sticker size={16} /> Figurinhas</div>
                </div>
              </aside>

              <section className="border-r border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-800">Cortar</p>
                <div className="mt-3 space-y-2">
                  {(Object.keys(PRESET_OPTIONS) as MediaPreset[]).map((presetKey) => (
                    <button
                      key={presetKey}
                      type="button"
                      onClick={() => setEditingDraftMedia((prev) => (prev ? { ...prev, preset: presetKey } : prev))}
                      className={`w-full rounded-lg border p-3 text-left ${
                        editingDraftMedia.preset === presetKey ? 'border-blue-500 bg-blue-50' : 'border-slate-200'
                      }`}
                    >
                      <p className="font-medium text-slate-900">{PRESET_OPTIONS[presetKey].label}</p>
                      <p className="text-sm text-slate-600">{PRESET_OPTIONS[presetKey].ratioLabel}</p>
                    </button>
                  ))}
                </div>

                {editingDraftMedia.preset !== 'original' && (
                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="text-xs font-medium text-slate-700">Zoom ({editingDraftMedia.zoom.toFixed(2)}x)</label>
                      <input
                        type="range"
                        min="1"
                        max="2"
                        step="0.01"
                        value={editingDraftMedia.zoom}
                        onChange={(e) =>
                          setEditingDraftMedia((prev) => (prev ? { ...prev, zoom: Number(e.target.value) } : prev))
                        }
                        className="mt-1 w-full"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-700">Mover X ({editingDraftMedia.offsetX}px)</label>
                      <input
                        type="range"
                        min="-400"
                        max="400"
                        step="1"
                        value={editingDraftMedia.offsetX}
                        onChange={(e) =>
                          setEditingDraftMedia((prev) => (prev ? { ...prev, offsetX: Number(e.target.value) } : prev))
                        }
                        className="mt-1 w-full"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-700">Mover Y ({editingDraftMedia.offsetY}px)</label>
                      <input
                        type="range"
                        min="-400"
                        max="400"
                        step="1"
                        value={editingDraftMedia.offsetY}
                        onChange={(e) =>
                          setEditingDraftMedia((prev) => (prev ? { ...prev, offsetY: Number(e.target.value) } : prev))
                        }
                        className="mt-1 w-full"
                      />
                    </div>
                  </div>
                )}
              </section>

              <section className="flex flex-col bg-slate-100 p-4">
                <p className="text-sm font-semibold text-slate-800">Prévia</p>
                <div className="mt-3 flex-1 overflow-auto rounded-lg border border-slate-200 bg-white p-4">
                  <div
                    className="mx-auto max-w-xl overflow-hidden rounded-lg border border-slate-300 bg-slate-200"
                    style={{ aspectRatio: getCssAspectRatio(editingDraftMedia.preset) }}
                  >
                    <img
                      src={editingDraftMedia.source_url}
                      alt="Preview"
                      className="h-full w-full object-cover"
                      style={imageStyle(editingDraftMedia)}
                    />
                  </div>
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeEditor}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={applyEditor}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#c62737] px-4 py-2 text-sm text-white"
                  >
                    <Crop size={14} />
                    Aplicar
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </PageAccessGuard>
  )
}
