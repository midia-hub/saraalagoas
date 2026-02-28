'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import {
  Upload,
  CheckCircle2,
  X,
  Loader2,
  ImagePlus,
  ChevronRight,
  Camera,
  PartyPopper,
} from 'lucide-react'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type UploadType = 'culto' | 'evento'
type FileStatus = 'pending' | 'uploading' | 'done' | 'error'
type WorshipService = { id: string; name: string }

// ─── Constantes ───────────────────────────────────────────────────────────────

const MAX_MB = 10
const MAX_SIZE = MAX_MB * 1024 * 1024
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

const DAY_NAMES: Record<number, string> = { 0: 'Domingo', 2: 'Terça', 6: 'Sábado' }
const SUGGESTED_WEEKDAYS = [0, 2, 6]

function getSuggestedDates(): Array<{ value: string; label: string }> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const collected: Array<{ date: Date; value: string; label: string }> = []
  for (let offset = 0; offset < 60 && collected.length < 9; offset++) {
    const d = new Date(today)
    d.setDate(today.getDate() - offset)
    const day = d.getDay()
    if (!SUGGESTED_WEEKDAYS.includes(day)) continue
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const dn = String(d.getDate()).padStart(2, '0')
    const value = `${y}-${m}-${dn}`
    const label = `${DAY_NAMES[day]}, ${dn}/${m}/${y}`
    if (!collected.some((x) => x.value === value)) {
      collected.push({ date: d, value, label })
    }
  }
  collected.sort((a, b) => b.date.getTime() - a.date.getTime())
  return collected.slice(0, 9).map(({ value, label }) => ({ value, label }))
}

// ─── Upload via XHR com progresso ─────────────────────────────────────────────

