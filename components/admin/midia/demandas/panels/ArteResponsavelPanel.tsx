'use client'

import { useState, useEffect } from 'react'
import { Search } from 'lucide-react'
import PeoplePickerModal from '../PeoplePickerModal'
import { adminFetchJson } from '@/lib/admin-client'

interface Person {
  id:        string
  full_name: string
  phone?:    string
}

interface Disparo {
  id:          string
  person_name: string
  phone:       string
  message_body: string
  status:      string
  sent_at:     string
}

interface ResponsavelPanelProps {
  stepId:      string
  demandId:    string
  stepType:    'arte_responsavel' | 'producao_video'
  demandTitle: string
  dueDate?:    string
  metadata:    Record<string, unknown>
  onPatchMeta: (meta: Record<string, unknown>) => Promise<void>
  saving:      boolean
}

export default function ArteResponsavelPanel({
  stepId,
  demandId,
  stepType,
  demandTitle,
  dueDate,
  metadata,
  onPatchMeta,
}: ResponsavelPanelProps) {
  const isVideo = stepType === 'producao_video'
  const labelTipo = isVideo ? '🎬 Produção de Vídeo' : '🎨 Arte'

  const [people,      setPeople]      = useState<Person[]>([])
  const [disparos,    setDisparos]    = useState<Disparo[]>([])
  const [loadingPpl,  setLoadingPpl]  = useState(true)
  const [selected,    setSelected]    = useState<Person | null>(null)
  const [taskBody,    setTaskBody]    = useState(String(metadata.task_body ?? ''))
  const [sending,     setSending]     = useState(false)
  const [error,       setError]       = useState('')
  const [success,     setSuccess]     = useState('')
  const [manualText,  setManualText]  = useState('')
  const [peoplePickerOpen, setPeoplePickerOpen] = useState(false)

  /* Carrega pessoas e histórico de disparos */
  useEffect(() => {
    adminFetchJson<{ people?: Person[]; data?: Person[] }>('/api/admin/consolidacao/people?limit=500')
      .then((d) => setPeople(d.people ?? d.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingPpl(false))

    adminFetchJson<{ disparos?: Disparo[] }>(`/api/admin/midia/demandas/${demandId}/steps/${stepId}/disparo`)
      .then((d) => setDisparos(d.disparos ?? []))
      .catch(() => {})
  }, [demandId, stepId])

  const prazoFormatado = dueDate
    ? new Date(dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : ''

  const preview = [
    `*${labelTipo}* — ${demandTitle}`,
    `Tarefa: ${taskBody || '(descrição da tarefa)'}`,
    prazoFormatado ? `Prazo: ${prazoFormatado}` : '',
    selected ? `Para: ${selected.full_name}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  const enviar = async () => {
    if (!selected) { setError('Selecione o responsável.'); return }
    if (!taskBody.trim()) { setError('Descreva a tarefa.'); return }
    const phone = selected.phone ?? (metadata[`phone_${selected.id}`] as string)
    if (!phone) { setError('O responsável não tem telefone cadastrado.'); return }

    setSending(true)
    setError('')
    setSuccess('')
    setManualText('')

    try {
      await onPatchMeta({ ...metadata, task_body: taskBody })
      const data = await adminFetchJson<{ isConfigured: boolean; success?: boolean; manualText?: string; disparo: Disparo }>(
        `/api/admin/midia/demandas/${demandId}/steps/${stepId}/disparo`,
        {
          method: 'POST',
          body: JSON.stringify({
            personId:    selected.id,
            personName:  selected.full_name,
            phone,
            stepType,
            taskBody:    taskBody.trim(),
            demandTitle,
            dueDate:     prazoFormatado || undefined,
          }),
        },
      )

      if (data.isConfigured && data.success) {
        setSuccess(`Mensagem enviada para ${selected.full_name}!`)
      } else {
        setManualText(data.manualText ?? preview)
        setSuccess('Template não configurado — copie o texto abaixo e envie manualmente.')
      }
      setDisparos((prev) => [data.disparo, ...prev])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Responsável */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Responsável</label>
        {loadingPpl ? (
          <p className="text-xs text-slate-400">Carregando pessoas...</p>
        ) : (
          <button
            type="button"
            onClick={() => setPeoplePickerOpen(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-[#c62737]/50 transition-colors text-left"
          >
            {selected ? (
              <>
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[#c62737]/10 flex items-center justify-center text-xs font-bold text-[#c62737]">
                  {selected.full_name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
                </div>
                <span className="flex-1 text-sm font-medium text-slate-700">{selected.full_name}</span>
                <span className="text-xs text-slate-400 flex-shrink-0">trocar →</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="text-sm text-slate-400">Buscar responsável...</span>
              </>
            )}
          </button>
        )}
        {selected && !selected.phone && (
          <p className="mt-1 text-xs text-amber-500">
            ⚠ Nenhum telefone cadastrado para esta pessoa. O WhatsApp não será enviado.
          </p>
        )}
        {peoplePickerOpen && (
          <PeoplePickerModal
            people={people}
            selectedIds={selected ? [selected.id] : []}
            onConfirm={(ids) => {
              const person = people.find((p) => p.id === ids[0]) ?? null
              setSelected(person)
            }}
            onClose={() => setPeoplePickerOpen(false)}
            singleSelect
            title="Selecionar responsável"
          />
        )}
      </div>

      {/* Descrição da tarefa */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Descrição da tarefa</label>
        <textarea
          value={taskBody}
          onChange={(e) => setTaskBody(e.target.value)}
          rows={3}
          placeholder={`Ex: Criar ${isVideo ? 'vídeo' : 'arte'} para ${demandTitle}. Usar identidade visual padrão...`}
          className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 hover:border-slate-300 focus:border-[#c62737] focus:ring-1 focus:ring-[#c62737] outline-none transition-colors resize-none"
        />
      </div>

      {/* Preview da mensagem */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">
          Preview da mensagem WhatsApp
        </label>
        <div className="px-3 py-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-mono whitespace-pre-wrap leading-relaxed">
          {preview}
        </div>
      </div>

      {error   && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
      {success && <p className="text-xs text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">{success}</p>}

      {/* Texto para cópia manual */}
      {manualText && (
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Copie e envie manualmente:
          </label>
          <div className="relative">
            <textarea
              readOnly
              value={manualText}
              rows={5}
              className="w-full px-3 py-2 text-xs rounded-xl border border-amber-200 bg-amber-50 font-mono resize-none"
            />
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(manualText)}
              className="absolute top-2 right-2 px-2 py-1 rounded-lg text-xs bg-amber-200 hover:bg-amber-300 text-amber-800 transition-colors"
            >
              Copiar
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={enviar}
        disabled={sending}
        className="w-full py-2.5 rounded-xl bg-[#c62737] hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-60"
      >
        {sending ? 'Enviando...' : `📱 Enviar tarefa via WhatsApp`}
      </button>

      {/* Histórico de disparos */}
      {disparos.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Histórico de envios
          </h4>
          {disparos.map((d) => (
            <div
              key={d.id}
              className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-white text-xs"
            >
              <span className={`mt-0.5 flex-shrink-0 w-2 h-2 rounded-full ${d.status === 'sent' ? 'bg-emerald-400' : 'bg-red-400'}`} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-700 truncate">{d.person_name}</p>
                <p className="text-slate-400">{new Date(d.sent_at).toLocaleString('pt-BR')}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${d.status === 'sent' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                {d.status === 'sent' ? 'Enviado' : 'Falhou'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
