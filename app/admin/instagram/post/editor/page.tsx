'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { adminFetchJson } from '@/lib/admin-client'
import { supabase } from '@/lib/supabase'

type PresetKey = '4:5' | '3:4' | '1:1' | '1.91:1'

type DraftAsset = {
  id: string
  source_url: string
  final_url: string | null
  sort_order: number
}

type DraftPayload = {
  id: string
  preset: PresetKey
  instagram_post_assets: DraftAsset[]
}

type Transform = {
  zoom: number
  offsetX: number
  offsetY: number
}

const PRESETS: Record<PresetKey, { width: number; height: number; label: string }> = {
  '4:5': { width: 1080, height: 1350, label: 'Feed Retrato (4:5)' },
  '3:4': { width: 1080, height: 1440, label: 'Feed Retrato (3:4)' },
  '1:1': { width: 1080, height: 1080, label: 'Feed Quadrado (1:1)' },
  '1.91:1': { width: 1080, height: 566, label: 'Feed Paisagem (1.91:1)' },
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Falha ao carregar imagem de origem.'))
    image.src = url
  })
}

async function renderEditedImage(
  sourceUrl: string,
  preset: PresetKey,
  transform: Transform
): Promise<{ blob: Blob; width: number; height: number }> {
  const presetSize = PRESETS[preset]
  const image = await loadImage(sourceUrl)
  const canvas = document.createElement('canvas')
  canvas.width = presetSize.width
  canvas.height = presetSize.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Falha ao iniciar editor de imagem.')

  const baseScale = Math.max(presetSize.width / image.width, presetSize.height / image.height)
  const scale = baseScale * transform.zoom
  const drawWidth = image.width * scale
  const drawHeight = image.height * scale
  const x = (presetSize.width - drawWidth) / 2 + transform.offsetX
  const y = (presetSize.height - drawHeight) / 2 + transform.offsetY

  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, presetSize.width, presetSize.height)
  ctx.drawImage(image, x, y, drawWidth, drawHeight)

  // Qualidade alta para publicação (evitar perda visível na rede)
  const JPEG_QUALITY_PUBLISH = 0.97
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((value) => resolve(value), 'image/jpeg', JPEG_QUALITY_PUBLISH)
  })
  if (!blob) throw new Error('Falha ao gerar imagem final.')
  return { blob, width: presetSize.width, height: presetSize.height }
}

export default function AdminInstagramPostEditorPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const draftId = searchParams?.get('draftId') || ''

  const [draft, setDraft] = useState<DraftPayload | null>(null)
  const [preset, setPreset] = useState<PresetKey>('4:5')
  const [transforms, setTransforms] = useState<Record<string, Transform>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    async function loadDraft() {
      if (!draftId) {
        setLoading(false)
        return
      }
      try {
        const data = await adminFetchJson<DraftPayload>(`/api/admin/instagram/drafts/${draftId}`)
        const ordered = (data.instagram_post_assets || []).slice().sort((a, b) => a.sort_order - b.sort_order)
        const initialTransforms: Record<string, Transform> = {}
        ordered.forEach((asset) => {
          initialTransforms[asset.id] = { zoom: 1, offsetX: 0, offsetY: 0 }
        })
        setDraft({ ...data, instagram_post_assets: ordered })
        setPreset(data.preset || '4:5')
        setTransforms(initialTransforms)
      } catch (e) {
        setError('Não foi possível carregar o rascunho. Tente novamente.')
      } finally {
        setLoading(false)
      }
    }
    loadDraft()
  }, [draftId])

  const previewRatio = useMemo(() => {
    const size = PRESETS[preset]
    return `${size.width} / ${size.height}`
  }, [preset])

  function updateTransform(assetId: string, patch: Partial<Transform>) {
    setTransforms((prev) => ({
      ...prev,
      [assetId]: { ...(prev[assetId] || { zoom: 1, offsetX: 0, offsetY: 0 }), ...patch },
    }))
  }

  async function handleSave() {
    if (!draft || !supabase) {
      setError('Serviço temporariamente indisponível. Tente mais tarde.')
      return
    }
    setSaving(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const now = new Date().toISOString()
      const updatedAssets: Array<{
        id: string
        sort_order: number
        storage_path: string
        final_url: string
        width: number
        height: number
        status: 'processed'
      }> = []

      for (let i = 0; i < draft.instagram_post_assets.length; i++) {
        const asset = draft.instagram_post_assets[i]
        const transform = transforms[asset.id] || { zoom: 1, offsetX: 0, offsetY: 0 }
        const output = await renderEditedImage(asset.source_url, preset, transform)
        const path = `${draft.id}/${String(i + 1).padStart(2, '0')}.jpg`

        const { error: uploadError } = await supabase
          .storage
          .from('instagram_posts')
          .upload(path, output.blob, {
            upsert: true,
            contentType: 'image/jpeg',
          })

        if (uploadError) throw new Error(uploadError.message)
        const { data } = supabase.storage.from('instagram_posts').getPublicUrl(path)

        updatedAssets.push({
          id: asset.id,
          sort_order: i,
          storage_path: path,
          final_url: data.publicUrl,
          width: output.width,
          height: output.height,
          status: 'processed',
        })
      }

      await adminFetchJson(`/api/admin/instagram/drafts/${draft.id}/assets`, {
        method: 'PUT',
        body: JSON.stringify({ assets: updatedAssets }),
      })
      await adminFetchJson(`/api/admin/instagram/drafts/${draft.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          preset,
          status: 'ready',
          updated_at: now,
        }),
      })

      setSuccessMessage('Imagens processadas e salvas com sucesso.')
    } catch (e) {
      setError('Não foi possível salvar as imagens. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <PageAccessGuard pageKey="instagram">
        <div className="p-6 md:p-8">
          <h1 className="text-2xl font-bold text-slate-900">Instagram - Editor</h1>
          <p className="mt-4 text-slate-600">Carregando draft...</p>
        </div>
      </PageAccessGuard>
    )
  }

  return (
    <PageAccessGuard pageKey="instagram">
      <div className="p-6 md:p-8">
        <h1 className="text-2xl font-bold text-slate-900">Instagram - Editor</h1>
        <p className="mt-1 text-slate-600">Ajuste enquadramento e exporte para os formatos do Instagram.</p>

        {!draftId && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-700">
            draftId não informado na URL.
          </div>
        )}
        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-green-700">
            {successMessage}
          </div>
        )}

        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
          <label className="text-sm font-medium text-slate-700">Preset global</label>
          <select
            value={preset}
            onChange={(e) => setPreset(e.target.value as PresetKey)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 md:max-w-sm"
          >
            {Object.entries(PRESETS).map(([value, info]) => (
              <option key={value} value={value}>{info.label} ({info.width}x{info.height})</option>
            ))}
          </select>
        </div>

        <div className="mt-5 grid gap-4">
          {(draft?.instagram_post_assets || []).map((asset, index) => {
            const transform = transforms[asset.id] || { zoom: 1, offsetX: 0, offsetY: 0 }
            return (
              <div key={asset.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="mb-3 text-sm font-medium text-slate-700">Imagem {index + 1}</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <img
                      src={asset.source_url}
                      alt={`asset-${index + 1}`}
                      className="w-full rounded-lg border border-slate-200 object-cover"
                      style={{ aspectRatio: previewRatio }}
                    />
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm text-slate-700">Zoom ({transform.zoom.toFixed(2)}x)</label>
                      <input
                        type="range"
                        min="1"
                        max="2"
                        step="0.01"
                        value={transform.zoom}
                        onChange={(e) => updateTransform(asset.id, { zoom: Number(e.target.value) })}
                        className="mt-1 w-full"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-slate-700">Deslocamento X ({transform.offsetX}px)</label>
                      <input
                        type="range"
                        min="-400"
                        max="400"
                        step="1"
                        value={transform.offsetX}
                        onChange={(e) => updateTransform(asset.id, { offsetX: Number(e.target.value) })}
                        className="mt-1 w-full"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-slate-700">Deslocamento Y ({transform.offsetY}px)</label>
                      <input
                        type="range"
                        min="-400"
                        max="400"
                        step="1"
                        value={transform.offsetY}
                        onChange={(e) => updateTransform(asset.id, { offsetY: Number(e.target.value) })}
                        className="mt-1 w-full"
                      />
                    </div>
                    <p className="text-xs text-slate-500">
                      Preview simplificado no card. O recorte final é aplicado no momento de salvar.
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !draft}
            className="rounded-lg bg-[#c62737] px-4 py-2 text-white disabled:opacity-60"
          >
            {saving ? 'Processando e enviando...' : 'Salvar imagens'}
          </button>
          {draft && (
            <button
              type="button"
              onClick={() => router.push(`/admin/instagram/post/publish?draftId=${draft.id}`)}
              className="rounded-lg border border-slate-300 px-4 py-2"
            >
              Ir para publicação
            </button>
          )}
        </div>
      </div>
    </PageAccessGuard>
  )
}