function uploadFile(
  galleryId: string,
  file: File,
  uploaderName: string,
  onProgress: (p: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const fd = new FormData()
    fd.append('file', file)
    if (uploaderName) fd.append('uploaderName', uploaderName)

    const xhr = new XMLHttpRequest()
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    })
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
      } else {
        try {
          const j = JSON.parse(xhr.responseText || '{}')
          reject(new Error(j.error || `Erro ${xhr.status}`))
        } catch {
          reject(new Error(`Erro ${xhr.status}`))
        }
      }
    })
    xhr.addEventListener('error', () => reject(new Error('Falha na rede. Tente novamente.')))
    xhr.addEventListener('abort', () => reject(new Error('Upload cancelado.')))
    xhr.open('POST', `/api/public/gallery/${galleryId}/upload`)
    xhr.send(fd)
  })
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function UploadFotosPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [uploaderName, setUploaderName] = useState('')
  const [type, setType] = useState<UploadType>('culto')
  const [date, setDate] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [eventName, setEventName] = useState('')
  const [services, setServices] = useState<WorshipService[]>([])
  const [files, setFiles] = useState<File[]>([])
  const [fileStatuses, setFileStatuses] = useState<Array<{ status: FileStatus; progress: number; error?: string }>>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successCount, setSuccessCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [galleryRoute, setGalleryRoute] = useState<string | null>(null)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  // ─── Wake Lock: impede que a tela adormeça durante o upload ─────────────────
  async function acquireWakeLock() {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await (navigator as Navigator & { wakeLock: { request(type: string): Promise<WakeLockSentinel> } }).wakeLock.request('screen')
      } catch { /* silencioso — não crítico */ }
    }
  }
  function releaseWakeLock() {
    wakeLockRef.current?.release().catch(() => {})
    wakeLockRef.current = null
  }

  // Re-adquire wake lock se a aba voltar ao foco durante o upload
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === 'visible' && loading) {
        acquireWakeLock()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [loading])

  const suggestedDates = useMemo(() => getSuggestedDates(), [])

  useEffect(() => {
    fetch('/api/public/services')
      .then((r) => r.json())
      .then((d) => setServices(Array.isArray(d) ? d : []))
      .catch(() => setServices([]))
  }, [])

  const previewUrls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files])
  useEffect(() => () => previewUrls.forEach(URL.revokeObjectURL), [previewUrls])

  // ─── Validação ───────────────────────────────────────────────────────────────

  const validateStep1 = useCallback((): string | null => {
    if (!date) return 'Selecione a data.'
    if (type === 'culto' && !serviceId) return 'Selecione o culto.'
    if (type === 'evento' && !eventName.trim()) return 'Informe o nome do evento.'
    return null
  }, [date, type, serviceId, eventName])

  // ─── Seleção de arquivos ─────────────────────────────────────────────────────

  function handleSelectFiles(fileList: FileList | null) {
    if (!fileList) return
    const picked = Array.from(fileList)
    for (const f of picked) {
      if (!ALLOWED_TYPES.includes(f.type)) {
        setError('Formato inválido. Envie apenas PNG, JPEG, WebP ou GIF.')
        return
      }
      if (f.size > MAX_SIZE) {
        setError(`Arquivo muito grande. Máximo ${MAX_MB} MB por imagem.`)
        return
      }
    }
    setError(null)
    setFiles((prev) => [...prev, ...picked])
  }

  // ─── Envio ───────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    const err = validateStep1()
    if (err) { setError(err); return }
    if (files.length === 0) { setError('Selecione ao menos uma imagem.'); return }

    setError(null)
    setLoading(true)
    setFileStatuses(files.map(() => ({ status: 'pending', progress: 0 })))
    acquireWakeLock()

    try {
      // 1. Prepara / cria o álbum
      const res = await fetch('/api/public/gallery/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          date,
          uploaderName: uploaderName.trim() || undefined,
          ...(type === 'culto' ? { serviceId } : { eventName: eventName.trim() }),
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.galleryId) {
        setError(json.error || 'Não foi possível criar o álbum. Tente novamente.')
        setLoading(false)
        return
      }

      const { galleryId, galleryRoute: route } = json as { galleryId: string; galleryRoute: string }
      setGalleryRoute(route || null)
      const total = files.length
      setTotalCount(total)
      let ok = 0

      // 2. Envia arquivos um a um
      for (let i = 0; i < files.length; i++) {
        setFileStatuses((prev) => {
          const next = [...prev]; next[i] = { ...next[i], status: 'uploading', progress: 0 }; return next
        })
        try {
          await uploadFile(galleryId, files[i], uploaderName.trim(), (p) => {
            setFileStatuses((prev) => {
              const next = [...prev]; next[i] = { ...next[i], progress: p }; return next
            })
          })
          setFileStatuses((prev) => {
            const next = [...prev]; next[i] = { status: 'done', progress: 100 }; return next
          })
          ok++
        } catch (e) {
          setFileStatuses((prev) => {
            const next = [...prev]
            next[i] = { status: 'error', progress: 0, error: e instanceof Error ? e.message : 'Erro' }
            return next
          })
        }
      }

      setSuccessCount(ok)
      setStep(3)
    } catch {
      setError('Falha na conexão. Verifique sua internet e tente novamente.')
    } finally {
      setLoading(false)
      releaseWakeLock()
    }
  }

  const isUploading = loading

  const STEPS = [
    { n: 1, label: 'Informações' },
    { n: 2, label: 'Fotos' },
    { n: 3, label: 'Concluído' },
  ]

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-[680px] mx-auto px-4 py-8 md:py-12">

        {/* Logo / marca */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="w-14 h-14 rounded-2xl bg-[#c62737] flex items-center justify-center shadow-lg shadow-[#c62737]/30">
            <Camera className="text-white" size={28} />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Enviar Fotos</h1>
            <p className="text-sm text-slate-500 mt-0.5">Sara Sede Alagoas · Cultos e eventos</p>
          </div>
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
                      ? 'bg-[#c62737] text-white ring-4 ring-[#c62737]/20'
                      : 'bg-slate-100 text-slate-400'
                }`}>
                  {step > s.n ? <CheckCircle2 size={18} /> : s.n}
                </div>
                <span className={`text-xs font-medium hidden sm:block ${
                  step === s.n ? 'text-[#c62737]' : step > s.n ? 'text-green-600' : 'text-slate-400'
                }`}>{s.label}</span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 mb-5 transition-all duration-300 ${step > s.n ? 'bg-green-400' : 'bg-slate-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Erro global */}
        {error && (
          <div className="mb-5 flex items-start gap-3 p-4 rounded-xl border-2 border-red-300 bg-red-50 text-red-700">
            <X size={18} className="shrink-0 mt-0.5" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* ── Etapa 1: Informações ── */}
        {step === 1 && (
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 rounded-t-2xl bg-slate-50">
              <h2 className="text-base font-semibold text-slate-800">Informações do álbum</h2>
              <p className="text-xs text-slate-500 mt-0.5">Preencha para identificar este álbum na galeria.</p>
            </div>
            <div className="p-6 space-y-5">

              {/* Quem está enviando */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Seu nome <span className="font-normal text-slate-400">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={uploaderName}
                  onChange={(e) => setUploaderName(e.target.value)}
                  placeholder="Ex.: João Silva"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20 hover:border-slate-300 transition"
                />
              </div>

              {/* Tipo */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Tipo</label>
                <div className="flex gap-3">
                  {([['culto', '🙏 Culto'], ['evento', '🎉 Evento']] as const).map(([v, l]) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => { setType(v); setServiceId(''); setEventName('') }}
                      className={`flex-1 rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition-all ${
                        type === v
                          ? 'bg-[#c62737] border-[#c62737] text-white'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-[#c62737]/40 hover:text-[#c62737]'
                      }`}
                    >{l}</button>
                  ))}
                </div>
              </div>

              {/* Data */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Data</label>
                <div className="flex flex-wrap gap-2">
                  {suggestedDates.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setDate(value)}
                      className={`rounded-xl border-2 px-3 py-2 text-xs font-semibold transition-all ${
                        date === value
                          ? 'bg-[#c62737] text-white border-[#c62737]'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-[#c62737]/40 hover:text-[#c62737] hover:bg-red-50'
                      }`}
                    >{label}</button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-slate-400">Não encontrou a data? Digite abaixo:</p>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20 hover:border-slate-300 transition"
                />
              </div>

              {/* Culto ou nome do evento */}
              {type === 'culto' ? (
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Culto</label>
                  {services.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {services.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setServiceId(s.id)}
                          className={`w-full rounded-xl border-2 px-4 py-2.5 text-sm font-medium text-left transition-all ${
                            serviceId === s.id
                              ? 'bg-[#c62737] border-[#c62737] text-white'
                              : 'bg-white border-slate-200 text-slate-700 hover:border-[#c62737]/40 hover:text-[#c62737]'
                          }`}
                        >{s.name}</button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 italic">Carregando cultos...</p>
                  )}
                </div>
              ) : (
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Nome do evento</label>
                  <input
                    type="text"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    placeholder="Ex.: Conferência Anual 2026"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20 hover:border-slate-300 transition"
                  />
                </div>
              )}
            </div>

            <div className="px-6 pb-6 flex justify-end">
              <button
                onClick={() => {
                  const err = validateStep1()
                  if (err) { setError(err); return }
                  setError(null)
                  setStep(2)
                }}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm bg-[#c62737] text-white hover:bg-[#a81e2d] transition-all shadow-sm"
              >
                Próximo
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ── Etapa 2: Fotos ── */}
        {step === 2 && (
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 rounded-t-2xl bg-slate-50">
              <h2 className="text-base font-semibold text-slate-800">
                {isUploading ? 'Enviando fotos...' : 'Selecionar fotos'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isUploading
                  ? `${fileStatuses.filter(s => s.status === 'done').length} de ${files.length} concluída(s)`
                  : `PNG, JPEG, WebP ou GIF · máx. ${MAX_MB} MB por foto.`}
              </p>
            </div>
            <div className="p-6 space-y-5">

              {/* ── Barra de progresso geral (só durante upload) ── */}
              {isUploading && (() => {
                const done = fileStatuses.filter(s => s.status === 'done').length
                const errCount = fileStatuses.filter(s => s.status === 'error').length
                const currentProgress = fileStatuses.find(s => s.status === 'uploading')?.progress ?? 0
                const overallPct = files.length === 0 ? 0
                  : Math.round(((done + errCount + currentProgress / 100) / files.length) * 100)

                return (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Loader2 size={16} className="text-[#c62737] animate-spin shrink-0" />
                        <span className="text-sm font-bold text-slate-800">Progresso geral</span>
                      </div>
                      <span className="text-sm font-extrabold text-[#c62737]">{overallPct}%</span>
                    </div>
                    {/* Barra geral */}
                    <div className="w-full h-3 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#c62737] transition-all duration-300"
                        style={{ width: `${overallPct}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500">
                      {done + errCount} de {files.length} foto(s) processada(s)
                      {errCount > 0 && <span className="text-red-500 ml-1">· {errCount} erro(s)</span>}
                    </p>
                  </div>
                )
              })()}

              {/* ── Área de seleção (antes do upload) ── */}
              {!isUploading && (
                <label className="group flex flex-col items-center justify-center gap-3 w-full min-h-[140px] rounded-xl border-2 border-dashed border-slate-300 hover:border-[#c62737]/60 hover:bg-red-50/40 transition-all cursor-pointer bg-slate-50/60">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 group-hover:bg-red-100 flex items-center justify-center transition-colors">
                    <ImagePlus className="text-slate-400 group-hover:text-[#c62737] transition-colors" size={22} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-slate-600 group-hover:text-[#c62737] transition-colors">
                      Clique para selecionar fotos
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">Você pode selecionar várias de uma vez</p>
                  </div>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    multiple
                    className="hidden"
                    onChange={(e) => handleSelectFiles(e.target.files)}
                  />
                </label>
              )}

              {/* ── Lista de fotos ── */}
              {files.length > 0 && (
                <div className="space-y-2">
                  {!isUploading && (
                    <p className="text-xs text-slate-500 font-medium">{files.length} foto(s) selecionada(s)</p>
                  )}

                  {/* Durante upload: lista detalhada com barra individual */}
                  {isUploading ? (
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {files.map((file, i) => {
                        const st = fileStatuses[i]
                        const isDone = st?.status === 'done'
                        const isErr = st?.status === 'error'
                        const isActive = st?.status === 'uploading'
                        const isPending = !st || st.status === 'pending'

                        return (
                          <div
                            key={`file-${i}`}
                            className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all ${
                              isDone ? 'border-green-200 bg-green-50'
                              : isErr ? 'border-red-200 bg-red-50'
                              : isActive ? 'border-[#c62737]/30 bg-red-50/40'
                              : 'border-slate-200 bg-white opacity-50'
                            }`}
                          >
                            {/* Thumb */}
                            <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-slate-200">
                              <img src={previewUrls[i]} alt="" className="w-full h-full object-cover" />
                            </div>

                            {/* Nome + barra */}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-slate-700 truncate">{file.name}</p>
                              <div className="mt-1 w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-150 ${
                                    isDone ? 'bg-green-500' : isErr ? 'bg-red-400' : 'bg-[#c62737]'
                                  }`}
                                  style={{ width: `${isDone ? 100 : isErr ? 100 : st?.progress ?? 0}%` }}
                                />
                              </div>
                              {isErr && (
                                <p className="text-xs text-red-500 mt-0.5 truncate">{st?.error || 'Erro no envio'}</p>
                              )}
                            </div>

                            {/* Ícone de status */}
                            <div className="shrink-0">
                              {isDone && <CheckCircle2 size={18} className="text-green-500" />}
                              {isErr && <X size={18} className="text-red-500" />}
                              {isActive && <Loader2 size={16} className="text-[#c62737] animate-spin" />}
                              {isPending && (
                                <span className="w-4 h-4 rounded-full border-2 border-slate-300 inline-block" />
                              )}
                            </div>

                            {/* Percentual */}
                            {isActive && (
                              <span className="text-xs font-bold text-[#c62737] shrink-0 w-8 text-right">
                                {st?.progress ?? 0}%
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    /* Antes do upload: grid de preview com botão de remover */
                    <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                      {previewUrls.map((url, i) => (
                        <div key={url} className="relative group rounded-xl overflow-hidden border-2 border-slate-200 aspect-square bg-slate-100">
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
                  )}
                </div>
              )}
            </div>

            <div className="px-6 pb-6 flex justify-between">
              <button
                disabled={isUploading}
                onClick={() => { setStep(1); setFiles([]); setFileStatuses([]); setError(null) }}
                className="px-5 py-2.5 border-2 border-slate-200 rounded-xl font-semibold text-sm text-slate-700 hover:border-[#c62737] hover:text-[#c62737] hover:bg-red-50 transition-all disabled:opacity-40"
              >
                ← Voltar
              </button>
              <button
                onClick={handleSubmit}
                disabled={isUploading || files.length === 0}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm bg-[#c62737] text-white hover:bg-[#a81e2d] transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
                {isUploading ? 'Enviando...' : `Enviar ${files.length} foto(s)`}
              </button>
            </div>
          </div>
        )}

        {/* ── Etapa 3: Concluído ── */}
        {step === 3 && (
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm text-center px-8 py-12">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <PartyPopper className="text-green-600" size={30} />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 mb-2">Fotos enviadas!</h2>
            <p className="text-slate-500 text-sm max-w-xs mx-auto">
              {successCount} de {totalCount} foto(s) {successCount === 1 ? 'foi enviada' : 'foram enviadas'} com sucesso.
              A equipe de mídia vai revisar e publicar em breve. 🙏
            </p>

            {totalCount > successCount && (
              <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm">
                {totalCount - successCount} foto(s) falharam. Você pode tentar enviá-las novamente.
              </div>
            )}

            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => {
                  setStep(1)
                  setFiles([])
                  setFileStatuses([])
                  setSuccessCount(0)
                  setTotalCount(0)
                  setGalleryRoute(null)
                  setError(null)
                }}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm bg-[#c62737] text-white hover:bg-[#a81e2d] transition-all shadow-sm"
              >
                <Upload size={16} />
                Enviar mais fotos
              </button>
              {galleryRoute && (
                <a
                  href={galleryRoute}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm border-2 border-slate-200 bg-white text-slate-700 hover:border-[#c62737] hover:text-[#c62737] hover:bg-red-50 transition-all"
                >
                  <ImagePlus size={16} />
                  Ver álbum
                </a>
              )}
            </div>
          </div>
        )}

        {/* Rodapé */}
        <p className="text-center text-xs text-slate-400 mt-8">
          Sara Sede Alagoas · As fotos ficam em revisão até serem aprovadas pela equipe de mídia.
        </p>

      </div>
    </div>
  )
}
