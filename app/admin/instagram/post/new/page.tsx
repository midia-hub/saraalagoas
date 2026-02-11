'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { adminFetchJson } from '@/lib/admin-client'

type GalleryFile = {
  id: string
  name: string
  viewUrl?: string
  webViewLink?: string | null
  thumbnailLink?: string | null
}

function imageUrl(fileId: string, mode: 'thumb' | 'full' = 'thumb') {
  return `/api/gallery/image?fileId=${encodeURIComponent(fileId)}&mode=${mode}`
}

export default function AdminInstagramPostNewPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const galleryId = searchParams?.get('galleryId') || ''
  const [files, setFiles] = useState<GalleryFile[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadFiles() {
      if (!galleryId) {
        setLoading(false)
        return
      }
      try {
        const response = await fetch(`/api/gallery/${galleryId}/files`)
        const data = await response.json().catch(() => [])
        setFiles(Array.isArray(data) ? data : [])
      } catch {
        setFiles([])
      } finally {
        setLoading(false)
      }
    }
    loadFiles()
  }, [galleryId])

  const selectedFiles = useMemo(() => {
    const map = new Set(selectedIds)
    return files.filter((file) => map.has(file.id))
  }, [files, selectedIds])

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id)
      if (prev.length >= 10) {
        setError('Você pode selecionar no máximo 10 fotos.')
        return prev
      }
      setError(null)
      return [...prev, id]
    })
  }

  async function handleNext() {
    if (!galleryId) {
      setError('Álbum não encontrado. Volte e tente novamente.')
      return
    }
    if (selectedFiles.length < 1) {
      setError('Selecione pelo menos 1 foto.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const payload = {
        galleryId,
        preset: '4:5' as const,
        assets: selectedFiles.map((file, index) => ({
          source_url: imageUrl(file.id, 'full'),
          sort_order: index,
        })),
      }

      const result = await adminFetchJson<{ draft: { id: string } }>('/api/admin/instagram/drafts', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      router.push(`/admin/instagram/post/editor?draftId=${result.draft.id}`)
    } catch (e) {
      setError('Não foi possível criar o rascunho. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageAccessGuard pageKey="instagram">
      <div className="p-6 md:p-8">
        <h1 className="text-2xl font-bold text-slate-900">Instagram - Nova Postagem</h1>
        <p className="mt-1 text-slate-600">Selecione de 1 a 10 imagens da galeria.</p>

        {!galleryId && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-700">
            galleryId não informado na URL.
          </div>
        )}
        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
            {error}
          </div>
        )}

        <div className="mt-5 text-sm text-slate-700">
          Selecionadas: <strong>{selectedIds.length}</strong> / 10
        </div>

        {loading ? (
          <p className="mt-4 text-slate-600">Carregando imagens...</p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {files.map((file) => {
              const selected = selectedIds.includes(file.id)
              return (
                <button
                  key={file.id}
                  type="button"
                  onClick={() => toggleSelect(file.id)}
                  className={`overflow-hidden rounded-lg border bg-white text-left ${
                    selected ? 'border-[#c62737] ring-2 ring-[#c62737]/20' : 'border-slate-200'
                  }`}
                >
                  <img
                    src={imageUrl(file.id, 'thumb')}
                    alt={file.name}
                    className="h-28 w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="p-2 text-xs text-slate-700 truncate">{file.name}</div>
                </button>
              )
            })}
          </div>
        )}

        <div className="mt-6">
          <button
            type="button"
            onClick={handleNext}
            disabled={saving || selectedIds.length === 0}
            className="rounded-lg bg-[#c62737] px-4 py-2 text-white disabled:opacity-60"
          >
            {saving ? 'Criando rascunho...' : 'Editar imagens'}
          </button>
        </div>
      </div>
    </PageAccessGuard>
  )
}
