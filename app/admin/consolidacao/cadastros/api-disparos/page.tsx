'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { Send, ArrowLeft, Save, RefreshCw, CheckCircle2, XCircle, Activity, Filter, Loader2, Clock, Bell, ChevronDown, MessageSquare } from 'lucide-react'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { Button } from '@/components/ui/Button'
import { adminFetchJson } from '@/lib/admin-client'
import { CustomSelect } from '@/components/ui/CustomSelect'

export interface DisparosLogEntry {
  id: string
  phone: string
  nome: string
  conversion_type: string
  status_code: number | null
  source: string
  created_at: string
}

export interface BackgroundJobEntry {
  id: string
  kind: string
  status: 'queued' | 'running' | 'completed' | 'failed'
  metadata: Record<string, string> | null
  result: { ok?: boolean; enviados?: number; erros?: number; aviso?: string } | null
  error: string | null
  created_at: string
  started_at: string | null
  finished_at: string | null
}

export interface CronJobEntry {
  jobid: number
  jobname: string
  schedule: string
  command: string
  start_time: string | null
  end_time: string | null
  status: string | null
  return_message: string | null
}

// â”€â”€ Labels descritivos para cada conversion_type â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const TIPO_LABELS: Record<string, { label: string; color: string }> = {
  accepted:                  { label: 'Aceitou',          color: 'bg-green-100 text-green-700' },
  reconciled:                { label: 'Reconciliou',      color: 'bg-blue-100 text-blue-700' },
  reserva_recebida:          { label: 'Reserva Recebida',    color: 'bg-yellow-100 text-yellow-700' },
  reserva_pendente_aprovacao:{ label: 'Reserva Pendente',    color: 'bg-orange-100 text-orange-700' },
  reserva_aprovada:          { label: 'Reserva Aprovada',    color: 'bg-teal-100 text-teal-700' },
  reserva_reprovada:         { label: 'Reserva Reprovada',   color: 'bg-red-100 text-red-700' },
  reserva_cancelada:         { label: 'Reserva Cancelada',   color: 'bg-slate-100 text-slate-600' },
  reserva_solicitada:        { label: 'Sol. Reserva',        color: 'bg-yellow-100 text-yellow-700' },
  reserva_rejeitada:         { label: 'Reserva Rejeitada',   color: 'bg-red-100 text-red-700' },
  escala_mes:                { label: 'Escala do MÃªs',       color: 'bg-purple-100 text-purple-700' },
  escala_lembrete_3dias:     { label: 'Lembrete 3 dias',     color: 'bg-purple-100 text-purple-700' },
  escala_lembrete_1dia:      { label: 'Lembrete 1 dia',      color: 'bg-purple-100 text-purple-700' },
  escala_dia_da_escala:      { label: 'Lembrete no dia',     color: 'bg-purple-100 text-purple-700' },
  'escala_mes':              { label: 'Escala do MÃªs',       color: 'bg-purple-100 text-purple-700' },
  kids_checkin:              { label: 'Kids Check-in',       color: 'bg-pink-100 text-pink-700' },
  kids_checkout:             { label: 'Kids Check-out',      color: 'bg-pink-100 text-pink-700' },
  kids_alerta:               { label: 'Kids Alerta',         color: 'bg-pink-100 text-pink-700' },
  kids_encerramento:         { label: 'Kids Encerramento',   color: 'bg-pink-100 text-pink-700' },
  midia_arte_responsavel:    { label: 'MÃ­dia â€“ Arte',        color: 'bg-indigo-100 text-indigo-700' },
  midia_producao_video:      { label: 'MÃ­dia â€“ VÃ­deo',       color: 'bg-indigo-100 text-indigo-700' },
}

const JOB_TIPO_LABELS: Record<string, string> = {
  mes:            'Envio da Escala do MÃªs',
  lembrete_3dias: 'Lembrete â€“ 3 dias antes',
  lembrete_1dia:  'Lembrete â€“ 1 dia antes',
  dia_da_escala:  'Lembrete no dia',
}

