'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { adminFetchJson, getAccessTokenOrThrow } from '@/lib/admin-client'
import { supabase } from '@/lib/supabase'
import { Loader2, Upload, LayoutGrid, CheckCircle2, ChevronRight, ImagePlus, X } from 'lucide-react'
import { CustomSelect } from '@/components/ui/CustomSelect'

type UploadType = 'culto' | 'evento'
type WorshipService = { id: string; name: string }

// Até este tamanho: upload direto para a API. Acima: vai para Supabase e depois a API envia ao Drive.
const SIZE_THRESHOLD_DIRECT_MB = 4
const SIZE_THRESHOLD_DIRECT = SIZE_THRESHOLD_DIRECT_MB * 1024 * 1024
// Máximo quando usar Supabase (evita 413 na API; arquivo vai direto ao bucket).
const MAX_SIZE_LARGE_MB = 50
const MAX_SIZE_LARGE = MAX_SIZE_LARGE_MB * 1024 * 1024
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

  const STEPS = [
    { n: 1, label: 'Informações' },
    { n: 2, label: 'Imagens' },
    { n: 3, label: 'Conclusão' },
  ]

  return (
    <PageAccessGuard pageKey="upload">
      <div className="p-6 md:p-8 max-w-[760px] mx-auto">

        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-600/10 flex items-center justify-center shrink-0">
              <Upload className="text-red-600" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Upload de fotos</h1>
              <p className="text-sm text-slate-500">Cultos e eventos para a galeria</p>
            </div>
          </div>
          <Link
            href="/admin/galeria"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:border-red-600 hover:text-red-600 hover:bg-red-50 transition-all duration-200 shrink-0"
          >
            <LayoutGrid size={16} />
            Ver galeria
          </Link>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-0 mb-8">
          {STEPS.map((s, idx) => (
            <div key={s.n} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                  step > s.n
                    ? 'bg-green-500 text-white'
                    : step === s.n
                      ? 'bg-red-600 text-white ring-4 ring-red-600/20'
                      : 'bg-slate-100 text-slate-400'
                }`}>
                  {step > s.n ? <CheckCircle2 size={18} /> : s.n}
                </div>
                <span className={`text-xs font-medium hidden sm:block ${step === s.n ? 'text-red-600' : step > s.n ? 'text-green-600' : 'text-slate-400'}`}>
                  {s.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 mb-5 transition-all duration-300 ${step > s.n ? 'bg-green-400' : 'bg-slate-200'}`} />
              )}
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-5 flex items-start gap-3 p-4 rounded-xl border-2 border-red-300 bg-red-50 text-red-700">
            <X size={18} className="shrink-0 mt-0.5" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Etapa 1: Informações */}
        {step === 1 && (
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-visible">
            <div className="px-6 py-4 border-b border-slate-100 rounded-t-2xl bg-slate-50">
              <h2 className="text-base font-semibold text-slate-800">Informações do álbum</h2>
              <p className="text-xs text-slate-500 mt-0.5">Preencha os dados para identificar este álbum na galeria.</p>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Tipo de conteúdo</label>
                <CustomSelect
                  value={type}
                  onChange={(v) => setType(v as UploadType)}
                  options={[{ value: 'culto', label: '🙏 Culto' }, { value: 'evento', label: '🎉 Evento' }]}
                  placeholder="Selecione"
                  allowEmpty={false}
                />
              </div>

              {type === 'culto' ? (
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Qual culto?</label>
                  <CustomSelect
                    value={serviceId}
                    onChange={setServiceId}
                    placeholder="Selecione o culto..."
                    options={services.map((s) => ({ value: s.id, label: s.name }))}
                  />
                </div>
              ) : (
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Nome do evento</label>
                  <input
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    placeholder="Ex: Encontro de Jovens 2026"
                    className="w-full border-2 border-slate-200 rounded-xl bg-white text-slate-800 px-4 py-3 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/20 transition-colors placeholder:text-slate-400"
                  />
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Data</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full border-2 border-slate-200 rounded-xl bg-white text-slate-800 px-4 py-3 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/20 transition-colors"
                />
                <div className="mt-2.5">
                  <p className="text-xs text-slate-400 mb-1.5">Sugestões rápidas:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {getSuggestedDates().map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setDate(value)}
                        className={`px-3 py-1.5 text-xs rounded-lg border-2 font-medium transition-all duration-200 ${
                          date === value
                            ? 'bg-red-600 text-white border-red-600'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-red-400 hover:text-red-600 hover:bg-red-50'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Observações <span className="font-normal text-slate-400">(opcional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Alguma informação adicional sobre este álbum..."
                  className="w-full border-2 border-slate-200 rounded-xl bg-white text-slate-800 px-4 py-3 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/20 transition-colors resize-none placeholder:text-slate-400"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => {
                    const e = validateStepOne()
                    if (e) return setError(e)
                    setError(null)
                    setStep(2)
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 transition-all shadow-sm"
                >
                  Próximo
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Etapa 2: Imagens */}
        {step === 2 && (
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 rounded-t-2xl bg-slate-50">
              <h2 className="text-base font-semibold text-slate-800">Selecione as imagens</h2>
              <p className="text-xs text-slate-500 mt-0.5">PNG, JPEG, WebP ou GIF · até {MAX_SIZE_LARGE_MB} MB por imagem.</p>
            </div>
            <div className="p-6">
              {/* Área de seleção */}
              {!isUploading && (
                <label className="group flex flex-col items-center justify-center gap-3 w-full min-h-[140px] rounded-xl border-2 border-dashed border-slate-300 hover:border-red-400 hover:bg-red-50/40 transition-all cursor-pointer bg-slate-50/60">
                  <div className="w-12 h-12 rounded-full bg-red-600/10 flex items-center justify-center group-hover:bg-red-600/20 transition-colors">
                    <ImagePlus className="text-red-600" size={24} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-slate-700 group-hover:text-red-600 transition-colors">
                      Clique para selecionar imagens
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">Você pode selecionar múltiplos arquivos de uma vez</p>
                  </div>
                  <input
                    type="file"
                    multiple
                    accept={ALLOWED_TYPES.join(',')}
                    onChange={(e) => handleSelectFiles(e.target.files)}
                    className="sr-only"
                  />
                </label>
              )}

              {/* Previews */}
              {files.length > 0 && !isUploading && (
                <div className="mt-4">
                  <p className="text-xs text-slate-500 mb-2 font-medium">{files.length} imagem(ns) selecionada(s)</p>
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                    {previewUrls.map((url, i) => (
                      <div key={url} className="relative group rounded-xl overflow-hidden border-2 border-slate-200 aspect-square">
                        <img src={url} alt={`preview-${i}`} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
                        <button
                          onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                          className="absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center rounded-full bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Progresso */}
              {isUploading && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex justify-between text-sm font-medium text-slate-700 mb-2">
                      <span>Enviando imagens…</span>
                      <span className="text-red-600 font-bold">{overallProgress}%</span>
                    </div>
                    <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-600 rounded-full transition-all duration-300"
                        style={{ width: `${overallProgress}%` }}
                      />
                    </div>
                  </div>
                  <ul className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                    {files.map((file, i) => {
                      const st = fileStatuses[i]
                      const status = st?.status ?? 'pending'
                      const progress = st?.progress ?? 0
                      return (
                        <li key={`${i}-${file.name}`} className="flex items-center gap-3 text-xs px-3 py-2 rounded-lg bg-slate-50 border border-slate-100">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${status === 'done' ? 'bg-green-500' : status === 'error' ? 'bg-red-500' : status === 'uploading' ? 'bg-amber-400 animate-pulse' : 'bg-slate-300'}`} />
                          <span className="truncate flex-1 text-slate-700" title={file.name}>{file.name}</span>
                          <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden shrink-0">
                            {(status === 'uploading' || status === 'done') && (
                              <div className="h-full bg-red-600 rounded-full transition-all duration-200" style={{ width: `${progress}%` }} />
                            )}
                          </div>
                          <span className={`w-16 shrink-0 text-right font-medium ${status === 'done' ? 'text-green-600' : status === 'error' ? 'text-red-600' : 'text-slate-500'}`}>
                            {status === 'pending' && 'Na fila'}
                            {status === 'uploading' && `${progress}%`}
                            {status === 'done' && 'Enviado'}
                            {status === 'error' && 'Falhou'}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}

              <div className="mt-6 flex items-center justify-between gap-3">
                <button
                  onClick={() => setStep(1)}
                  disabled={isUploading}
                  className="px-5 py-2.5 border-2 border-slate-200 rounded-xl font-semibold text-sm text-slate-700 hover:border-red-600 hover:text-red-600 hover:bg-red-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ← Voltar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading || files.length === 0}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm bg-red-600 text-white hover:bg-red-700 transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? 'Enviando…' : `Enviar ${files.length > 0 ? `${files.length} imagem(ns)` : 'imagens'}`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Etapa 3: Sucesso */}
        {step === 3 && (
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-8 text-center border-b border-slate-100 bg-gradient-to-b from-green-50 to-white">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="text-green-600" size={36} />
              </div>
              <h2 className="text-xl font-bold text-slate-800">Upload concluído!</h2>
              <p className="text-sm text-slate-500 mt-1">As imagens foram enviadas para o Google Drive com sucesso.</p>
            </div>

            {fileStatuses.some((f) => f.status === 'error') && (
              <div className="mx-6 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-amber-800 font-semibold text-sm mb-2">⚠️ Alguns arquivos falharam:</p>
                <ul className="space-y-1 text-sm text-amber-900">
                  {files.map((file, i) =>
                    fileStatuses[i]?.status === 'error' ? (
                      <li key={`err-${i}-${file.name}`}>
                        <strong>{file.name}</strong>: {fileStatuses[i]?.error && !fileStatuses[i].error.includes('413') && !fileStatuses[i].error.includes('Payload') ? fileStatuses[i].error : `arquivo muito grande (máx. ${MAX_SIZE_LARGE_MB} MB).`}
                      </li>
                    ) : null
                  )}
                </ul>
              </div>
            )}

            <div className="p-6 flex flex-wrap gap-3">
              {successGalleryId && (
                <button
                  onClick={() => router.push(`/admin/galeria/${successGalleryId}`)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-red-600 text-white hover:bg-red-700 transition-all shadow-sm"
                >
                  <LayoutGrid size={16} />
                  Ver álbum criado
                </button>
              )}
              <Link
                href="/admin/galeria"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm border-2 border-red-600 text-red-600 hover:bg-red-50 transition-all"
              >
                Ver galeria completa
              </Link>
              <button
                onClick={() => { setStep(1); setSuccessGalleryId(null); setFiles([]); setFileStatuses([]); setOverallProgress(0); }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm border-2 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all"
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
