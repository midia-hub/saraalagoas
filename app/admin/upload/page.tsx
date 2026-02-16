'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { AdminPageHeader } from '@/app/admin/AdminPageHeader'
import { adminFetchJson, getAccessTokenOrThrow } from '@/lib/admin-client'
import { supabase } from '@/lib/supabase'
import { Loader2, Upload } from 'lucide-react'
import { CustomSelect } from '@/components/ui/CustomSelect'

type UploadType = 'culto' | 'evento'
type WorshipService = { id: string; name: string }

// Até este tamanho: upload direto para a API. Acima: vai para Supabase e depois a API envia ao Drive.
const SIZE_THRESHOLD_DIRECT_MB = 4
const SIZE_THRESHOLD_DIRECT = SIZE_THRESHOLD_DIRECT_MB * 1024 * 1024
// Máximo quando usar Supabase (evita 413 na API; arquivo vai direto ao bucket).
const MAX_SIZE_LARGE_MB = 50
const MAX_SIZE_LARGE = MAX_SIZE_LARGE_MB * 1024 * 1024
const MAX_MB = SIZE_THRESHOLD_DIRECT_MB // mensagens "até X MB" para o fluxo direto
const MAX_SIZE = SIZE_THRESHOLD_DIRECT
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
const BUCKET_TEMP = 'temp-gallery-uploads'

const DAY_NAMES: Record<number, string> = { 0: 'Domingo', 2: 'Terça', 6: 'Sábado' }
const SUGGESTED_WEEKDAYS = [0, 2, 6] // Domingo, Terça, Sábado

function getSuggestedDates(): Array<{ value: string; label: string }> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const collected: Array<{ date: Date; value: string; label: string }> = []
  for (let offset = 0; offset < 60 && collected.length < 12; offset++) {
    const d = new Date(today)
    d.setDate(today.getDate() - offset)
    const day = d.getDay()
    if (!SUGGESTED_WEEKDAYS.includes(day)) continue
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const dayNum = String(d.getDate()).padStart(2, '0')
    const value = `${y}-${m}-${dayNum}`
    const label = `${DAY_NAMES[day]}, ${dayNum}/${m}/${y}`
    if (!collected.some((x) => x.value === value)) {
      collected.push({ date: d, value, label })
    }
  }
  collected.sort((a, b) => b.date.getTime() - a.date.getTime())
  return collected.slice(0, 9).map(({ value, label }) => ({ value, label }))
}

type FileStatus = 'pending' | 'uploading' | 'done' | 'error'