const JOB_STATUS_UI: Record<string, { label: string; color: string }> = {
  queued:    { label: 'Aguardando',   color: 'bg-yellow-100 text-yellow-700' },
  running:   { label: 'Em andamento', color: 'bg-blue-100 text-blue-700'    },
  completed: { label: 'ConcluÃ­do',    color: 'bg-green-100 text-green-700'  },
  failed:    { label: 'Com erro',     color: 'bg-red-100 text-red-600'      },
}

function JobStatusIcon({ status }: { status: string }) {
  if (status === 'queued')    return <Clock size={11} />
  if (status === 'running')   return <Loader2 size={11} className="animate-spin" />
  if (status === 'completed') return <CheckCircle2 size={11} />
  if (status === 'failed')    return <XCircle size={11} />
  return null
}

const SOURCE_LABELS: Record<string, string> = {
  public:  'Site pÃºblico',
  admin:   'Painel admin',
  reservas:'Reservas',
  escala:  'Escalas',
  kids:    'Sara Kids',
  midia:   'MÃ­dia',
}

function getTipoInfo(conversion_type: string) {
  if (TIPO_LABELS[conversion_type]) return TIPO_LABELS[conversion_type]
  // Tenta prefixo
  for (const key of Object.keys(TIPO_LABELS)) {
    if (conversion_type.startsWith(key.replace('_', ''))) return TIPO_LABELS[key]
  }
  return { label: conversion_type || 'Outro', color: 'bg-slate-100 text-slate-500' }
}

