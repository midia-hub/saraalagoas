'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, ScanFace, Trash2, UserPlus, RefreshCw, ExternalLink, Copy, Check, CheckCircle2, AlertCircle, Clock, AlertTriangle } from 'lucide-react'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { adminFetchJson, getAccessTokenOrThrow } from '@/lib/admin-client'
import { AdminPageHeader } from '@/app/admin/AdminPageHeader'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { Toast } from '@/components/Toast'
import Link from 'next/link'

type PersonStatus = 'pending' | 'indexed' | 'error'

type Person = {
  id: string
  name: string
  reference_url: string | null
  status: PersonStatus
  status_message: string | null
  face_id: string | null
  collection_id: string
  created_at: string
}

type ScanState = { personId: string; running: boolean; result: { scanned: number; matched: number } | null }

type UsageData = {
  apiCalls: {
    used: number; limit: number; remaining: number; percentUsed: number
    nearLimit: boolean; overLimit: boolean
    breakdown: { IndexFaces: number; SearchFacesByImage: number }
  }
  storedFaces: { used: number; limit: number }
  limits: { maxPhotosPerPerson: number; maxScanPhotosPerCall: number }
  yearMonth: string
}

function StatusBadge({ status }: { status: PersonStatus }) {
  if (status === 'indexed') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
        <CheckCircle2 className="w-3 h-3" />
        Indexado
      </span>
    )
  }
  if (status === 'error') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
        <AlertCircle className="w-3 h-3" />
        Erro
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
      <Clock className="w-3 h-3" />
      Pendente
    </span>
  )
}

