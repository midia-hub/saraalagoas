'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  ArrowRight,
  Bot,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  FileCheck2,
  FileImage,
  ListChecks,
  Loader2,
  MessageSquare,
  MoveRight,
  Palette,
  Plus,
  Search,
  Send,
  Tag,
  Trash2,
  User,
  X,
} from 'lucide-react'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { AdminPageHeader } from '@/app/admin/AdminPageHeader'
import { adminFetchJson } from '@/lib/admin-client'
import { CustomSelect } from '@/components/ui/CustomSelect'
import { DatePickerInput } from '@/components/ui/DatePickerInput'
import { Toast } from '@/components/Toast'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import StageWorkflowDrawer from '@/components/admin/midia/demandas/StageWorkflowDrawer'
import PeoplePickerModal from '@/components/admin/midia/demandas/PeoplePickerModal'

// ─── Types ────────────────────────────────────────────────────────────────────
type Demand = {
  id: string
  sourceType: string
  title: string
  description: string
  status: string
  dueDate: string | null
  churchName: string
  createdAt: string
}

type Assignee = { personId: string; name: string }

type StepItem = {
  id: string
  demandId: string
  parentStepId: string
  stepType: string
  title: string
  description: string
  dueDate: string | null
  status: string
  sortOrder: number
  assignees: Assignee[]
  tags: string[]
  createdAt: string
}

type Stage = {
  id: string
  demandId: string
  parentStepId: null
  stepType: string
  title: string
  description: string
  dueDate: string | null
  status: string
  sortOrder: number
  assignees: Assignee[]
  tags: string[]
  createdAt: string
  metadata: Record<string, unknown>
  children: StepItem[]
}

type Comment = {
  id: string
  demandId: string
  stepId: string | null
  content: string
  authorName: string
  createdAt: string
}

type Person = { id: string; full_name: string }

// ─── Pipeline stage definitions ───────────────────────────────────────────────
type StageDef = {
  type: string
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  headerBg: string
  borderColor: string
  textColor: string
}

const STAGE_DEFS: StageDef[] = [
  {
    type: 'triagem',
    label: 'Triagem',
    description: 'Avaliar a demanda e definir o caminho de execução',
    icon: ClipboardList,
    headerBg: 'bg-slate-100',
    borderColor: 'border-slate-300',
    textColor: 'text-slate-700',
  },
  {
    type: 'escala',
    label: 'Escala',
    description: 'Gerar escala de equipe para o evento ou ação',
    icon: Calendar,
    headerBg: 'bg-violet-50',
    borderColor: 'border-violet-200',
    textColor: 'text-violet-700',
  },
  {
    type: 'arte_ia',
    label: 'Arte — IA',
    description: 'Gerar artes automaticamente com base no contexto da demanda',
    icon: Bot,
    headerBg: 'bg-sky-50',
    borderColor: 'border-sky-200',
    textColor: 'text-sky-700',
  },
  {
    type: 'arte_responsavel',
    label: 'Arte — Responsável',
    description: 'Produção de artes por uma pessoa da equipe',
    icon: Palette,
    headerBg: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-700',
  },
  {
    type: 'publicacao_material',
    label: 'Material Existente',
    description: 'Já existe material — seguir direto para postagem',
    icon: FileCheck2,
    headerBg: 'bg-teal-50',
    borderColor: 'border-teal-200',
    textColor: 'text-teal-700',
  },
  {
    type: 'producao_video',
    label: 'Produção de Vídeo',
    description: 'Captação, filmagem ou edição de vídeo',
    icon: FileImage,
    headerBg: 'bg-rose-50',
    borderColor: 'border-rose-200',
    textColor: 'text-rose-700',
  },
  {
    type: 'revisao',
    label: 'Revisão / Aprovação',
    description: 'Revisar material antes de publicar ou entregar',
    icon: ListChecks,
    headerBg: 'bg-orange-50',
    borderColor: 'border-orange-200',
    textColor: 'text-orange-700',
  },
  {
    type: 'postagem',
    label: 'Postagem',
    description: 'Programar e publicar conteúdo nas redes sociais',
    icon: Send,
    headerBg: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    textColor: 'text-emerald-700',
  },
  {
    type: 'geral',
    label: 'Estágio Geral',
    description: 'Etapa personalizada',
    icon: ClipboardList,
    headerBg: 'bg-slate-50',
    borderColor: 'border-slate-200',
    textColor: 'text-slate-600',
  },
]

function getStageDef(type: string): StageDef {
  return STAGE_DEFS.find((s) => s.type === type) ?? STAGE_DEFS[STAGE_DEFS.length - 1]
}

