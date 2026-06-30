'use client'

import {
  useCallback, useEffect, useRef, useState,
} from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  SortableContext, arrayMove, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  AlignLeft, AlertCircle, Calendar, CheckSquare, ChevronDown,
  CircleDot, ClipboardList, Copy, ExternalLink, Eye,
  GripVertical, Hash, Loader2, Mail, Minus, Paperclip,
  Phone, Plus, Save, Settings, Trash2, Type, X, Check,
} from 'lucide-react'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { adminFetchJson } from '@/lib/admin-client'
import type {
  CampoFormulario, ConfigFormulario, Formulario, TipoCampo,
} from '@/lib/formularios'
import {
  TIPO_CAMPO_META, defaultConfig, generateSlug, newCampo,
} from '@/lib/formularios'

// ─── Icon map ─────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  Type, AlignLeft, Mail, Phone, Hash, Calendar,
  CircleDot, CheckSquare, ChevronDown, Paperclip, Minus,
}

function FieldIcon({ tipo, size = 14 }: { tipo: TipoCampo; size?: number }) {
  const iconName = TIPO_CAMPO_META[tipo]?.icone ?? 'Type'
  const Icon = ICON_MAP[iconName] ?? Type
  return <Icon size={size} />
}

// ─── Sortable Field Card ───────────────────────────────────────────────────────

function SortableFieldCard({
  campo, isSelected, onSelect, onDuplicate, onDelete,
}: {
  campo: CampoFormulario
  isSelected: boolean
  onSelect: () => void
  onDuplicate: () => void
  onDelete: () => void
}) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: campo.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  }

  if (campo.tipo === 'secao') {
    return (
      <div
        ref={setNodeRef}
        style={style}
        onClick={onSelect}
        className={`group relative flex items-center gap-2 rounded-xl border-2 px-4 py-3 cursor-pointer transition-all ${
          isSelected
            ? 'border-orange-400 bg-orange-50/60'
            : 'border-dashed border-slate-200 hover:border-slate-300 bg-white'
        }`}
      >
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 touch-none"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={16} />
        </button>
        <Minus size={14} className="text-slate-400 shrink-0" />
        <span className="flex-1 text-sm font-bold text-slate-500 uppercase tracking-wider">
          {campo.label || 'Seção'}
        </span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button type="button" onClick={(e) => { e.stopPropagation(); onDuplicate() }}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-100 text-slate-400">
            <Copy size={11} />
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-50 text-slate-400 hover:text-red-500">
            <Trash2 size={11} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`group relative bg-white rounded-xl border-2 overflow-hidden cursor-pointer transition-all ${
        isSelected
          ? 'border-orange-400 shadow-md shadow-orange-100/60'
          : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
      }`}
    >
      {/* Top bar */}
      <div className={`flex items-center gap-2 px-3 py-2 border-b ${
        isSelected ? 'border-orange-100 bg-orange-50/50' : 'border-slate-100 bg-slate-50/60'
      }`}>
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 touch-none"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={14} />
        </button>
        <div className={`w-5 h-5 rounded-md flex items-center justify-center ${
          isSelected ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-500'
        }`}>
          <FieldIcon tipo={campo.tipo} size={11} />
        </div>
        <span className="flex-1 text-[11px] font-bold text-slate-500 uppercase tracking-wide truncate">
          {TIPO_CAMPO_META[campo.tipo]?.label}
        </span>
        {campo.condicional && (
          <span className="text-[9px] bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full font-semibold shrink-0">
            Condicional
          </span>
        )}
        {campo.obrigatorio && (
          <span className="text-[9px] bg-red-50 text-red-600 border border-red-100 px-1.5 py-0.5 rounded-full font-semibold shrink-0">
            Obrig.
          </span>
        )}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button type="button" onClick={(e) => { e.stopPropagation(); onDuplicate() }}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-white text-slate-400">
            <Copy size={10} />
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-red-50 text-slate-400 hover:text-red-500">
            <Trash2 size={10} />
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="px-3 py-2.5">
        <p className="text-sm font-semibold text-slate-800 mb-1.5">
          {campo.label || <span className="text-slate-300 italic">Sem título</span>}
          {campo.obrigatorio && <span className="text-red-500 ml-0.5">*</span>}
        </p>
        {campo.descricao && (
          <p className="text-[11px] text-slate-400 mb-1.5 line-clamp-1">{campo.descricao}</p>
        )}
        <FieldPreview campo={campo} />
      </div>
    </div>
  )
}

