'use client'

import { useState, useEffect } from 'react'
import { X, Save, Loader2, Phone, MessageSquare, Home, CalendarCheck, BookOpen, FileText, CheckCircle2, Calendar, ExternalLink, Link2, ClipboardCheck } from 'lucide-react'
import {
  FollowupEnriched,
  FollowupStatus,
  FOLLOWUP_STATUS_LABELS,
  FOLLOWUP_STATUS_COLORS,
  ATTENDED_CHANNELS,
  ReviewEvent,
} from '@/lib/consolidacao-types'
import { adminFetchJson } from '@/lib/admin-client'
import { CustomSelect } from '@/components/ui/CustomSelect'
import { DatePickerInput } from '@/components/ui/DatePickerInput'

interface Props {
  item: FollowupEnriched | null
  onClose: () => void
  onSaved: (updated: FollowupEnriched) => void
  reviewEvents?: ReviewEvent[]
}

const fieldBase = 'w-full border-2 border-slate-200 rounded-lg px-3.5 py-2.5 text-sm font-medium bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#c62737]/20 focus:border-[#c62737] transition-all hover:border-slate-300'

function SectionHeader({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-7 h-7 rounded-lg bg-[#c62737]/10 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-[#c62737]" />
      </div>
      <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">{label}</h3>
    </div>
  )
}

function ToggleCheckbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <label className="inline-flex items-center gap-3 cursor-pointer select-none group">
      <div
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5.5 rounded-full transition-colors shrink-0 ${checked ? 'bg-[#c62737]' : 'bg-slate-200'}`}
        style={{ height: '1.375rem' }}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-[1.125rem]' : 'translate-x-0'}`}
        />
      </div>
      <span className={`text-sm font-medium transition-colors ${checked ? 'text-slate-800' : 'text-slate-500'}`}>{label}</span>
    </label>
  )
}

