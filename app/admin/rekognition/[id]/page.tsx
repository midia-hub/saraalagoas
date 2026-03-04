'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  ExternalLink,
  Loader2,
  Plus,
  RefreshCw,
  ScanFace,
  LayoutGrid,
  X,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from 'lucide-react'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { adminFetchJson } from '@/lib/admin-client'
import { AdminPageHeader } from '@/app/admin/AdminPageHeader'
import { Toast } from '@/components/Toast'
import { CustomSelect, type CustomSelectOption } from '@/components/ui/CustomSelect'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { ImageCropModal } from '@/components/ui/ImageCropModal'
import { DriveThumbImage } from '@/components/ui/DriveThumbImage'
import Link from 'next/link'
import { notifyNavigation } from '@/lib/loading-overlay'

type Gallery = {
  id: string
  title: string
  date: string
  slug: string
  type: string
  hidden_from_public?: boolean
}

type PhotoMatch = {
  driveFileId: string
  similarity: number
  matchedAt: string
  thumbnailUrl: string
  viewUrl: string
  webViewLink: string | null
  fileName: string
  gallery: Gallery | null
}

type PersonData = {
  id: string
  name: string
  reference_url: string | null
  status: string
  face_id: string | null
  created_at: string
}

type ReferencePhoto = {
  id: string
  face_id: string
  storage_path: string
  photo_url: string | null
  created_at: string
}

type AlbumResponse = {
  person: PersonData
  photos: PhotoMatch[]
  total: number
}

// Agrupa fotos por álbum
function groupByGallery(photos: PhotoMatch[]): Map<string, PhotoMatch[]> {
  const map = new Map<string, PhotoMatch[]>()
  for (const photo of photos) {
    const key = photo.gallery?.id ?? '__sem_album'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(photo)
  }
  return map
}