function uploadOneFile(
  galleryId: string,
  file: File,
  onProgress: (percent: number) => void,
  accessToken: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const formData = new FormData()
    formData.append('file', file)
    const xhr = new XMLHttpRequest()
    const url = `/api/gallery/${galleryId}/upload`

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100)
        onProgress(percent)
      }
    })
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else {
        if (xhr.status === 413) {
          reject(new Error(
            `Servidor recusou o tamanho (413). Arquivos acima de ${SIZE_THRESHOLD_DIRECT_MB} MB devem ir pelo Supabase. Faça deploy da versão mais recente e crie o bucket "temp-gallery-uploads" no Supabase.`
          ))
          return
        }
        try {
          const j = JSON.parse(xhr.responseText || '{}')
          const msg = j.error || `Erro ${xhr.status}`
          console.error('[Upload]', file.name, msg, xhr.responseText)
          reject(new Error(msg))
        } catch {
          const msg = `Erro ${xhr.status}: ${xhr.responseText?.slice(0, 200) || 'sem detalhes'}`
          console.error('[Upload]', file.name, msg)
          reject(new Error(msg))
        }
      }
    })
    xhr.addEventListener('error', () => reject(new Error('Erro na rede. Tente novamente.')))
    xhr.addEventListener('abort', () => reject(new Error('Erro na rede. Tente novamente.')))
    xhr.open('POST', url)
    xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`)
    xhr.send(formData)
  })
}

/** Upload de arquivo grande: envia ao bucket Supabase e a API envia ao Drive e remove do bucket. */
async function uploadViaSupabase(
  galleryId: string,
  file: File,
  userId: string,
  onProgress: (percent: number) => void
): Promise<void> {
  if (!supabase) throw new Error('A configuração do serviço não está concluída. Tente novamente.')
  const path = `${userId}/${crypto.randomUUID()}/${file.name.replace(/[/\\]/g, '_')}`
  onProgress(10)
  const { error: uploadError } = await supabase.storage
    .from(BUCKET_TEMP)
    .upload(path, file, { contentType: file.type || 'image/jpeg', upsert: false })
  if (uploadError) throw new Error(uploadError.message || 'Falha ao enviar para o armazenamento.')
  onProgress(60)
  await adminFetchJson(`/api/gallery/${galleryId}/upload-from-storage`, {
    method: 'POST',
    body: JSON.stringify({ path }),
  })
  onProgress(100)
}

export default function AdminUploadPage() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [type, setType] = useState<UploadType>('culto')
  const [date, setDate] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [eventName, setEventName] = useState('')
  const [description, setDescription] = useState('')
  const [services, setServices] = useState<WorshipService[]>([])
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successGalleryId, setSuccessGalleryId] = useState<string | null>(null)
  const [fileStatuses, setFileStatuses] = useState<Array<{ status: FileStatus; progress: number; error?: string }>>([])
  const [overallProgress, setOverallProgress] = useState(0)

  useEffect(() => {
    adminFetchJson<WorshipService[]>('/api/services')
      .then((data) => setServices(Array.isArray(data) ? data : []))
      .catch(() => setServices([]))
  }, [])

  const previewUrls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files])

  useEffect(() => {
    return () => {
      previewUrls.forEach((u) => URL.revokeObjectURL(u))
    }
  }, [previewUrls])

  const validateStepOne = useCallback((): string | null => {
    if (!date) return 'Selecione a data.'
    if (type === 'culto' && !serviceId) return 'Selecione o culto.'
    if (type === 'evento' && !eventName.trim()) return 'Informe o nome do evento.'
    return null
  }, [date, type, serviceId, eventName])

  function handleSelectFiles(fileList: FileList | null) {
    if (!fileList) return
    const picked = Array.from(fileList)
    const next = [...files, ...picked]
    for (const file of picked) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError('Formato de arquivo inválido. Envie apenas imagens nos formatos PNG, JPEG, WebP ou GIF.')
        return
      }
      if (file.size > MAX_SIZE_LARGE) {
        setError(`Cada arquivo deve ter no máximo ${MAX_SIZE_LARGE_MB} MB. Reduza o tamanho da imagem.`)
        return
      }
    }
    setError(null)
    setFiles(next)
  }

  async function handleSubmit() {
    const err = validateStepOne()
    if (err) {
      setError(err)
      return
    }
    setError(null)
    setLoading(true)
    setFileStatuses(files.map(() => ({ status: 'pending', progress: 0 })))
    setOverallProgress(0)

    try {
      const accessToken = await getAccessTokenOrThrow()
      let userId = ''
      if (files.some((f) => f.size > SIZE_THRESHOLD_DIRECT)) {
        if (!supabase) {
          setError('Supabase não está configurado. Arquivos acima de 4 MB precisam do bucket temporário.')
          setLoading(false)
          return
        }
        const { data: { session } } = await supabase.auth.getSession()
        userId = session?.user?.id ?? ''
        if (!userId) {
          setError('Sessão necessária para enviar arquivos grandes. Faça login novamente.')
          setLoading(false)
          return
        }
      }

      const prepareJson = await adminFetchJson<{ galleryId: string; galleryRoute: string }>('/api/gallery/prepare', {
        method: 'POST',
        body: JSON.stringify({
          type,
          date,
          description: description || undefined,
          ...(type === 'culto' ? { serviceId } : { eventName: eventName.trim() }),
        }),
      })
      const { galleryId } = prepareJson
      setSuccessGalleryId(galleryId || null)

      const total = files.length
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const useSupabase = file.size > SIZE_THRESHOLD_DIRECT
        setFileStatuses((prev) => {
          const next = [...prev]
          next[i] = { ...next[i], status: 'uploading', progress: 0 }
          return next
        })
        setOverallProgress(Math.round((i / total) * 100))
        try {
          if (useSupabase) {
            await uploadViaSupabase(galleryId, file, userId, (percent) => {
              setFileStatuses((prev) => {
                const next = [...prev]
                next[i] = { ...next[i], progress: percent }
                return next
              })
              setOverallProgress(Math.round(((i + percent / 100) / total) * 100))
            })
          } else {
            await uploadOneFile(galleryId, file, (percent) => {
              setFileStatuses((prev) => {
                const next = [...prev]
                next[i] = { ...next[i], progress: percent }
                return next
              })
              setOverallProgress(Math.round(((i + percent / 100) / total) * 100))
            }, accessToken)
          }
          setFileStatuses((prev) => {
            const next = [...prev]
            next[i] = { status: 'done', progress: 100 }
            return next
          })
          setOverallProgress(Math.round(((i + 1) / total) * 100))
        } catch (e) {
          setFileStatuses((prev) => {
            const next = [...prev]
            next[i] = { status: 'error', progress: 0, error: e instanceof Error ? e.message : 'Erro' }
            return next
          })
          setOverallProgress(Math.round(((i + 1) / total) * 100))
        }
      }
      setOverallProgress(100)
      setStep(3)
    } catch (e) {
      setError('O envio falhou. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const isUploading = loading && fileStatuses.some((f) => f.status === 'uploading' || f.status === 'pending')

  return (
    <PageAccessGuard pageKey="upload">
      <div className="p-6 md:p-8 max-w-[800px] mx-auto">
        <AdminPageHeader
          icon={Upload}
          title="Upload de cultos e eventos"
          subtitle="Fluxo em 3 etapas: informações, imagens e confirmação."
        />

      <div className="mt-6 flex gap-2 text-sm">
        {[1, 2, 3].map((n) => (
          <span key={n} className={`px-3 py-1.5 rounded-full ${step === n ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
            Etapa {n}
          </span>
        ))}
      </div>

      {error && <div className="mt-4 p-4 rounded-xl border-2 border-red-600/50 bg-red-50 text-red-600">{error}</div>}

      {step === 1 && (
        <div className="mt-6 rounded-2xl shadow-lg bg-white border border-slate-200 p-8 space-y-5">
          <div className="mb-6">
            <label className="mb-1.5 block text-sm font-semibold text-slate-800">Tipo</label>
            <CustomSelect value={type} onChange={(v) => setType(v as UploadType)} options={[{ value: 'culto', label: 'Culto' }, { value: 'evento', label: 'Evento' }]} placeholder="Selecione" allowEmpty={false} />
          </div>

          {type === 'culto' ? (
            <div className="mb-6">
              <label className="mb-1.5 block text-sm font-semibold text-slate-800">Qual culto?</label>
              <CustomSelect value={serviceId} onChange={setServiceId} placeholder="Selecione..." options={services.map((s) => ({ value: s.id, label: s.name }))} />
            </div>
          ) : (
            <div className="mb-6">
              <label className="mb-1.5 block text-sm font-semibold text-slate-800">Nome do evento</label>
              <input value={eventName} onChange={(e) => setEventName(e.target.value)} className="w-full border-2 border-slate-300 rounded-xl bg-white text-slate-800 px-4 py-3 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/20" />
            </div>
          )}

          <div className="mb-6">
            <label className="mb-1.5 block text-sm font-semibold text-slate-800">Data</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full border-2 border-slate-300 rounded-xl bg-white text-slate-800 px-4 py-3 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/20" />
            <p className="mt-1.5 text-xs text-slate-500">Sugestões (últimos cultos):</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {getSuggestedDates().map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDate(value)}
                  className={`px-3 py-2 text-xs rounded-[25px] border-2 transition-all duration-300 ${
                    date === value
                      ? 'bg-red-600 text-white border-red-600'
                      : 'bg-white border-slate-300 text-slate-800 hover:border-red-600 hover:bg-red-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <label className="mb-1.5 block text-sm font-semibold text-slate-800">Descrição/observações (opcional)</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full border-2 border-slate-300 rounded-xl bg-white text-slate-800 px-4 py-3 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/20 resize-none" />
          </div>

          <button
            onClick={() => {
              const e = validateStepOne()
              if (e) return setError(e)
              setError(null)
              setStep(2)
            }}
            className="w-auto px-8 py-3 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 transition-all"
          >
            Avançar para upload
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="mt-6 rounded-2xl shadow-lg bg-white border border-slate-200 p-8">
          <label className="block text-sm font-semibold text-slate-800 mb-2">Você pode enviar várias imagens.</label>
          <p className="text-xs text-slate-500 mb-4">Até {MAX_SIZE_LARGE_MB} MB por imagem. PNG, JPEG, WebP ou GIF.</p>
          <input type="file" multiple accept={ALLOWED_TYPES.join(',')} onChange={(e) => handleSelectFiles(e.target.files)} />

          {files.length > 0 && !isUploading && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3">
              {previewUrls.map((url, i) => (
                <div key={url} className="relative rounded-lg overflow-hidden border border-slate-200">
                  <img src={url} alt={`preview-${i}`} className="w-full h-28 object-cover" />
                  <button
                    onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute top-1 right-1 text-xs px-2 py-1 bg-black/70 text-white rounded"
                  >
                    Remover
                  </button>
                </div>
              ))}
            </div>
          )}

          {isUploading && (
            <div className="mt-6 space-y-4">
              <div>
                <div className="flex justify-between text-sm text-slate-600 mb-1">
                  <span>Status do upload</span>
                  <span>{overallProgress}%</span>
                </div>
                <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-600 transition-all duration-300"
                    style={{ width: `${overallProgress}%` }}
                  />
                </div>
              </div>
              <ul className="space-y-2 max-h-60 overflow-y-auto">
                {files.map((file, i) => {
                  const st = fileStatuses[i]
                  const status = st?.status ?? 'pending'
                  const progress = st?.progress ?? 0
                  return (
                    <li key={`${i}-${file.name}`} className="flex items-center gap-3 text-sm">
                      <span className="truncate flex-1" title={file.name}>{file.name}</span>
                      <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden shrink-0">
                        {(status === 'uploading' || status === 'done') && (
                          <div
                            className="h-full bg-red-600 transition-all duration-200"
                            style={{ width: `${progress}%` }}
                          />
                        )}
                      </div>
                      <span className="w-20 shrink-0 text-right text-slate-600">
                        {status === 'pending' && 'Na fila'}
                        {status === 'uploading' && `${progress}%`}
                        {status === 'done' && 'Concluído'}
                        {status === 'error' && 'Falhou'}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => setStep(1)}
              disabled={isUploading}
              className="px-6 py-3 border-2 border-slate-300 rounded-xl font-semibold text-slate-800 hover:border-red-600 hover:bg-red-50 transition-all duration-300 disabled:opacity-50"
            >
              Voltar
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || files.length === 0}
              className="w-auto px-8 py-3 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 transition-all flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Enviando...' : 'Iniciar upload'}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="mt-6 rounded-2xl shadow-lg bg-white p-8 bg-green-50 border-2 border-green-300">
          <h2 className="text-lg font-bold text-green-800 uppercase tracking-[1px]">Upload concluído!</h2>
          <p className="text-slate-600 mt-2">A galeria foi criada e as imagens foram enviadas para o Google Drive.</p>
          {fileStatuses.some((f) => f.status === 'error') && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-amber-800 font-medium text-sm">Alguns arquivos falharam:</p>
              <ul className="mt-2 space-y-1 text-sm text-amber-900">
                {files.map((file, i) =>
                  fileStatuses[i]?.status === 'error' ? (
                    <li key={`err-${i}-${file.name}`}>
                      <strong>{file.name}</strong>: {fileStatuses[i]?.error && !fileStatuses[i].error.includes('413') && !fileStatuses[i].error.includes('Payload') ? fileStatuses[i].error : `arquivo muito grande (máx. ${MAX_SIZE_LARGE_MB} MB). Reduza o tamanho da imagem.`}
                    </li>
                  ) : null
                )}
              </ul>
              <p className="mt-2 text-xs text-amber-700">
              Erro 413 = arquivo passou pelo servidor (limite ~4,5 MB). Na versão atual, arquivos acima de {SIZE_THRESHOLD_DIRECT_MB} MB vão direto ao Supabase e depois ao Drive. Faça deploy da versão mais recente e aplique a migration do bucket &quot;temp-gallery-uploads&quot; no Supabase.
            </p>
            </div>
          )}
          <div className="mt-6 flex gap-3">
            {successGalleryId && (
              <button
                onClick={() => router.push(`/admin/galeria/${successGalleryId}`)}
                className="w-auto px-8 py-3 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 transition-all"
              >
                Ver álbum
              </button>
            )}
            <button
              onClick={() => { setStep(1); setSuccessGalleryId(null); setFiles([]); setFileStatuses([]); setOverallProgress(0); }}
              className="px-6 py-3 border-2 border-slate-300 rounded-xl font-semibold text-slate-800 hover:border-red-600 hover:bg-red-50 transition-all duration-300"
            >
              Novo upload
            </button>
          </div>
        </div>
      )}
      </div>
    </PageAccessGuard>
  )
}
