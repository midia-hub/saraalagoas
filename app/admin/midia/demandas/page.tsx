'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  BarChart2,
  BookOpen,
  Bot,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Clock,
  Hash,
  Image as ImageIcon,
  Loader2,
  Palette,
  PenLine,
  Send,
  Sparkles,
  Target,
  XCircle,
  Zap,
} from 'lucide-react'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { AdminPageHeader } from '@/app/admin/AdminPageHeader'
import { adminFetchJson, getAccessTokenOrThrow } from '@/lib/admin-client'
import { CustomSelect } from '@/components/ui/CustomSelect'
import SessaoDrawer from '@/components/admin/midia/demandas/SessaoDrawer'
import type { RepoMeta } from '@/lib/equipe-ia-repositorio'

// ─── Shared types (exported for SessaoDrawer) ─────────────────────────────────

export interface AgentConfig {
  orquestrador: { objetivo: string; tom: string; prioridade: string; model: string }
  analista:     { periodo: string; foco: string; model: string }
  estrategista: { instrucoes: string; publicoAlvo: string; model: string }
  redator:      { instrucoes: string; hashtagsFixas: string; model: string }
  diretorArte:  { instrucoes: string; elementosObrig: string; model: string }
  designer:     { qualidade: string; formato: string; model: string; imageModel: string }
  socialManager:{ instrucoes: string; horarioPref: string; model: string }
  /** IDs de integrações Meta (Instagram já conectado) para puxar posts como referência nesta sessão */
  instagramRefsIntegracaoIds?: string[]
}

export interface RepoItem {
  id: string
  path: string
  nome: string
  url: string
  createdAt?: string
  meta?: Partial<RepoMeta> | null
  metaPath?: string
}

// ─── Session types ────────────────────────────────────────────────────────────

type AgentId = 'orquestrador' | 'analista' | 'estrategista' | 'redator' | 'diretor_arte' | 'designer' | 'social_manager'
type AgentStatus = 'idle' | 'working' | 'done' | 'error'

interface AgentState {
  status:    AgentStatus
  message:   string
  result:    unknown
  directive: string   // last orchestrator message before this agent started
}

interface LogEntry {
  id:       number
  agentId?: AgentId
  message:  string
  ts:       number
  kind:     'orchestrator' | 'agent' | 'system' | 'error'
}

interface ApprovalSummary {
  legenda: string; cta: string; variacao: string
  hashtags: string[]; melhor_horario: string
  plataforma: string; tipo_post: string
  artUrl: string; dallePrompt: string; briefing_arte: string
  estrategia: string; conceito_visual: string
}

type SessionStatus = 'idle' | 'running' | 'approval' | 'done' | 'error'

interface Session {
  status:           SessionStatus
  agents:           Record<AgentId, AgentState>
  log:              LogEntry[]
  approval:         ApprovalSummary | null
  orchestratorMsgs: string[]
  /** Após rodada sem painel de aprovação, o usuário pode enviar nova instrução ao orquestrador */
  podeContinuarConversa?: boolean
}

// ─── Agent meta ───────────────────────────────────────────────────────────────

const AGENT_META: Record<AgentId, { label: string; icon: React.ComponentType<{ className?: string }>; cor: string; papel: string }> = {
  orquestrador:  { label: 'Diretor de Marketing',  icon: Zap,       cor: 'from-violet-600 to-indigo-600',    papel: 'Dirige toda a equipe'        },
  analista:      { label: 'Analista de Dados',      icon: BarChart2, cor: 'from-blue-600 to-blue-500',       papel: 'Métricas do Instagram'       },
  estrategista:  { label: 'Gerente de Conteúdo',    icon: Target,    cor: 'from-violet-600 to-violet-500',   papel: 'Estratégia e ângulo criativo' },
  redator:       { label: 'Copywriter',             icon: PenLine,   cor: 'from-sky-600 to-sky-500',         papel: 'Legenda e copy'              },
  diretor_arte:  { label: 'Diretor de Arte',        icon: Palette,   cor: 'from-rose-600 to-rose-500',       papel: 'Conceito visual'             },
  designer:      { label: 'Designer',               icon: ImageIcon, cor: 'from-amber-600 to-amber-500',     papel: 'Geração de arte com IA'      },
  social_manager:{ label: 'Social Media Manager',   icon: Hash,      cor: 'from-emerald-600 to-emerald-500', papel: 'Hashtags e agendamento'      },
}

const AGENT_ORDER: AgentId[] = ['orquestrador', 'analista', 'estrategista', 'redator', 'diretor_arte', 'designer', 'social_manager']

const IDLE_SESSION: Session = {
  status:                 'idle',
  agents:                 Object.fromEntries(AGENT_ORDER.map((id) => [id, { status: 'idle', message: '', result: null, directive: '' }])) as Record<AgentId, AgentState>,
  log:                    [],
  approval:               null,
  orchestratorMsgs:       [],
  podeContinuarConversa:  false,
}

function buildResultadosAnteriores(agents: Record<AgentId, AgentState>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const id of AGENT_ORDER) {
    if (id === 'orquestrador') continue
    const st = agents[id]
    if (st.status === 'done' && st.result != null) out[id] = st.result
  }
  return out
}

// ─── Demand types ─────────────────────────────────────────────────────────────

type MidiaDemand = {
  id: string; sourceType: 'agenda' | 'manual'
  title: string; description: string
  status: 'pendente' | 'em_andamento' | 'concluida' | 'cancelada'
  churchName: string; createdAt: string; dueDate: string | null
}