export default function RekognitionAlbumPage() {
  const params = useParams()
  const personId = params?.id as string
  const [data, setData] = useState<AlbumResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [scanLoading, setScanLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'ok' | 'err' } | null>(null)

  // Fotos de referência
  const [refPhotos, setRefPhotos] = useState<ReferencePhoto[]>([])
  const [addPhotoLoading, setAddPhotoLoading] = useState(false)
  const [confirmRemovePhotoId, setConfirmRemovePhotoId] = useState<string | null>(null)
  const [removePhotoLoading, setRemovePhotoLoading] = useState(false)
  const addPhotoInputRef = useRef<HTMLInputElement>(null)

  // Crop modal
  const [cropSrc, setCropSrc]   = useState<string | null>(null)
  const [cropOpen, setCropOpen] = useState(false)

  // Seletor de álbum para scan
  const [galleries, setGalleries] = useState<Gallery[]>([])
  const [selectedGalleryId, setSelectedGalleryId] = useState('')

  // Lightbox
  const [lightbox, setLightbox] = useState<{ photos: PhotoMatch[]; index: number } | null>(null)

  // ─── Load ──────────────────────────────────────────────────────────────────

  const loadAlbum = useCallback(async () => {
    if (!personId) return
    try {
      setLoading(true)
      const res = await adminFetchJson<AlbumResponse>(`/api/rekognition/people/${personId}/album`)
      setData(res)
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Erro ao carregar álbum.', type: 'err' })
    } finally {
      setLoading(false)
    }
  }, [personId])

  useEffect(() => { loadAlbum() }, [loadAlbum])

  // ─── Load fotos de referência ──────────────────────────────────────────────────

  const loadRefPhotos = useCallback(async () => {
    if (!personId) return
    try {
      const res = await adminFetchJson<{ photos: ReferencePhoto[] }>(`/api/rekognition/people/${personId}/photos`)
      setRefPhotos(res.photos ?? [])
    } catch {
      // silencioso
    }
  }, [personId])

  useEffect(() => { loadRefPhotos() }, [loadRefPhotos])

  // ─── Load galleries ────────────────────────────────────────────────────────

  useEffect(() => {
    adminFetchJson<Gallery[]>('/api/gallery/list?limit=200')
      .then(setGalleries)
      .catch(() => {/* silencioso */})
  }, [])

  // ─── Scan ──────────────────────────────────────────────────────────────────

  async function handleScan() {
    try {
      setScanLoading(true)
      const res = await adminFetchJson<{ scanned: number; matched: number; total: number }>(
        `/api/rekognition/people/${personId}/scan/`,
        {
          method: 'POST',
          body: selectedGalleryId ? JSON.stringify({ gallery_id: selectedGalleryId }) : undefined,
        }
      )
      const galleryLabel = selectedGalleryId
        ? (galleries.find((g) => g.id === selectedGalleryId)?.title ?? 'álbum selecionado')
        : 'toda a galeria'
      setToast({
        message: `Scan de ${galleryLabel} concluído: ${res.matched} novas fotos encontradas de ${res.scanned} analisadas.`,
        type: 'ok',
      })
      await loadAlbum()
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Erro no scan.', type: 'err' })
    } finally {
      setScanLoading(false)
    }
  }
  // ─── Adicionar foto de referência ──────────────────────────────────────────────────

  // Passo 1: usuário seleciona o arquivo → abre o modal de recorte
  function handleAddPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    // Limpa o input para permitir reselecionar o mesmo arquivo
    if (addPhotoInputRef.current) addPhotoInputRef.current.value = ''

    const reader = new FileReader()
    reader.onload = () => {
      setCropSrc(reader.result as string)
      setCropOpen(true)
    }
    reader.readAsDataURL(file)
  }

  // Passo 2: usuário confirma o recorte → faz upload do Blob resultante
  async function handleCropApply(blob: Blob) {
    try {
      setAddPhotoLoading(true)
      const croppedFile = new File([blob], 'reference.jpg', { type: 'image/jpeg' })
      const fd = new FormData()
      fd.append('file', croppedFile)
      await adminFetchJson<{ photo: ReferencePhoto }>(
        `/api/rekognition/people/${personId}/photos`,
        { method: 'POST', body: fd }
      )
      setCropOpen(false)
      setCropSrc(null)
      setToast({ message: 'Foto de referência adicionada com sucesso!', type: 'ok' })
      await loadRefPhotos()
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Erro ao adicionar foto.', type: 'err' })
    } finally {
      setAddPhotoLoading(false)
    }
  }

  async function handleRemovePhoto() {
    if (!confirmRemovePhotoId) return
    try {
      setRemovePhotoLoading(true)
      await adminFetchJson(
        `/api/rekognition/people/${personId}/photos/${confirmRemovePhotoId}`,
        { method: 'DELETE' }
      )
      setToast({ message: 'Foto removida com sucesso.', type: 'ok' })
      await loadRefPhotos()
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Erro ao remover foto.', type: 'err' })
    } finally {
      setRemovePhotoLoading(false)
      setConfirmRemovePhotoId(null)
    }
  }
  // ─── Lightbox ─────────────────────────────────────────────────────────────

  function openLightbox(photos: PhotoMatch[], index: number) {
    setLightbox({ photos, index })
  }

  function closeLightbox() { setLightbox(null) }

  function lightboxPrev() {
    if (!lightbox) return
    setLightbox({ ...lightbox, index: (lightbox.index - 1 + lightbox.photos.length) % lightbox.photos.length })
  }

  function lightboxNext() {
    if (!lightbox) return
    setLightbox({ ...lightbox, index: (lightbox.index + 1) % lightbox.photos.length })
  }

  useEffect(() => {
    if (!lightbox) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox()
      if (e.key === 'ArrowLeft') lightboxPrev()
      if (e.key === 'ArrowRight') lightboxNext()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightbox])

  // ──────────────────────────────────────────────────────────────────────────

  const person = data?.person

  return (
    <PageAccessGuard pageKey="galeria">
      <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-8">
        <AdminPageHeader
          icon={ScanFace}
          title={loading ? 'Carregando...' : (person?.name ?? 'Álbum')}
          subtitle={
            data
              ? `${data.total} foto${data.total !== 1 ? 's' : ''} encontrada${data.total !== 1 ? 's' : ''} na galeria`
              : 'Reconhecimento Facial'
          }
          backLink={{ href: '/admin/rekognition', label: 'Voltar para pessoas' }}
          actions={
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <div className="w-56">
              <CustomSelect
                value={selectedGalleryId}
                onChange={setSelectedGalleryId}
                placeholder="Todos os álbuns"
                allowEmpty
                showIcon={false}
                options={galleries.map<CustomSelectOption>((g) => ({
                  value: g.id,
                  label: g.title,
                  description: new Date(g.date + 'T12:00:00').toLocaleDateString('pt-BR'),
                }))}
              />
            </div>
            <button
              type="button"
              onClick={handleScan}
              disabled={scanLoading || !person || person.status !== 'indexed'}
              title={selectedGalleryId ? 'Varrer o álbum selecionado' : 'Varrer toda a galeria em busca desta pessoa'}
              className="inline-flex items-center gap-2 rounded-xl border border-[#c62737]/40 px-4 py-2.5 text-sm font-semibold text-[#c62737] hover:bg-[#c62737]/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {scanLoading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <RefreshCw className="w-4 h-4" />}
              {scanLoading ? 'Escaneando...' : selectedGalleryId ? 'Escanear álbum' : 'Escanear tudo'}
            </button>
          </div>
          }
        />

        {/* Referência da pessoa */}
        {person && (
          <div className="mb-8 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-visible">
            {/* Header da seção */}
            <div className="rounded-t-2xl flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div>
                <p className="font-semibold text-slate-800 text-sm">{person.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Fotos de referência
                  <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-slate-200 text-slate-600 text-[10px] font-medium w-4 h-4">{refPhotos.length}</span>
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                  person.status === 'indexed'
                    ? 'bg-green-100 text-green-700'
                    : person.status === 'error'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {person.status === 'indexed' ? '✓ Indexada' : person.status === 'error' ? '✗ Erro' : '⏳ Pendente'}
                </span>
                {/* Botão adicionar foto */}
                <label
                  className={`inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:border-slate-300 transition-colors cursor-pointer ${
                    addPhotoLoading ? 'opacity-50 pointer-events-none' : ''
                  }`}
                  title="Adicionar nova foto de referência"
                >
                  {addPhotoLoading
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Plus className="w-3.5 h-3.5" />}
                  Adicionar foto
                  <input
                    ref={addPhotoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleAddPhoto}
                    disabled={addPhotoLoading}
                  />
                </label>
              </div>
            </div>

            {/* Grade de fotos de referência */}
            <div className="p-4 flex flex-wrap gap-3">
              {refPhotos.length === 0 ? (
                <div className="flex items-center justify-center w-full py-6 text-slate-300">
                  <ScanFace className="w-10 h-10" />
                </div>
              ) : (
                refPhotos.map((photo) => (
                  <div
                    key={photo.id}
                    className="group relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 flex-shrink-0"
                  >
                    {photo.photo_url ? (
                      <img
                        src={photo.photo_url}
                        alt="Foto de referência"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <ScanFace className="w-6 h-6" />
                      </div>
                    )}
                    {/* Botão remover (aparece no hover) */}
                    {refPhotos.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setConfirmRemovePhotoId(photo.id)}
                        className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl"
                        title="Remover esta foto de referência"
                      >
                        <Trash2 className="w-4 h-4 text-white" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Fotos */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : !data || data.total === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center rounded-2xl border border-slate-200 bg-white">
            <LayoutGrid className="w-14 h-14 text-slate-200" />
            <p className="text-slate-500 font-medium text-lg">Nenhuma foto encontrada ainda</p>
            <p className="text-sm text-slate-400 max-w-sm">
              Clique em &ldquo;Escanear galeria&rdquo; para procurar {person?.name ?? 'esta pessoa'} em todas as fotos já enviadas.
              Novas fotos são analisadas automaticamente ao serem enviadas.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {Array.from(groupByGallery(data.photos)).map(([galleryKey, photos]) => {
              const gallery = photos[0].gallery
              return (
                <div key={galleryKey} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  {/* Header do álbum */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
                    <div>
                      <h3 className="font-semibold text-slate-800">
                        {gallery ? gallery.title : 'Fotos sem álbum vinculado'}
                      </h3>
                      {gallery && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          {gallery.type === 'culto' ? 'Culto' : 'Evento'} · {new Date(gallery.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-slate-500">{photos.length} foto{photos.length !== 1 ? 's' : ''}</span>
                      {gallery && (
                        <Link
                          href={`/galeria/${gallery.type}/${gallery.slug}/${gallery.date}`}
                          target="_blank"
                          onClick={() => notifyNavigation()}
                          className="inline-flex items-center gap-1 text-xs text-[#c62737] hover:underline"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Ver álbum completo
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Grade de fotos */}
                  <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                    {photos.map((photo, idx) => (
                      <div
                        key={photo.driveFileId}
                        className="group relative aspect-square rounded-xl overflow-hidden bg-slate-100 cursor-pointer border border-slate-200 hover:border-[#c62737]/50 hover:shadow-md transition-all"
                        onClick={() => openLightbox(photos, idx)}
                      >
                        <DriveThumbImage
                          src={photo.thumbnailUrl}
                          driveFileId={photo.driveFileId}
                          alt={photo.fileName}
                          className="w-full h-full"
                          imgClassName="group-hover:scale-105 transition-transform duration-300"
                        />
                        {/* Similarity badge */}
                        <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] rounded-md px-1.5 py-0.5 font-medium">
                          {photo.similarity.toFixed(0)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Lightbox ──────────────────────────────────────────────────────── */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={closeLightbox}
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            onClick={closeLightbox}
          >
            <X className="w-5 h-5" />
          </button>

          {lightbox.photos.length > 1 && (
            <>
              <button
                className="absolute left-4 text-white/80 hover:text-white p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                onClick={(e) => { e.stopPropagation(); lightboxPrev() }}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                className="absolute right-4 text-white/80 hover:text-white p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                onClick={(e) => { e.stopPropagation(); lightboxNext() }}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          <div className="max-w-4xl max-h-[85vh] flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
            <img
              src={lightbox.photos[lightbox.index].viewUrl}
              alt=""
              className="max-h-[75vh] max-w-full rounded-2xl object-contain shadow-2xl"
              onError={(e) => {
                const img = e.target as HTMLImageElement
                img.src = lightbox.photos[lightbox.index].thumbnailUrl
              }}
            />
            <div className="flex items-center gap-4 text-white/80 text-sm">
              <span>{lightbox.photos[lightbox.index].fileName}</span>
              <span>·</span>
              <span>Similaridade: {lightbox.photos[lightbox.index].similarity.toFixed(1)}%</span>
              {lightbox.photos[lightbox.index].webViewLink && (
                <>
                  <span>·</span>
                  <a
                    href={lightbox.photos[lightbox.index].webViewLink!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 hover:text-white"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Abrir no Drive
                  </a>
                </>
              )}
              {lightbox.photos.length > 1 && (
                <>
                  <span>·</span>
                  <span>{lightbox.index + 1} / {lightbox.photos.length}</span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmRemovePhotoId}
        variant="danger"
        title="Remover foto de referência"
        message="A foto será removida do AWS Rekognition e do armazenamento. A pessoa continuará sendo buscada pelas outras fotos de referência."
        confirmLabel="Remover"
        onConfirm={handleRemovePhoto}
        onCancel={() => setConfirmRemovePhotoId(null)}
        loading={removePhotoLoading}
      />

      <ImageCropModal
        open={cropOpen}
        fileSrc={cropSrc}
        title="Ajustar foto de referência"
        onClose={() => { setCropOpen(false); setCropSrc(null) }}
        onApply={handleCropApply}
      />

      {toast && (
        <Toast
          visible={!!toast}
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </PageAccessGuard>
  )
}
