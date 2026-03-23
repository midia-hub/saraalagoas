'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  BarChart2,
  Bot,
  Check,
  ChevronDown,
  ChevronUp,
  Cpu,
  Hash,
  Image as ImageIcon,
  Instagram,
  Loader2,
  Palette,
  PenLine,
  Sparkles,
  Target,
  Trash2,
  Upload,
  X,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import { AgentConfig, RepoItem } from '@/app/admin/midia/demandas/page'
import { adminFetchJson } from '@/lib/admin-client'
import { REPO_CATEGORIAS } from '@/lib/equipe-ia-repositorio'

// ─── LLM options ──────────────────────────────────────────────────────────────

const TEXT_MODELS = [
  // ── Gemini (Google) ────────────────────────────────────────────
  { value: 'gemini-2.5-pro',   label: 'Gemini 2.5 Pro',   desc: 'Google — mais poderoso (mar/25)'    },
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', desc: 'Google — rápido e capaz (mai/25)'   },
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', desc: 'Google — eficiente (dez/24)'        },
  // ── GPT série ──────────────────────────────────────────────────
  { value: 'gpt-4.5',          label: 'GPT-4.5',           desc: 'OpenAI — criativo e preciso (fev/25)'  },
  { value: 'gpt-4o',           label: 'GPT-4o',            desc: 'OpenAI — rápido e versátil'            },
  { value: 'gpt-4o-mini',      label: 'GPT-4o Mini',       desc: 'OpenAI — econômico'                    },
  { value: 'gpt-4-turbo',      label: 'GPT-4 Turbo',       desc: 'OpenAI — equilibrado'                  },
  // ── o-series (raciocínio) ──────────────────────────────────────
  { value: 'o4-mini',          label: 'o4-mini',           desc: 'OpenAI — raciocínio + visão (abr/25)'  },
  { value: 'o3',               label: 'o3',                desc: 'OpenAI — raciocínio poderoso (abr/25)' },
  { value: 'o3-mini',          label: 'o3-mini',           desc: 'OpenAI — raciocínio eficiente (jan/25)'},
  { value: 'o1',               label: 'o1',                desc: 'OpenAI — raciocínio avançado'          },
  { value: 'o1-mini',          label: 'o1-mini',           desc: 'OpenAI — raciocínio rápido'            },
]

const IMAGE_MODELS = [
  { value: 'gemini-2.5-flash-image',         label: 'Nano Banana',     desc: 'Gemini 2.5 Flash Image — velocidade e eficiência, alto volume' },
  { value: 'gemini-3.1-flash-image-preview', label: 'Nano Banana 2',   desc: 'Gemini 3.1 Flash Image Preview — pré-lançamento, rápido' },
  { value: 'gemini-3-pro-image-preview',     label: 'Nano Banana Pro', desc: 'Gemini 3 Pro Image Preview — profissional, thinking avançado' },
]

// ─── Default config ────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: AgentConfig = {
  orquestrador: { objetivo: '', tom: '', prioridade: '', model: 'o4-mini'   }, // raciocínio para dirigir equipe
  analista:     { periodo: '30', foco: '', model: 'gpt-4o'                  }, // análise de dados
  estrategista: { instrucoes: '', publicoAlvo: '', model: 'o3-mini'         }, // raciocínio para estratégia
  redator:      { instrucoes: '', hashtagsFixas: '', model: 'gpt-4o'        }, // criatividade textual
  diretorArte:  { instrucoes: '', elementosObrig: '', model: 'gpt-4o'       }, // conceito visual
  designer:     { qualidade: 'hd', formato: '1024x1024', model: 'gemini-2.5-flash', imageModel: 'gemini-2.5-flash-image' },
  socialManager:{ instrucoes: '', horarioPref: '', model: 'gpt-4o-mini'     }, // hashtags e horário
  instagramRefsIntegracaoIds: [],
}

// ─── Section meta ──────────────────────────────────────────────────────────────

