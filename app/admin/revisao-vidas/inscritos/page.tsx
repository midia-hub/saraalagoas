'use client'

import { useState, useEffect, useCallback } from 'react'
import { adminFetchJson } from '@/lib/admin-client'
import type { ReviewRegistrationEnriched } from '@/lib/consolidacao-types'
import { REVIEW_REG_STATUS_LABELS, REVIEW_REG_STATUS_COLORS } from '@/lib/consolidacao-types'
import { Loader2, RefreshCw, CheckCircle, XCircle, Check, Search } from 'lucide-react'
import Link from 'next/link'

export default function RevisaoVidasInscritosPage() {
  const [regs, setRegs] = useState<ReviewRegistrationEnriched[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    adminFetchJson('/api/admin/consolidacao/revisao/registrations')
      .then((d: any) => setRegs(d.registrations ?? []))
      .catch(() => setRegs([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  async function updateStatus(regId: string, status: string) {
    setUpdating(regId)
    try {
      await adminFetchJson(`/api/admin/consolidacao/revisao/registrations/${regId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      load()
    } catch (e) {
      console.error(e)
    } finally {
      setUpdating(null)
    }
  }

  async function remove(regId: string) {
    if (!confirm('Remover inscrição?')) return
    setUpdating(regId)
    try {
      await adminFetchJson(`/api/admin/consolidacao/revisao/registrations/${regId}`, { method: 'DELETE' })
      load()
    } catch (e) {
      console.error(e)
    } finally {
      setUpdating(null)
    }
  }

  const filtered = regs.filter(r =>
    !search || 
    r.person?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.person?.mobile_phone?.includes(search) ||
    r.event?.name?.toLowerCase().includes(search.toLowerCase())
  )

  const statusCounts = {
    inscrito: filtered.filter(r => r.status === 'inscrito').length,
    participou: filtered.filter(r => r.status === 'participou').length,
    concluiu: filtered.filter(r => r.status === 'concluiu').length,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inscritos — Revisão de Vidas</h1>
          <p className="text-sm text-gray-500 mt-1">Acompanhamento de inscrições em todos os eventos</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded border hover:bg-gray-50">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-bold text-gray-900">{statusCounts.inscrito}</div>
          <div className="text-xs text-gray-500 mt-1">Inscrito</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-bold text-blue-600">{statusCounts.participou}</div>
          <div className="text-xs text-gray-500 mt-1">Participou</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-bold text-green-600">{statusCounts.concluiu}</div>
          <div className="text-xs text-gray-500 mt-1">Concluiu</div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por pessoa, telefone ou evento…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 px-4 py-2 rounded-lg border bg-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="px-4 py-3 border-b">
          <span className="text-sm font-medium text-gray-700">{loading ? '…' : `${filtered.length} inscrição(ões)`}</span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> Carregando…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">{search ? 'Nenhuma inscrição encontrada.' : 'Nenhuma inscrição ainda.'}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Pessoa</th>
                  <th className="px-4 py-3 text-left">Evento</th>
                  <th className="px-4 py-3 text-left">Líder</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{r.person?.full_name ?? '—'}</div>
                      {r.person?.mobile_phone && <div className="text-xs text-gray-400">{r.person.mobile_phone}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/revisao-vidas/${r.event_id}`} className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                        {r.event?.name ?? '—'}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-sm">{r.leader?.full_name ?? '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${REVIEW_REG_STATUS_COLORS[r.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {REVIEW_REG_STATUS_LABELS[r.status] ?? r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {updating === r.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                        ) : (
                          <>
                            {r.status !== 'concluiu' && (
                              <button onClick={() => updateStatus(r.id, 'concluiu')}
                                title="Concluiu"
                                className="p-1.5 rounded text-green-600 hover:bg-green-50">
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}
                            {r.status !== 'participou' && r.status !== 'concluiu' && (
                              <button onClick={() => updateStatus(r.id, 'participou')}
                                title="Participou"
                                className="p-1.5 rounded text-blue-600 hover:bg-blue-50">
                                <Check className="w-4 h-4" />
                              </button>
                            )}
                            <button onClick={() => remove(r.id)}
                              title="Remover"
                              className="p-1.5 rounded text-red-500 hover:bg-red-50">
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