export default function ApiDisparosPage() {
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saveLoading, setSaveLoading] = useState(false)
  const [disparosLog, setDisparosLog] = useState<DisparosLogEntry[]>([])
  const [disparosLogLoading, setDisparosLogLoading] = useState(true)
  const [jobs, setJobs] = useState<BackgroundJobEntry[]>([])
  const [cronJobs, setCronJobs] = useState<CronJobEntry[]>([])

  // Disparo manual de lembretes de escala - DESATIVADO
  const [triggerLoading] = useState<Record<string, boolean>>({})
  const [triggerResult] = useState<Record<string, { enviados: number; erros: number; aviso?: string } | { error: string } | null>>({})
  const [triggerForce] = useState<Record<string, boolean>>({})
  const [showPreview] = useState<Record<string, boolean>>({})

  // Filtros do log
  const [filterSource, setFilterSource] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterType, setFilterType] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await adminFetchJson<{ disparos_api_enabled: boolean }>('/api/admin/consolidacao/disparos-settings')
      setEnabled(data.disparos_api_enabled ?? false)
    } catch (err) {
      console.error('[API disparos] Erro ao carregar configuraÃ§Ã£o:', err)
      setEnabled(false)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadLog = useCallback(async () => {
    setDisparosLogLoading(true)
    try {
      const data = await adminFetchJson<{ items: DisparosLogEntry[]; jobs?: BackgroundJobEntry[]; cron?: CronJobEntry[] }>('/api/admin/disparos-log?limit=200')
      setDisparosLog(data.items ?? [])
      setJobs(data.jobs ?? [])
      setCronJobs(data.cron ?? [])
    } catch (err) {
      console.error('[API disparos] Erro ao carregar log:', err)
      setDisparosLog([])
    } finally {
      setDisparosLogLoading(false)
    }
  }, [])

  // Auto-refresh quando hÃ¡ jobs em andamento
  useEffect(() => {
    const hasActive = jobs.some(j => j.status === 'queued' || j.status === 'running')
    if (!hasActive) return
    const interval = setInterval(() => { loadLog() }, 3000)
    return () => clearInterval(interval)
  }, [jobs, loadLog])

  useEffect(() => {
    load()
    loadLog()
  }, [load, loadLog])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaveLoading(true)
    try {
      await adminFetchJson('/api/admin/consolidacao/disparos-settings', {
        method: 'PATCH',
        body: JSON.stringify({ disparos_api_enabled: enabled }),
      })
    } catch (err) {
      console.error('[API disparos] Erro ao salvar:', err)
    } finally {
      setSaveLoading(false)
    }
  }

  // â”€â”€ EstatÃ­sticas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const stats = useMemo(() => {
    const total = disparosLog.length
    const success = disparosLog.filter(r => r.status_code != null && r.status_code >= 200 && r.status_code < 300).length
    const failed  = disparosLog.filter(r => r.status_code != null && !(r.status_code >= 200 && r.status_code < 300)).length
    const pending = disparosLog.filter(r => r.status_code == null).length
    return { total, success, failed, pending }
  }, [disparosLog])

  // â”€â”€ OpÃ§Ãµes dinÃ¢micas de filtros â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const sourceOptions = useMemo(() => {
    const uniq = Array.from(new Set(disparosLog.map(r => r.source).filter(Boolean)))
    return [
      { value: '', label: 'Todas as origens' },
      ...uniq.map(s => ({ value: s, label: SOURCE_LABELS[s] ?? s })),
    ]
  }, [disparosLog])

  const typeOptions = useMemo(() => {
    const uniq = Array.from(new Set(disparosLog.map(r => r.conversion_type).filter(Boolean)))
    return [
      { value: '', label: 'Todos os tipos' },
      ...uniq.map(t => ({ value: t, label: getTipoInfo(t).label })),
    ]
  }, [disparosLog])

  const statusOptions = [
    { value: '',        label: 'Todos os status' },
    { value: 'success', label: 'Sucesso (2xx)' },
    { value: 'error',   label: 'Erro (nÃ£o-2xx)' },
    { value: 'pending', label: 'Sem status' },
  ]

  // â”€â”€ Log filtrado â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const filteredLog = useMemo(() => {
    return disparosLog.filter(r => {
      if (filterSource && r.source !== filterSource) return false
      if (filterType && r.conversion_type !== filterType) return false
      if (filterStatus === 'success' && !(r.status_code != null && r.status_code >= 200 && r.status_code < 300)) return false
      if (filterStatus === 'error'   && !(r.status_code != null && !(r.status_code >= 200 && r.status_code < 300))) return false
      if (filterStatus === 'pending' && r.status_code != null) return false
      return true
    })
  }, [disparosLog, filterSource, filterType, filterStatus])

  return (
    <PageAccessGuard pageKey="consolidacao_config">
      <div className="p-6 md:p-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/consolidacao/cadastros"
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
            >
              <ArrowLeft size={20} />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#c62737]/10 flex items-center justify-center">
                <Send className="text-[#c62737]" size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">API de disparos</h1>
                <p className="text-slate-500">Envio automÃ¡tico de mensagem ao finalizar o formulÃ¡rio de consolidaÃ§Ã£o</p>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
            Carregando...
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 rounded-t-xl">
                <h2 className="text-lg font-semibold text-slate-800">Ativar API de disparos</h2>
                <p className="text-sm text-slate-500">
                  Quando ativa, ao finalizar o formulÃ¡rio de consolidaÃ§Ã£o (pÃºblico ou admin) serÃ¡ chamado o webhook de disparos com o telefone e nome do convertido. A mensagem enviada depende do tipo: &quot;Aceitou&quot; ou &quot;Reconciliou&quot;.
                </p>
              </div>
              <div className="p-6 flex items-center gap-4">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                    className="w-5 h-5 rounded border-slate-300 text-[#c62737] focus:ring-[#c62737]"
                  />
                  <span className="font-medium text-slate-800">API de disparos ativa</span>
                </label>
              </div>
            </div>

            <p className="text-sm text-slate-500">
              Configure no servidor as variÃ¡veis <code className="bg-slate-100 px-1 rounded">DISPAROS_WEBHOOK_URL</code> e <code className="bg-slate-100 px-1 rounded">DISPAROS_WEBHOOK_BEARER</code> para que o envio funcione.
            </p>

            <div className="flex justify-end">
              <Button type="submit" loading={saveLoading}>
                <Save size={18} />
                Salvar
              </Button>
            </div>
          </form>
        )}
        {/* Modulo de Lembretes Desativado */}
          {!disparosLogLoading && disparosLog.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
                <div className="text-2xl font-bold text-slate-800">{stats.total}</div>
                <div className="text-xs text-slate-500 mt-0.5">Total de disparos</div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
                <div className="text-2xl font-bold text-green-600">{stats.success}</div>
                <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1"><CheckCircle2 size={11} className="text-green-500" /> Enviados com sucesso</div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
                <div className="text-2xl font-bold text-red-500">{stats.failed}</div>
                <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1"><XCircle size={11} className="text-red-400" /> Com erro</div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
                <div className="text-2xl font-bold text-slate-400">{stats.pending}</div>
                <div className="text-xs text-slate-500 mt-0.5">Sem status</div>
              </div>
            </div>
          )}

          {/* Filtros */}
          {!disparosLogLoading && disparosLog.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-4 items-center">
              <Filter size={15} className="text-slate-400 shrink-0" />
              <div className="w-44">
                <CustomSelect
                  value={filterSource}
                  onChange={setFilterSource}
                  options={sourceOptions}
                  placeholder="Origem"
                />
              </div>
              <div className="w-52">
                <CustomSelect
                  value={filterType}
                  onChange={setFilterType}
                  options={typeOptions}
                  placeholder="Tipo"
                />
              </div>
              <div className="w-44">
                <CustomSelect
                  value={filterStatus}
                  onChange={setFilterStatus}
                  options={statusOptions}
                  placeholder="Status"
                />
              </div>
              {(filterSource || filterType || filterStatus) && (
                <button
                  onClick={() => { setFilterSource(''); setFilterType(''); setFilterStatus('') }}
                  className="text-xs text-slate-400 hover:text-slate-600 underline"
                >
                  Limpar filtros
                </button>
              )}
              {(filterSource || filterType || filterStatus) && (
                <span className="text-xs text-slate-500 ml-1">{filteredLog.length} resultado{filteredLog.length !== 1 ? 's' : ''}</span>
              )}
            </div>
          )}

          {disparosLogLoading ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 italic">
              Carregando registros...
            </div>
          ) : disparosLog.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-500">
              Nenhum disparo registrado ainda.
            </div>
          ) : filteredLog.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-500">
              Nenhum registro encontrado com os filtros selecionados.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="text-left py-3 px-4 font-semibold text-slate-600">Data/Hora</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-600">Telefone</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-600">Nome</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-600">Tipo</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-600">Origem</th>
                      <th className="text-center py-3 px-4 font-semibold text-slate-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredLog.map((row) => {
                      const tipoInfo = getTipoInfo(row.conversion_type)
                      const isSuccess = row.status_code != null && row.status_code >= 200 && row.status_code < 300
                      const isError   = row.status_code != null && !isSuccess
                      return (
                        <tr key={row.id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="py-3 px-4 text-slate-500 text-xs whitespace-nowrap">
                            {new Date(row.created_at).toLocaleString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-700 text-xs">{row.phone}</td>
                          <td className="py-3 px-4 font-medium text-slate-900 max-w-[160px] truncate" title={row.nome}>{row.nome}</td>
                          <td className="py-3 px-4">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold whitespace-nowrap ${tipoInfo.color}`}>
                              {tipoInfo.label}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">
                            {SOURCE_LABELS[row.source] ?? row.source}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {row.status_code != null ? (
                              <span className={`inline-flex items-center gap-1 font-bold text-xs ${isSuccess ? 'text-green-600' : 'text-red-600'}`}>
                                {isSuccess
                                  ? <CheckCircle2 size={13} className="text-green-500" />
                                  : <XCircle size={13} className="text-red-400" />}
                                {row.status_code}
                              </span>
                            ) : (
                              <span className="text-slate-300 text-xs">â€”</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-400 text-right rounded-b-xl">
                {filteredLog.length} disparo{filteredLog.length !== 1 ? 's' : ''} exibido{filteredLog.length !== 1 ? 's' : ''}
                {disparosLog.length !== filteredLog.length && ` de ${disparosLog.length} total`}
              </div>
            </div>
          )}
        </div>
      </div>
    </PageAccessGuard>
  )
}