const SECTIONS = [
  { key: 'orquestrador',  label: 'Diretor de Marketing',  icon: Zap,       cor: 'text-violet-600' },
  { key: 'analista',      label: 'Analista de Dados',      icon: BarChart2, cor: 'text-blue-600'   },
  { key: 'estrategista',  label: 'Gerente de Conteúdo',    icon: Target,    cor: 'text-violet-600' },
  { key: 'redator',       label: 'Copywriter',             icon: PenLine,   cor: 'text-sky-600'    },
  { key: 'diretorArte',   label: 'Diretor de Arte',        icon: Palette,   cor: 'text-rose-600'   },
  { key: 'designer',      label: 'Designer',               icon: ImageIcon, cor: 'text-amber-600'  },
  { key: 'socialManager', label: 'Social Media Manager',   icon: Hash,      cor: 'text-emerald-600'},
] as const

type SectionKey = (typeof SECTIONS)[number]['key']

// ─── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  open:    boolean
  onClose: () => void
  onStart: (solicitacao: string, config: AgentConfig, selectedRefs: string[]) => void
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  )
}

function ModelSelect({
  value,
  onChange,
  options = TEXT_MODELS,
}: {
  value: string
  onChange: (v: string) => void
  options?: typeof TEXT_MODELS
}) {
  const current = options.find((o) => o.value === value)
  return (
    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white">
      <Cpu className="w-3 h-3 text-slate-400 shrink-0" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 text-xs bg-transparent outline-none cursor-pointer text-slate-700 font-medium"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label} — {o.desc}</option>
        ))}
      </select>
      {current && (
        <span className="text-[9px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full shrink-0">
          {current.label}
        </span>
      )}
    </div>
  )
}

const inputCls  = 'w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:border-violet-400 focus:ring-1 focus:ring-violet-400 outline-none bg-white placeholder-slate-300'
const selectCls = 'w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:border-violet-400 focus:ring-1 focus:ring-violet-400 outline-none bg-white'

// ─── Component ────────────────────────────────────────────────────────────────

