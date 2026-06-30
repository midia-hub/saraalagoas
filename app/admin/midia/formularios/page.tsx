'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ChevronRight,
  ClipboardList,
  Copy,
  ExternalLink,
  Loader2,
  MessageSquare,
  PenLine,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
} from 'lucide-react'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { AdminPageHeader } from '@/app/admin/AdminPageHeader'
import { adminFetchJson } from '@/lib/admin-client'
import type { ConfigFormulario } from '@/lib/formularios'

type FormularioItem = {
  id: string
  titulo: string
  descricao: string | null
  slug: string
  ativo: boolean
  config: ConfigFormulario
  created_at: string
  total_respostas: number
}

function StatusBadge({ ativo, config }: { ativo: boolean; config: ConfigFormulario }) {
  if (!ativo) return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
      Fechado
    </span>
  )
  if (config.data_encerramento && new Date(config.data_encerramento) < new Date()) return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
      Prazo expirado
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
      Aberto
    </span>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function FormulariosListPage() {
  const [items, setItems] = useState<FormularioItem[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    adminFetchJson<{ items: FormularioItem[] }>('/api/admin/midia/formularios')
      .then((d) => setItems(d.items ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  async function handleDelete(id: string, titulo: string) {
    if (!confirm(`Excluir "${titulo}" e todas as respostas? Esta ação não pode ser desfeita.`)) return
    setDeletingId(id)
    try {
      await adminFetchJson(`/api/admin/midia/formularios/${id}`, { method: 'DELETE' })
      setItems((prev) => prev.filter((f) => f.id !== id))
    } catch {
      alert('Erro ao excluir formulário.')
    } finally {
      setDeletingId(null)
    }
  }

  async function handleToggle(item: FormularioItem) {
    setTogglingId(item.id)
    try {
      const { formulario } = await adminFetchJson<{ formulario: FormularioItem }>(
        `/api/admin/midia/formularios/${item.id}`,
        { method: 'PUT', body: JSON.stringify({ ativo: !item.ativo }) }
      )
      setItems((prev) => prev.map((f) => (f.id === item.id ? { ...f, ativo: formulario.ativo } : f)))
    } catch {
      alert('Erro ao alterar status.')
    } finally {
      setTogglingId(null)
    }
  }

  function handleCopyLink(slug: string) {
    const url = `${window.location.origin}/f/${slug}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(slug)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  return (
    <PageAccessGuard pageKey="instagram">
      <div className="p-3 sm:p-4 md:p-6 space-y-5">
        <AdminPageHeader
          icon={ClipboardList}
          title="Formulários"
          subtitle="Crie e gerencie formulários com link público para preenchimento externo."
          backLink={{ href: '/admin/midia', label: 'Voltar para Mídia' }}
          actions={
            <Link
              href="/admin/midia/formularios/novo"
              className="inline-flex items-center gap-2 rounded-xl bg-[#c2410c] hover:bg-[#9a3412] text-white text-sm font-bold px-4 py-2.5 transition-colors shadow-sm"
            >
              <Plus size={16} />
              Novo formulário
            </Link>
          }
        />

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-16 text-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center">
              <ClipboardList className="w-7 h-7 text-orange-400" />
            </div>
            <div>
              <p className="text-base font-bold text-slate-700">Nenhum formulário criado ainda</p>
              <p className="text-sm text-slate-400 mt-1">Crie seu primeiro formulário para compartilhar com o público.</p>
            </div>
            <Link
              href="/admin/midia/formularios/novo"
              className="inline-flex items-center gap-2 rounded-xl bg-[#c2410c] hover:bg-[#9a3412] text-white text-sm font-bold px-5 py-2.5 transition-colors"
            >
              <Plus size={16} /> Criar formulário
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all overflow-hidden"
              >
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3">
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-slate-800 truncate">{item.titulo}</p>
                      <StatusBadge ativo={item.ativo} config={item.config} />
                    </div>
                    {item.descricao && (
                      <p className="text-xs text-slate-400 mt-0.5 truncate">{item.descricao}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 flex-wrap text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <MessageSquare size={11} />
                        {item.total_respostas} resposta{item.total_respostas !== 1 ? 's' : ''}
                      </span>
                      <span>Criado em {formatDate(item.created_at)}</span>
                      {item.config.data_encerramento && (
                        <span className="flex items-center gap-1">
                          <AlertCircle size={11} />
                          Encerra {formatDate(item.config.data_encerramento)}
                        </span>
                      )}
                      {item.config.limite_respostas != null && (
                        <span>Limite: {item.total_respostas}/{item.config.limite_respostas}</span>
                      )}
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleCopyLink(item.slug)}
                      title="Copiar link público"
                      className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors"
                    >
                      {copied === item.slug ? (
                        <><Copy size={12} className="text-emerald-500" /><span className="text-emerald-600">Copiado!</span></>
                      ) : (
                        <><Copy size={12} /><span>Link</span></>
                      )}
                    </button>

                    <a
                      href={`/f/${item.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Ver formulário público"
                      className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors"
                    >
                      <ExternalLink size={12} />
                    </a>

                    <Link
                      href={`/admin/midia/formularios/${item.id}/respostas`}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors"
                    >
                      <MessageSquare size={12} />
                      <span>Respostas</span>
                    </Link>

                    <Link
                      href={`/admin/midia/formularios/${item.id}/editar`}
                      className="flex items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 text-xs font-bold text-orange-700 transition-colors"
                    >
                      <PenLine size={12} />
                      <span>Editar</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleToggle(item)}
                      disabled={togglingId === item.id}
                      title={item.ativo ? 'Fechar formulário' : 'Abrir formulário'}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors disabled:opacity-50"
                    >
                      {togglingId === item.id
                        ? <Loader2 size={12} className="animate-spin" />
                        : item.ativo
                          ? <ToggleRight size={14} className="text-emerald-500" />
                          : <ToggleLeft size={14} className="text-slate-400" />
                      }
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(item.id, item.titulo)}
                      disabled={deletingId === item.id}
                      title="Excluir formulário"
                      className="flex items-center gap-1.5 rounded-lg border border-red-100 bg-red-50 hover:bg-red-100 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors disabled:opacity-50"
                    >
                      {deletingId === item.id
                        ? <Loader2 size={12} className="animate-spin" />
                        : <Trash2 size={12} />
                      }
                    </button>
                  </div>
                </div>

                {/* Progress bar for limit */}
                {item.config.limite_respostas != null && item.config.limite_respostas > 0 && (
                  <div className="px-4 sm:px-5 pb-3">
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (item.total_respostas / item.config.limite_respostas) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </PageAccessGuard>
  )
}