export default function RekognitionPage() {
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ message: string; type: 'ok' | 'err' } | null>(null)

  // Formulário de nova pessoa
  const [showForm, setShowForm] = useState(false)
  const [formName, setFormName] = useState('')
  const [formFile, setFormFile] = useState<File | null>(null)
  const [formPreview, setFormPreview] = useState<string | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Exclusão
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Copiar link
  const [copiedId, setCopiedId] = useState<string | null>(null)

  function handleCopyLink(personId: string) {
    const url = `${window.location.origin}/fotos/${personId}`
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(personId)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  // Scan
  const [scanState, setScanState] = useState<ScanState | null>(null)

  // Free tier usage
  const [usage, setUsage] = useState<UsageData | null>(null)

  // ─── Load ──────────────────────────────────────────────────────────────────

  const loadPeople = useCallback(async () => {
    try {
      setLoading(true)
      const data = await adminFetchJson<{ people: Person[] }>('/api/rekognition/people')
      setPeople(data.people ?? [])
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Erro ao carregar.', type: 'err' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadPeople() }, [loadPeople])

  useEffect(() => {
    adminFetchJson<UsageData>('/api/rekognition/usage').then(setUsage).catch(() => {})
  }, [])

  // ─── Cadastrar pessoa ──────────────────────────────────────────────────────

  async function compressImage(file: File): Promise<File> {
    const MAX_BYTES = 3.5 * 1024 * 1024 // 3.5 MB — bem abaixo do limite do Vercel (4.5 MB)
    const MAX_DIM = 1600

    if (file.size <= MAX_BYTES) return file

    return new Promise((resolve, reject) => {
      const img = new Image()
      const objectUrl = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(objectUrl)
        let { width, height } = img
        if (width > MAX_DIM || height > MAX_DIM) {
          const ratio = Math.min(MAX_DIM / width, MAX_DIM / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) { reject(new Error('Canvas não suportado')); return }
        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob(
          (blob) => {
            if (!blob) { reject(new Error('Falha ao comprimir imagem')); return }
            resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }))
          },
          'image/jpeg',
          0.82
        )
      }
      img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Falha ao carregar imagem')) }
      img.src = objectUrl
    })
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    if (!file) { setFormFile(null); setFormPreview(null); return }

    const compressed = await compressImage(file).catch(() => file)
    setFormFile(compressed)
    const url = URL.createObjectURL(compressed)
    setFormPreview(url)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formName.trim()) { setToast({ message: 'O nome é obrigatório.', type: 'err' }); return }
    if (!formFile) { setToast({ message: 'Selecione uma imagem de referência.', type: 'err' }); return }

    try {
      setFormLoading(true)
      const token = await getAccessTokenOrThrow()
      const fd = new FormData()
      fd.append('name', formName.trim())
      fd.append('file', formFile)
      const res = await fetch('/api/rekognition/people', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erro ao cadastrar.')

      setToast({ message: `Pessoa "${formName}" cadastrada e indexada com sucesso!`, type: 'ok' })
      setFormName('')
      setFormFile(null)
      setFormPreview(null)
      setShowForm(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
      await loadPeople()
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Erro ao cadastrar.', type: 'err' })
    } finally {
      setFormLoading(false)
    }
  }

  // ─── Excluir pessoa ────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!deletingId) return
    try {
      setDeleteLoading(true)
      await adminFetchJson(`/api/rekognition/people/${deletingId}`, { method: 'DELETE' })
      setToast({ message: 'Pessoa removida com sucesso.', type: 'ok' })
      await loadPeople()
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Erro ao excluir.', type: 'err' })
    } finally {
      setDeleteLoading(false)
      setDeletingId(null)
    }
  }

  // ─── Escanear galeria ──────────────────────────────────────────────────────

  async function handleScan(person: Person) {
    if (person.status !== 'indexed') {
      setToast({ message: 'Esta pessoa não está indexada ainda.', type: 'err' })
      return
    }
    try {
      setScanState({ personId: person.id, running: true, result: null })
      const res = await adminFetchJson<{ scanned: number; matched: number; errors: number; skipped: number; total: number }>(
        `/api/rekognition/people/${person.id}/scan`,
        { method: 'POST' }
      )
      setScanState({ personId: person.id, running: false, result: { scanned: res.scanned, matched: res.matched } })
      setToast({
        message: `Scan concluído: ${res.matched} foto(s) encontrada(s) de ${res.scanned} analisada(s).`,
        type: 'ok',
      })
      // Atualiza contagem de uso
      adminFetchJson<UsageData>('/api/rekognition/usage').then(setUsage).catch(() => {})
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Erro no scan.', type: 'err' })
      setScanState(null)
    }
  }

  // ──────────────────────────────────────────────────────────────────────────

  return (
    <PageAccessGuard pageKey="galeria">
      <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-8">
        <AdminPageHeader
          icon={ScanFace}
          title="Reconhecimento Facial"
          subtitle="Cadastre pessoas de referência e localize automaticamente todas as fotos em que aparecem na galeria."
          actions={
            <button
              type="button"
              onClick={() => setShowForm((v) => !v)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#c62737] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#9e1f2e] transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Nova pessoa
            </button>
          }
        />

        {/* ── Banner de uso do free tier ───────────────────────────────────────────── */}
        {usage && (
          <div className={`mb-6 rounded-2xl border px-5 py-4 ${
            usage.apiCalls.overLimit
              ? 'border-red-200 bg-red-50'
              : usage.apiCalls.nearLimit
              ? 'border-amber-200 bg-amber-50'
              : 'border-slate-200 bg-white'
          }`}>
            <div className="flex items-start gap-3">
              {usage.apiCalls.overLimit || usage.apiCalls.nearLimit ? (
                <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                  usage.apiCalls.overLimit ? 'text-red-500' : 'text-amber-500'
                }`} />
              ) : null}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800">
                  Uso do AWS Rekognition — Free Tier ({usage.yearMonth})
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Chamadas de API: <span className="font-medium text-slate-700">{usage.apiCalls.used}</span> de {usage.apiCalls.limit} usadas
                  &nbsp;·&nbsp;IndexFaces: {usage.apiCalls.breakdown.IndexFaces}
                  &nbsp;·&nbsp;SearchFacesByImage: {usage.apiCalls.breakdown.SearchFacesByImage}
                  &nbsp;·&nbsp;Faces armazenadas: {usage.storedFaces.used}/{usage.storedFaces.limit}
                </p>
                {/* Barra de progresso */}
                <div className="mt-2 h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div
                    style={{ width: `${Math.min(usage.apiCalls.percentUsed, 100)}%` }}
                    className={`h-full rounded-full transition-all ${
                      usage.apiCalls.overLimit ? 'bg-red-500' : usage.apiCalls.nearLimit ? 'bg-amber-400' : 'bg-green-500'
                    }`}
                  />
                </div>
              </div>
              <span className={`text-sm font-bold flex-shrink-0 ${
                usage.apiCalls.overLimit ? 'text-red-600' : usage.apiCalls.nearLimit ? 'text-amber-600' : 'text-slate-500'
              }`}>
                {usage.apiCalls.percentUsed}%
              </span>
            </div>
          </div>
        )}

        {/* ── Formulário de cadastro ─────────────────────────────────────── */}
        {showForm && (
          <div className="mb-8 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-visible">
            <div className="rounded-t-2xl bg-slate-50 border-b border-slate-200 px-6 py-4">
              <h2 className="text-base font-semibold text-slate-800">Cadastrar nova pessoa</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Envie uma foto nítida com o rosto bem visível. Ela será usada como referência para encontrar todas as fotos na galeria.
              </p>
            </div>
            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Nome da pessoa <span className="text-[#c62737]">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex.: João Silva"
                  required
                  disabled={formLoading}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20 hover:border-slate-300 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Foto de referência <span className="text-[#c62737]">*</span>
                </label>
                <div className="flex items-start gap-4">
                  {formPreview && (
                    <img
                      src={formPreview}
                      alt="Preview"
                      className="w-20 h-20 rounded-xl object-cover border border-slate-200 flex-shrink-0"
                    />
                  )}
                  <div className="flex-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFileChange}
                      disabled={formLoading}
                      className="block w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-[#c62737]/10 file:text-[#c62737] hover:file:bg-[#c62737]/20 disabled:opacity-50"
                    />
                    <p className="mt-1.5 text-xs text-slate-400">JPEG, PNG ou WebP · imagens grandes são comprimidas automaticamente · rosto centralizado e bem iluminado</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={formLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#c62737] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#9e1f2e] transition-colors disabled:opacity-60"
                >
                  {formLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  {formLoading ? 'Indexando...' : 'Cadastrar e indexar'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setFormName(''); setFormFile(null); setFormPreview(null) }}
                  disabled={formLoading}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-60"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Lista de pessoas ───────────────────────────────────────────── */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
            <h2 className="text-base font-semibold text-slate-800">
              Pessoas cadastradas
              {!loading && (
                <span className="ml-2 text-xs font-normal text-slate-400">({people.length})</span>
              )}
            </h2>
            <button
              onClick={loadPeople}
              disabled={loading}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
              title="Recarregar"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : people.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <ScanFace className="w-12 h-12 text-slate-200" />
              <p className="text-slate-500 font-medium">Nenhuma pessoa cadastrada ainda</p>
              <p className="text-sm text-slate-400">Clique em &quot;Nova pessoa&quot; para começar.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {people.map((person) => {
                const currentScan = scanState?.personId === person.id ? scanState : null
                return (
                  <div key={person.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors">
                    {/* Avatar de referência */}
                    <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-slate-100 border border-slate-200">
                      {person.reference_url ? (
                        <img
                          src={person.reference_url}
                          alt={person.name}
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <ScanFace className="w-6 h-6" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-800 truncate">{person.name}</span>
                        <StatusBadge status={person.status} />
                      </div>
                      {person.status === 'error' && person.status_message && (
                        <p className="text-xs text-red-600 mt-0.5 truncate">{person.status_message}</p>
                      )}
                      {currentScan?.result && (
                        <p className="text-xs text-green-600 mt-0.5">
                          ✓ {currentScan.result.matched} foto(s) encontrada(s) de {currentScan.result.scanned} analisadas
                        </p>
                      )}
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Botão Ver Álbum */}
                      <Link
                        href={`/admin/rekognition/${person.id}`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                        title="Abrir álbum desta pessoa"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Ver álbum
                      </Link>

                      {/* Botão Copiar link público */}
                      <button
                        type="button"
                        onClick={() => handleCopyLink(person.id)}
                        title="Copiar link público para compartilhar com a pessoa"
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-xl border transition-colors ${
                          copiedId === person.id
                            ? 'border-green-300 bg-green-50 text-green-600'
                            : 'border-slate-200 text-slate-400 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-600'
                        }`}
                      >
                        {copiedId === person.id
                          ? <Check className="w-3.5 h-3.5" />
                          : <Copy className="w-3.5 h-3.5" />}
                      </button>

                      {/* Botão Escanear */}
                      <button
                        type="button"
                        onClick={() => handleScan(person)}
                        disabled={person.status !== 'indexed' || currentScan?.running}
                        title="Varrer toda a galeria em busca desta pessoa"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#c62737]/30 px-3 py-2 text-xs font-medium text-[#c62737] hover:bg-[#c62737]/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {currentScan?.running
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <RefreshCw className="w-3.5 h-3.5" />}
                        {currentScan?.running ? 'Escaneando...' : 'Escanear galeria'}
                      </button>

                      {/* Botão Excluir */}
                      <button
                        type="button"
                        onClick={() => setDeletingId(person.id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Excluir pessoa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Modais e toasts ────────────────────────────────────────────── */}
        <ConfirmDialog
          open={!!deletingId}
          variant="danger"
          title="Excluir pessoa"
          message="Ao excluir, o índice desta pessoa será removido do AWS Rekognition e todas as correspondências de fotos serão apagadas. Essa ação não pode ser desfeita."
          confirmLabel="Excluir"
          onConfirm={handleDelete}
          onCancel={() => setDeletingId(null)}
          loading={deleteLoading}
        />

        {toast && (
          <Toast
            visible={!!toast}
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    </PageAccessGuard>
  )
}
