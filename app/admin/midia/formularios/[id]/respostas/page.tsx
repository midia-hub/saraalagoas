'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import {
  ChevronLeft, ChevronRight, ClipboardList, Download, Eye, Loader2, MessageSquare, X,
} from 'lucide-react'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { AdminPageHeader } from '@/app/admin/AdminPageHeader'
import { adminFetchJson } from '@/lib/admin-client'
import type { CampoFormulario, Formulario, FormularioResposta } from '@/lib/formularios'
import { TIPO_CAMPO_META } from '@/lib/formularios'

type RespostasData = {
  items: FormularioResposta[]
  total: number
  page: number
  page_size: number
}

const CHART_COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4', '#84cc16']

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function CampoChart({ campo, respostas }: { campo: CampoFormulario; respostas: FormularioResposta[] }) {
  const tipo = campo.tipo

  if (['multipla_escolha', 'checkbox_multiplo', 'dropdown'].includes(tipo)) {
    const counts: Record<string, number> = {}
    for (const r of respostas) {
      const val = r.dados[campo.id]
      const vals = Array.isArray(val) ? val : [val]
      for (const v of vals) {
        if (v != null && v !== '') counts[String(v)] = (counts[String(v)] ?? 0) + 1
      }
    }
    const data = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, value]) => ({ name, value }))
    if (data.length === 0) return <p className="text-xs text-slate-400 italic">Sem respostas ainda</p>

    return (
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} layout="vertical" margin={{ left: 4, right: 16 }}>
          <XAxis type="number" tick={{ fontSize: 10 }} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={90} />
          <Tooltip formatter={(v: unknown) => [`${v} respostas`, '']} contentStyle={{ fontSize: 11 }} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    )
  }

  if (tipo === 'numero') {
    const nums = respostas
      .map((r) => parseFloat(String(r.dados[campo.id] ?? '')))
      .filter((n) => !isNaN(n))
    if (nums.length === 0) return <p className="text-xs text-slate-400 italic">Sem respostas ainda</p>

    const min = Math.min(...nums)
    const max = Math.max(...nums)
    const buckets = 6
    const step = Math.ceil((max - min + 1) / buckets) || 1
    const hist: Record<string, number> = {}
    for (let i = 0; i < buckets; i++) {
      const lo = min + i * step
      const hi = lo + step - 1
      hist[`${lo}–${hi}`] = 0
    }
    for (const n of nums) {
      const idx = Math.min(buckets - 1, Math.floor((n - min) / step))
      const lo = min + idx * step
      const hi = lo + step - 1
      hist[`${lo}–${hi}`] = (hist[`${lo}–${hi}`] ?? 0) + 1
    }
    const data = Object.entries(hist).map(([name, value]) => ({ name, value }))

    return (
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={data} margin={{ left: 0 }}>
          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip formatter={(v: unknown) => [`${v} respostas`, '']} contentStyle={{ fontSize: 11 }} />
          <Bar dataKey="value" fill="#f97316" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    )
  }

  // Texto: últimas respostas
  const textos = respostas
    .map((r) => String(r.dados[campo.id] ?? '').trim())
    .filter(Boolean)
    .slice(0, 5)

  if (textos.length === 0) return <p className="text-xs text-slate-400 italic">Sem respostas ainda</p>

  return (
    <ul className="space-y-1.5">
      {textos.map((t, i) => (
        <li key={i} className="text-xs text-slate-600 bg-slate-50 rounded-lg px-2.5 py-1.5 line-clamp-2 border border-slate-100">{t}</li>
      ))}
      {respostas.length > 5 && (
        <li className="text-[10px] text-slate-400">+{respostas.length - 5} mais respostas na tabela</li>
      )}
    </ul>
  )
}