function FieldPreview({ campo }: { campo: CampoFormulario }) {
  const inputBase = 'w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-400 pointer-events-none'

  switch (campo.tipo) {
    case 'texto_curto':
    case 'email':
    case 'telefone':
    case 'numero':
      return <div className={inputBase}>{campo.placeholder || 'Resposta curta'}</div>
    case 'texto_longo':
      return <div className={`${inputBase} h-12`}>{campo.placeholder || 'Resposta longa'}</div>
    case 'data':
      return <div className={`${inputBase} flex items-center justify-between`}><span>{campo.placeholder || 'dd/mm/aaaa'}</span><Calendar size={11} /></div>
    case 'multipla_escolha':
      return (
        <div className="space-y-1">
          {(campo.opcoes ?? []).slice(0, 3).map((op, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs text-slate-500">
              <div className="w-3 h-3 rounded-full border-2 border-slate-300 shrink-0" />
              <span>{op}</span>
            </div>
          ))}
          {(campo.opcoes ?? []).length > 3 && (
            <p className="text-[10px] text-slate-400">+{(campo.opcoes?.length ?? 0) - 3} opções</p>
          )}
        </div>
      )
    case 'checkbox_multiplo':
      return (
        <div className="space-y-1">
          {(campo.opcoes ?? []).slice(0, 3).map((op, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs text-slate-500">
              <div className="w-3 h-3 rounded border border-slate-300 shrink-0" />
              <span>{op}</span>
            </div>
          ))}
          {(campo.opcoes ?? []).length > 3 && (
            <p className="text-[10px] text-slate-400">+{(campo.opcoes?.length ?? 0) - 3} opções</p>
          )}
        </div>
      )
    case 'dropdown':
      return <div className={`${inputBase} flex items-center justify-between`}><span>Selecione...</span><ChevronDown size={11} /></div>
    case 'arquivo':
      return (
        <div className="rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center gap-2 py-2.5 text-xs text-slate-400">
          <Paperclip size={11} />
          Clique ou arraste um arquivo
        </div>
      )
    default:
      return null
  }
}

// ─── Properties Panel ──────────────────────────────────────────────────────────