export default function SessaoDrawer({ open, onClose, onStart }: Props) {
  const [solicitacao, setSolicitacao] = useState('')
  const [config,       setConfig]      = useState<AgentConfig>(DEFAULT_CONFIG)
  const [openSection,  setOpenSection] = useState<SectionKey | null>(null)

  // Designer repository
  const [repoItems,    setRepoItems]   = useState<RepoItem[]>([])
  const [selectedRefs, setSelectedRefs]= useState<string[]>([])
  const [repoLoading,  setRepoLoading] = useState(false)
  const [uploading,    setUploading]   = useState(false)
  const [deleteIds,    setDeleteIds]   = useState<Set<string>>(new Set())
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [igIntegrations, setIgIntegrations] = useState<{ id: string; label: string }[]>([])

  useEffect(() => {
    if (!open) return
    adminFetchJson<{ integrations?: { id: string; page_name: string | null; instagram_username: string | null; is_active: boolean }[] }>(
      '/api/meta/integrations',
    )
      .then((data) => {
        const list = (Array.isArray(data) ? data : data.integrations ?? []) as {
          id: string; page_name: string | null; instagram_username: string | null; is_active: boolean
        }[]
        setIgIntegrations(
          list
            .filter((i) => i.is_active && (i.instagram_username || i.page_name))
            .map((i) => ({
              id:    i.id,
              label: i.instagram_username ? `@${i.instagram_username}` : i.page_name ?? i.id,
            })),
        )
      })
      .catch(() => setIgIntegrations([]))
  }, [open])

  const loadRepo = useCallback(async () => {
    setRepoLoading(true)
    try {
      const data = await adminFetchJson<{ items?: RepoItem[] }>('/api/admin/midia/equipe-ia/repositorio')
      setRepoItems(Array.isArray(data) ? data : data.items ?? [])
    } catch {
      setRepoItems([])
    } finally {
      setRepoLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) loadRepo()
  }, [open, loadRepo])

  const handleUpload = async (file: File) => {
    setUploading(true)
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload  = (e) => resolve(String(e.target?.result ?? ''))
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      await adminFetchJson('/api/admin/midia/equipe-ia/repositorio', {
        method: 'POST',
        body:   JSON.stringify({ nome: file.name, base64 }),
      })
      await loadRepo()
    } catch { /* ignore */ } finally {
      setUploading(false)
    }
  }

  const catLabel = (id: string | undefined) =>
    REPO_CATEGORIAS.find((c) => c.id === id)?.label ?? id ?? ''

  const handleDelete = async (item: RepoItem) => {
    setDeleteIds((prev) => new Set(prev).add(item.id))
    try {
      await adminFetchJson(
        `/api/admin/midia/equipe-ia/repositorio?path=${encodeURIComponent(item.path)}`,
        { method: 'DELETE' },
      )
      setRepoItems((prev) => prev.filter((r) => r.id !== item.id))
      setSelectedRefs((prev) => prev.filter((u) => u !== item.url))
    } catch { /* ignore */ } finally {
      setDeleteIds((prev) => { const s = new Set(prev); s.delete(item.id); return s })
    }
  }

  const toggleRef = (url: string) =>
    setSelectedRefs((prev) =>
      prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url],
    )

  const toggleIgIntegrationRef = (id: string) => {
    setConfig((prev) => {
      const cur = prev.instagramRefsIntegracaoIds ?? []
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
      return { ...prev, instagramRefsIntegracaoIds: next }
    })
  }

  const setField = <K extends keyof AgentConfig>(
    agent: K,
    field: keyof AgentConfig[K],
    value: string,
  ) =>
    setConfig((prev) => ({
      ...prev,
      [agent]: { ...(prev[agent] as object), [field]: value },
    }))

  const handleStart = () => {
    if (!solicitacao.trim()) return
    onStart(solicitacao.trim(), config, selectedRefs)
    setSolicitacao('')
    setConfig(DEFAULT_CONFIG)
    setSelectedRefs([])
    setOpenSection(null)
  }

  const toggleSection = (key: SectionKey) =>
    setOpenSection((prev) => (prev === key ? null : key))

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Slide-over */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-md flex flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-900 to-slate-700 shrink-0">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 border border-white/20">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">Nova solicitação</p>
            <p className="text-[10px] text-slate-400">Configure os agentes e inicie a sessão</p>
          </div>
          <button type="button" onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors">
            <X className="w-4 h-4 text-slate-300" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* Main textarea */}
          <div className="px-5 pt-5 pb-4 border-b border-slate-100">
            <label className="block text-xs font-bold text-slate-700 mb-2">
              O que você precisa?
            </label>
            <textarea
              value={solicitacao}
              onChange={(e) => setSolicitacao(e.target.value)}
              placeholder="Ex.: Post para o culto de domingo com tema de gratidão, quero um Reels com música gospel..."
              rows={4}
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 outline-none resize-none placeholder-slate-300"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              O Diretor de Marketing monta só as etapas necessárias (pesquisa, arte, texto, etc.).
            </p>
          </div>

          {/* Instagram de referência (API — contas conectadas) */}
          {igIntegrations.length > 0 && (
            <div className="px-5 pt-2 pb-4 border-b border-slate-100">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <Instagram className="w-3.5 h-3.5 text-pink-500" />
                Instagram de referência
              </p>
              <p className="text-[10px] text-slate-500 mb-2 leading-relaxed">
                Inclui amostra de posts recentes via Meta para os agentes alinharem tom e formatos (não perfis aleatórios — só contas já conectadas).
              </p>
              <div className="flex flex-wrap gap-2">
                {igIntegrations.map((ig) => {
                  const on = (config.instagramRefsIntegracaoIds ?? []).includes(ig.id)
                  return (
                    <button
                      key={ig.id}
                      type="button"
                      onClick={() => toggleIgIntegrationRef(ig.id)}
                      className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg border transition-colors ${
                        on
                          ? 'border-pink-400 bg-pink-50 text-pink-800'
                          : 'border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      {on && <Check className="w-3 h-3 inline mr-0.5 -mt-0.5" />}
                      {ig.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Agent accordion */}
          <div className="px-5 py-4 space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Configuração dos agentes (opcional)
            </p>

            {SECTIONS.map(({ key, label, icon: Icon, cor }) => {
              const isOpen = openSection === key

              // Current model label for badge
              const agentCfg = config[key] as Record<string, string>
              const modelVal  = agentCfg.model || 'gpt-4o'
              const modelLabel = TEXT_MODELS.find((m) => m.value === modelVal)?.label ?? modelVal

              return (
                <div key={key} className="rounded-xl border border-slate-200 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleSection(key)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors"
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${cor}`} />
                    <span className="flex-1 text-xs font-semibold text-slate-700">{label}</span>
                    <span className="flex items-center gap-1 text-[9px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full shrink-0">
                      <Cpu className="w-2.5 h-2.5" />{modelLabel}
                    </span>
                    {isOpen
                      ? <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      : <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                  </button>

                  {isOpen && (
                    <div className="border-t border-slate-100 px-3 pb-3 pt-3 space-y-3 bg-slate-50/60">

                      {/* ── Modelo de IA ── */}
                      <Field label="Modelo de IA">
                        <ModelSelect
                          value={agentCfg.model || 'gpt-4o'}
                          onChange={(v) => setField(key, 'model' as keyof AgentConfig[typeof key], v)}
                        />
                      </Field>

                      {/* ── Campos por agente ── */}

                      {key === 'orquestrador' && (
                        <>
                          <Field label="Objetivo da sessão">
                            <input type="text" value={config.orquestrador.objetivo}
                              onChange={(e) => setField('orquestrador', 'objetivo', e.target.value)}
                              placeholder="Ex.: Aumentar engajamento neste domingo"
                              className={inputCls} />
                          </Field>
                          <Field label="Tom geral">
                            <input type="text" value={config.orquestrador.tom}
                              onChange={(e) => setField('orquestrador', 'tom', e.target.value)}
                              placeholder="Ex.: Acolhedor, esperançoso, vibrante..."
                              className={inputCls} />
                          </Field>
                          <Field label="Prioridade">
                            <input type="text" value={config.orquestrador.prioridade}
                              onChange={(e) => setField('orquestrador', 'prioridade', e.target.value)}
                              placeholder="Ex.: Conversão de novos membros"
                              className={inputCls} />
                          </Field>
                        </>
                      )}

                      {key === 'analista' && (
                        <>
                          <Field label="Período de análise">
                            <select value={config.analista.periodo}
                              onChange={(e) => setField('analista', 'periodo', e.target.value)}
                              className={selectCls}>
                              <option value="7">Últimos 7 dias</option>
                              <option value="14">Últimos 14 dias</option>
                              <option value="30">Últimos 30 dias</option>
                              <option value="60">Últimos 60 dias</option>
                            </select>
                          </Field>
                          <Field label="Foco da análise">
                            <input type="text" value={config.analista.foco}
                              onChange={(e) => setField('analista', 'foco', e.target.value)}
                              placeholder="Ex.: Formatos que mais engajam"
                              className={inputCls} />
                          </Field>
                        </>
                      )}

                      {key === 'estrategista' && (
                        <>
                          <Field label="Instruções extras">
                            <textarea value={config.estrategista.instrucoes}
                              onChange={(e) => setField('estrategista', 'instrucoes', e.target.value)}
                              placeholder="Ex.: Focar no tema da ceia"
                              rows={2} className={`${inputCls} resize-none`} />
                          </Field>
                          <Field label="Público-alvo">
                            <input type="text" value={config.estrategista.publicoAlvo}
                              onChange={(e) => setField('estrategista', 'publicoAlvo', e.target.value)}
                              placeholder="Ex.: Jovens de 18-30 anos"
                              className={inputCls} />
                          </Field>
                        </>
                      )}

                      {key === 'redator' && (
                        <>
                          <Field label="Instruções extras">
                            <textarea value={config.redator.instrucoes}
                              onChange={(e) => setField('redator', 'instrucoes', e.target.value)}
                              placeholder="Ex.: Incluir versículo bíblico"
                              rows={2} className={`${inputCls} resize-none`} />
                          </Field>
                          <Field label="Hashtags fixas (sempre incluir)">
                            <input type="text" value={config.redator.hashtagsFixas}
                              onChange={(e) => setField('redator', 'hashtagsFixas', e.target.value)}
                              placeholder="Ex.: #SaraSede #Alagoas #Culto"
                              className={inputCls} />
                          </Field>
                        </>
                      )}

                      {key === 'diretorArte' && (
                        <>
                          <Field label="Instruções extras">
                            <textarea value={config.diretorArte.instrucoes}
                              onChange={(e) => setField('diretorArte', 'instrucoes', e.target.value)}
                              placeholder="Ex.: Usar fontes serifadas, estilo elegante"
                              rows={2} className={`${inputCls} resize-none`} />
                          </Field>
                          <Field label="Elementos obrigatórios">
                            <input type="text" value={config.diretorArte.elementosObrig}
                              onChange={(e) => setField('diretorArte', 'elementosObrig', e.target.value)}
                              placeholder="Ex.: Logo da Igreja, versículo central"
                              className={inputCls} />
                          </Field>
                        </>
                      )}

                      {key === 'designer' && (
                        <>
                          <Field label="Modelo de geração de imagem">
                            <ModelSelect
                              value={config.designer.imageModel}
                              onChange={(v) => setField('designer', 'imageModel', v)}
                              options={IMAGE_MODELS}
                            />
                          </Field>
                          <div className="grid grid-cols-2 gap-3">
                            <Field label="Qualidade">
                              <select value={config.designer.qualidade}
                                onChange={(e) => setField('designer', 'qualidade', e.target.value)}
                                className={selectCls}>
                                <option value="standard">Standard</option>
                                <option value="hd">HD</option>
                              </select>
                            </Field>
                            <Field label="Formato">
                              <select value={config.designer.formato}
                                onChange={(e) => setField('designer', 'formato', e.target.value)}
                                className={selectCls}>
                                <option value="1024x1024">Quadrado (1:1)</option>
                                <option value="1024x1792">Vertical (4:5 / Story)</option>
                                <option value="1792x1024">Horizontal (16:9)</option>
                              </select>
                            </Field>
                          </div>

                          {/* Repository */}
                          <div className="space-y-2 pt-1">
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                                Repositório de referência
                              </p>
                              <button type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className="flex items-center gap-1 text-[10px] font-semibold text-violet-600 hover:text-violet-700 disabled:opacity-50">
                                {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                                {uploading ? 'Enviando...' : 'Enviar arte'}
                              </button>
                            </div>
                            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp"
                              className="hidden"
                              onChange={(e) => { const f = e.target.files?.[0]; if (f) { handleUpload(f); e.target.value = '' } }} />

                            {repoLoading ? (
                              <div className="flex items-center gap-2 py-3 text-xs text-slate-400">
                                <Loader2 className="w-3 h-3 animate-spin" /> Carregando...
                              </div>
                            ) : repoItems.length === 0 ? (
                              <div className="rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 py-4 text-center">
                                <ImageIcon className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                                <p className="text-[10px] text-slate-400">Nenhuma arte no repositório</p>
                                <p className="text-[9px] text-slate-300 mt-0.5">Envie artes anteriores como referência</p>
                              </div>
                            ) : (
                              <div className="grid grid-cols-3 gap-2">
                                {repoItems.map((item) => {
                                  const isSelected = selectedRefs.includes(item.url)
                                  const isDeleting = deleteIds.has(item.id)
                                  const pub = item.meta?.publico ?? ['diretor_arte', 'designer']
                                  const sóConceito = !pub.includes('designer')
                                  return (
                                    <div key={item.id}
                                      className={`group relative rounded-lg overflow-hidden border-2 aspect-square bg-slate-100 transition-all ${isSelected ? 'border-violet-500' : 'border-slate-200'} ${sóConceito ? 'opacity-90' : ''}`}>
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img src={item.url} alt={item.nome} className="w-full h-full object-cover" />
                                      {item.meta?.categoria && (
                                        <span className="absolute bottom-1 left-1 right-1 text-[7px] font-bold text-white bg-black/55 px-1 py-0.5 rounded truncate text-center">
                                          {catLabel(item.meta.categoria)}
                                        </span>
                                      )}
                                      {sóConceito && (
                                        <span className="absolute top-1 left-1 text-[7px] font-bold bg-rose-600 text-white px-1 rounded z-10">só conceito</span>
                                      )}
                                      {isSelected && (
                                        <span className={`absolute ${sóConceito ? 'top-5' : 'top-1'} left-1 w-4 h-4 rounded-full bg-violet-600 flex items-center justify-center shadow z-10`}>
                                          <Check className="w-2.5 h-2.5 text-white" />
                                        </span>
                                      )}
                                      <div className={`absolute inset-0 transition-all ${isSelected ? 'bg-violet-600/25' : 'bg-transparent group-hover:bg-black/15'}`} />
                                      <button type="button" onClick={() => toggleRef(item.url)} className="absolute inset-0 z-[1]"
                                        title={item.meta?.linha_criativa || item.meta?.descricao || (isSelected ? 'Remover referência' : 'Usar como referência')} />
                                      <button type="button" disabled={isDeleting}
                                        onClick={(e) => { e.stopPropagation(); handleDelete(item) }}
                                        className="absolute top-1 right-1 z-20 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                                        title="Remover">
                                        {isDeleting
                                          ? <Loader2 className="w-2.5 h-2.5 text-white animate-spin" />
                                          : <Trash2 className="w-2 h-2 text-white" />}
                                      </button>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                            {selectedRefs.length > 0 && (
                              <p className="text-[10px] text-violet-600 font-medium">
                                {selectedRefs.length} arte{selectedRefs.length > 1 ? 's' : ''} selecionada{selectedRefs.length > 1 ? 's' : ''} como referência
                              </p>
                            )}
                            <p className="text-[9px] text-slate-400 pt-0.5">
                              <Link href="/admin/midia/referencias-design" className="text-violet-600 font-semibold hover:underline">
                                Abrir biblioteca de referências (edição e filtros)
                              </Link>
                            </p>
                          </div>
                        </>
                      )}

                      {key === 'socialManager' && (
                        <>
                          <Field label="Instruções extras">
                            <textarea value={config.socialManager.instrucoes}
                              onChange={(e) => setField('socialManager', 'instrucoes', e.target.value)}
                              placeholder="Ex.: Priorizar publicação pela manhã"
                              rows={2} className={`${inputCls} resize-none`} />
                          </Field>
                          <Field label="Horário preferido">
                            <input type="text" value={config.socialManager.horarioPref}
                              onChange={(e) => setField('socialManager', 'horarioPref', e.target.value)}
                              placeholder="Ex.: Domingo às 9h"
                              className={inputCls} />
                          </Field>
                        </>
                      )}

                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 py-4 border-t border-slate-100 bg-white space-y-2">
          {selectedRefs.length > 0 && (
            <p className="text-[10px] text-emerald-600 font-medium bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
              {selectedRefs.length} referência{selectedRefs.length > 1 ? 's' : ''} de arte selecionada{selectedRefs.length > 1 ? 's' : ''} para o Designer
            </p>
          )}
          <button
            type="button"
            onClick={handleStart}
            disabled={!solicitacao.trim()}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-sm font-bold transition-all disabled:opacity-40 shadow-sm"
          >
            <Sparkles className="w-4 h-4" />
            Iniciar sessão
          </button>
          <p className="text-center text-[10px] text-slate-400">
            O Diretor de Marketing vai coordenar a equipe até pedir sua aprovação final.
          </p>
        </div>
      </aside>
    </>
  )
}
