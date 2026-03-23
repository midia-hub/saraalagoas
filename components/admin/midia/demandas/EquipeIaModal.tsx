'use client'

import { useEffect, useRef, useState } from 'react'
import {
  BarChart2,
  Bot,
  ChevronDown,
  ChevronUp,
  Hash,
  Image as ImageIcon,
  Loader2,
  Palette,
  PenLine,
  Send,
  Sparkles,
  Target,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react'
import { adminFetchJson } from '@/lib/admin-client'
import { CustomSelect } from '@/components/ui/CustomSelect'
import type { AgentConfig } from '@/app/admin/midia/demandas/page'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnalistaConta {
  integrationId:    string
  nome:             string
  username:         string | null
  totalPosts:       number
  mediaLikes:       number
  mediaComentarios: number
  mediaAlcance:     number
  tipoMaisEngajado: string
}

interface AnalistaResult {
  contas:  AnalistaConta[]
  analise: {
    resumo:        string
    insights:      string[]
    referencias:   string[]
    recomendacoes: { formato: string; horario: string; frequencia: string; estilo: string }
  } | null
}

interface EquipeIaResult {
  orquestrador: {
    plano:      string
    tom:        string
    prioridades: string[]
    diretrizes: string
  }
  estrategista: {
    objetivo:      string
    angulo:        string
    formato_ideal: string
    dicas:         string[]
  }
  redator: {
    legenda:  string
    cta:      string
    variacao: string
  }
  diretor_arte: {
    conceito_visual: string
    paleta:          string
    elementos:       string[]
    briefing_arte:   string
  }
  social_manager: {
    hashtags:       string[]
    melhor_horario: string
    frequencia:     string
    engajamento:    string
  }
}

interface MetaIntegration {
  id:                 string
  page_name:          string | null
  instagram_username: string | null
  is_active:          boolean
}

interface EquipeIaModalProps {
  open:         boolean
  onClose:      () => void
  agentConfig:  AgentConfig
  selectedRefs: string[]   // URLs de imagens do repositório selecionadas
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PLATAFORMAS = [
  { value: 'Instagram', label: 'Instagram' },
  { value: 'Facebook',  label: 'Facebook'  },
  { value: 'YouTube',   label: 'YouTube'   },
  { value: 'TikTok',    label: 'TikTok'    },
]
const TIPOS = [
  { value: 'post',      label: 'Post (Feed)' },
  { value: 'story',     label: 'Story'       },
  { value: 'reels',     label: 'Reels'       },
  { value: 'carrossel', label: 'Carrossel'   },
]
const POST_TYPES = [
  { value: 'feed',  label: 'Feed'  },
  { value: 'reel',  label: 'Reel'  },
  { value: 'story', label: 'Story' },
]

// ─── UI helpers ───────────────────────────────────────────────────────────────

function ResultCard({
  icon: Icon, cor, titulo, badge, children, defaultOpen = true,
}: {
  icon: React.ComponentType<{ className?: string }>
  cor: string; titulo: string; badge?: React.ReactNode
  defaultOpen?: boolean; children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
      >
        <div className={`flex items-center justify-center w-7 h-7 rounded-lg ${cor} shrink-0`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <span className="flex-1 text-sm font-semibold text-slate-800">{titulo}</span>
        {badge}
        {open ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
      </button>
      {open && <div className="px-4 pb-4 space-y-3 border-t border-slate-100">{children}</div>}
    </div>
  )
}

function Campo({ label, value }: { label: string; value: string }) {
  return (
    <div className="pt-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">{label}</p>
      <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{value}</p>
    </div>
  )
}

function TagList({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5 pt-3">
      {items.map((item, i) => (
        <span key={i} className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">{item}</span>
      ))}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center">
      <p className="text-base font-bold text-slate-800">{value}</p>
      <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function EquipeIaModal({ open, onClose, agentConfig, selectedRefs }: EquipeIaModalProps) {
  const [evento,     setEvento]     = useState('')
  const [contexto,   setContexto]   = useState('')
  const [plataforma, setPlataforma] = useState('Instagram')
  const [tipo,       setTipo]       = useState('post')

  const [analistaLoading, setAnalistaLoading] = useState(false)
  const [analistaResult,  setAnalistaResult]  = useState<AnalistaResult | null>(null)
  const [analistaError,   setAnalistaError]   = useState('')

  const [equipeLoading, setEquipeLoading] = useState(false)
  const [equipeError,   setEquipeError]   = useState('')
  const [result,        setResult]        = useState<EquipeIaResult | null>(null)

  const [designerLoading, setDesignerLoading] = useState<'prompt' | 'image' | null>(null)
  const [generatedPrompt, setGeneratedPrompt] = useState('')
  const [artUrl,          setArtUrl]          = useState('')
  const [designerError,   setDesignerError]   = useState('')

  const [integrations,    setIntegrations]    = useState<MetaIntegration[]>([])
  const [selectedInteg,   setSelectedInteg]   = useState('')
  const [scheduledAt,     setScheduledAt]     = useState('')
  const [postType,        setPostType]        = useState('feed')
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [scheduleSuccess, setScheduleSuccess] = useState(false)
  const [scheduleError,   setScheduleError]   = useState('')

  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    adminFetchJson<MetaIntegration[] | { integrations?: MetaIntegration[] }>('/api/meta/integrations')
      .then((data) => {
        const list = Array.isArray(data) ? data : ((data as { integrations?: MetaIntegration[] }).integrations ?? [])
        setIntegrations(list.filter((i) => i.is_active))
      })
      .catch(() => {})
  }, [open])

  useEffect(() => {
    if (result) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [result])

  // ── Analista ──────────────────────────────────────────────────────────────
  const rodarAnalista = async () => {
    setAnalistaLoading(true)
    setAnalistaError('')
    try {
      const params = new URLSearchParams({
        periodo: agentConfig.analista.periodo || '30',
        ...(agentConfig.analista.foco ? { foco: agentConfig.analista.foco } : {}),
      })
      const data = await adminFetchJson<AnalistaResult>(`/api/admin/midia/equipe-ia/analista?${params}`)
      setAnalistaResult(data)
    } catch (err) {
      setAnalistaError(err instanceof Error ? err.message : 'Erro ao analisar páginas.')
    } finally {
      setAnalistaLoading(false)
    }
  }

  // ── Equipe principal ──────────────────────────────────────────────────────
  const acionar = async () => {
    if (!evento.trim()) { setEquipeError('Informe o evento ou assunto.'); return }
    setEquipeLoading(true)
    setEquipeError('')
    setResult(null)
    setArtUrl('')
    setGeneratedPrompt('')
    setScheduleSuccess(false)

    const contextoInstagram = analistaResult?.analise
      ? [
          `Resumo: ${analistaResult.analise.resumo}`,
          `Insights: ${analistaResult.analise.insights.join(' | ')}`,
          `Referências: ${analistaResult.analise.referencias.join(', ')}`,
          `Formato recomendado: ${analistaResult.analise.recomendacoes.formato}`,
          `Horário recomendado: ${analistaResult.analise.recomendacoes.horario}`,
        ].join('\n')
      : ''

    try {
      const data = await adminFetchJson<{ result: EquipeIaResult }>('/api/admin/midia/equipe-ia', {
        method: 'POST',
        body: JSON.stringify({
          evento, contexto, plataforma, tipo,
          contexto_instagram: contextoInstagram,
          config: agentConfig,
        }),
      })
      setResult(data.result)
    } catch (err) {
      setEquipeError(err instanceof Error ? err.message : 'Erro ao acionar a equipe.')
    } finally {
      setEquipeLoading(false)
    }
  }

  // ── Designer IA ───────────────────────────────────────────────────────────
  const gerarPrompt = async () => {
    if (!result) return
    setDesignerLoading('prompt')
    setDesignerError('')
    try {
      // Usa a primeira referência do repositório como imagem de referência (se houver)
      const refImage = selectedRefs[0] ?? null
      const payload: Record<string, unknown> = {
        tema:     evento,
        tom:      result.orquestrador?.tom || result.estrategista.angulo,
        formato:  agentConfig.designer.formato || '1024x1024',
        detalhes: [
          result.diretor_arte.briefing_arte,
          agentConfig.diretorArte.elementosObrig,
        ].filter(Boolean).join(' | '),
      }
      if (refImage) {
        // Baixa a imagem do storage e envia como base64 para o gerar-prompt-arte
        try {
          const imgRes  = await fetch(refImage)
          const blob    = await imgRes.blob()
          const base64  = await new Promise<string>((res) => {
            const reader = new FileReader()
            reader.onload = () => res(reader.result as string)
            reader.readAsDataURL(blob)
          })
          payload.reference_image_base64 = base64
        } catch { /* silencioso */ }
      }
      const data = await adminFetchJson<{ prompt: string }>('/api/admin/midia/gerar-prompt-arte', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      setGeneratedPrompt(data.prompt ?? '')
    } catch (err) {
      setDesignerError(err instanceof Error ? err.message : 'Erro ao gerar prompt.')
    } finally {
      setDesignerLoading(null)
    }
  }

  const gerarArte = async () => {
    if (!generatedPrompt.trim()) { setDesignerError('Gere o prompt primeiro.'); return }
    setDesignerLoading('image')
    setDesignerError('')
    try {
      const data = await adminFetchJson<{ images: { url: string }[] }>('/api/admin/midia/gerar-arte', {
        method: 'POST',
        body: JSON.stringify({
          prompt:  generatedPrompt,
          size:    agentConfig.designer.formato || '1024x1024',
          quality: agentConfig.designer.qualidade || 'standard',
        }),
      })
      setArtUrl(data.images?.[0]?.url ?? '')
    } catch (err) {
      setDesignerError(err instanceof Error ? err.message : 'Erro ao gerar arte.')
    } finally {
      setDesignerLoading(null)
    }
  }

  // ── Social Manager — agendar ──────────────────────────────────────────────
  const agendarPost = async () => {
    if (!artUrl)        { setScheduleError('Gere a arte primeiro.');               return }
    if (!selectedInteg) { setScheduleError('Selecione uma conta.');                 return }
    if (!scheduledAt)   { setScheduleError('Informe a data e hora de publicação.'); return }
    if (!result)        return

    setScheduleLoading(true)
    setScheduleError('')
    try {
      const hashtagLine = result.social_manager.hashtags.length > 0
        ? `\n\n#${result.social_manager.hashtags.join(' #')}`
        : ''
      const caption = result.redator.legenda + hashtagLine

      await adminFetchJson('/api/admin/midia/equipe-ia/programar', {
        method: 'POST',
        body: JSON.stringify({
          imageUrl:       artUrl,
          caption,
          integrationIds: [selectedInteg],
          scheduledAt,
          postType,
          destinations: { instagram: true, facebook: false },
        }),
      })
      setScheduleSuccess(true)
    } catch (err) {
      setScheduleError(err instanceof Error ? err.message : 'Erro ao agendar.')
    } finally {
      setScheduleLoading(false)
    }
  }

  const resetar = () => {
    setResult(null)
    setEquipeError('')
    setArtUrl('')
    setGeneratedPrompt('')
    setScheduleSuccess(false)
    setScheduleError('')
    setAnalistaResult(null)
  }

  useEffect(() => {
    if (!result || scheduledAt) return
    const match = result.social_manager.melhor_horario.match(/(\d{1,2})h/)
    if (match) {
      const hour = parseInt(match[1], 10)
      const d    = new Date()
      d.setDate(d.getDate() + 1)
      d.setHours(hour, 0, 0, 0)
      setScheduledAt(d.toISOString().slice(0, 16))
    }
  }, [result]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null

  const integOptions = integrations.map((i) => ({
    value: i.id,
    label: i.instagram_username ? `@${i.instagram_username}` : i.page_name ?? i.id,
  }))

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full sm:max-w-2xl bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[93dvh]">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-slate-800">Sessão da Equipe de IA</h2>
            <p className="text-xs text-slate-500">
              {agentConfig.orquestrador.objetivo
                ? `Objetivo: ${agentConfig.orquestrador.objetivo}`
                : '7 agentes • briefing → resultado completo'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Config summary badges */}
          {(agentConfig.orquestrador.tom || agentConfig.orquestrador.prioridade || selectedRefs.length > 0) && (
            <div className="flex flex-wrap gap-1.5">
              {agentConfig.orquestrador.tom && (
                <span className="text-[10px] font-semibold bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">
                  Tom: {agentConfig.orquestrador.tom}
                </span>
              )}
              {agentConfig.orquestrador.prioridade && (
                <span className="text-[10px] font-semibold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                  Prioridade: {agentConfig.orquestrador.prioridade}
                </span>
              )}
              {selectedRefs.length > 0 && (
                <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                  {selectedRefs.length} referência{selectedRefs.length > 1 ? 's' : ''} no Designer
                </span>
              )}
            </div>
          )}

          {/* Analista — pré-sessão */}
          {!result && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-blue-600" />
                  <p className="text-xs font-semibold text-blue-700">Analista de Instagram</p>
                  {agentConfig.analista.periodo && (
                    <span className="text-[10px] text-blue-500">({agentConfig.analista.periodo} dias)</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={rodarAnalista}
                  disabled={analistaLoading}
                  className="flex items-center gap-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
                >
                  {analistaLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <BarChart2 className="w-3 h-3" />}
                  {analistaLoading ? 'Analisando...' : 'Analisar'}
                </button>
              </div>

              {analistaError && <p className="text-xs text-red-600 bg-white px-2 py-1 rounded-lg border border-red-200">{analistaError}</p>}

              {analistaResult?.analise && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {analistaResult.contas.slice(0, 1).map((conta) => (
                      <>
                        <Stat key="likes" label="Média likes"   value={conta.mediaLikes} />
                        <Stat key="coment" label="Média coment." value={conta.mediaComentarios} />
                        <Stat key="alcance" label="Alcance médio" value={conta.mediaAlcance.toLocaleString('pt-BR')} />
                        <Stat key="tipo" label="Tipo top"       value={conta.tipoMaisEngajado} />
                      </>
                    ))}
                  </div>
                  <p className="text-xs text-blue-800 leading-relaxed">{analistaResult.analise.resumo}</p>
                  <div className="flex flex-wrap gap-1">
                    {analistaResult.analise.referencias.map((r, i) => (
                      <span key={i} className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{r}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Briefing */}
          {!result && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Evento / Assunto *</label>
                <input
                  value={evento}
                  onChange={(e) => setEvento(e.target.value)}
                  placeholder="Ex: Culto de Domingo — Série 'Tempo de Colheita'"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 hover:border-slate-300 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Contexto / Detalhes</label>
                <textarea
                  value={contexto}
                  onChange={(e) => setContexto(e.target.value)}
                  rows={3}
                  placeholder="Data, palestrante, versículo base, tema específico..."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 hover:border-slate-300 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition-colors resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Plataforma</label>
                  <CustomSelect value={plataforma} onChange={setPlataforma} options={PLATAFORMAS} allowEmpty={false} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Tipo</label>
                  <CustomSelect value={tipo} onChange={setTipo} options={TIPOS} allowEmpty={false} />
                </div>
              </div>
              {equipeError && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{equipeError}</p>}
            </div>
          )}

          {/* Resultados */}
          {result && (
            <div className="space-y-3">

              {/* Orquestrador */}
              {result.orquestrador && (
                <ResultCard icon={Zap} cor="bg-gradient-to-br from-violet-600 to-indigo-600" titulo="Orquestrador">
                  <Campo label="Plano da sessão" value={result.orquestrador.plano} />
                  <Campo label="Tom definido"    value={result.orquestrador.tom} />
                  {result.orquestrador.prioridades?.length > 0 && (
                    <div className="pt-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-2">Prioridades</p>
                      <TagList items={result.orquestrador.prioridades} />
                    </div>
                  )}
                  {result.orquestrador.diretrizes && (
                    <Campo label="Diretrizes para a equipe" value={result.orquestrador.diretrizes} />
                  )}
                </ResultCard>
              )}

              {/* Estrategista */}
              <ResultCard icon={Target} cor="bg-violet-600" titulo="Estrategista">
                <Campo label="Objetivo"        value={result.estrategista.objetivo} />
                <Campo label="Ângulo criativo" value={result.estrategista.angulo} />
                <Campo label="Formato ideal"   value={result.estrategista.formato_ideal} />
                {result.estrategista.dicas.length > 0 && (
                  <div className="pt-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-2">Dicas estratégicas</p>
                    <ul className="space-y-1.5">
                      {result.estrategista.dicas.map((d, i) => (
                        <li key={i} className="flex gap-2 text-sm text-slate-700">
                          <span className="text-violet-500 font-bold shrink-0">{i + 1}.</span> {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </ResultCard>

              {/* Redator */}
              <ResultCard icon={PenLine} cor="bg-sky-600" titulo="Redator">
                <Campo label="Legenda completa" value={result.redator.legenda} />
                <Campo label="CTA"              value={result.redator.cta} />
                <Campo label="Versão curta"     value={result.redator.variacao} />
              </ResultCard>

              {/* Diretor de Arte */}
              <ResultCard icon={Palette} cor="bg-rose-600" titulo="Diretor de Arte">
                <Campo label="Conceito visual"    value={result.diretor_arte.conceito_visual} />
                <Campo label="Paleta de cores"    value={result.diretor_arte.paleta} />
                {result.diretor_arte.elementos.length > 0 && (
                  <div className="pt-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-2">Elementos visuais</p>
                    <TagList items={result.diretor_arte.elementos} />
                  </div>
                )}
                <Campo label="Briefing para arte" value={result.diretor_arte.briefing_arte} />
              </ResultCard>

              {/* Designer IA */}
              <ResultCard
                icon={ImageIcon}
                cor="bg-amber-500"
                titulo="Designer IA"
                badge={artUrl ? <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5">Arte pronta</span> : undefined}
              >
                <div className="pt-3 space-y-3">
                  {selectedRefs.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-2">
                        Referências do repositório ({selectedRefs.length})
                      </p>
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {selectedRefs.map((url, i) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={i} src={url} alt={`ref ${i + 1}`} className="h-14 w-14 rounded-lg object-cover border border-slate-200 shrink-0" />
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Prompt para DALL-E (editável)</label>
                    <textarea
                      value={generatedPrompt}
                      onChange={(e) => setGeneratedPrompt(e.target.value)}
                      rows={3}
                      placeholder="Clique em 'Gerar prompt' para criar automaticamente..."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-colors resize-none font-mono"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={gerarPrompt} disabled={designerLoading !== null}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-amber-200 text-amber-700 text-xs font-semibold hover:bg-amber-50 transition-colors disabled:opacity-60">
                      {designerLoading === 'prompt' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TrendingUp className="w-3.5 h-3.5" />}
                      {designerLoading === 'prompt' ? 'Gerando...' : selectedRefs.length > 0 ? 'Gerar prompt c/ referência' : 'Gerar prompt'}
                    </button>
                    <button type="button" onClick={gerarArte} disabled={designerLoading !== null || !generatedPrompt.trim()}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition-colors disabled:opacity-60">
                      {designerLoading === 'image' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
                      {designerLoading === 'image' ? 'Gerando arte...' : 'Gerar arte'}
                    </button>
                  </div>
                  {artUrl && (
                    <div className="rounded-xl overflow-hidden border border-slate-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={artUrl} alt="Arte gerada" className="w-full object-contain bg-slate-100" />
                      <div className="px-3 py-2 flex gap-2">
                        <a href={artUrl} target="_blank" rel="noopener noreferrer"
                          className="flex-1 text-center py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                          Abrir em nova aba
                        </a>
                        <button type="button" onClick={() => { setArtUrl(''); setGeneratedPrompt('') }}
                          className="flex-1 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                          Gerar outra
                        </button>
                      </div>
                    </div>
                  )}
                  {designerError && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{designerError}</p>}
                </div>
              </ResultCard>

              {/* Social Manager */}
              <ResultCard icon={Hash} cor="bg-emerald-600" titulo="Social Manager">
                {result.social_manager.hashtags.length > 0 && (
                  <div className="pt-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-2">Hashtags</p>
                    <TagList items={result.social_manager.hashtags.map((h) => `#${h}`)} />
                  </div>
                )}
                <Campo label="Melhor horário"          value={result.social_manager.melhor_horario} />
                <Campo label="Frequência"              value={result.social_manager.frequencia} />
                <Campo label="Estímulo ao engajamento" value={result.social_manager.engajamento} />

                {/* Agendamento autônomo */}
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 space-y-3">
                  <div className="flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-emerald-600" />
                    <p className="text-xs font-semibold text-emerald-700">Programar publicação</p>
                  </div>
                  {!artUrl && (
                    <p className="text-xs text-slate-500 bg-white rounded-lg px-3 py-2 border border-slate-200">
                      Gere a arte com o Designer IA acima para habilitar o agendamento.
                    </p>
                  )}
                  {artUrl && !scheduleSuccess && (
                    <div className="space-y-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-1">Conta</label>
                        {integOptions.length > 0
                          ? <CustomSelect value={selectedInteg} onChange={setSelectedInteg} options={integOptions} placeholder="Selecione a conta" allowEmpty />
                          : <p className="text-xs text-slate-400 italic">Nenhuma conta Meta conectada.</p>}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 mb-1">Data e hora</label>
                          <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-colors bg-white" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 mb-1">Tipo</label>
                          <CustomSelect value={postType} onChange={setPostType} options={POST_TYPES} allowEmpty={false} />
                        </div>
                      </div>
                      {scheduleError && <p className="text-xs text-red-500 bg-white px-3 py-1.5 rounded-lg border border-red-200">{scheduleError}</p>}
                      <button type="button" onClick={agendarPost} disabled={scheduleLoading || !selectedInteg || !scheduledAt}
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors disabled:opacity-60">
                        {scheduleLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Agendando...</> : <><Send className="w-3.5 h-3.5" /> Programar post</>}
                      </button>
                    </div>
                  )}
                  {scheduleSuccess && (
                    <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-emerald-300">
                      <Send className="w-4 h-4 text-emerald-600 shrink-0" />
                      <p className="text-xs font-semibold text-emerald-700">Post agendado com sucesso!</p>
                    </div>
                  )}
                </div>
              </ResultCard>

              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-5 py-4 border-t border-slate-100 shrink-0">
          {result ? (
            <button type="button" onClick={resetar}
              className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
              Nova sessão
            </button>
          ) : (
            <button type="button" onClick={acionar} disabled={equipeLoading}
              className="flex items-center gap-2 flex-1 justify-center px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-sm font-semibold transition-all disabled:opacity-60 shadow-sm">
              {equipeLoading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Acionando equipe...</>
                : <><Sparkles className="w-4 h-4" /> Acionar Equipe de IA</>}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