function PropertiesPanel({
  campo, todos, onChange, onClose,
}: {
  campo: CampoFormulario
  todos: CampoFormulario[]
  onChange: (updated: CampoFormulario) => void
  onClose: () => void
}) {
  const [novaOpcao, setNovaOpcao] = useState('')
  const hasOpcoes = ['multipla_escolha', 'checkbox_multiplo', 'dropdown'].includes(campo.tipo)
  const otherFields = todos.filter((c) => c.id !== campo.id && c.tipo !== 'secao')

  function set<K extends keyof CampoFormulario>(key: K, value: CampoFormulario[K]) {
    onChange({ ...campo, [key]: value })
  }

  function addOpcao() {
    const v = novaOpcao.trim()
    if (!v) return
    set('opcoes', [...(campo.opcoes ?? []), v])
    setNovaOpcao('')
  }

  function removeOpcao(i: number) {
    set('opcoes', (campo.opcoes ?? []).filter((_, idx) => idx !== i))
  }

  function updateOpcao(i: number, v: string) {
    const arr = [...(campo.opcoes ?? [])]
    arr[i] = v
    set('opcoes', arr)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/60 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-orange-100 flex items-center justify-center">
            <FieldIcon tipo={campo.tipo} size={12} />
          </div>
          <span className="text-xs font-bold text-slate-700">{TIPO_CAMPO_META[campo.tipo]?.label}</span>
        </div>
        <button type="button" onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-200 text-slate-400">
          <X size={13} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Label */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
            {campo.tipo === 'secao' ? 'Título da seção' : 'Label'}
          </label>
          <input
            type="text"
            value={campo.label}
            onChange={(e) => set('label', e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-400/30 outline-none"
          />
        </div>

        {campo.tipo !== 'secao' && (
          <>
            {/* Obrigatório */}
            <label className="flex items-center gap-2.5 cursor-pointer group">
              <div
                onClick={() => set('obrigatorio', !campo.obrigatorio)}
                className={`w-9 h-5 rounded-full transition-colors cursor-pointer ${campo.obrigatorio ? 'bg-orange-500' : 'bg-slate-200'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white shadow-sm mt-0.5 transition-transform ${campo.obrigatorio ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-sm font-medium text-slate-700">Obrigatório</span>
            </label>

            {/* Placeholder */}
            {['texto_curto', 'texto_longo', 'email', 'telefone', 'numero', 'data'].includes(campo.tipo) && (
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Placeholder</label>
                <input
                  type="text"
                  value={campo.placeholder ?? ''}
                  onChange={(e) => set('placeholder', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-400/30 outline-none"
                />
              </div>
            )}

            {/* Descrição */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Texto de ajuda</label>
              <textarea
                value={campo.descricao ?? ''}
                onChange={(e) => set('descricao', e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-400/30 outline-none resize-none"
              />
            </div>

            {/* Opções */}
            {hasOpcoes && (
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Opções</label>
                <div className="space-y-1.5">
                  {(campo.opcoes ?? []).map((op, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={op}
                        onChange={(e) => updateOpcao(i, e.target.value)}
                        onFocus={(e) => e.target.select()}
                        className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-400/30 outline-none"
                      />
                      <button type="button" onClick={() => removeOpcao(i)}
                        className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-50 text-slate-300 hover:text-red-500 shrink-0">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={novaOpcao}
                    onChange={(e) => setNovaOpcao(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOpcao() } }}
                    placeholder="Nova opção..."
                    className="flex-1 rounded-lg border border-dashed border-slate-300 px-2.5 py-1.5 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-400/30 outline-none"
                  />
                  <button type="button" onClick={addOpcao}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-100">
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* Lógica condicional */}
            {otherFields.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Lógica condicional</label>
                  {campo.condicional ? (
                    <button type="button" onClick={() => set('condicional', null)}
                      className="text-[10px] text-red-500 hover:underline">Remover</button>
                  ) : (
                    <button type="button"
                      onClick={() => set('condicional', { campo_id: otherFields[0].id, operador: 'igual', valor: '' })}
                      className="text-[10px] text-orange-600 hover:underline font-semibold">+ Adicionar</button>
                  )}
                </div>
                {campo.condicional && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2.5">
                    <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wide">Mostrar este campo somente se:</p>
                    <select
                      value={campo.condicional.campo_id}
                      onChange={(e) => set('condicional', { ...campo.condicional!, campo_id: e.target.value })}
                      className="w-full rounded-lg border border-amber-200 px-2.5 py-1.5 text-xs bg-white focus:border-orange-400 outline-none"
                    >
                      {otherFields.map((f) => (
                        <option key={f.id} value={f.id}>{f.label || TIPO_CAMPO_META[f.tipo]?.label}</option>
                      ))}
                    </select>
                    <select
                      value={campo.condicional.operador}
                      onChange={(e) => set('condicional', { ...campo.condicional!, operador: e.target.value as never })}
                      className="w-full rounded-lg border border-amber-200 px-2.5 py-1.5 text-xs bg-white focus:border-orange-400 outline-none"
                    >
                      <option value="igual">for igual a</option>
                      <option value="diferente">for diferente de</option>
                      <option value="preenchido">estiver preenchido</option>
                      <option value="vazio">estiver vazio</option>
                    </select>
                    {(campo.condicional.operador === 'igual' || campo.condicional.operador === 'diferente') && (
                      <input
                        type="text"
                        value={campo.condicional.valor ?? ''}
                        onChange={(e) => set('condicional', { ...campo.condicional!, valor: e.target.value })}
                        placeholder="Valor..."
                        className="w-full rounded-lg border border-amber-200 px-2.5 py-1.5 text-xs bg-white focus:border-orange-400 outline-none"
                      />
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Config Panel ──────────────────────────────────────────────────────────────

function ConfigPanel({
  titulo, descricao, config,
  onTituloChange, onDescricaoChange, onConfigChange, onClose,
}: {
  titulo: string
  descricao: string
  config: ConfigFormulario
  onTituloChange: (v: string) => void
  onDescricaoChange: (v: string) => void
  onConfigChange: (c: ConfigFormulario) => void
  onClose: () => void
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/60 shrink-0">
        <div className="flex items-center gap-2">
          <Settings size={14} className="text-slate-500" />
          <span className="text-xs font-bold text-slate-700">Configurações do formulário</span>
        </div>
        <button type="button" onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-200 text-slate-400">
          <X size={13} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Título</label>
          <input
            type="text" value={titulo} onChange={(e) => onTituloChange(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-400/30 outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Descrição</label>
          <textarea
            value={descricao} onChange={(e) => onDescricaoChange(e.target.value)} rows={3} resize-none
            className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-400/30 outline-none resize-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Mensagem de sucesso</label>
          <textarea
            value={config.mensagem_sucesso} rows={2}
            onChange={(e) => onConfigChange({ ...config, mensagem_sucesso: e.target.value })}
            className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-400/30 outline-none resize-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Data de encerramento</label>
          <input
            type="date"
            value={config.data_encerramento ?? ''}
            onChange={(e) => onConfigChange({ ...config, data_encerramento: e.target.value || null })}
            className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-400/30 outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Limite de respostas</label>
          <input
            type="number" min={1}
            value={config.limite_respostas ?? ''}
            onChange={(e) => onConfigChange({ ...config, limite_respostas: e.target.value ? parseInt(e.target.value, 10) : null })}
            placeholder="Sem limite"
            className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-400/30 outline-none"
          />
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-800">Um envio por e-mail</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Bloqueia respostas duplicadas pelo mesmo e-mail</p>
            </div>
            <button
              type="button"
              onClick={() => onConfigChange({ ...config, unico_por_email: !config.unico_por_email })}
              className={`w-9 h-5 rounded-full transition-colors shrink-0 mt-0.5 relative ${config.unico_por_email ? 'bg-orange-500' : 'bg-slate-300'}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${config.unico_por_email ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
          </div>
          {config.unico_por_email && (
            <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
              O formulário precisa ter um campo do tipo E-mail para que essa opção funcione.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-800">Um envio por IP</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Bloqueia respostas duplicadas do mesmo dispositivo/rede</p>
            </div>
            <button
              type="button"
              onClick={() => onConfigChange({ ...config, unico_por_ip: !config.unico_por_ip })}
              className={`w-9 h-5 rounded-full transition-colors shrink-0 mt-0.5 relative ${config.unico_por_ip ? 'bg-orange-500' : 'bg-slate-300'}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${config.unico_por_ip ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── FIELD TYPE GROUPS ─────────────────────────────────────────────────────────

const GRUPOS = ['Básico', 'Seleção', 'Avançado', 'Layout'] as const
const TIPOS_POR_GRUPO: Record<string, TipoCampo[]> = {
  'Básico':    ['texto_curto', 'texto_longo', 'email', 'telefone', 'numero', 'data'],
  'Seleção':   ['multipla_escolha', 'checkbox_multiplo', 'dropdown'],
  'Avançado':  ['arquivo'],
  'Layout':    ['secao'],
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error'

export default function FormularioEditorPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [campos, setCampos] = useState<CampoFormulario[]>([])
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [slug, setSlug] = useState('')
  const [config, setConfig] = useState<ConfigFormulario>(defaultConfig())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showConfig, setShowConfig] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [saveError, setSaveError] = useState('')

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingRef = useRef({ campos, titulo, descricao, config })

  useEffect(() => { pendingRef.current = { campos, titulo, descricao, config } }, [campos, titulo, descricao, config])

  // Load
  useEffect(() => {
    adminFetchJson<{ formulario: Formulario }>(`/api/admin/midia/formularios/${id}`)
      .then(({ formulario }) => {
        setTitulo(formulario.titulo)
        setDescricao(formulario.descricao ?? '')
        // garante que slug nunca fique vazio — gera a partir do título se necessário
        const resolvedSlug = formulario.slug || generateSlug(formulario.titulo) || formulario.id
        setSlug(resolvedSlug)
        setCampos(formulario.schema?.campos ?? [])
        setConfig(formulario.config ?? defaultConfig())
        // persiste o slug no banco caso estivesse vazio
        if (!formulario.slug) {
          adminFetchJson(`/api/admin/midia/formularios/${formulario.id}`, {
            method: 'PUT',
            body: JSON.stringify({ slug: resolvedSlug }),
          }).catch(() => {})
        }
      })
      .catch(() => router.push('/admin/midia/formularios'))
      .finally(() => setLoading(false))
  }, [id, router])

  // Auto-save debounce
  const triggerSave = useCallback(() => {
    setSaveStatus('unsaved')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaveStatus('saving')
      const { campos: c, titulo: t, descricao: d, config: cfg } = pendingRef.current
      try {
        await adminFetchJson(`/api/admin/midia/formularios/${id}`, {
          method: 'PUT',
          body: JSON.stringify({ schema: { campos: c }, titulo: t, descricao: d || null, config: cfg }),
        })
        setSaveStatus('saved')
        setSaveError('')
      } catch (err) {
        setSaveStatus('error')
        setSaveError(err instanceof Error ? err.message : 'Erro ao salvar.')
      }
    }, 1000)
  }, [id])

  function updateCampos(next: CampoFormulario[]) { setCampos(next); triggerSave() }
  function updateTitulo(v: string) { setTitulo(v); triggerSave() }
  function updateDescricao(v: string) { setDescricao(v); triggerSave() }
  function updateConfig(c: ConfigFormulario) { setConfig(c); triggerSave() }

  const selectedCampo = campos.find((c) => c.id === selectedId) ?? null

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragStart(e: DragStartEvent) {
    setActiveId(e.active.id as string)
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null)
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldIndex = campos.findIndex((c) => c.id === active.id)
    const newIndex = campos.findIndex((c) => c.id === over.id)
    updateCampos(arrayMove(campos, oldIndex, newIndex))
  }

  function addField(tipo: TipoCampo) {
    const campo = newCampo(tipo)
    updateCampos([...campos, campo])
    setSelectedId(campo.id)
    setShowConfig(false)
  }

  function updateField(updated: CampoFormulario) {
    updateCampos(campos.map((c) => (c.id === updated.id ? updated : c)))
  }

  function duplicateField(id: string) {
    const idx = campos.findIndex((c) => c.id === id)
    if (idx === -1) return
    const dup = { ...campos[idx], id: crypto.randomUUID() }
    const next = [...campos]
    next.splice(idx + 1, 0, dup)
    updateCampos(next)
    setSelectedId(dup.id)
  }

  function deleteField(id: string) {
    updateCampos(campos.filter((c) => c.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  const activeCampo = campos.find((c) => c.id === activeId)

  if (loading) {
    return (
      <PageAccessGuard pageKey="instagram">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      </PageAccessGuard>
    )
  }

  return (
    <PageAccessGuard pageKey="instagram">
      <div className="flex flex-col h-screen bg-[#F0F0F3]">

        {/* ── Top bar ─────────────────────────────────────────────────────────── */}
        <div className="shrink-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 shadow-sm z-10">
          <button
            type="button"
            onClick={() => router.push('/admin/midia/formularios')}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-sm font-medium transition-colors"
          >
            <ClipboardList size={15} />
            <span className="hidden sm:inline">Formulários</span>
          </button>
          <span className="text-slate-300">/</span>
          <h1 className="text-sm font-bold text-slate-800 truncate flex-1">{titulo || 'Sem título'}</h1>

          {/* Save status */}
          <div className="flex items-center gap-1.5 text-xs shrink-0">
            {saveStatus === 'saving' && <><Loader2 size={12} className="animate-spin text-slate-400" /><span className="text-slate-400 hidden sm:inline">Salvando...</span></>}
            {saveStatus === 'saved'  && <><Check size={12} className="text-emerald-500" /><span className="text-emerald-600 hidden sm:inline">Salvo</span></>}
            {saveStatus === 'unsaved' && <><Save size={12} className="text-amber-500" /><span className="text-amber-600 hidden sm:inline">Não salvo</span></>}
            {saveStatus === 'error'  && <><AlertCircle size={12} className="text-red-500" /><span className="text-red-600 hidden sm:inline">{saveError || 'Erro'}</span></>}
          </div>

          <button
            type="button"
            onClick={() => { setShowConfig(true); setSelectedId(null) }}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors"
          >
            <Settings size={13} />
            <span className="hidden sm:inline">Config.</span>
          </button>

          {slug ? (
            <a
              href={`/f/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors"
            >
              <Eye size={13} />
              <span className="hidden sm:inline">Pré-visualizar</span>
            </a>
          ) : (
            <span className="flex items-center gap-1.5 rounded-lg border border-slate-100 bg-slate-50 px-3 py-1.5 text-xs text-slate-300 cursor-not-allowed">
              <Eye size={13} />
              <span className="hidden sm:inline">Pré-visualizar</span>
            </span>
          )}
        </div>

        {/* ── Main layout ─────────────────────────────────────────────────────── */}
        <div className="flex-1 flex overflow-hidden">

          {/* ── Left panel — field types ──────────────────────────────────────── */}
          <div className="w-52 shrink-0 bg-white border-r border-slate-200 overflow-y-auto hidden md:flex flex-col">
            <div className="px-3 py-3 border-b border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Adicionar campo</p>
            </div>
            <div className="flex-1 p-2 space-y-3">
              {GRUPOS.map((grupo) => (
                <div key={grupo}>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-1 mb-1.5">{grupo}</p>
                  <div className="space-y-0.5">
                    {TIPOS_POR_GRUPO[grupo].map((tipo) => {
                      const meta = TIPO_CAMPO_META[tipo]
                      return (
                        <button
                          key={tipo}
                          type="button"
                          onClick={() => addField(tipo)}
                          className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-600 hover:bg-orange-50 hover:text-orange-700 transition-colors text-left group"
                        >
                          <div className="w-5 h-5 rounded bg-slate-100 group-hover:bg-orange-100 flex items-center justify-center transition-colors shrink-0">
                            <FieldIcon tipo={tipo} size={11} />
                          </div>
                          {meta.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Canvas ───────────────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="max-w-2xl mx-auto space-y-3">

              {/* Form header preview */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-2">
                <h2 className="text-lg font-bold text-slate-800">{titulo || <span className="text-slate-300">Título do formulário</span>}</h2>
                {descricao && <p className="text-sm text-slate-500 mt-1">{descricao}</p>}
              </div>

              {/* Mobile: add field button */}
              <div className="md:hidden">
                <button
                  type="button"
                  onClick={() => addField('texto_curto')}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-orange-200 bg-orange-50/60 py-3 text-sm font-semibold text-orange-700 hover:bg-orange-100 transition-colors"
                >
                  <Plus size={15} /> Adicionar campo
                </button>
              </div>

              {campos.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-16 text-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                    <ClipboardList className="w-6 h-6 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-600">Formulário vazio</p>
                    <p className="text-xs text-slate-400 mt-0.5">Clique em um tipo de campo no painel esquerdo para adicionar.</p>
                  </div>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={campos.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {campos.map((campo) => (
                        <SortableFieldCard
                          key={campo.id}
                          campo={campo}
                          isSelected={selectedId === campo.id}
                          onSelect={() => { setSelectedId(campo.id); setShowConfig(false) }}
                          onDuplicate={() => duplicateField(campo.id)}
                          onDelete={() => deleteField(campo.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                  <DragOverlay>
                    {activeCampo && (
                      <div className="bg-white rounded-xl border-2 border-orange-400 shadow-xl px-4 py-3 opacity-90">
                        <div className="flex items-center gap-2">
                          <GripVertical size={14} className="text-slate-400" />
                          <FieldIcon tipo={activeCampo.tipo} size={13} />
                          <span className="text-sm font-semibold text-slate-700">{activeCampo.label}</span>
                        </div>
                      </div>
                    )}
                  </DragOverlay>
                </DndContext>
              )}

              {/* Add field shortcut */}
              {campos.length > 0 && (
                <button
                  type="button"
                  onClick={() => addField('texto_curto')}
                  className="hidden md:flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 hover:border-orange-300 hover:bg-orange-50/40 py-3 text-sm font-medium text-slate-400 hover:text-orange-600 transition-all"
                >
                  <Plus size={14} /> Adicionar campo
                </button>
              )}
            </div>
          </div>

          {/* ── Right panel — properties / config ────────────────────────────── */}
          {(selectedCampo || showConfig) && (
            <div className="w-72 shrink-0 bg-white border-l border-slate-200 overflow-hidden flex flex-col">
              {showConfig ? (
                <ConfigPanel
                  titulo={titulo}
                  descricao={descricao}
                  config={config}
                  onTituloChange={updateTitulo}
                  onDescricaoChange={updateDescricao}
                  onConfigChange={updateConfig}
                  onClose={() => setShowConfig(false)}
                />
              ) : selectedCampo ? (
                <PropertiesPanel
                  campo={selectedCampo}
                  todos={campos}
                  onChange={updateField}
                  onClose={() => setSelectedId(null)}
                />
              ) : null}
            </div>
          )}
        </div>
      </div>
    </PageAccessGuard>
  )
}