export function FollowupDrawer({ item, onClose, onSaved, reviewEvents = [] }: Props) {
  const [form, setForm] = useState<Record<string, unknown>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [anamneseLoading, setAnamneseLoading] = useState(false)
  const [anamneseToken, setAnamneseToken] = useState<string | null>(null)
  const [anamneseCompletedAt, setAnamneseCompletedAt] = useState<string | null>(null)
  const [copiedAnamneseLink, setCopiedAnamneseLink] = useState(false)

  useEffect(() => {
    if (item) {
      setForm({
        contacted: item.contacted,
        contacted_at: item.contacted_at?.slice(0, 10) ?? '',
        contacted_channel: item.contacted_channel ?? '',
        contacted_notes: item.contacted_notes ?? '',
        fono_visit_done: item.fono_visit_done,
        fono_visit_date: item.fono_visit_date ?? '',
        visit_done: item.visit_done,
        visit_date: item.visit_date ?? '',
        status: item.status,
        next_review_event_id: item.next_review_event_id ?? '',
        next_review_date: item.next_review_date ?? '',
        notes: item.notes ?? '',
      })
      setError('')
    }
  }, [item])

  useEffect(() => {
    if (!item?.person_id) return
    setAnamneseLoading(true)
    adminFetchJson(`/api/admin/consolidacao/revisao/registrations?person_id=${item.person_id}`)
      .then((data: any) => {
        const list = Array.isArray(data.registrations) ? data.registrations : []
        const latest = list[0]
        setAnamneseToken(latest?.anamnese_token ?? null)
        setAnamneseCompletedAt(latest?.anamnese_completed_at ?? null)
      })
      .catch(() => {
        setAnamneseToken(null)
        setAnamneseCompletedAt(null)
      })
      .finally(() => setAnamneseLoading(false))
  }, [item?.person_id])

  if (!item) return null

  const isDirected = item.status === 'direcionado_revisao'
  const alreadyEnrolled = item.status === 'inscrito_revisao' || item.status === 'concluiu_revisao'
  const canEnrollReview = isDirected

  function set(key: string, value: unknown) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function getAnamneseLink(token: string | null) {
    if (!token) return ''
    if (typeof window === 'undefined') return `/revisao-vidas/anamnese/${token}`
    return `${window.location.origin}/revisao-vidas/anamnese/${token}`
  }

  async function copyAnamneseLink() {
    const url = getAnamneseLink(anamneseToken)
    if (!url || typeof navigator?.clipboard?.writeText !== 'function') return
    await navigator.clipboard.writeText(url)
    setCopiedAnamneseLink(true)
    setTimeout(() => setCopiedAnamneseLink(false), 1800)
  }

  async function handleSave() {
    const nextStatus = form.status as string | undefined
    if (nextStatus === 'inscrito_revisao' && !canEnrollReview && !alreadyEnrolled) {
      setError('Para inscrever, o status precisa estar direcionado para o Revisão de Vidas.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const data = await adminFetchJson(`/api/admin/consolidacao/followups/${item!.id}`, {
        method: 'PATCH',
        body: JSON.stringify(form),
      })
      const updated = (data as any).item as FollowupEnriched
      onSaved({ ...item, ...updated } as FollowupEnriched)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const statusOptions: { value: FollowupStatus; label: string }[] = [
    { value: 'em_acompanhamento', label: FOLLOWUP_STATUS_LABELS.em_acompanhamento },
    { value: 'direcionado_revisao', label: FOLLOWUP_STATUS_LABELS.direcionado_revisao },
    { value: 'inscrito_revisao', label: FOLLOWUP_STATUS_LABELS.inscrito_revisao },
    { value: 'concluiu_revisao', label: FOLLOWUP_STATUS_LABELS.concluiu_revisao },
    { value: 'encerrado', label: FOLLOWUP_STATUS_LABELS.encerrado },
  ]

  const allowInscritoOption = canEnrollReview || alreadyEnrolled || form.status === 'inscrito_revisao'
  const statusOptionsFiltered = statusOptions.filter((opt) =>
    opt.value !== 'inscrito_revisao' || allowInscritoOption
  )

  const statusColorCls = FOLLOWUP_STATUS_COLORS[(form.status as FollowupStatus) ?? item.status] ?? 'bg-slate-100 text-slate-500'
  const conversionTypeLabel =
    item.conversion?.conversion_type === 'accepted' ? 'Aceitou Jesus' :
    item.conversion?.conversion_type === 'reconciled' ? 'Reconciliou' :
    item.conversion?.conversion_type ?? null

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Panel */}
      <div
        className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#c62737]/10 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-[#c62737] font-bold text-base">
                {(item.person?.full_name ?? '?')[0]?.toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="font-bold text-slate-800 text-sm truncate">{item.person?.full_name}</p>
              {item.person?.mobile_phone && (
                <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                  <Phone className="w-3 h-3" />
                  {item.person.mobile_phone}
                </div>
              )}
              {item.attendance_summary && (
                <div className="flex items-center gap-1 text-[10px] font-bold mt-1 uppercase tracking-wider">
                  <span className="text-slate-400">Freqüência:</span>
                  <span className={item.attendance_summary.total_attended === 0 ? 'text-rose-500' : 'text-emerald-600'}>
                    {item.attendance_summary.total_attended}/{item.attendance_summary.total_expected}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${statusColorCls}`}>
                  {FOLLOWUP_STATUS_LABELS[(form.status as FollowupStatus)] ?? FOLLOWUP_STATUS_LABELS[item.status]}
                </span>
                {conversionTypeLabel && (
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <CalendarCheck className="w-3 h-3" />
                    {conversionTypeLabel}
                    {item.conversion?.data_conversao ? ` · ${new Date(item.conversion.data_conversao).toLocaleDateString('pt-BR')}` : ''}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors shrink-0 ml-3"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 px-6 py-5 space-y-6 overflow-y-auto">

          {/* Contato */}
          <section>
            <SectionHeader icon={Phone} label="Contato" />
            <div className="space-y-4">
              <ToggleCheckbox
                checked={Boolean(form.contacted)}
                onChange={(v) => set('contacted', v)}
                label="Entramos em contato"
              />
              {Boolean(form.contacted) && (
                <div className="space-y-3 pl-1 border-l-2 border-[#c62737]/20 ml-1.5 pl-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Data do contato</label>
                    <DatePickerInput
                      value={form.contacted_at as string}
                      onChange={(v) => set('contacted_at', v)}
                      placeholder="dd/mm/aaaa"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Canal</label>
                    <CustomSelect
                      value={form.contacted_channel as string}
                      onChange={(v) => set('contacted_channel', v)}
                      options={ATTENDED_CHANNELS.map((c) => ({ value: c.value, label: c.label }))}
                      placeholder="Selecionar..."
                      allowEmpty={true}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Observação</label>
                    <textarea
                      value={form.contacted_notes as string}
                      onChange={(e) => set('contacted_notes', e.target.value)}
                      rows={2}
                      placeholder="Como foi o contato?"
                      className={`${fieldBase} resize-none`}
                    />
                  </div>
                </div>
              )}
            </div>
          </section>

          <div className="border-t border-slate-100" />

          {/* Fono Visita */}
          <section>
            <SectionHeader icon={MessageSquare} label="Fono Visita" />
            <div className="space-y-3">
              <ToggleCheckbox
                checked={Boolean(form.fono_visit_done)}
                onChange={(v) => set('fono_visit_done', v)}
                label="Fono Visita realizada"
              />
              {Boolean(form.fono_visit_done) && (
                <div className="pl-4 border-l-2 border-[#c62737]/20 ml-1.5">
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Data da fono visita</label>
                  <DatePickerInput
                    value={form.fono_visit_date as string}
                    onChange={(v) => set('fono_visit_date', v)}
                    placeholder="dd/mm/aaaa"
                  />
                </div>
              )}
            </div>
          </section>

          <div className="border-t border-slate-100" />

          {/* Visita */}
          <section>
            <SectionHeader icon={Home} label="Visita" />
            <div className="space-y-3">
              <ToggleCheckbox
                checked={Boolean(form.visit_done)}
                onChange={(v) => set('visit_done', v)}
                label="Visita realizada"
              />
              {Boolean(form.visit_done) && (
                <div className="pl-4 border-l-2 border-[#c62737]/20 ml-1.5">
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Data da visita</label>
                  <DatePickerInput
                    value={form.visit_date as string}
                    onChange={(v) => set('visit_date', v)}
                    placeholder="dd/mm/aaaa"
                  />
                </div>
              )}
            </div>
          </section>

          <div className="border-t border-slate-100" />

          {/* Status */}
          <section>
            <SectionHeader icon={CheckCircle2} label="Status" />
            <CustomSelect
              value={form.status as string}
              onChange={(v) => set('status', v)}
              options={statusOptionsFiltered.map((s) => ({ value: s.value, label: s.label }))}
              placeholder="Selecionar status..."
              required={true}
            />
            {!canEnrollReview && !alreadyEnrolled && (
              <p className="mt-2 text-xs text-amber-600">
                Para inscrever no Revisão de Vidas, primeiro direcione este acompanhamento.
              </p>
            )}

            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 space-y-2">
              <p className="text-xs font-semibold text-slate-700">Anamnese</p>
              {anamneseLoading ? (
                <p className="text-xs text-slate-500">Carregando status...</p>
              ) : anamneseToken ? (
                <>
                  <p className={`text-xs font-medium ${anamneseCompletedAt ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {anamneseCompletedAt ? 'Anamnese preenchida' : 'Anamnese pendente'}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <a
                      href={getAnamneseLink(anamneseToken)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium rounded-md px-2 py-1 border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Abrir formulário
                    </a>
                    <button
                      onClick={copyAnamneseLink}
                      className="inline-flex items-center gap-1 text-xs font-medium rounded-md px-2 py-1 border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    >
                      {copiedAnamneseLink ? <ClipboardCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Link2 className="w-3.5 h-3.5" />}
                      {copiedAnamneseLink ? 'Copiado' : 'Copiar link'}
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-xs text-slate-500">Sem inscrição ativa para anamnese.</p>
              )}
            </div>
          </section>

          <div className="border-t border-slate-100" />

          {/* Observações */}
          <section>
            <SectionHeader icon={FileText} label="Observações Gerais" />
            <textarea
              value={form.notes as string}
              onChange={(e) => set('notes', e.target.value)}
              rows={4}
              placeholder="Anotações sobre o acompanhamento..."
              className={`${fieldBase} resize-none`}
            />
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/80 sticky bottom-0 space-y-3">
          {error && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700">
              {error}
            </div>
          )}
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-[#c62737] text-white py-2.5 px-4 rounded-lg text-sm font-semibold hover:bg-[#a81f2c] disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