const STATUS_COLORS: Record<string, string> = {
  pendente:     'bg-slate-100 text-slate-600 border-slate-200',
  em_andamento: 'bg-sky-100 text-sky-700 border-sky-200',
  concluida:    'bg-emerald-100 text-emerald-700 border-emerald-200',
  cancelada:    'bg-red-100 text-red-600 border-red-200',
}
const STATUS_LABELS: Record<string, string> = {
  pendente: 'Pendente', em_andamento: 'Em andamento', concluida: 'Concluída', cancelada: 'Cancelada',
}
function formatDate(iso: string | null) {
  if (!iso) return null
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

// ─── Orchestrator Command Center ──────────────────────────────────────────────

function OrchestratorCard({ state, messages }: { state: AgentState; messages: string[] }) {
  const msgContainerRef = useRef<HTMLDivElement>(null)
  const orqResult = state.result as Record<string, unknown> | null
  const isWorking = state.status === 'working'
  const isDone    = state.status === 'done'

  useEffect(() => {
    const el = msgContainerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  return (
    <div className={`rounded-2xl border overflow-hidden h-full flex flex-col transition-all duration-300 ${
      isWorking ? 'border-violet-200 shadow-lg shadow-violet-100/60' : 'border-slate-200 shadow-sm'
    } bg-white`}>
      {/* Header */}
      <div className={`px-4 py-3 border-b flex items-center gap-3 shrink-0 transition-colors ${isWorking ? 'bg-violet-50 border-violet-100' : 'bg-slate-50/60 border-slate-100'}`}>
        <div className={`relative w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shrink-0 transition-shadow ${isWorking ? 'shadow-md shadow-violet-300/50' : ''}`}>
          <Zap className="w-4 h-4 text-white" />
          {isWorking && <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full border-2 border-white flex items-center justify-center"><Loader2 className="w-2.5 h-2.5 text-white animate-spin" /></span>}
          {isDone    && <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center"><CheckCircle2 className="w-2.5 h-2.5 text-white" /></span>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-extrabold text-slate-900 tracking-tight">Diretor de Marketing</p>
            {isWorking && <span className="inline-flex items-center gap-1 text-[9px] font-bold text-violet-700 bg-violet-100 px-2 py-0.5 rounded-full"><span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-ping" />Direcionando</span>}
            {isDone    && <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">Missão completa</span>}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5 truncate">Analisa a demanda e coordena toda a equipe</p>
        </div>
        {isWorking && <div className="flex gap-0.5 shrink-0"><span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce [animation-delay:0ms]" /><span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce [animation-delay:100ms]" /><span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce [animation-delay:200ms]" /></div>}
      </div>

      {/* Current status message */}
      {state.message && state.status !== 'idle' && (
        <div className={`mx-4 mt-3 shrink-0 px-3 py-2.5 rounded-xl border text-xs leading-relaxed ${isWorking ? 'bg-violet-50 border-violet-100 text-violet-800 font-medium' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
          {state.message}
        </div>
      )}

      {/* Message feed */}
      <div ref={msgContainerRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2 min-h-0">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full py-4">
            <p className="text-xs text-slate-300">Aguardando início...</p>
          </div>
        ) : messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 transition-opacity ${i === messages.length - 1 ? 'opacity-100' : 'opacity-45'}`}>
            <div className="w-5 h-5 rounded-full bg-violet-100 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-[8px] font-black text-violet-600 tabular-nums">{i + 1}</span>
            </div>
            <div className={`flex-1 rounded-xl px-2.5 py-1.5 ${i === messages.length - 1 ? 'bg-violet-50 border border-violet-100' : 'bg-slate-50'}`}>
              <p className="text-[11px] text-slate-700 leading-relaxed">{msg}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Done — plan summary */}
      {isDone && orqResult && (
        <div className="shrink-0 border-t border-slate-100 px-4 py-3 grid grid-cols-2 gap-3 bg-slate-50/40">
          {orqResult.plano != null && String(orqResult.plano).length > 0 ? (
            <div className="col-span-2">
              <p className="text-[9px] font-bold text-violet-500 uppercase tracking-widest mb-0.5">Plano executado</p>
              <p className="text-[11px] text-slate-600 line-clamp-2">{String(orqResult.plano)}</p>
            </div>
          ) : null}
          {orqResult.tom != null && String(orqResult.tom).length > 0 ? (
            <div>
              <p className="text-[9px] font-bold text-violet-500 uppercase tracking-widest mb-0.5">Tom</p>
              <p className="text-[11px] text-slate-600">{String(orqResult.tom)}</p>
            </div>
          ) : null}
          {orqResult.prioridade != null && String(orqResult.prioridade).length > 0 ? (
            <div>
              <p className="text-[9px] font-bold text-violet-500 uppercase tracking-widest mb-0.5">Prioridade</p>
              <p className="text-[11px] text-slate-600">{String(orqResult.prioridade)}</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

// ─── Agent Result (light theme) ───────────────────────────────────────────────

function AgentResultCompact({ agentId, result }: { agentId: AgentId; result: Record<string, unknown> }) {
  if (agentId === 'analista') {
    const analise = (result.analise ?? result) as Record<string, unknown>
    return (
      <div className="text-[11px] text-slate-600 space-y-1">
        {analise?.resumo != null && String(analise.resumo).length > 0 ? <p className="line-clamp-3 leading-relaxed">{String(analise.resumo)}</p> : null}
        {Array.isArray(analise?.insights) && (analise.insights as string[]).slice(0, 2).map((ins, i) => (
          <p key={i} className="flex gap-1.5"><span className="text-blue-500 font-bold shrink-0">{i+1}.</span><span className="line-clamp-1">{String(ins)}</span></p>
        ))}
      </div>
    )
  }
  if (agentId === 'estrategista') return (
    <div className="text-[11px] text-slate-600 space-y-1">
      {result.objetivo != null && String(result.objetivo).length > 0 ? <p><span className="font-semibold text-slate-700">Objetivo:</span> <span className="line-clamp-2">{String(result.objetivo)}</span></p> : null}
      {result.angulo != null && String(result.angulo).length > 0 ? <p><span className="font-semibold text-slate-700">Ângulo:</span> <span className="line-clamp-1">{String(result.angulo)}</span></p> : null}
    </div>
  )
  if (agentId === 'redator') return (
    <div className="text-[11px] text-slate-600 space-y-1">
      {result.legenda != null && String(result.legenda).length > 0 ? <p className="line-clamp-4 whitespace-pre-wrap leading-relaxed">{String(result.legenda)}</p> : null}
      {result.cta != null && String(result.cta).length > 0 ? <p className="text-sky-600 font-semibold">→ {String(result.cta)}</p> : null}
    </div>
  )
  if (agentId === 'diretor_arte') return (
    <div className="text-[11px] text-slate-600 space-y-1">
      {result.conceito_visual != null && String(result.conceito_visual).length > 0 ? <p className="line-clamp-2 leading-relaxed">{String(result.conceito_visual)}</p> : null}
      {result.paleta != null && String(result.paleta).length > 0 ? <p className="text-rose-600 font-medium line-clamp-1">{String(result.paleta)}</p> : null}
    </div>
  )
  if (agentId === 'designer') {
    const url = String(result.url || '')
    return url ? (
      <div className="rounded-xl overflow-hidden border border-slate-200">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="Arte gerada" className="w-full object-cover max-h-56" />
        <div className="px-3 py-1.5 flex items-center justify-between bg-slate-50 border-t border-slate-100">
          <p className="text-[9px] text-slate-400 font-medium">Arte gerada pela IA</p>
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-[9px] text-violet-600 hover:underline font-medium">Abrir em nova aba</a>
        </div>
      </div>
    ) : <p className="text-[11px] text-red-500">Arte não disponível</p>
  }
  if (agentId === 'social_manager') {
    const tags = Array.isArray(result.hashtags) ? (result.hashtags as string[]).slice(0, 5) : []
    return (
      <div className="text-[11px] text-slate-600 space-y-1">
        {result.tipo_post != null && result.plataforma != null && String(result.tipo_post).length > 0 && String(result.plataforma).length > 0 ? (
          <p><span className="font-bold text-emerald-700">{String(result.tipo_post)}</span> · {String(result.plataforma)}</p>
        ) : null}
        {result.melhor_horario != null && String(result.melhor_horario).length > 0 ? <p className="text-slate-500 line-clamp-1">{String(result.melhor_horario)}</p> : null}
        {tags.length > 0 && <p className="text-emerald-600 font-medium">#{tags.join(' #')}{(result.hashtags as string[]).length > 5 ? '…' : ''}</p>}
      </div>
    )
  }
  return null
}

// ─── Flow Rail — progresso horizontal ─────────────────────────────────────────

function FlowRail({ agents }: { agents: Record<AgentId, AgentState> }) {
  return (
    <div className="border-b border-slate-100 px-4 py-3 bg-white overflow-x-auto">
      <div className="flex items-start gap-0 w-fit mx-auto">
        {AGENT_ORDER.map((id, i) => {
          const meta      = AGENT_META[id]
          const Icon      = meta.icon
          const st        = agents[id]
          const isDone    = st.status === 'done'
          const isWorking = st.status === 'working'
          const isError   = st.status === 'error'
          const isLast    = i === AGENT_ORDER.length - 1
          return (
            <div key={id} className="flex items-center">
              <div className="flex flex-col items-center gap-1.5 w-[62px]">
                <div className={`relative w-9 h-9 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                  isWorking ? `bg-gradient-to-br ${meta.cor} shadow-lg scale-110` :
                  isDone    ? `bg-gradient-to-br ${meta.cor}` :
                  isError   ? 'bg-red-100 border border-red-200' :
                  'bg-slate-100 border border-slate-200'
                }`}>
                  <Icon className={`w-4 h-4 transition-colors ${isWorking || isDone ? 'text-white' : isError ? 'text-red-400' : 'text-slate-400'}`} />
                  {isDone    && <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center"><CheckCircle2 className="w-2.5 h-2.5 text-white" /></span>}
                  {isWorking && <span className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full border-2 border-violet-300 shadow flex items-center justify-center"><Loader2 className="w-2.5 h-2.5 text-violet-600 animate-spin" /></span>}
                  {isError   && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white flex items-center justify-center"><XCircle className="w-2.5 h-2.5 text-white" /></span>}
                  {isWorking && <span className="absolute inset-0 rounded-2xl ring-2 ring-violet-300 ring-offset-1 animate-pulse" />}
                </div>
                <p className={`text-[9px] font-semibold text-center leading-tight w-full truncate px-0.5 transition-colors ${
                  isWorking ? 'text-violet-700' : isDone ? 'text-emerald-600' : isError ? 'text-red-500' : 'text-slate-400'
                }`}>{meta.label}</p>
              </div>
              {!isLast && (
                <div className={`w-5 h-0.5 mb-5 rounded-full transition-all duration-700 shrink-0 ${
                  isDone ? 'bg-emerald-400' : isWorking ? 'bg-violet-300 animate-pulse' : 'bg-slate-200'
                }`} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Agent Feed — cards dos agentes ativos/concluídos ─────────────────────────

function AgentFeed({ agents }: { agents: Record<AgentId, AgentState> }) {
  const visible = AGENT_ORDER.filter((id) =>
    id !== 'orquestrador' &&
    (agents[id].status === 'working' || agents[id].status === 'done' || agents[id].status === 'error')
  )

  if (visible.length === 0) return (
    <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
      <div className="w-12 h-12 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-500">Orquestrador planejando...</p>
        <p className="text-xs text-slate-400 mt-0.5">Os agentes serão acionados em breve</p>
      </div>
    </div>
  )

  return (
    <div className="space-y-3">
      {visible.map((id) => {
        const meta      = AGENT_META[id]
        const Icon      = meta.icon
        const st        = agents[id]
        const isWorking = st.status === 'working'
        const isDone    = st.status === 'done'
        const isError   = st.status === 'error'
        const r         = st.result as Record<string, unknown> | null

        return (
          <div key={id} className={`rounded-2xl border overflow-hidden transition-all duration-300 bg-white ${
            isWorking ? 'border-violet-200 shadow-md shadow-violet-100/50' :
            isError   ? 'border-red-200' :
            'border-slate-200 shadow-sm'
          }`}>
            {/* Card header */}
            <div className={`flex items-center gap-2.5 px-4 py-2.5 border-b ${
              isWorking ? 'bg-violet-50 border-violet-100' :
              isDone    ? 'bg-slate-50/70 border-slate-100' :
              'bg-red-50/50 border-red-100'
            }`}>
              <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${meta.cor} flex items-center justify-center shrink-0 ${isWorking ? 'shadow-sm' : ''}`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-bold ${isWorking ? 'text-violet-800' : isDone ? 'text-slate-800' : 'text-red-700'}`}>{meta.label}</p>
                <p className={`text-[10px] truncate ${isWorking ? 'text-violet-500 font-medium' : isDone ? 'text-slate-400' : 'text-red-500'}`}>
                  {st.message || meta.papel}
                </p>
              </div>
              {isWorking && <div className="flex gap-0.5 shrink-0"><span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce [animation-delay:0ms]" /><span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce [animation-delay:100ms]" /><span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce [animation-delay:200ms]" /></div>}
              {isDone    && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
              {isError   && <XCircle     className="w-4 h-4 text-red-400     shrink-0" />}
            </div>

            {/* Directive badge */}
            {(isWorking || isDone) && st.directive && (
              <div className="mx-4 mt-2.5 px-2.5 py-1.5 rounded-lg bg-indigo-50 border border-indigo-100">
                <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-wide mb-0.5">Diretriz do Diretor</p>
                <p className="text-[10px] text-indigo-700 leading-relaxed line-clamp-2">{st.directive}</p>
              </div>
            )}

            {/* Working state */}
            {isWorking && (
              <div className="flex items-center gap-2 px-4 py-3">
                <Loader2 className="w-3.5 h-3.5 text-violet-500 animate-spin shrink-0" />
                <p className="text-xs text-violet-600">{st.message || 'Processando...'}</p>
              </div>
            )}

            {/* Result */}
            {isDone && r && (
              <div className="px-4 py-3">
                <AgentResultCompact agentId={id} result={r} />
              </div>
            )}

            {/* Error */}
            {isError && (
              <div className="px-4 py-2.5">
                <p className="text-[11px] text-red-500 line-clamp-2">{st.message}</p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Approval Panel ───────────────────────────────────────────────────────────

function ApprovalPanel({
  summary,
  onApprove,
  onReject,
}: {
  summary:   ApprovalSummary
  onApprove: (integrationId: string) => void
  onReject:  () => void
}) {
  const [integrations,  setIntegrations]  = useState<{ id: string; label: string }[]>([])
  const [selectedInteg, setSelectedInteg] = useState('')
  const [publishing,    setPublishing]    = useState(false)

  useEffect(() => {
    adminFetchJson<{ integrations?: { id: string; page_name: string | null; instagram_username: string | null; is_active: boolean }[] }>('/api/meta/integrations')
      .then((data) => {
        const list = (Array.isArray(data) ? data : data.integrations ?? []) as { id: string; page_name: string | null; instagram_username: string | null; is_active: boolean }[]
        setIntegrations(
          list.filter((i) => i.is_active).map((i) => ({
            id:    i.id,
            label: i.instagram_username ? `@${i.instagram_username}` : i.page_name ?? i.id,
          }))
        )
      })
      .catch(() => {})
  }, [])

  return (
    <div className="rounded-2xl border-2 border-violet-200 bg-white overflow-hidden shadow-lg shadow-violet-100/60">
      {/* Header */}
      <div className="relative bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3.5 flex items-center gap-3 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_left,rgba(255,255,255,0.1),transparent_60%)]" />
        <div className="relative w-8 h-8 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div className="relative flex-1">
          <p className="text-sm font-extrabold text-white">Conteúdo pronto para aprovação</p>
          <p className="text-[10px] text-violet-200">O Social Media Manager já definiu a programação</p>
        </div>
        <div className="relative flex gap-0.5">
          <span className="w-2 h-2 bg-white/70 rounded-full animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 bg-white/70 rounded-full animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 bg-white/70 rounded-full animate-bounce [animation-delay:300ms]" />
        </div>
      </div>

      <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Arte */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Arte gerada</p>
          {summary.artUrl ? (
            <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={summary.artUrl} alt="Arte" className="w-full object-contain bg-slate-50 max-h-52" />
              <div className="px-3 py-1.5 bg-white border-t border-slate-100 flex items-center justify-between">
                <p className="text-[9px] text-slate-400">Arte gerada pela IA</p>
                <a href={summary.artUrl} target="_blank" rel="noopener noreferrer" className="text-[9px] text-violet-600 hover:underline font-medium">Abrir em nova aba</a>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center h-32">
              <p className="text-xs text-slate-400">Arte não gerada</p>
            </div>
          )}
          {summary.estrategia && (
            <div className="rounded-xl bg-violet-50 border border-violet-100 px-3 py-2">
              <p className="text-[9px] font-bold text-violet-500 uppercase tracking-wide mb-0.5">Estratégia</p>
              <p className="text-xs text-slate-700 leading-relaxed">{summary.estrategia}</p>
            </div>
          )}
        </div>

        {/* Conteúdo */}
        <div className="space-y-3">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Legenda</p>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 max-h-36 overflow-y-auto">
              <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">{summary.legenda}</p>
            </div>
          </div>
          {summary.cta && (
            <div className="rounded-xl bg-sky-50 border border-sky-100 px-3 py-2">
              <p className="text-[9px] font-bold text-sky-500 uppercase tracking-wide mb-0.5">CTA</p>
              <p className="text-xs text-slate-700">{summary.cta}</p>
            </div>
          )}
          {summary.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {summary.hashtags.slice(0, 8).map((h, i) => (
                <span key={i} className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full font-medium">#{h}</span>
              ))}
              {summary.hashtags.length > 8 && <span className="text-[10px] text-slate-400">+{summary.hashtags.length - 8}</span>}
            </div>
          )}
        </div>
      </div>

      {/* Ação */}
      <div className="border-t border-slate-100 px-4 sm:px-5 pb-5 pt-4 space-y-4 bg-slate-50/40">

        {/* Programação do Social Manager — só leitura */}
        {(summary.plataforma || summary.tipo_post || summary.melhor_horario) && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3">
            <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mb-2">Programação definida pelo Social Media Manager</p>
            <div className="flex flex-wrap gap-4">
              {summary.plataforma    && <div><p className="text-[9px] text-emerald-500 font-medium mb-0.5">Plataforma</p><p className="text-xs font-semibold text-slate-700">{summary.plataforma}</p></div>}
              {summary.tipo_post     && <div><p className="text-[9px] text-emerald-500 font-medium mb-0.5">Tipo de post</p><p className="text-xs font-semibold text-slate-700">{summary.tipo_post}</p></div>}
              {summary.melhor_horario && <div className="flex-1"><p className="text-[9px] text-emerald-500 font-medium mb-0.5">Melhor horário</p><p className="text-xs font-semibold text-slate-700">{summary.melhor_horario}</p></div>}
            </div>
          </div>
        )}

        {/* Seleção de conta */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Em qual conta publicar?</label>
          {integrations.length > 0 ? (
            <CustomSelect
              value={selectedInteg}
              onChange={setSelectedInteg}
              options={integrations.map((i) => ({ value: i.id, label: i.label }))}
              placeholder="Selecione a conta..."
              allowEmpty
            />
          ) : (
            <p className="text-xs text-slate-400 italic py-1">Nenhuma conta conectada — configure em Integrações Meta.</p>
          )}
        </div>

        {/* Ações */}
        <div className="flex gap-3">
          <button type="button" onClick={onReject}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            Rejeitar e revisar
          </button>
          <button
            type="button"
            disabled={publishing || !selectedInteg}
            onClick={() => { setPublishing(true); onApprove(selectedInteg) }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-sm font-bold transition-all disabled:opacity-50 shadow-md shadow-violet-200"
          >
            {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {publishing ? 'Programando...' : 'Aprovar e programar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MidiaDemandasPage() {
  const [session,      setSession]      = useState<Session>(IDLE_SESSION)
  const [drawerOpen,   setDrawerOpen]   = useState(false)
  const [demands,      setDemands]      = useState<MidiaDemand[]>([])
  const [demandsLoad,  setDemandsLoad]  = useState(true)
  const [demandsOpen,  setDemandsOpen]  = useState(true)
  const [scheduleOk,   setScheduleOk]   = useState(false)
  const [scheduleErr,  setScheduleErr]  = useState('')
  const [followUpText, setFollowUpText] = useState('')

  const readerRef             = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null)
  const logIdRef              = useRef(0)
  const logContainerRef       = useRef<HTMLDivElement>(null)
  const lastOrchestratorMsg   = useRef('')
  const solicitacaoInicialRef = useRef('')
  const lastConfigRef         = useRef<AgentConfig | null>(null)
  const lastSelectedRefsRef   = useRef<string[]>([])

  // Load demands
  useEffect(() => {
    let active = true
    adminFetchJson<{ items?: MidiaDemand[] }>('/api/admin/midia/demandas')
      .then((res) => { if (active) setDemands(res.items ?? []) })
      .catch(() => { if (active) setDemands([]) })
      .finally(() => { if (active) setDemandsLoad(false) })
    return () => { active = false }
  }, [])

  // Auto-scroll log — rola só o container, não a página
  useEffect(() => {
    const el = logContainerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [session.log])

  const addLog = useCallback((entry: Omit<LogEntry, 'id' | 'ts'>) => {
    setSession((prev) => ({
      ...prev,
      log: [...prev.log, { ...entry, id: ++logIdRef.current, ts: Date.now() }],
    }))
  }, [])

  const startSession = useCallback(async (
    solicitacao: string,
    config: AgentConfig,
    selectedRefs: string[],
    opts?: { continuacao?: boolean; resultadosAnteriores?: Record<string, unknown> },
  ) => {
    // Cancel any existing stream
    readerRef.current?.cancel()

    lastOrchestratorMsg.current = ''
    setScheduleOk(false)
    setScheduleErr('')
    setFollowUpText('')

    const continuacao = opts?.continuacao === true

    if (!continuacao) {
      solicitacaoInicialRef.current = solicitacao
      setSession({ ...IDLE_SESSION, status: 'running' })
      addLog({ kind: 'system', message: `Nova sessão iniciada: "${solicitacao}"` })
    } else {
      setSession((prev) => ({
        ...IDLE_SESSION,
        status: 'running',
        log: [
          ...prev.log,
          {
            kind:    'system',
            message: `Nova instrução ao Diretor: "${solicitacao}"`,
            id:      ++logIdRef.current,
            ts:      Date.now(),
          },
        ],
        podeContinuarConversa: false,
      }))
    }

    lastConfigRef.current       = config
    lastSelectedRefsRef.current = selectedRefs

    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null
    try {
      const token = await getAccessTokenOrThrow()
      const res = await fetch('/api/admin/midia/equipe-ia/sessao', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body:    JSON.stringify({
          solicitacao,
          config,
          selectedRefs,
          continuacao,
          solicitacaoInicial: solicitacaoInicialRef.current,
          resultadosAnteriores: continuacao ? opts?.resultadosAnteriores : undefined,
        }),
      })

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`)
      }

      reader         = res.body.getReader()
      readerRef.current = reader
      const decoder  = new TextDecoder()
      let   buffer   = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const chunks = buffer.split('\n\n')
        buffer       = chunks.pop() ?? ''

        for (const chunk of chunks) {
          if (!chunk.startsWith('data: ')) continue
          try {
            const ev = JSON.parse(chunk.slice(6))
            handleSSEEvent(ev)
          } catch { /* ignore parse errors */ }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido.'
      addLog({ kind: 'error', message: `Erro na sessão: ${msg}` })
      setSession((prev) => ({ ...prev, status: 'error' }))
    } finally {
      readerRef.current = null
    }
  }, [addLog]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSSEEvent = useCallback((ev: Record<string, unknown>) => {
    const type = ev.type as string

    if (type === 'agent_start') {
      const agent     = ev.agent   as AgentId
      const message   = ev.message as string
      const directive = lastOrchestratorMsg.current
      setSession((prev) => ({
        ...prev,
        agents: { ...prev.agents, [agent]: { status: 'working', message, result: null, directive } },
      }))
      addLog({ kind: 'agent', agentId: agent, message })
    }

    if (type === 'agent_progress') {
      const agent   = ev.agent   as AgentId
      const message = ev.message as string
      setSession((prev) => ({
        ...prev,
        agents: { ...prev.agents, [agent]: { ...prev.agents[agent], message } },
      }))
      addLog({ kind: 'agent', agentId: agent, message })
    }

    if (type === 'agent_done') {
      const agent   = ev.agent   as AgentId
      const message = ev.message as string
      const result  = ev.result
      setSession((prev) => ({
        ...prev,
        agents: { ...prev.agents, [agent]: { ...prev.agents[agent], status: 'done', message, result } },
      }))
      addLog({ kind: 'agent', agentId: agent, message: `✓ ${message}` })
    }

    if (type === 'agent_error') {
      const agent   = ev.agent   as AgentId
      const message = ev.message as string
      setSession((prev) => ({
        ...prev,
        agents: { ...prev.agents, [agent]: { ...prev.agents[agent], status: 'error', message, result: null } },
      }))
      addLog({ kind: 'error', agentId: agent, message })
    }

    if (type === 'orchestrator_message') {
      const msg = ev.message as string
      lastOrchestratorMsg.current = msg
      addLog({ kind: 'orchestrator', message: msg })
      setSession((prev) => ({
        ...prev,
        orchestratorMsgs: [...prev.orchestratorMsgs, msg],
      }))
    }

    if (type === 'approval_required') {
      setSession((prev) => ({
        ...prev,
        status:                'approval',
        approval:              ev.summary as ApprovalSummary,
        podeContinuarConversa: false,
      }))
      addLog({ kind: 'orchestrator', message: '⏸️ Aguardando aprovação do usuário...' })
    }

    if (type === 'round_complete') {
      const msg = typeof ev.message === 'string' ? ev.message : 'Rodada concluída.'
      addLog({ kind: 'orchestrator', message: msg })
      setSession((prev) => ({
        ...prev,
        status:                'done',
        approval:              null,
        podeContinuarConversa: true,
      }))
    }

    if (type === 'error') {
      addLog({ kind: 'error', message: ev.message as string })
      setSession((prev) => ({ ...prev, status: 'error' }))
    }

    if (type === 'done') {
      setSession((prev) => ({
        ...prev,
        status: prev.status === 'approval' ? 'approval' : 'done',
      }))
    }
  }, [addLog])

  const handleApprove = useCallback(async (integrationId: string) => {
    const summary = session.approval
    if (!summary) return

    // Deriva scheduledAt a partir da recomendação do Social Manager
    const match = summary.melhor_horario?.match(/(\d{1,2})h/)
    const d = new Date()
    d.setDate(d.getDate() + 1)
    d.setHours(match ? parseInt(match[1], 10) : 9, 0, 0, 0)
    const scheduledAt = d.toISOString()

    // Deriva postType a partir do Social Manager (fallback: 'feed')
    const rawTipo = (summary.tipo_post ?? '').toLowerCase()
    const postType = rawTipo.includes('reel') ? 'reel' : rawTipo.includes('story') ? 'story' : 'feed'

    const caption = summary.legenda +
      (summary.hashtags.length > 0 ? `\n\n#${summary.hashtags.join(' #')}` : '')

    try {
      await adminFetchJson('/api/admin/midia/equipe-ia/programar', {
        method: 'POST',
        body: JSON.stringify({
          imageUrl:       summary.artUrl,
          caption,
          integrationIds: [integrationId],
          scheduledAt,
          postType,
          destinations: { instagram: true, facebook: false },
        }),
      })
      setScheduleOk(true)
      setSession((prev) => ({ ...prev, status: 'done', podeContinuarConversa: false }))
      addLog({ kind: 'orchestrator', message: '🚀 Post aprovado e programado com sucesso! Missão completa.' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao agendar.'
      setScheduleErr(msg)
      addLog({ kind: 'error', message: `Falha ao programar: ${msg}` })
    }
  }, [session.approval, addLog])

  const resetSession = useCallback(() => {
    readerRef.current?.cancel()
    setSession(IDLE_SESSION)
    setScheduleOk(false)
    setScheduleErr('')
    setFollowUpText('')
    solicitacaoInicialRef.current = ''
    lastConfigRef.current         = null
    lastSelectedRefsRef.current   = []
  }, [])

  const enviarContinuacao = useCallback(() => {
    const t = followUpText.trim()
    if (!t || !lastConfigRef.current) return
    const res = buildResultadosAnteriores(session.agents)
    void startSession(t, lastConfigRef.current, lastSelectedRefsRef.current, { continuacao: true, resultadosAnteriores: res })
  }, [followUpText, session.agents, startSession])

  const isRunning = session.status === 'running'

  return (
    <PageAccessGuard pageKey="instagram">
      <div className="p-3 sm:p-4 md:p-6 space-y-5">
        <AdminPageHeader
          icon={ClipboardList}
          title="Demandas de Mídia"
          subtitle="Workbench da equipe de IA — visualize os agentes trabalhando em tempo real."
          backLink={{ href: '/admin/midia/agenda-social', label: 'Voltar para Agenda' }}
        />

        <Link
          href="/admin/midia/referencias-design"
          className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50/80 px-4 py-2.5 text-sm font-semibold text-violet-800 hover:bg-violet-100 transition-colors"
        >
          <BookOpen className="w-4 h-4 shrink-0" />
          Biblioteca de referências visuais (bucket + descrições IA)
        </Link>

        {/* ── WORKBENCH ──────────────────────────────────────────────────── */}
        <section className="rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm">

          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-900 to-slate-800">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-md">
              <Bot className="w-5 h-5 text-white" />
              {isRunning && <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full border-2 border-slate-900 animate-pulse" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-extrabold text-white tracking-tight">Workbench — Equipe de IA</p>
                {session.status === 'idle'     && <span className="text-[9px] font-bold text-slate-400 bg-slate-700 px-2 py-0.5 rounded-full">7 agentes prontos</span>}
                {isRunning                      && <span className="inline-flex items-center gap-1 text-[9px] font-bold text-violet-300 bg-violet-500/20 border border-violet-500/30 px-2 py-0.5 rounded-full"><span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-ping" />Em execução</span>}
                {session.status === 'approval' && <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-300 bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded-full"><span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />Aguardando aprovação</span>}
                {session.status === 'done'     && <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded-full"><CheckCircle2 className="w-2.5 h-2.5" />Concluído</span>}
                {session.status === 'error'    && <span className="inline-flex items-center gap-1 text-[9px] font-bold text-red-300 bg-red-500/20 border border-red-500/30 px-2 py-0.5 rounded-full"><XCircle className="w-2.5 h-2.5" />Erro</span>}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {session.status === 'idle'     && 'O Diretor de Marketing coordena a equipe até a aprovação final'}
                {isRunning                      && 'Agentes trabalhando em tempo real — acompanhe o progresso abaixo'}
                {session.status === 'approval' && 'Revise e aprove o conteúdo gerado pela equipe'}
                {session.status === 'done'     && (session.podeContinuarConversa ? 'Rodada concluída — você pode enviar nova instrução ao Diretor' : (scheduleOk ? 'Post programado com sucesso' : 'Sessão encerrada'))}
                {session.status === 'error'    && 'Sessão encerrada com erro — tente novamente'}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {session.status !== 'idle' && (
                <button type="button" onClick={resetSession}
                  className="px-3 py-1.5 rounded-xl border border-slate-600 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors">
                  Nova sessão
                </button>
              )}
              <button type="button" onClick={() => setDrawerOpen(true)} disabled={isRunning}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-500 hover:bg-violet-600 text-white text-sm font-bold transition-colors disabled:opacity-40 shadow-sm">
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">Nova solicitação</span>
                <span className="sm:hidden">Solicitar</span>
              </button>
            </div>
          </div>

          {/* Body */}
          {session.status === 'idle' ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-14 px-6 text-center gap-8 bg-gradient-to-b from-white to-slate-50/60">
              {/* Agent pipeline visual */}
              <div className="flex items-center gap-0">
                {AGENT_ORDER.map((id, i) => {
                  const m    = AGENT_META[id]
                  const Icon = m.icon
                  return (
                    <div key={id} className="flex items-center">
                      <div className="flex flex-col items-center gap-1.5 group">
                        <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${m.cor} flex items-center justify-center shadow-sm group-hover:scale-110 group-hover:shadow-md transition-all duration-200`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <p className="text-[8px] font-semibold text-slate-400 w-14 leading-tight text-center">{m.label}</p>
                      </div>
                      {i < AGENT_ORDER.length - 1 && (
                        <div className="flex gap-0.5 items-center mb-5 mx-0.5">
                          <span className="w-1 h-1 bg-slate-300 rounded-full" />
                          <span className="w-1 h-1 bg-slate-200 rounded-full" />
                          <span className="w-1 h-1 bg-slate-200 rounded-full" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="space-y-2">
                <p className="text-xl font-extrabold text-slate-800 tracking-tight">Equipe de IA pronta para trabalhar</p>
                <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
                  O <strong className="text-slate-600">Diretor de Marketing</strong> define só as etapas necessárias: pesquisa em redes, texto, arte ou fluxo completo. Depois você pode pedir mais na mesma sessão.
                </p>
              </div>

              <button type="button" onClick={() => setDrawerOpen(true)}
                className="flex items-center gap-2 px-7 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-sm font-bold transition-all shadow-md shadow-violet-200 hover:shadow-violet-300 hover:-translate-y-0.5">
                <Sparkles className="w-4 h-4" />
                Nova solicitação
              </button>
            </div>
          ) : (
            <div>
              {/* Flow rail — progresso horizontal de todos os agentes */}
              <FlowRail agents={session.agents} />

              {/* Body — 2 colunas */}
              <div className="p-4 grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">

                {/* Coluna esquerda: Orquestrador */}
                <div className="lg:col-span-2 lg:sticky lg:top-4">
                  <OrchestratorCard
                    state={session.agents.orquestrador}
                    messages={session.orchestratorMsgs}
                  />
                </div>

                {/* Coluna direita: Feed de agentes + painéis */}
                <div className="lg:col-span-3 space-y-4">
                  <AgentFeed agents={session.agents} />

                  {/* Continuação da mesma demanda (sem painel de aprovação) */}
                  {session.status === 'done' && session.podeContinuarConversa && !scheduleOk && (
                    <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50/80 p-4 space-y-3 shadow-sm">
                      <p className="text-xs font-bold text-violet-900">Nova instrução ao Diretor (mesma demanda)</p>
                      <p className="text-[10px] text-violet-700 leading-relaxed">
                        O orquestrador usa os resultados já exibidos acima como contexto. Peça outra análise, só arte, só legenda, etc.
                      </p>
                      <textarea
                        value={followUpText}
                        onChange={(e) => setFollowUpText(e.target.value)}
                        placeholder="Ex.: Agora gere só uma variação de legenda mais curta / Analise só os Reels / Crie outra arte no mesmo estilo..."
                        rows={3}
                        className="w-full text-sm rounded-xl border border-violet-200 bg-white px-3 py-2.5 focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 outline-none resize-none placeholder-slate-400"
                      />
                      <button
                        type="button"
                        disabled={!followUpText.trim() || isRunning}
                        onClick={enviarContinuacao}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold transition-colors disabled:opacity-40"
                      >
                        <Sparkles className="w-4 h-4" />
                        Enviar ao Diretor de Marketing
                      </button>
                    </div>
                  )}

                  {/* Approval panel */}
                  {session.status === 'approval' && session.approval && !scheduleOk && (
                    <div>
                      <ApprovalPanel
                        summary={session.approval}
                        onApprove={handleApprove}
                        onReject={resetSession}
                      />
                      {scheduleErr && (
                        <p className="mt-2 text-xs text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-xl">{scheduleErr}</p>
                      )}
                    </div>
                  )}

                  {/* Success */}
                  {scheduleOk && (
                    <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-6 text-center space-y-3">
                      <div className="w-14 h-14 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-emerald-700">Post programado com sucesso!</p>
                        <p className="text-xs text-emerald-500 mt-0.5">Acompanhe em Postagens Programadas.</p>
                      </div>
                      <button type="button" onClick={resetSession}
                        className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors">
                        Nova sessão
                      </button>
                    </div>
                  )}

                  {/* Activity log (collapsible) */}
                  <details className="group">
                    <summary className="flex items-center gap-2 cursor-pointer text-[10px] font-bold text-slate-400 uppercase tracking-widest select-none list-none hover:text-slate-600 transition-colors">
                      <Clock className="w-3 h-3" />
                      Log de atividade
                      <span className="ml-auto">{session.log.length}</span>
                      <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
                    </summary>
                    <div ref={logContainerRef} className="mt-2 max-h-52 overflow-y-auto space-y-1 pr-1">
                      {session.log.map((entry) => {
                        const agentMeta = entry.agentId ? AGENT_META[entry.agentId] : null
                        return (
                          <div key={entry.id} className={`rounded-lg px-3 py-1.5 text-xs leading-relaxed ${
                            entry.kind === 'orchestrator' ? 'bg-violet-50 border border-violet-100 text-violet-800 font-medium' :
                            entry.kind === 'error'        ? 'bg-red-50 border border-red-100 text-red-600' :
                            entry.kind === 'system'       ? 'bg-slate-100 text-slate-500 text-[10px]' :
                            'bg-slate-50 border border-slate-100 text-slate-600'
                          }`}>
                            {agentMeta && entry.kind === 'agent' && (
                              <span className="inline-block font-bold mr-1.5 text-[10px] uppercase text-slate-400">[{agentMeta.label}]</span>
                            )}
                            {entry.message}
                          </div>
                        )
                      })}
                    </div>
                  </details>
                </div>

              </div>
            </div>
          )}
        </section>

        {/* ── DEMANDAS ─────────────────────────────────────────────────────── */}
        <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <button type="button" onClick={() => setDemandsOpen((v) => !v)}
            className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-50 transition-colors text-left border-b border-slate-100">
            <ClipboardList className="w-5 h-5 text-slate-500" />
            <span className="flex-1 text-sm font-semibold text-slate-700">Demandas de Mídia</span>
            {!demandsLoad && <span className="text-xs text-slate-400">{demands.length} demanda{demands.length !== 1 ? 's' : ''}</span>}
            {demandsOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {demandsOpen && (
            <div className="p-3 sm:p-5 space-y-3">
              {demandsLoad ? (
                <div className="flex items-center gap-2 text-sm text-slate-400 py-4">
                  <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
                </div>
              ) : demands.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-10 text-center gap-2">
                  <ClipboardList className="h-8 w-8 text-slate-300" />
                  <p className="text-sm font-medium text-slate-500">Nenhuma demanda cadastrada ainda</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {demands.map((item) => {
                    const isOverdue = item.dueDate && item.status !== 'concluida' && item.status !== 'cancelada' && item.dueDate < new Date().toISOString().slice(0, 10)
                    return (
                      <Link key={item.id} href={`/admin/midia/demandas/${item.id}`}
                        className={`group flex items-center justify-between rounded-xl border bg-white px-3 py-3 sm:px-4 hover:shadow-sm transition-shadow ${isOverdue ? 'border-red-200 hover:border-red-300' : 'border-slate-200 hover:border-slate-300'}`}>
                        <div className={`sm:hidden w-1 self-stretch rounded-full mr-3 shrink-0 ${item.status === 'concluida' ? 'bg-emerald-400' : item.status === 'em_andamento' ? 'bg-sky-400' : item.status === 'cancelada' ? 'bg-red-400' : isOverdue ? 'bg-red-400' : 'bg-slate-200'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 group-hover:text-[#c62737] transition-colors truncate">{item.title}</p>
                          <div className="hidden sm:flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                            <span>{item.churchName}</span>
                            <span className="text-slate-300">·</span>
                            <span>{item.sourceType === 'agenda' ? 'Agenda' : 'Manual'}</span>
                            {item.dueDate && <>
                              <span className="text-slate-300">·</span>
                              <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-semibold' : ''}`}>
                                <CalendarDays className="h-3 w-3" />{formatDate(item.dueDate)}{isOverdue && ' · Atrasada'}
                              </span>
                            </>}
                          </div>
                        </div>
                        <span className={`ml-3 shrink-0 hidden sm:inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[item.status] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                          {STATUS_LABELS[item.status] ?? item.status}
                        </span>
                      </Link>
                    )
                  })}
                </div>
              )}
              <Link href="/admin/midia/agenda-social"
                className="inline-flex items-center gap-2 rounded-xl bg-[#c62737] px-4 py-2 text-sm font-semibold text-white hover:bg-[#9e1f2e] transition-colors">
                Ir para Agenda
              </Link>
            </div>
          )}
        </section>

        <SessaoDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          onStart={(solicitacao, config, selectedRefs) => {
            setDrawerOpen(false)
            startSession(solicitacao, config, selectedRefs)
          }}
        />
      </div>
    </PageAccessGuard>
  )
}
