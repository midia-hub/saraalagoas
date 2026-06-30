'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  AlertCircle, Calendar, CheckCircle2, ChevronDown,
  ChevronLeft, ChevronRight, Loader2, Paperclip, Upload,
} from 'lucide-react'
import type { CampoFormulario, Formulario } from '@/lib/formularios'
import { isCampoVisible } from '@/lib/formularios'

type FormState = 'loading' | 'ready' | 'closed' | 'expired' | 'full' | 'error' | 'submitted'

// ─── Field components ──────────────────────────────────────────────────────────

function FieldInput({
  campo, value, onChange, error,
}: {
  campo: CampoFormulario
  value: unknown
  onChange: (v: unknown) => void
  error?: string
}) {
  const base = `w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all ${
    error
      ? 'border-red-300 bg-red-50 focus:border-red-400 focus:ring-2 focus:ring-red-400/20'
      : 'border-slate-200 bg-white focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20'
  }`

  switch (campo.tipo) {
    case 'texto_curto':
    case 'email':
    case 'telefone':
      return (
        <input
          type={campo.tipo === 'email' ? 'email' : campo.tipo === 'telefone' ? 'tel' : 'text'}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          placeholder={campo.placeholder}
          className={base}
        />
      )
    case 'numero':
      return (
        <input
          type="number"
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          placeholder={campo.placeholder}
          className={base}
        />
      )
    case 'texto_longo':
      return (
        <textarea
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          placeholder={campo.placeholder}
          rows={4}
          className={`${base} resize-none`}
        />
      )
    case 'data':
      return (
        <div className={`${base} flex items-center justify-between`}>
          <input
            type="date"
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 outline-none bg-transparent text-sm"
          />
          <Calendar size={16} className="text-slate-400 shrink-0" />
        </div>
      )
    case 'multipla_escolha':
      return (
        <div className="space-y-2">
          {(campo.opcoes ?? []).map((op, i) => (
            <label key={i} className="flex items-center gap-3 cursor-pointer group">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                value === op ? 'border-orange-500 bg-orange-500' : 'border-slate-300 group-hover:border-orange-400'
              }`}>
                {value === op && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <input type="radio" className="hidden" checked={value === op} readOnly />
              <span className="text-sm text-slate-700" onClick={() => onChange(op)}>{op}</span>
            </label>
          ))}
        </div>
      )
    case 'checkbox_multiplo': {
      const vals = Array.isArray(value) ? (value as string[]) : []
      return (
        <div className="space-y-2">
          {(campo.opcoes ?? []).map((op, i) => {
            const checked = vals.includes(op)
            return (
              <label key={i} className="flex items-center gap-3 cursor-pointer group" onClick={() => onChange(checked ? vals.filter((v) => v !== op) : [...vals, op])}>
                <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-all ${
                  checked ? 'border-orange-500 bg-orange-500' : 'border-slate-300 group-hover:border-orange-400'
                }`}>
                  {checked && (
                    <svg className="w-3 h-3 text-white" viewBox="0 0 12 10" fill="none">
                      <path d="M1 5l3.5 3.5L11 1" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span className="text-sm text-slate-700">{op}</span>
              </label>
            )
          })}
        </div>
      )
    }
    case 'dropdown':
      return (
        <div className={`${base} relative flex items-center`}>
          <select
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 outline-none bg-transparent text-sm appearance-none"
          >
            <option value="">Selecione...</option>
            {(campo.opcoes ?? []).map((op, i) => (
              <option key={i} value={op}>{op}</option>
            ))}
          </select>
          <ChevronDown size={15} className="text-slate-400 shrink-0 pointer-events-none" />
        </div>
      )
    case 'arquivo':
      return <FileInput value={String(value ?? '')} onChange={onChange} error={error} />
    default:
      return null
  }
}