function RespostaModal({
  resposta, campos, onClose,
}: {
  resposta: FormularioResposta
  campos: CampoFormulario[]
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={onClose}>
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <p className="text-sm font-bold text-slate-800">Detalhe da resposta</p>
          <p className="text-xs text-slate-400">{formatDate(resposta.created_at)}</p>
          <button type="button" onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 ml-2">
            <X size={15} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {campos.filter((c) => c.tipo !== 'secao').map((campo) => {
            const val = resposta.dados[campo.id]
            const display = Array.isArray(val) ? val.join(', ') : String(val ?? '—')
            return (
              <div key={campo.id}>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">{campo.label}</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{display || '—'}</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function RespostasPage() {
  const { id } = useParams<{ id: string }>()

  const [formulario, setFormulario] = useState<Formulario | null>(null)
  const [respostasData, setRespostasData] = useState<RespostasData | null>(null)
  const [allRespostas, setAllRespostas] = useState<FormularioResposta[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [selectedResposta, setSelectedResposta] = useState<FormularioResposta | null>(null)

  const campos = useMemo(
    () => (formulario?.schema?.campos ?? []).filter((c) => c.tipo !== 'secao'),
    [formulario]
  )

  useEffect(() => {
    Promise.all([
      adminFetchJson<{ formulario: Formulario }>(`/api/admin/midia/formularios/${id}`),
      // busca todas as respostas para os gráficos (sem paginação, limite 1000)
      adminFetchJson<RespostasData>(`/api/admin/midia/formularios/${id}/respostas?page=1`).then(
        (d) => d
      ),
    ])
      .then(([{ formulario: f }, resps]) => {
        setFormulario(f)
        setAllRespostas(resps.items)
        setRespostasData(resps)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!formulario) return
    const params = new URLSearchParams({ page: String(page) })
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    adminFetchJson<RespostasData>(`/api/admin/midia/formularios/${id}/respostas?${params}`)
      .then(setRespostasData)
      .catch(() => {})
  }, [page, from, to, id, formulario])

  function exportCSV() {
    if (!formulario || allRespostas.length === 0) return
    const camposExport = campos
    const headers = ['Data', ...camposExport.map((c) => c.label)]
    const rows = allRespostas.map((r) => [
      formatDate(r.created_at),
      ...camposExport.map((c) => {
        const val = r.dados[c.id]
        return Array.isArray(val) ? val.join('; ') : String(val ?? '')
      }),
    ])
    const csv = [headers, ...rows].map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${formulario.slug}-respostas.csv`
    a.click()
  }

  const totalPages = respostasData ? Math.ceil(respostasData.total / respostasData.page_size) : 1

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
      <div className="p-3 sm:p-4 md:p-6 space-y-5">
        <AdminPageHeader
          icon={MessageSquare}
          title={`Respostas — ${formulario?.titulo ?? ''}`}
          subtitle={`${respostasData?.total ?? 0} resposta${(respostasData?.total ?? 0) !== 1 ? 's' : ''} recebida${(respostasData?.total ?? 0) !== 1 ? 's' : ''}`}
          backLink={{ href: '/admin/midia/formularios', label: 'Voltar para Formulários' }}
          actions={
            <button
              type="button"
              onClick={exportCSV}
              disabled={allRespostas.length === 0}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors disabled:opacity-40"
            >
              <Download size={15} />
              Exportar CSV
            </button>
          }
        />

        {campos.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 py-12 text-center">
            <p className="text-slate-400 text-sm">Nenhum campo no formulário.</p>
          </div>
        ) : (
          <>
            {/* ── Charts ──────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {campos.map((campo) => (
                <div key={campo.id} className="bg-white rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate flex-1">
                      {campo.label}
                    </span>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {TIPO_CAMPO_META[campo.tipo]?.label}
                    </span>
                  </div>
                  <CampoChart campo={campo} respostas={allRespostas} />
                </div>
              ))}
            </div>

            {/* ── Filters ─────────────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">De</label>
                <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1) }}
                  className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-orange-400 transition" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Até</label>
                <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1) }}
                  className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-orange-400 transition" />
              </div>
              {(from || to) && (
                <button type="button" onClick={() => { setFrom(''); setTo(''); setPage(1) }}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50 transition-colors">
                  <X size={12} /> Limpar filtros
                </button>
              )}
            </div>

            {/* ── Table ───────────────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80">
                      <th className="text-left px-4 py-3 font-bold text-slate-400 uppercase tracking-wide whitespace-nowrap">Data</th>
                      {campos.slice(0, 4).map((c) => (
                        <th key={c.id} className="text-left px-4 py-3 font-bold text-slate-400 uppercase tracking-wide max-w-[140px]">
                          <span className="block truncate">{c.label}</span>
                        </th>
                      ))}
                      {campos.length > 4 && (
                        <th className="text-left px-4 py-3 font-bold text-slate-400 uppercase tracking-wide">+{campos.length - 4}</th>
                      )}
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {(respostasData?.items ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={campos.length + 2} className="text-center py-10 text-slate-400">
                          Nenhuma resposta encontrada.
                        </td>
                      </tr>
                    ) : (
                      (respostasData?.items ?? []).map((r) => (
                        <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDate(r.created_at)}</td>
                          {campos.slice(0, 4).map((c) => {
                            const val = r.dados[c.id]
                            const display = Array.isArray(val) ? val.join(', ') : String(val ?? '—')
                            return (
                              <td key={c.id} className="px-4 py-3 text-slate-700 max-w-[140px]">
                                <span className="block truncate">{display || '—'}</span>
                              </td>
                            )
                          })}
                          {campos.length > 4 && <td className="px-4 py-3 text-slate-400">...</td>}
                          <td className="px-4 py-3">
                            <button type="button" onClick={() => setSelectedResposta(r)}
                              className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-100 text-slate-400 hover:text-orange-600 transition-colors">
                              <Eye size={13} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/40">
                  <p className="text-xs text-slate-400">
                    Página {page} de {totalPages} · {respostasData?.total ?? 0} no total
                  </p>
                  <div className="flex items-center gap-2">
                    <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 transition-colors">
                      <ChevronLeft size={13} />
                    </button>
                    <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 transition-colors">
                      <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {selectedResposta && (
        <RespostaModal
          resposta={selectedResposta}
          campos={campos}
          onClose={() => setSelectedResposta(null)}
        />
      )}
    </PageAccessGuard>
  )
}
