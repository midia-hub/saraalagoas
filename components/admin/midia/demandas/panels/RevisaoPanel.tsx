'use client'

import { useState, useEffect } from 'react'
import { adminFetchJson } from '@/lib/admin-client'

interface StepFile {
  id:          string
  step_id:     string
  file_name:   string
  file_url:    string
  mime_type:   string
  file_size:   number
  source_type: string
  approved:    boolean | null
  created_at:  string
}

interface Step {
  id:        string
  step_type: string
  title:     string
}

interface RevisaoGroup {
  step: Step
  files: StepFile[]
}

interface RevisaoPanelProps {
  demandId: string
}

const STEP_TYPE_LABELS: Record<string, string> = {
  triagem:           '🗂 Triagem',
  escala:            '📅 Escala',
  arte_ia:           '🎨 Arte IA',
  arte_responsavel:  '🎨 Arte Responsável',
  material_existente:'📁 Material Existente',
  producao_video:    '🎬 Produção de Vídeo',
  revisao:           '✅ Revisão',
  postagem:          '📲 Postagem',
}

function isImage(mime: string) { return mime.startsWith('image/') }

export default function RevisaoPanel({ demandId }: RevisaoPanelProps) {
  const [groups,  setGroups]  = useState<RevisaoGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [saving,  setSaving]  = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      // Busca todos os steps da demanda
      const stepsData = await adminFetchJson<{ steps?: Step[]; items?: Step[] }>(`/api/admin/midia/demandas/${demandId}/steps`)
      const steps: Step[] = stepsData.steps ?? stepsData.items ?? []

      // Busca arquivos de cada step em paralelo
      const filesPerStep = await Promise.all(
        steps.map((s) =>
          adminFetchJson<{ files?: StepFile[] }>(`/api/admin/midia/demandas/${demandId}/steps/${s.id}/files`)
            .then((d) => ({ step: s, files: (d.files ?? []) as StepFile[] }))
            .catch(() => ({ step: s, files: [] as StepFile[] })),
        ),
      )

      setGroups(filesPerStep.filter((g) => g.files.length > 0))
    } catch {
      setError('Erro ao carregar material para revisão.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [demandId]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleApprove = async (file: StepFile) => {
    setSaving(file.id)
    try {
      // PATCH no file via SQL direto (não temos endpoint de patch de arquivo ainda)
      await adminFetchJson(`/api/admin/midia/demandas/${demandId}/steps/${file.step_id}/files`, {
        method: 'PATCH',
        body: JSON.stringify({ file_id: file.id, approved: !file.approved }),
      })
      setGroups((prev) =>
        prev.map((g) => ({
          ...g,
          files: g.files.map((f) =>
            f.id === file.id ? { ...f, approved: !f.approved } : f,
          ),
        })),
      )
    } catch {
      setError('Erro ao atualizar aprovação.')
    } finally {
      setSaving(null)
    }
  }

  if (loading) return <p className="text-sm text-slate-400 text-center py-8">Carregando material...</p>
  if (error)   return <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
  if (groups.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-2xl mb-2">📭</p>
        <p className="text-sm text-slate-500">Nenhum material produzido ainda.</p>
        <p className="text-xs text-slate-400 mt-1">
          Arquivos gerados nas etapas anteriores aparecerão aqui para revisão.
        </p>
      </div>
    )
  }

  const totalFiles    = groups.reduce((s, g) => s + g.files.length, 0)
  const approvedFiles = groups.reduce((s, g) => s + g.files.filter((f) => f.approved).length, 0)

  return (
    <div className="space-y-5">
      {/* Resumo */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
        <span className="text-sm text-slate-600 font-medium">Total de materiais</span>
        <span className="text-sm font-semibold">
          <span className="text-emerald-600">{approvedFiles} aprovados</span>
          <span className="text-slate-400 mx-1">/</span>
          <span className="text-slate-700">{totalFiles} total</span>
        </span>
      </div>

      {/* Grupos por etapa */}
      {groups.map((group) => (
        <div key={group.step.id} className="space-y-2">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            {STEP_TYPE_LABELS[group.step.step_type] ?? group.step.step_type}
            {group.step.title ? ` — ${group.step.title}` : ''}
          </h4>

          {group.files.map((f) => (
            <div
              key={f.id}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                f.approved === true
                  ? 'border-emerald-200 bg-emerald-50'
                  : f.approved === false
                  ? 'border-red-100 bg-red-50/40'
                  : 'border-slate-200 bg-white'
              }`}
            >
              {/* preview */}
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0 flex items-center justify-center">
                {isImage(f.mime_type) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.file_url} alt={f.file_name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl">{f.mime_type.includes('video') ? '🎬' : '📄'}</span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">{f.file_name}</p>
                <p className="text-xs text-slate-400">
                  {f.source_type === 'dalle' ? 'Arte IA' : 'Upload'} ·{' '}
                  {new Date(f.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <a
                  href={f.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
                >
                  ↗
                </a>
                <button
                  type="button"
                  onClick={() => toggleApprove(f)}
                  disabled={saving === f.id}
                  className={`text-xs px-2 py-1.5 rounded-lg font-semibold transition-colors disabled:opacity-60 ${
                    f.approved
                      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                      : 'bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-700'
                  }`}
                >
                  {saving === f.id ? '...' : f.approved ? '✓ Aprovado' : 'Aprovar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