function FileInput({ value, onChange, error }: { value: string; onChange: (v: unknown) => void; error?: string }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [fileName, setFileName] = useState(value || '')

  function handleFile(file: File) {
    setUploading(true)
    const reader = new FileReader()
    reader.onload = () => {
      setFileName(file.name)
      onChange(reader.result as string)
      setUploading(false)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
      className={`w-full rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 py-8 cursor-pointer transition-all ${
        error ? 'border-red-300 bg-red-50' : fileName ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-slate-50 hover:border-orange-300 hover:bg-orange-50/40'
      }`}
    >
      <input ref={inputRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
      {uploading ? (
        <Loader2 size={20} className="animate-spin text-orange-500" />
      ) : fileName ? (
        <>
          <Paperclip size={20} className="text-emerald-500" />
          <p className="text-sm text-emerald-700 font-medium">{fileName}</p>
          <p className="text-xs text-emerald-500">Clique para trocar</p>
        </>
      ) : (
        <>
          <Upload size={20} className="text-slate-400" />
          <p className="text-sm text-slate-500">Clique ou arraste um arquivo</p>
        </>
      )}
    </div>
  )
}

// ─── Layout wrapper ────────────────────────────────────────────────────────────

function FormLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50/20 to-slate-100 flex flex-col">
      <div className="h-1 bg-gradient-to-r from-[#c2410c] via-[#f97316] to-[#fb923c]" />
      <div className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-lg">
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 p-6 sm:p-8">
            {children}
          </div>
          <p className="text-center text-[11px] text-slate-300 mt-6">Formulário criado em Sara Sede Alagoas</p>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function PublicFormPage() {
  const { slug } = useParams<{ slug: string }>()

  const [state, setState] = useState<FormState>('loading')
  const [formulario, setFormulario] = useState<Formulario | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [respostas, setRespostas] = useState<Record<string, unknown>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [currentSection, setCurrentSection] = useState(0)

  useEffect(() => {
    fetch(`/api/public/formularios/${slug}`)
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) {
          setErrorMsg(data.message ?? 'Formulário não disponível.')
          setState(data.error === 'expired' ? 'expired' : data.error === 'full' ? 'full' : 'closed')
          return
        }
        setFormulario(data.formulario)
        setState('ready')
      })
      .catch(() => { setErrorMsg('Erro ao carregar o formulário.'); setState('error') })
  }, [slug])

  // Divide campos em seções/páginas
  const sections = useMemo<CampoFormulario[][]>(() => {
    if (!formulario) return [[]]
    const campos = formulario.schema?.campos ?? []
    const pages: CampoFormulario[][] = [[]]
    for (const campo of campos) {
      if (campo.tipo === 'secao') {
        if (pages[pages.length - 1].length > 0) pages.push([])
        pages[pages.length - 1].push(campo)
      } else {
        pages[pages.length - 1].push(campo)
      }
    }
    return pages.filter((p) => p.length > 0)
  }, [formulario])

  const currentCampos = (sections[currentSection] ?? []).filter(
    (c) => c.tipo === 'secao' || isCampoVisible(c, respostas)
  )

  const isLastSection = currentSection === sections.length - 1
  const totalSections = sections.length
  const showProgress = totalSections > 1

  function validate(secaoCampos: CampoFormulario[]): boolean {
    const newErrors: Record<string, string> = {}
    for (const campo of secaoCampos) {
      if (campo.tipo === 'secao' || !isCampoVisible(campo, respostas) || !campo.obrigatorio) continue
      const val = respostas[campo.id]
      const empty = val == null || val === '' || (Array.isArray(val) && val.length === 0)
      if (empty) newErrors[campo.id] = 'Este campo é obrigatório.'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function handleNext() {
    if (!validate(currentCampos)) return
    setCurrentSection((s) => s + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate(currentCampos)) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/public/formularios/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dados: respostas }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao enviar.')
      setSuccessMsg(data.mensagem ?? 'Obrigado pela sua resposta!')
      setState('submitted')
    } catch (err) {
      setErrors((prev) => ({ ...prev, _form: err instanceof Error ? err.message : 'Erro ao enviar.' }))
    } finally {
      setSubmitting(false)
    }
  }

  // ── Render states ──────────────────────────────────────────────────────────

  if (state === 'loading') {
    return (
      <FormLayout>
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
        </div>
      </FormLayout>
    )
  }

  if (state === 'submitted') {
    return (
      <FormLayout>
        <div className="flex flex-col items-center justify-center gap-5 py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-1">Resposta enviada!</h2>
            <p className="text-slate-500">{successMsg}</p>
          </div>
        </div>
      </FormLayout>
    )
  }

  if (state !== 'ready') {
    const msgs: Record<string, string> = {
      closed:  'Este formulário está fechado.',
      expired: 'O prazo deste formulário encerrou.',
      full:    'Este formulário atingiu o limite de respostas.',
      error:   'Não foi possível carregar o formulário.',
    }
    return (
      <FormLayout>
        <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
            <AlertCircle className="w-7 h-7 text-slate-400" />
          </div>
          <p className="text-base font-semibold text-slate-700">{errorMsg || msgs[state]}</p>
        </div>
      </FormLayout>
    )
  }

  if (!formulario) return null

  return (
    <FormLayout>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900 leading-tight">{formulario.titulo}</h1>
        {formulario.descricao && <p className="text-slate-500 mt-2">{formulario.descricao}</p>}
      </div>

      {/* Progress bar */}
      {showProgress && (
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Parte {currentSection + 1} de {totalSections}</span>
            <span>{Math.round(((currentSection + 1) / totalSections) * 100)}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all duration-500"
              style={{ width: `${((currentSection + 1) / totalSections) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} noValidate>
        <div className="space-y-6">
          {currentCampos.map((campo) => {
            if (campo.tipo === 'secao') {
              return (
                <div key={campo.id} className="pt-2">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-slate-200" />
                    <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{campo.label}</h2>
                    <div className="flex-1 h-px bg-slate-200" />
                  </div>
                </div>
              )
            }
            return (
              <div key={campo.id} className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-800">
                  {campo.label}
                  {campo.obrigatorio && <span className="text-red-500 ml-1">*</span>}
                </label>
                {campo.descricao && <p className="text-xs text-slate-500">{campo.descricao}</p>}
                <FieldInput
                  campo={campo}
                  value={respostas[campo.id]}
                  onChange={(v) => {
                    setRespostas((prev) => ({ ...prev, [campo.id]: v }))
                    if (errors[campo.id]) setErrors((prev) => { const n = { ...prev }; delete n[campo.id]; return n })
                  }}
                  error={errors[campo.id]}
                />
                {errors[campo.id] && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle size={11} /> {errors[campo.id]}
                  </p>
                )}
              </div>
            )
          })}
        </div>

        {errors._form && (
          <div className="mt-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            <AlertCircle size={15} /> {errors._form}
          </div>
        )}

        <div className="mt-8 flex items-center justify-between gap-3">
          {showProgress && currentSection > 0 ? (
            <button
              type="button"
              onClick={() => { setCurrentSection((s) => s - 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
              className="flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <ChevronLeft size={16} /> Anterior
            </button>
          ) : <div />}

          {isLastSection ? (
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#c2410c] to-[#f97316] hover:from-[#9a3412] hover:to-[#ea580c] text-white font-bold px-8 py-3 text-sm transition-all disabled:opacity-50 shadow-md shadow-orange-200"
            >
              {submitting ? <><Loader2 size={15} className="animate-spin" /> Enviando...</> : 'Enviar respostas'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#c2410c] to-[#f97316] hover:from-[#9a3412] hover:to-[#ea580c] text-white font-bold px-8 py-3 text-sm transition-all shadow-md shadow-orange-200"
            >
              Próximo <ChevronRight size={16} />
            </button>
          )}
        </div>
      </form>
    </FormLayout>
  )
}