// ─── Tag definitions ─────────────────────────────────────────────────────────
type TagDef = { value: string; label: string; color: string; hint?: string }
const ITEM_TAGS: TagDef[] = [
  { value: 'urgente', label: 'Urgente', color: 'bg-red-100 text-red-700 border-red-200', hint: 'Prioridade máxima' },
  { value: 'design', label: 'Design', color: 'bg-violet-100 text-violet-700 border-violet-200' },
  { value: 'edicao_video', label: 'Edição de Vídeo', color: 'bg-sky-100 text-sky-700 border-sky-200' },
  { value: 'fotografia', label: 'Fotografia', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'filmagem', label: 'Filmagem', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { value: 'aprovacao', label: 'Aprovação', color: 'bg-teal-100 text-teal-700 border-teal-200', hint: 'Necessita aprovação' },
  { value: 'publicacao_redes', label: 'Redes Sociais', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { value: 'impressao', label: 'Impressão', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { value: 'revisao', label: 'Revisão', color: 'bg-slate-100 text-slate-600 border-slate-200' },
]
function tagDef(val: string): TagDef {
  return ITEM_TAGS.find((t) => t.value === val) ?? { value: val, label: val, color: 'bg-slate-100 text-slate-600 border-slate-200' }
}

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'concluida', label: 'Concluída' },
  { value: 'cancelada', label: 'Cancelada' },
]
const STATUS_COLORS: Record<string, string> = {
  pendente: 'bg-slate-100 text-slate-600 border-slate-200',
  em_andamento: 'bg-sky-100 text-sky-700 border-sky-200',
  concluida: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  cancelada: 'bg-red-100 text-red-600 border-red-200',
}
const STATUS_LABELS: Record<string, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em andamento',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
}

