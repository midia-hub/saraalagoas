'use client'

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import {
  ANAMNESE_QUESTION_DEFS,
  createDefaultAnamneseData,
  normalizeAnamneseData,
  validateRequiredAnamnese,
  type RevisaoAnamneseFormData,
  type YesNo,
} from '@/lib/revisao-anamnese'
import { Loader2, CheckCircle2, Camera, AlertCircle, ChevronRight, ChevronsUpDown, Check } from 'lucide-react'

type LoadResponse = {
  registrationId: string
  eventName: string
  eventDate: string | null
  anamneseCompletedAt: string | null
  liabilityAccepted: boolean
  data: RevisaoAnamneseFormData
}

/* â”€â”€ Sub-components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function YesNoField({
  value,
  onChange,
  name,
}: {
  value: YesNo
  onChange: (next: YesNo) => void
  name: string
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {(['nao', 'sim'] as const).map((opt) => {
        const active = value === opt
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={[
              'flex items-center justify-center py-3 rounded-xl text-base font-bold border-2 transition-all active:scale-95',
              active
                ? opt === 'sim'
                  ? 'bg-purple-600 border-purple-600 text-white'
                  : 'bg-slate-700 border-slate-700 text-white'
                : 'bg-white border-slate-200 text-slate-500',
            ].join(' ')}
          >
            {opt === 'sim' ? 'Sim' : 'Não'}
          </button>
        )
      })}
      <input type="hidden" name={name} value={value} />
    </div>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-slate-700">{label}</label>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
      {children}
    </div>
  )
}

const inputCls =
  'w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 transition-colors'

const BLOOD_TYPE_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const
const BLOOD_TYPE_VALUES = [...BLOOD_TYPE_OPTIONS, 'Não informado'] as const

/* â”€â”€ Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

export default function RevisaoVidasAnamnesePage() {
  const params = useParams<{ token: string }>()
  const token = params?.token ?? ''

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [bloodTypeModalOpen, setBloodTypeModalOpen] = useState(false)

  const [eventName, setEventName] = useState('Revisão de Vidas')
  const [eventDate, setEventDate] = useState<string | null>(null)
  const [submittedAt, setSubmittedAt] = useState<string | null>(null)
  const [liabilityAccepted, setLiabilityAccepted] = useState(false)

  const [form, setForm] = useState<RevisaoAnamneseFormData>(createDefaultAnamneseData())

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/public/revisao-vidas/anamnese/${token}`, { cache: 'no-store' })
      const data = (await res.json()) as LoadResponse & { error?: string }
      if (!res.ok) throw new Error(data.error || 'Não foi possível carregar o formulário.')
      setEventName(data.eventName || 'Revisão de Vidas')
      setEventDate(data.eventDate || null)
      setSubmittedAt(data.anamneseCompletedAt || null)
      setLiabilityAccepted(!!data.liabilityAccepted)
      setForm(normalizeAnamneseData(data.data))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar formulário.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (!token) return
    load()
  }, [token, load])

  const eventDateLabel = useMemo(() => {
    if (!eventDate) return null
    return new Date(eventDate).toLocaleDateString('pt-BR')
  }, [eventDate])

  function setQuestion(key: string, patch: Partial<RevisaoAnamneseFormData['questions'][string]>) {
    setForm((prev) => ({
      ...prev,
      questions: { ...prev.questions, [key]: { ...prev.questions[key], ...patch } },
    }))
  }

  async function handleUploadPhoto(file: File) {
    setUploading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(`/api/public/revisao-vidas/anamnese/${token}/photo`, {
        method: 'POST',
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar foto.')
      setForm((prev) => ({ ...prev, photoUrl: data.photoUrl || '' }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao enviar foto.')
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const requiredError = validateRequiredAnamnese(form)
    if (requiredError) {
      setError(requiredError)
      return
    }

    if (!liabilityAccepted) {
      setError('Confirme a responsabilidade pelas informações para enviar.')
      return
    }

    setSaving(true)
    setSuccess(false)
    setError('')
    try {
      const res = await fetch(`/api/public/revisao-vidas/anamnese/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: form, liabilityAccepted }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar formulário.')
      setSubmittedAt(data.submittedAt ?? new Date().toISOString())
      setSuccess(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar formulário.')
    } finally {
      setSaving(false)
    }
  }

  /* â”€â”€ Loading â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-5 bg-slate-50">
        <Image src="/brand/logo.png" alt="Logo" width={90} height={90} className="opacity-90" />
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Carregando…
        </div>
      </div>
    )
  }

  /* â”€â”€ Sucesso â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-slate-50 px-6 text-center">
        <Image src="/brand/logo.png" alt="Logo" width={90} height={90} />
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-md px-6 py-10 space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="w-9 h-9 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900">Tudo certo!</h2>
          <p className="text-slate-500 text-sm leading-relaxed">
            Suas informações foram salvas com sucesso. Você já pode fechar esta página.
          </p>
          {submittedAt && (
            <p className="text-xs text-slate-400">
              Enviado em {new Date(submittedAt).toLocaleString('pt-BR')}
            </p>
          )}
          <button
            type="button"
            onClick={() => setSuccess(false)}
            className="text-sm text-purple-600 font-semibold underline underline-offset-2"
          >
            Editar respostas
          </button>
        </div>
      </div>
    )
  }

  /* â”€â”€ FormulÃ¡rio â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  return (
    <div className="min-h-screen bg-slate-100 pb-32">

      {/* â”€â”€ Header â”€â”€ */}
      <header className="bg-white border-b border-slate-200 px-4 pt-8 pb-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <Image src="/brand/logo.png" alt="Logo da Igreja" width={90} height={90} />
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-purple-600 mb-0.5">
              Ficha de saúde
            </p>
            <h1 className="text-xl font-extrabold text-slate-900">Anamnese Individual</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {eventName}{eventDateLabel ? ` · ${eventDateLabel}` : ''}
            </p>
          </div>
          {submittedAt && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-100 rounded-full px-3 py-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Enviado em {new Date(submittedAt).toLocaleString('pt-BR')}
            </span>
          )}
        </div>
      </header>

      <form onSubmit={handleSubmit} className="px-4 pt-5 space-y-4 max-w-lg mx-auto">

        {error && (
          <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3">
            <AlertCircle className="w-5 h-5 text-rose-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-rose-700 leading-snug">{error}</p>
          </div>
        )}

        {/* â”€â”€ SeÃ§Ã£o 1 â€” Dados pessoais â”€â”€ */}
        <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 bg-slate-50">
            <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Dados pessoais</h2>
          </div>
          <div className="p-4 space-y-4">
            <Field label="Nome completo">
              <input
                className={inputCls}
                required
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </Field>
            <Field label="Telefone" hint="Com DDD">
              <input
                className={inputCls}
                inputMode="tel"
                required
                placeholder="(82) 9XXXX-XXXX"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              />
            </Field>
            <Field label="Tipo sanguíneo">
              <button
                type="button"
                className={`${inputCls} min-h-[52px]`}
                onClick={() => setBloodTypeModalOpen(true)}
              >
                <span className="flex items-center justify-between gap-3 w-full">
                  <span className={`truncate text-left ${form.bloodType ? 'text-slate-900' : 'text-slate-400'}`}>
                    {form.bloodType || 'Selecione'}
                  </span>
                  <ChevronsUpDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                </span>
              </button>
            </Field>
            <Field label="Equipe">
              <input
                className={inputCls}
                required
                value={form.team}
                onChange={(e) => setForm((p) => ({ ...p, team: e.target.value }))}
              />
            </Field>
            <Field label="Líder">
              <input
                className={inputCls}
                required
                value={form.leader}
                onChange={(e) => setForm((p) => ({ ...p, leader: e.target.value }))}
              />
            </Field>
          </div>
        </section>

        {/* â”€â”€ SeÃ§Ã£o 2 â€” PrÃ© RevisÃ£o â”€â”€ */}
        <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 bg-slate-50">
            <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Pré Revisão</h2>
          </div>
          <div className="p-4 space-y-4">
            <Field label="Concluiu o Pré Revisão?">
              <YesNoField
                value={form.preReviewCompleted}
                onChange={(next) => setForm((p) => ({ ...p, preReviewCompleted: next }))}
                name="preReviewCompleted"
              />
            </Field>
          </div>
        </section>

        {/* â”€â”€ SeÃ§Ã£o 3 â€” HistÃ³rico de saÃºde â”€â”€ */}
        {form.preReviewCompleted !== 'nao' && (
          <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 bg-slate-50">
              <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">3</span>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Histórico de saúde</h2>
            </div>
          <div className="divide-y divide-slate-100">
            {ANAMNESE_QUESTION_DEFS.map((q, idx) => {
              const item = form.questions[q.key]
              return (
                <div key={q.key} className="p-4 space-y-3">
                  <p className="text-sm font-semibold text-slate-800 leading-snug">
                    <span className="text-slate-400 mr-1">{idx + 1}.</span>
                    {q.title.replace(/^\d+\)\s*/, '')}
                  </p>

                  <YesNoField
                    value={item.answer}
                    onChange={(next) => setQuestion(q.key, { answer: next, detail: next === 'sim' ? item.detail : '' })}
                    name={q.key}
                  />

                  {'detailLabel' in q && q.detailLabel && item.answer === 'sim' && (
                    <Field label={q.detailLabel}>
                      <input
                        className={inputCls}
                        required
                        value={item.detail}
                        onChange={(e) => setQuestion(q.key, { detail: e.target.value })}
                      />
                    </Field>
                  )}

                  {'scheduleLabel' in q && q.scheduleLabel && item.answer === 'sim' && (
                    <Field label={q.scheduleLabel}>
                      <input
                        className={inputCls}
                        required
                        placeholder="Ex: 08:00, 14:00, 20:00"
                        value={item.schedule || ''}
                        onChange={(e) => setQuestion(q.key, { schedule: e.target.value })}
                      />
                    </Field>
                  )}

                  {q.key === 'q1' && item.answer === 'sim' && (
                    <Field label="Observação">
                      <textarea
                        rows={2}
                        className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 transition-colors resize-y"
                        placeholder="Deixe em branco se não houver"
                        value={item.notes || ''}
                        onChange={(e) => setQuestion(q.key, { notes: e.target.value })}
                      />
                    </Field>
                  )}
                </div>
              )
            })}
          </div>
          </section>
        )}

        {/* â"€â"€ SeÃ§Ã£o 4 â€" Foto â"€â"€ */}
        {form.preReviewCompleted !== 'nao' && (
          <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 bg-slate-50">
              <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">4</span>
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Foto</h2>
            <span className="ml-auto text-xs text-slate-400 font-normal">Opcional</span>
          </div>
          <div className="p-4 space-y-4">
            {form.photoUrl ? (
              <div className="flex items-center gap-4">
                <img
                  src={form.photoUrl}
                  alt="Foto enviada"
                  className="w-20 h-20 object-cover rounded-2xl border-2 border-slate-200 flex-shrink-0"
                />
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-semibold text-slate-700">Foto enviada</p>
                  <label className="inline-flex items-center gap-2 cursor-pointer text-sm font-semibold text-purple-600">
                    <Camera className="w-4 h-4" />
                    Trocar foto
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      disabled={uploading}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadPhoto(f) }}
                    />
                  </label>
                </div>
              </div>
            ) : (
              <label className={[
                'flex items-center justify-center gap-3 w-full rounded-2xl border-2 border-dashed border-slate-300',
                'bg-slate-50 py-6 cursor-pointer active:bg-slate-100 transition-colors',
                uploading ? 'opacity-60 pointer-events-none' : '',
              ].join(' ')}>
                {uploading
                  ? <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                  : <Camera className="w-6 h-6 text-slate-400" />
                }
                <span className="text-sm font-semibold text-slate-600">
                  {uploading ? 'Enviando foto…' : 'Selecionar ou tirar foto'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadPhoto(f) }}
                />
              </label>
            )}
          </div>
          </section>
        )}

        {/* Mensagem de pré-revisão não concluída */}
        {form.preReviewCompleted === 'nao' && (
          <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-2xl px-4 py-4">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-blue-900">Próximos passos</p>
              <p className="text-sm text-blue-800 leading-snug">
                Para continuar o preenchimento desta anamnese, é necessário que você procure seu <strong>líder ou discipulador</strong> para preencher esta anamnese de forma orientada e personalizada.
              </p>
            </div>
          </div>
        )}

        {/* Observações gerais */}
        {form.preReviewCompleted !== 'nao' && (
          <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 bg-slate-50">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Observações</h2>
              <span className="ml-auto text-xs text-slate-400 font-normal">Opcional</span>
            </div>
            <div className="p-4">
              <textarea
                rows={3}
                className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 transition-colors resize-y"
                placeholder="Deixe alguma informação adicional ou observação relevante..."
                value={form.observacoes || ''}
                onChange={(e) => setForm((p) => ({ ...p, observacoes: e.target.value }))}
              />
            </div>
          </section>
        )}

        {/* — Termo — */}
        <label className="flex items-start gap-4 bg-white rounded-2xl shadow-sm p-4 cursor-pointer active:bg-slate-50 transition-colors">
          <div className={[
            'mt-0.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-colors',
            liabilityAccepted ? 'bg-purple-600 border-purple-600' : 'bg-white border-slate-300',
          ].join(' ')}>
            {liabilityAccepted && (
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <span className="text-sm text-slate-700 leading-relaxed">
            Confirmo que as informações preenchidas neste formulário são verdadeiras e são de minha
            responsabilidade.
          </span>
          <input
            type="checkbox"
            className="hidden"
            checked={liabilityAccepted}
            onChange={(e) => setLiabilityAccepted(e.target.checked)}
          />
        </label>

      </form>

      {bloodTypeModalOpen && (
        <div className="fixed inset-0 z-40">
          <button
            type="button"
            aria-label="Fechar seleção de tipo sanguíneo"
            className="absolute inset-0 bg-slate-900/45"
            onClick={() => setBloodTypeModalOpen(false)}
          />

          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl max-h-[78vh] overflow-y-auto p-4 pb-6 sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:right-auto sm:w-[92vw] sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:max-h-[70vh]">
            <p className="text-center text-sm sm:text-base font-bold text-slate-800 mb-3">Selecione o tipo sanguíneo</p>
            <div className="space-y-2 sm:grid sm:grid-cols-2 sm:gap-2 sm:space-y-0">
              {BLOOD_TYPE_VALUES.map((value) => {
                const active = form.bloodType === value
                const label = value === 'Não informado' ? 'Não sei informar' : value
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setForm((prev) => ({ ...prev, bloodType: value }))
                      setBloodTypeModalOpen(false)
                    }}
                    className={[
                      'w-full rounded-xl border-2 px-4 py-3.5 text-left text-base font-semibold transition-colors',
                      active
                        ? 'border-purple-600 bg-purple-50 text-purple-700'
                        : 'border-slate-200 bg-white text-slate-700 active:bg-slate-50',
                    ].join(' ')}
                  >
                    <span className="flex items-center justify-between">
                      <span>{label}</span>
                      {active && <Check className="w-4 h-4 text-purple-600" />}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* â”€â”€ Barra de envio fixa no rodapÃ© â”€â”€ */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-4 safe-area-inset-bottom">
        <div className="max-w-lg mx-auto space-y-2">
          {!liabilityAccepted && (
            <p className="text-center text-xs text-slate-500 flex items-center justify-center gap-1">
              <ChevronRight className="w-3.5 h-3.5" />
              Marque o termo de responsabilidade para continuar
            </p>
          )}
          <button
            type="submit"
            form="anamnese-form"
            disabled={saving || !liabilityAccepted}
            onClick={(e) => {
              if (!saving && liabilityAccepted) {
                const form = document.querySelector('form')
                form?.requestSubmit()
              }
              e.preventDefault()
            }}
            className={[
              'w-full flex items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold transition-all active:scale-[0.98]',
              liabilityAccepted && !saving
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-200'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed',
            ].join(' ')}
          >
            {saving && <Loader2 className="w-5 h-5 animate-spin" />}
            {saving ? 'Enviando…' : 'Salvar anamnese'}
          </button>
        </div>
      </div>

    </div>
  )
}

