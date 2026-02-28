'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { adminFetchJson } from '@/lib/admin-client'
import TriagemPanel        from './panels/TriagemPanel'
import EscalaPanel         from './panels/EscalaPanel'
import ArteIaPanel         from './panels/ArteIaPanel'
import ArteResponsavelPanel from './panels/ArteResponsavelPanel'
import MaterialPanel       from './panels/MaterialPanel'
import RevisaoPanel        from './panels/RevisaoPanel'
import PostagemPanel       from './panels/PostagemPanel'

// ── Types ──────────────────────────────────────────────────────────────────────
interface Stage {
  id:          string
  demandId:    string
  stepType:    string
  title:       string
  description: string
  dueDate:     string | null
  status:      string
  metadata?:   Record<string, unknown>
}

interface Demand {
  id:          string
  title:       string
  description: string
  dueDate:     string | null
}

interface StageWorkflowDrawerProps {
  stage:    Stage
  demand:   Demand
  onClose:  () => void
  /** Callback chamado após patch de metadata — atualiza o state no page */
  onMetaUpdated: (stageId: string, meta: Record<string, unknown>) => void
  /** Callback chamado após patch de status — atualiza o kanban */
  onStatusUpdated?: (stageId: string, status: string) => void
}

// ── Icon map ──────────────────────────────────────────────────────────────────
const STAGE_ICONS: Record<string, string> = {
  triagem:              '🗂',
  escala:               '📅',
  arte_ia:              '🎨',
  arte_responsavel:     '🎨',
  publicacao_material:  '📁',
  producao_video:       '🎬',
  revisao:              '✅',
  postagem:             '📲',
  geral:                '📋',
}

const STAGE_LABELS: Record<string, string> = {
  triagem:              'Triagem',
  escala:               'Escala',
  arte_ia:              'Arte — IA',
  arte_responsavel:     'Arte — Responsável',
  publicacao_material:  'Material Existente',
  producao_video:       'Produção de Vídeo',
  revisao:              'Revisão / Aprovação',
  postagem:             'Postagem',
  geral:                'Estágio Geral',
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function StageWorkflowDrawer({
  stage,
  demand,
  onClose,
  onMetaUpdated,
  onStatusUpdated,
}: StageWorkflowDrawerProps) {
  const [saving, setSaving] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  /* Fecha ao pressionar Escape */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  /* Salva metadata via PATCH no step */
  const patchMeta = async (newMeta: Record<string, unknown>) => {
    setSaving(true)
    try {
      await adminFetchJson(
        `/api/admin/midia/demandas/${demand.id}/steps/${stage.id}`,
        {
          method: 'PATCH',
          body:   JSON.stringify({ metadata: newMeta }),
        },
      )
      onMetaUpdated(stage.id, newMeta)
    } finally {
      setSaving(false)
    }
  }

  /* Atualiza status do step (ex: 'done') */
  const patchStatus = async (status: string) => {
    setSaving(true)
    try {
      await adminFetchJson(
        `/api/admin/midia/demandas/${demand.id}/steps/${stage.id}`,
        {
          method: 'PATCH',
          body:   JSON.stringify({ status }),
        },
      )
      onStatusUpdated?.(stage.id, status)
    } finally {
      setSaving(false)
    }
  }

  const meta     = stage.metadata ?? {}
  const icon     = STAGE_ICONS[stage.stepType] ?? '📋'
  const label    = STAGE_LABELS[stage.stepType] ?? stage.title

  // ── Renderiza o painel correto ──────────────────────────────────────────────
  const renderPanel = () => {
    switch (stage.stepType) {
      case 'triagem':
        return (
          <TriagemPanel
            stepId={stage.id}
            demandId={demand.id}
            metadata={meta}
            saving={saving}
            onSaved={() => {}}
            onPatchMeta={patchMeta}
          />
        )

      case 'escala':
        return (
          <EscalaPanel
            stepId={stage.id}
            demandId={demand.id}
            metadata={meta}
            stageStatus={stage.status}
            saving={saving}
            onPatchMeta={patchMeta}
            onComplete={() => patchStatus('concluida')}
          />
        )

      case 'arte_ia':
        return (
          <ArteIaPanel
            stepId={stage.id}
            demandId={demand.id}
            metadata={{ ...meta, titulo_demanda: demand.title }}
          />
        )

      case 'arte_responsavel':
        return (
          <ArteResponsavelPanel
            stepId={stage.id}
            demandId={demand.id}
            stepType="arte_responsavel"
            demandTitle={demand.title}
            dueDate={demand.dueDate ?? undefined}
            metadata={meta}
            saving={saving}
            onPatchMeta={patchMeta}
          />
        )

      case 'publicacao_material':
      case 'material_existente':
        return (
          <MaterialPanel
            stepId={stage.id}
            demandId={demand.id}
          />
        )

      case 'producao_video':
        return (
          <ArteResponsavelPanel
            stepId={stage.id}
            demandId={demand.id}
            stepType="producao_video"
            demandTitle={demand.title}
            dueDate={demand.dueDate ?? undefined}
            metadata={meta}
            saving={saving}
            onPatchMeta={patchMeta}
          />
        )

      case 'revisao':
        return <RevisaoPanel demandId={demand.id} />

      case 'postagem':
        return (
          <PostagemPanel
            demandId={demand.id}
            demandTitle={demand.title}
            description={demand.description ?? ''}
            dueDate={demand.dueDate ?? undefined}
          />
        )

      default:
        return (
          <div className="text-center py-8">
            <p className="text-2xl mb-2">📋</p>
            <p className="text-sm text-slate-500">
              Este tipo de estágio não possui fluxo específico configurado.
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Use os itens do estágio para registrar o progresso manualmente.
            </p>
          </div>
        )
    }
  }

  return (
    <>
      {/* Overlay */}
      <div
        ref={overlayRef}
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[290]"
        onClick={onClose}
      />

      {/* Drawer */}
      <aside className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-[300] flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200 flex-shrink-0">
          <span className="text-2xl">{icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Fluxo de trabalho
            </p>
            <h2 className="text-base font-bold text-slate-800 truncate">{label}</h2>
            {stage.title !== label && (
              <p className="text-xs text-slate-500 truncate">{stage.title}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex-shrink-0 w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status badge */}
        <div className="px-5 py-2 border-b border-slate-100 flex-shrink-0">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
              stage.status === 'concluida'      ? 'bg-emerald-100 text-emerald-700'
              : stage.status === 'em_andamento' ? 'bg-blue-100 text-blue-700'
              : stage.status === 'cancelada'    ? 'bg-red-100 text-red-700'
              : 'bg-slate-100 text-slate-600'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {stage.status === 'concluida'      ? 'Concluído'
              : stage.status === 'em_andamento' ? 'Em Andamento'
              : stage.status === 'cancelada'    ? 'Cancelado'
              : 'Pendente'}
          </span>
          {saving && (
            <span className="ml-3 text-xs text-slate-400 animate-pulse">Salvando...</span>
          )}
        </div>

        {/* Body scroll */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {renderPanel()}
        </div>
      </aside>
    </>
  )
}