function StatusBadge({ status, small }: { status: string; small?: boolean }) {
  return (
    <span className={`inline-flex items-center rounded-full border font-medium ${small ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs'} ${STATUS_COLORS[status] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

function TagBadge({ tag, onRemove }: { tag: string; onRemove?: () => void }) {
  const def = tagDef(tag)
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${def.color}`}>
      <Tag className="h-2.5 w-2.5" />
      {def.label}
      {onRemove && <button type="button" onClick={onRemove} className="ml-0.5 hover:opacity-70"><X className="h-2.5 w-2.5" /></button>}
    </span>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatDate(iso: string | null) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}
function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function checkOverdue(dueDate: string | null, status: string) {
  if (!dueDate || status === 'concluida' || status === 'cancelada') return false
  return dueDate < new Date().toISOString().slice(0, 10)
}

// ─── Comment Section ─────────────────────────────────────────────────────────
function CommentSection({ demandId, stepId = null }: { demandId: string; stepId?: string | null }) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const url = `/api/admin/midia/demandas/${demandId}/comments${stepId ? `?step_id=${stepId}` : ''}`

  useEffect(() => {
    let active = true
    setLoading(true)
    adminFetchJson<{ items?: Comment[] }>(url)
      .then((r) => { if (active) setComments(r.items ?? []) })
      .catch(() => { if (active) setComments([]) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [url])

  async function submit() {
    if (!text.trim()) return
    setSaving(true)
    try {
      const res = await adminFetchJson<{ item: Comment }>(`/api/admin/midia/demandas/${demandId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: text.trim(), stepId }),
      })
      if (res?.item) { setComments((p) => [...p, res.item]); setText('') }
    } finally { setSaving(false) }
  }

  function del(id: string) {
    setConfirmDeleteId(id)
  }

  async function doDeleteComment(id: string) {
    await adminFetchJson(`/api/admin/midia/demandas/${demandId}/comments?comment_id=${id}`, { method: 'DELETE' })
    setComments((p) => p.filter((c) => c.id !== id))
    setConfirmDeleteId(null)
  }

  return (
    <div className="space-y-2 pt-2">
      {loading ? (
        <p className="text-xs text-slate-400 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Carregando…</p>
      ) : comments.length === 0 ? (
        <p className="text-xs text-slate-400 italic">Sem comentários.</p>
      ) : (
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {comments.map((c) => (
            <div key={c.id} className="rounded-xl border border-slate-100 bg-white px-3 py-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-slate-500 font-medium">{c.authorName || 'Anônimo'} · {formatDateTime(c.createdAt)}</span>
                <button type="button" onClick={() => del(c.id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="h-3 w-3" /></button>
              </div>
              <p className="text-xs text-slate-700 whitespace-pre-wrap">{c.content}</p>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-1.5">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Comentar…"
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
          className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20 outline-none transition-all placeholder:text-slate-400" />
        <button type="button" onClick={submit} disabled={saving || !text.trim()}
          className="shrink-0 rounded-xl bg-[#c62737] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#9e1f2e] disabled:opacity-50 transition-colors">
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
        </button>
      </div>

      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Remover comentário"
        message="Remover este comentário? Esta ação não pode ser desfeita."
        variant="danger"
        confirmLabel="Remover"
        onConfirm={() => confirmDeleteId && doDeleteComment(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  )
}

// ─── Item Card ────────────────────────────────────────────────────────────────
function ItemCard({
  item, demandDueDate, people, onUpdate, onDelete,
}: {
  item: StepItem
  demandDueDate: string | null
  people: Person[]
  onUpdate: (u: StepItem) => void
  onDelete: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const [title, setTitle] = useState(item.title)
  const [description, setDescription] = useState(item.description)
  const [dueDate, setDueDate] = useState(item.dueDate ?? '')
  const [status, setStatus] = useState(item.status)
  const [assigneeIds, setAssigneeIds] = useState<string[]>(item.assignees.map((a) => a.personId))
  const [tags, setTags] = useState<string[]>(item.tags)
  const [tagOpen, setTagOpen] = useState(false)
  const [itemPickerOpen, setItemPickerOpen] = useState(false)
  const peopleOpts = useMemo(() => people.map((p) => ({ value: p.id, label: p.full_name })), [people])
  const availTags = ITEM_TAGS.filter((t) => !tags.includes(t.value))

  const overdue = checkOverdue(item.dueDate, item.status)

  async function save() {
    setSaving(true)
    try {
      const res = await adminFetchJson<{ item: StepItem }>(
        `/api/admin/midia/demandas/${item.demandId}/steps/${item.id}`,
        { method: 'PATCH', body: JSON.stringify({ title, description, dueDate: dueDate || null, status, assigneeIds, tags }) },
      )
      if (res?.item) { onUpdate(res.item); setEditing(false) }
    } finally { setSaving(false) }
  }

  async function quickDone() {
    const ns = item.status === 'concluida' ? 'em_andamento' : 'concluida'
    setSaving(true)
    try {
      const res = await adminFetchJson<{ item: StepItem }>(
        `/api/admin/midia/demandas/${item.demandId}/steps/${item.id}`,
        { method: 'PATCH', body: JSON.stringify({ status: ns }) },
      )
      if (res?.item) onUpdate(res.item)
    } finally { setSaving(false) }
  }

  function del() {
    setConfirmDelete(true)
  }

  async function doDelete() {
    setDeleting(true)
    try {
      await adminFetchJson(`/api/admin/midia/demandas/${item.demandId}/steps/${item.id}`, { method: 'DELETE' })
      onDelete(item.id)
    } finally { setDeleting(false) }
  }

  return (
    <div className={`rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-md ${overdue ? 'border-red-200' : 'border-slate-200'} ${item.tags.includes('urgente') ? 'ring-1 ring-red-300' : ''}`}>
      <div className="flex items-start gap-2 px-3 pt-3 pb-2">
        <button type="button" onClick={quickDone} disabled={saving}
          className={`mt-0.5 shrink-0 transition-colors disabled:opacity-40 ${item.status === 'concluida' ? 'text-emerald-500' : 'text-slate-300 hover:text-emerald-400'}`}>
          <CheckCircle2 className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-semibold leading-snug ${item.status === 'concluida' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
            {item.title}
          </p>
          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">{item.tags.map((t) => <TagBadge key={t} tag={t} />)}</div>
          )}
          <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[10px] text-slate-500">
            {item.dueDate && (
              <span className={`flex items-center gap-0.5 ${overdue ? 'text-red-600 font-semibold' : ''}`}>
                <CalendarDays className="h-3 w-3" />{formatDate(item.dueDate)}{overdue && ' · ⚠'}
              </span>
            )}
            {item.assignees.length > 0 && (
              <span className="flex items-center gap-0.5">
                <User className="h-3 w-3" />{item.assignees.map((a) => a.name.split(' ')[0]).join(', ')}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <StatusBadge status={item.status} small />
          <div className="flex items-center gap-0.5">
            <button type="button" onClick={() => setEditing((v) => !v)}
              className="rounded-lg px-1.5 py-0.5 text-[10px] font-medium text-slate-500 hover:bg-slate-100 transition-colors">
              editar
            </button>
            <button type="button" onClick={del} disabled={deleting}
              className="rounded-lg p-1 text-slate-300 hover:text-red-500 disabled:opacity-40 transition-colors">
              {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
            </button>
          </div>
        </div>
      </div>

      {editing && (
        <div className="border-t border-slate-100 px-3 py-3 space-y-2.5">
          <input value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20 outline-none transition-all" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Descrição…"
            className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20 outline-none transition-all resize-none placeholder:text-slate-400" />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] font-medium text-slate-600 mb-1">Data limite</p>
              <DatePickerInput value={dueDate} onChange={setDueDate} />
            </div>
            <div>
              <p className="text-[10px] font-medium text-slate-600 mb-1">Status</p>
              <CustomSelect value={status} onChange={setStatus} options={STATUS_OPTIONS} allowEmpty={false} />
            </div>
          </div>
          <div>
            <p className="text-[10px] font-medium text-slate-600 mb-1">Responsáveis</p>
            <button
              type="button"
              onClick={() => setItemPickerOpen(true)}
              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:border-[#c62737]/50 transition-colors text-left"
            >
              <Search className="h-3 w-3 text-slate-400 flex-shrink-0" />
              <span className="text-xs text-slate-400">
                {assigneeIds.length > 0
                  ? `${assigneeIds.length} pessoa${assigneeIds.length !== 1 ? 's' : ''}`
                  : 'Adicionar pessoa...'}
              </span>
            </button>
            {assigneeIds.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {assigneeIds.map((id) => {
                  const p = people.find((x) => x.id === id)
                  return p ? (
                    <span key={id} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-700">
                      {p.full_name.split(' ')[0]}
                      <button type="button" onClick={() => setAssigneeIds((prev) => prev.filter((x) => x !== id))}><X className="h-2.5 w-2.5" /></button>
                    </span>
                  ) : null
                })}
              </div>
            )}
            {itemPickerOpen && (
              <PeoplePickerModal
                people={people}
                selectedIds={assigneeIds}
                onConfirm={(ids) => setAssigneeIds(ids)}
                onClose={() => setItemPickerOpen(false)}
                title="Selecionar responsáveis"
              />
            )}
          </div>
          <div>
            <p className="text-[10px] font-medium text-slate-600 mb-1">Tags</p>
            <div className="flex flex-wrap gap-1 mb-1.5">
              {tags.map((t) => <TagBadge key={t} tag={t} onRemove={() => setTags((p) => p.filter((x) => x !== t))} />)}
            </div>
            <div className="relative inline-block">
              <button type="button" onClick={() => setTagOpen((v) => !v)}
                className="inline-flex items-center gap-1 rounded-xl border border-dashed border-slate-300 px-2 py-1 text-[10px] font-medium text-slate-500 hover:border-slate-400 transition-colors">
                <Plus className="h-3 w-3" /> Tag
              </button>
              {tagOpen && availTags.length > 0 && (
                <div className="absolute left-0 top-full mt-1 z-30 rounded-2xl border border-slate-200 bg-white shadow-lg p-1.5 min-w-[180px] space-y-0.5">
                  {availTags.map((t) => (
                    <button key={t.value} type="button" onClick={() => { setTags((p) => [...p, t.value]); setTagOpen(false) }}
                      className="w-full flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-slate-50 transition-colors">
                      <TagBadge tag={t.value} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-1.5">
            <button type="button" onClick={save} disabled={saving}
              className="inline-flex items-center gap-1 rounded-xl bg-[#c62737] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#9e1f2e] disabled:opacity-60 transition-colors">
              {saving && <Loader2 className="h-3 w-3 animate-spin" />} Salvar
            </button>
            <button type="button" onClick={() => setEditing(false)}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors">Cancelar</button>
          </div>
        </div>
      )}

      <div className="px-3 pb-2">
        <button type="button" onClick={() => setCommentsOpen((v) => !v)}
          className="flex items-center gap-1 text-[10px] font-medium text-slate-400 hover:text-slate-600 transition-colors mt-1">
          <MessageSquare className="h-3 w-3" /> Comentários
          <ChevronDown className={`h-3 w-3 transition-transform ${commentsOpen ? 'rotate-180' : ''}`} />
        </button>
        {commentsOpen && <CommentSection demandId={item.demandId} stepId={item.id} />}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Excluir item"
        message={`Excluir "${item.title}"? Esta ação não pode ser desfeita.`}
        variant="danger"
        loading={deleting}
        onConfirm={doDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}

// ─── Stage Column ─────────────────────────────────────────────────────────────
function StageColumn({
  stage, demandDueDate, people, isLast,
  onUpdateStage, onDeleteStage, onAddItem, onUpdateItem, onDeleteItem, onOpenWorkflow,
}: {
  stage: Stage
  demandDueDate: string | null
  people: Person[]
  isLast: boolean
  onUpdateStage: (s: Stage) => void
  onDeleteStage: (id: string) => void
  onAddItem: (stageId: string, item: StepItem) => void
  onUpdateItem: (stageId: string, item: StepItem) => void
  onDeleteItem: (stageId: string, itemId: string) => void
  onOpenWorkflow: (stage: Stage) => void
}) {
  const def = getStageDef(stage.stepType)
  const Icon = def.icon

  const [addOpen, setAddOpen] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [editingStage, setEditingStage] = useState(false)
  const [savingStage, setSavingStage] = useState(false)
  const [deletingStage, setDeletingStage] = useState(false)
  const [confirmDeleteStage, setConfirmDeleteStage] = useState(false)

  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newDueDate, setNewDueDate] = useState('')
  const [newAssigneeIds, setNewAssigneeIds] = useState<string[]>([])
  const [newTags, setNewTags] = useState<string[]>([])
  const [newTagOpen, setNewTagOpen] = useState(false)
  const [savingItem, setSavingItem] = useState(false)
  const [peoplePickerOpen, setPeoplePickerOpen] = useState(false)

  const [stageTitle, setStageTitle] = useState(stage.title)
  const [stageStatus, setStageStatus] = useState(stage.status)

  const peopleOpts = useMemo(() => people.map((p) => ({ value: p.id, label: p.full_name })), [people])
  const availNewTags = ITEM_TAGS.filter((t) => !newTags.includes(t.value))
  const doneCount = stage.children.filter((i) => i.status === 'concluida').length
  const totalCount = stage.children.length

  // Metadata tipado para estágio de escala
  const escalaMeta = (stage.metadata ?? {}) as {
    escala_id?:  string
    slot_id?:    string
    ministry?:   string
    event_label?: string
    event_date?: string
    event_time?: string
  }

  async function saveStage() {
    setSavingStage(true)
    try {
      await adminFetchJson(`/api/admin/midia/demandas/${stage.demandId}/steps/${stage.id}`,
        { method: 'PATCH', body: JSON.stringify({ title: stageTitle, status: stageStatus }) })
      onUpdateStage({ ...stage, title: stageTitle, status: stageStatus })
      setEditingStage(false)
    } finally { setSavingStage(false) }
  }

  function deleteStage() {
    setConfirmDeleteStage(true)
  }

  async function doDeleteStage() {
    setDeletingStage(true)
    try {
      await adminFetchJson(`/api/admin/midia/demandas/${stage.demandId}/steps/${stage.id}`, { method: 'DELETE' })
      onDeleteStage(stage.id)
    } finally { setDeletingStage(false) }
  }

  async function createItem() {
    if (!newTitle.trim()) return
    setSavingItem(true)
    try {
      const res = await adminFetchJson<{ item: StepItem }>(`/api/admin/midia/demandas/${stage.demandId}/steps`, {
        method: 'POST',
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim(),
          dueDate: newDueDate || null,
          assigneeIds: newAssigneeIds,
          tags: newTags,
          parentStepId: stage.id,
          stepType: 'item',
        }),
      })
      if (res?.item) {
        onAddItem(stage.id, res.item)
        setNewTitle(''); setNewDescription(''); setNewDueDate('')
        setNewAssigneeIds([]); setNewTags([]); setAddOpen(false)
      }
    } finally { setSavingItem(false) }
  }

  return (
    <div className="flex items-stretch gap-0">
      <div className={`flex flex-col rounded-2xl border ${def.borderColor} bg-white min-w-[260px] max-w-[280px] w-[270px] shadow-sm`}>
        {/* Stage header — overflow visible to allow floating panels */}
        <div className={`rounded-t-2xl px-4 py-3 ${def.headerBg} border-b ${def.borderColor}`}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Icon className={`h-4 w-4 shrink-0 ${def.textColor}`} />
              {editingStage ? (
                <input value={stageTitle} onChange={(e) => setStageTitle(e.target.value)}
                  className="text-xs font-bold bg-white/80 rounded-lg border border-white/60 px-2 py-0.5 w-28 outline-none focus:ring-1 focus:ring-[#c62737]/30" />
              ) : (
                <span className={`text-xs font-bold ${def.textColor} uppercase tracking-wide leading-tight truncate`}>{stage.title}</span>
              )}
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <button type="button" onClick={() => onOpenWorkflow(stage)}
                className={`rounded-lg px-1.5 py-0.5 text-[10px] font-semibold ${def.textColor} hover:bg-white/50 border border-current/20 transition-colors`}>
                ▶ fluxo
              </button>
              <button type="button" onClick={() => setEditingStage((v) => !v)}
                className={`rounded-lg px-1.5 py-0.5 text-[10px] font-medium ${def.textColor} hover:bg-white/50 transition-colors`}>
                {editingStage ? '✕' : 'editar'}
              </button>
              <button type="button" onClick={deleteStage} disabled={deletingStage}
                className={`rounded-lg p-1 ${def.textColor} opacity-50 hover:opacity-100 hover:bg-white/50 disabled:opacity-30 transition-all`}>
                {deletingStage ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
              </button>
            </div>
          </div>
          {editingStage ? (
            <div className="mt-2 space-y-1.5">
              <CustomSelect value={stageStatus} onChange={setStageStatus} options={STATUS_OPTIONS} allowEmpty={false} />
              <div className="flex gap-1.5">
                <button type="button" onClick={saveStage} disabled={savingStage}
                  className="rounded-xl bg-[#c62737] px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-[#9e1f2e] disabled:opacity-60">
                  {savingStage ? <Loader2 className="h-3 w-3 animate-spin inline" /> : 'Salvar'}
                </button>
                <button type="button" onClick={() => setEditingStage(false)}
                  className="rounded-xl border border-slate-200 px-2.5 py-1 text-[10px] font-medium text-slate-600 hover:bg-white/20">Cancelar</button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between mt-1.5">
              <StatusBadge status={stage.status} small />
              <span className={`text-[10px] ${def.textColor} opacity-70`}>
                {totalCount > 0 ? `${doneCount}/${totalCount} item${totalCount !== 1 ? 's' : ''}` : 'Sem itens'}
              </span>
            </div>
          )}

          {/* Mini-card de informações para estágio de escala */}
          {!editingStage && stage.stepType === 'escala' && !!escalaMeta.escala_id && (
            <div className="mt-2 rounded-xl border border-violet-200 bg-white/70 px-3 py-2 space-y-0.5">
              <p className="text-[11px] font-semibold text-violet-800 truncate">
                📅 {escalaMeta.event_label ?? 'Evento vinculado'}
              </p>
              {(escalaMeta.ministry || escalaMeta.event_date) && (
                <p className="text-[10px] text-violet-600 truncate">
                  {escalaMeta.ministry ?? ''}
                  {escalaMeta.event_date
                    ? ` · ${escalaMeta.event_date.split('-').reverse().join('/')}`
                    : ''}
                  {escalaMeta.event_time ? ` · ${escalaMeta.event_time}` : ''}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Items list */}
        <div className="flex-1 p-3 space-y-2.5 overflow-y-auto max-h-[520px]">
          {stage.children.length === 0 && !addOpen && (
            <p className="text-[11px] text-slate-400 italic text-center py-3">Nenhum item neste estágio</p>
          )}
          {stage.children.map((item) => (
            <ItemCard key={item.id} item={item} demandDueDate={demandDueDate} people={people}
              onUpdate={(updated) => onUpdateItem(stage.id, updated)}
              onDelete={(id) => onDeleteItem(stage.id, id)} />
          ))}

          {addOpen && (
            <div className="rounded-xl border border-[#c62737]/30 bg-slate-50 p-3 space-y-2.5">
              <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Título do item *" autoFocus
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20 outline-none transition-all placeholder:text-slate-400" />
              <textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} rows={2} placeholder="Descrição (opcional)…"
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20 outline-none transition-all resize-none placeholder:text-slate-400" />
              <div>
                <p className="text-[10px] font-medium text-slate-600 mb-1">Data limite</p>
                <DatePickerInput value={newDueDate} onChange={setNewDueDate} />
              </div>
              <div>
                <p className="text-[10px] font-medium text-slate-600 mb-1">Responsáveis</p>
                <button
                  type="button"
                  onClick={() => setPeoplePickerOpen(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:border-[#c62737]/50 transition-colors text-left"
                >
                  <Search className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                  <span className="text-xs text-slate-400">
                    {newAssigneeIds.length > 0
                      ? `${newAssigneeIds.length} pessoa${newAssigneeIds.length !== 1 ? 's' : ''} selecionada${newAssigneeIds.length !== 1 ? 's' : ''}`
                      : 'Buscar e selecionar...'}
                  </span>
                </button>
                {newAssigneeIds.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {newAssigneeIds.map((id) => {
                      const p = people.find((x) => x.id === id)
                      return p ? (
                        <span key={id} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] text-slate-700">
                          {p.full_name.split(' ')[0]}
                          <button type="button" onClick={() => setNewAssigneeIds((prev) => prev.filter((x) => x !== id))}><X className="h-2.5 w-2.5" /></button>
                        </span>
                      ) : null
                    })}
                  </div>
                )}
                {peoplePickerOpen && (
                  <PeoplePickerModal
                    people={people}
                    selectedIds={newAssigneeIds}
                    onConfirm={(ids) => setNewAssigneeIds(ids)}
                    onClose={() => setPeoplePickerOpen(false)}
                    title="Selecionar responsáveis"
                  />
                )}
              </div>
              <div>
                <p className="text-[10px] font-medium text-slate-600 mb-1">Tags</p>
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {newTags.map((t) => <TagBadge key={t} tag={t} onRemove={() => setNewTags((p) => p.filter((x) => x !== t))} />)}
                </div>
                <div className="relative inline-block">
                  <button type="button" onClick={() => setNewTagOpen((v) => !v)}
                    className="inline-flex items-center gap-1 rounded-xl border border-dashed border-slate-300 px-2 py-1 text-[10px] font-medium text-slate-500 hover:border-slate-400 transition-colors">
                    <Plus className="h-3 w-3" /> Tag
                  </button>
                  {newTagOpen && availNewTags.length > 0 && (
                    <div className="absolute left-0 top-full mt-1 z-30 rounded-2xl border border-slate-200 bg-white shadow-lg p-1.5 min-w-[180px] space-y-0.5">
                      {availNewTags.map((t) => (
                        <button key={t.value} type="button" onClick={() => { setNewTags((p) => [...p, t.value]); setNewTagOpen(false) }}
                          className="w-full flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-slate-50 transition-colors">
                          <TagBadge tag={t.value} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-1.5">
                <button type="button" onClick={createItem} disabled={savingItem || !newTitle.trim()}
                  className="inline-flex items-center gap-1 rounded-xl bg-[#c62737] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#9e1f2e] disabled:opacity-60 transition-colors">
                  {savingItem ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />} Criar
                </button>
                <button type="button" onClick={() => setAddOpen(false)}
                  className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors">Cancelar</button>
              </div>
            </div>
          )}
        </div>

        <div className="px-3 pb-3 space-y-1.5 border-t border-slate-100 pt-2">
          {!addOpen && (
            <button type="button" onClick={() => setAddOpen(true)}
              className="w-full flex items-center justify-center gap-1 rounded-xl border border-dashed border-slate-200 bg-slate-50 py-2 text-xs font-medium text-slate-500 hover:border-slate-300 hover:bg-white hover:text-slate-700 transition-all">
              <Plus className="h-3.5 w-3.5" /> Novo item
            </button>
          )}
          <button type="button" onClick={() => setCommentsOpen((v) => !v)}
            className="w-full flex items-center justify-center gap-1 text-[10px] font-medium text-slate-400 hover:text-slate-600 transition-colors">
            <MessageSquare className="h-3 w-3" /> Comentários do estágio
            <ChevronDown className={`h-3 w-3 transition-transform ${commentsOpen ? 'rotate-180' : ''}`} />
          </button>
          {commentsOpen && <CommentSection demandId={stage.demandId} stepId={stage.id} />}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDeleteStage}
        title="Excluir estágio"
        message={`Excluir o estágio "${stage.title}" e todos os seus itens? Esta ação não pode ser desfeita.`}
        variant="danger"
        loading={deletingStage}
        onConfirm={doDeleteStage}
        onCancel={() => setConfirmDeleteStage(false)}
      />

      {!isLast && (
        <div className="flex items-center justify-center w-7 shrink-0 mt-16">
          <MoveRight className="h-5 w-5 text-slate-300" />
        </div>
      )}
    </div>
  )
}

// ─── Add Stage Modal ──────────────────────────────────────────────────────────
function AddStageModal({ usedTypes, onSelect, onClose }: {
  usedTypes: string[]
  onSelect: (type: string, title: string) => void
  onClose: () => void
}) {
  const [selected, setSelected] = useState('')
  const [customTitle, setCustomTitle] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <p className="text-sm font-semibold text-slate-800">Adicionar estágio ao pipeline</p>
          <button type="button" onClick={onClose} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 transition-colors"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5 max-h-[60vh] overflow-y-auto">
          <p className="text-xs text-slate-500 mb-3">Escolha o tipo de estágio para o fluxo desta demanda:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {STAGE_DEFS.map((s) => {
              const alreadyUsed = usedTypes.filter((t) => t !== 'geral').includes(s.type)
              const Icon = s.icon
              return (
                <button key={s.type} type="button" disabled={alreadyUsed}
                  onClick={() => { setSelected(s.type); setCustomTitle('') }}
                  className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-all ${alreadyUsed ? 'opacity-40 cursor-not-allowed border-slate-100 bg-slate-50' : selected === s.type ? `${s.headerBg} ${s.borderColor} ring-2 ring-[#c62737]/20` : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}>
                  <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${s.textColor}`} />
                  <div>
                    <p className={`text-xs font-semibold ${s.textColor}`}>{s.label}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{s.description}</p>
                  </div>
                </button>
              )
            })}
          </div>
          {selected && (
            <div className="mt-4">
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Título personalizado (opcional)</label>
              <input value={customTitle} onChange={(e) => setCustomTitle(e.target.value)}
                placeholder={getStageDef(selected).label}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20 outline-none transition-all placeholder:text-slate-400" />
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button type="button" onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">Cancelar</button>
          <button type="button" disabled={!selected}
            onClick={() => onSelect(selected, customTitle || getStageDef(selected).label)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#c62737] px-4 py-2 text-sm font-semibold text-white hover:bg-[#9e1f2e] disabled:opacity-50 transition-colors">
            <Plus className="h-4 w-4" /> Adicionar estágio
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function DemandDetailPage() {
  const { id } = useParams<{ id: string }>()

  const [demand, setDemand] = useState<Demand | null>(null)
  const [stages, setStages] = useState<Stage[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [savingDemand, setSavingDemand] = useState(false)
  const [demandCommentsOpen, setDemandCommentsOpen] = useState(false)
  const [addStageOpen, setAddStageOpen] = useState(false)
  const [addingStage, setAddingStage] = useState(false)
  const [activePanelStage, setActivePanelStage] = useState<Stage | null>(null)

  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'ok' | 'err' }>({ visible: false, message: '', type: 'ok' })
  function showToast(m: string, t: 'ok' | 'err') { setToast({ visible: true, message: m, type: t }) }

  useEffect(() => {
    if (!id) return
    let active = true
    async function load() {
      setLoading(true)
      try {
        const [demandRes, stagesRes, peopleRes] = await Promise.all([
          adminFetchJson<{ item: Demand }>(`/api/admin/midia/demandas/${id}`),
          adminFetchJson<{ stages: Stage[] }>(`/api/admin/midia/demandas/${id}/steps`),
          adminFetchJson<{ items: Person[] }>('/api/admin/consolidacao/people'),
        ])
        if (!active) return
        setDemand(demandRes.item ?? null)
        setStages(stagesRes.stages ?? [])
        setPeople(peopleRes.items ?? [])
      } catch {
        if (active) showToast('Erro ao carregar demanda.', 'err')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [id])

  async function updateDemandField(field: 'status' | 'dueDate', value: string) {
    if (!demand) return
    setSavingDemand(true)
    try {
      const res = await adminFetchJson<{ item: Demand }>(`/api/admin/midia/demandas/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ [field]: value || null }),
      })
      if (res?.item) setDemand(res.item)
    } catch { showToast('Erro ao atualizar.', 'err') } finally { setSavingDemand(false) }
  }

  async function addStage(stepType: string, title: string) {
    setAddingStage(true)
    setAddStageOpen(false)
    try {
      const res = await adminFetchJson<{ item: any }>(`/api/admin/midia/demandas/${id}/steps`, {
        method: 'POST',
        body: JSON.stringify({ title, stepType, parentStepId: null }),
      })
      if (res?.item) {
        setStages((prev) => [...prev, { ...res.item, children: [] }])
        showToast('Estágio adicionado.', 'ok')
      }
    } catch { showToast('Erro ao adicionar estágio.', 'err') } finally { setAddingStage(false) }
  }

  const updateStage = useCallback((updated: Stage) => {
    setStages((prev) => prev.map((s) => s.id === updated.id ? { ...updated, children: s.children } : s))
  }, [])
  const handleMetaUpdated = useCallback((stageId: string, meta: Record<string, unknown>) => {
    setStages((prev) => prev.map((s) => s.id === stageId ? { ...s, metadata: meta } : s))
    setActivePanelStage((prev) => prev?.id === stageId ? { ...prev, metadata: meta } : prev)
  }, [])
  const handleStatusUpdated = useCallback((stageId: string, status: string) => {
    setStages((prev) => prev.map((s) => s.id === stageId ? { ...s, status } : s))
    setActivePanelStage((prev) => prev?.id === stageId ? { ...prev, status } : prev)
  }, [])
  const deleteStage = useCallback((stageId: string) => {
    setStages((prev) => prev.filter((s) => s.id !== stageId))
  }, [])
  const addItem = useCallback((stageId: string, item: StepItem) => {
    setStages((prev) => prev.map((s) => s.id === stageId ? { ...s, children: [...s.children, item] } : s))
  }, [])
  const updateItem = useCallback((stageId: string, updated: StepItem) => {
    setStages((prev) => prev.map((s) => s.id === stageId
      ? { ...s, children: s.children.map((i) => i.id === updated.id ? updated : i) } : s))
  }, [])
  const deleteItem = useCallback((stageId: string, itemId: string) => {
    setStages((prev) => prev.map((s) => s.id === stageId
      ? { ...s, children: s.children.filter((i) => i.id !== itemId) } : s))
  }, [])

  const allItems = useMemo(() => stages.flatMap((s) => s.children), [stages])
  const doneItems = useMemo(() => allItems.filter((i) => i.status === 'concluida').length, [allItems])
  const progressPct = allItems.length > 0 ? Math.round((doneItems / allItems.length) * 100) : 0
  const usedTypes = useMemo(() => stages.map((s) => s.stepType), [stages])

  if (loading) {
    return (
      <PageAccessGuard pageKey="instagram">
        <div className="p-8 flex items-center gap-2 text-slate-500 text-sm">
          <Loader2 className="h-5 w-5 animate-spin" /> Carregando demanda…
        </div>
      </PageAccessGuard>
    )
  }
  if (!demand) {
    return (
      <PageAccessGuard pageKey="instagram">
        <div className="p-8 text-slate-500 text-sm">Demanda não encontrada.</div>
      </PageAccessGuard>
    )
  }

  return (
    <PageAccessGuard pageKey="instagram">
      <div className="p-4 md:p-8 space-y-6">

        <AdminPageHeader
          icon={ClipboardList}
          title={demand.title}
          subtitle={`${demand.churchName} · ${formatDateTime(demand.createdAt)}`}
          backLink={{ href: '/admin/midia/demandas', label: 'Voltar para Demandas' }}
        />

        {/* ── Demand info card ── */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 space-y-4">
          {demand.description && (
            <p className="text-sm text-slate-600 whitespace-pre-wrap">{demand.description}</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Status da demanda</label>
              <div className="flex items-center gap-2">
                {savingDemand && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400 shrink-0" />}
                <CustomSelect value={demand.status} onChange={(v) => updateDemandField('status', v)} options={STATUS_OPTIONS} allowEmpty={false} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Data limite</label>
              <DatePickerInput value={demand.dueDate ?? ''} onChange={(v) => updateDemandField('dueDate', v)} />
            </div>
            {allItems.length > 0 && (
              <div>
                <p className="text-xs text-slate-500 mb-1">{doneItems}/{allItems.length} itens concluídos · {progressPct}%</p>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progressPct}%` }} />
                </div>
              </div>
            )}
          </div>
          <div>
            <button type="button" onClick={() => setDemandCommentsOpen((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors">
              <MessageSquare className="h-3.5 w-3.5" /> Comentários da demanda
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${demandCommentsOpen ? 'rotate-180' : ''}`} />
            </button>
            {demandCommentsOpen && <div className="mt-3"><CommentSection demandId={demand.id} /></div>}
          </div>
        </section>

        {/* ── Pipeline ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-base font-semibold text-slate-800">Pipeline de execução</p>
              <p className="text-xs text-slate-500">
                {stages.length === 0
                  ? 'Nenhum estágio — adicione o primeiro para montar o fluxo'
                  : `${stages.length} estágio${stages.length !== 1 ? 's' : ''} · ${allItems.length} item${allItems.length !== 1 ? 's' : ''}`}
              </p>
            </div>
            <button type="button" onClick={() => setAddStageOpen(true)} disabled={addingStage}
              className="inline-flex items-center gap-2 rounded-xl bg-[#c62737] px-4 py-2 text-sm font-semibold text-white hover:bg-[#9e1f2e] disabled:opacity-60 transition-colors">
              {addingStage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Adicionar estágio
            </button>
          </div>

          {stages.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 py-14 flex flex-col items-center justify-center gap-3 text-center px-6">
              <ArrowRight className="h-10 w-10 text-slate-300" />
              <p className="text-sm font-semibold text-slate-500">Pipeline vazio</p>
              <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                Monte o fluxo adicionando estágios como <strong>Triagem</strong>, <strong>Arte IA</strong>, <strong>Arte por Responsável</strong> e <strong>Postagem</strong>. Cada estágio pode ter múltiplos itens com responsáveis, datas e tags.
              </p>
              <button type="button" onClick={() => setAddStageOpen(true)}
                className="mt-1 inline-flex items-center gap-2 rounded-xl border border-[#c62737]/30 bg-white px-4 py-2 text-sm font-semibold text-[#c62737] hover:bg-[#c62737]/5 transition-colors">
                <Plus className="h-4 w-4" /> Adicionar primeiro estágio
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto pb-6 -mx-4 px-4 md:-mx-8 md:px-8">
              <div className="flex items-start w-max gap-0">
                {stages.map((stage, idx) => (
                  <StageColumn
                    key={stage.id}
                    stage={stage}
                    demandDueDate={demand.dueDate}
                    people={people}
                    isLast={idx === stages.length - 1}
                    onUpdateStage={updateStage}
                    onDeleteStage={deleteStage}
                    onAddItem={addItem}
                    onUpdateItem={updateItem}
                    onDeleteItem={deleteItem}
                    onOpenWorkflow={setActivePanelStage}
                  />
                ))}
              </div>
            </div>
          )}
        </section>

        {addStageOpen && (
          <AddStageModal
            usedTypes={usedTypes}
            onSelect={addStage}
            onClose={() => setAddStageOpen(false)}
          />
        )}

        {activePanelStage && demand && (
          <StageWorkflowDrawer
            stage={activePanelStage}
            demand={demand}
            onClose={() => setActivePanelStage(null)}
            onMetaUpdated={handleMetaUpdated}
            onStatusUpdated={handleStatusUpdated}
          />
        )}

        <Toast
          visible={toast.visible}
          message={toast.message}
          type={toast.type}
          onClose={() => setToast((t) => ({ ...t, visible: false }))}
        />
      </div>
    </PageAccessGuard>
  )
}
