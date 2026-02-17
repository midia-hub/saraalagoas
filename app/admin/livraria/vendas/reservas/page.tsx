'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Bookmark, ArrowLeft } from 'lucide-react'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { Toast } from '@/components/Toast'
import { adminFetchJson } from '@/lib/admin-client'

type ReservationItem = {
  id: string
  status: string
  customer_name: string | null
  customer_phone: string | null
  notes: string | null
  created_at: string
  created_by: string | null
  items: Array<{ name: string; quantity: number; unit_price: number; total_price: number }>
  total_amount: number
}

export default function ReservasPage() {
  const [items, setItems] = useState<ReservationItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [cancelTarget, setCancelTarget] = useState<ReservationItem | null>(null)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; message: string } | null>(null)

  const load = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    adminFetchJson<{ items: ReservationItem[]; total: number }>(`/api/admin/livraria/vendas/reservas?${params}`)
      .then((data) => {
        setItems(data.items ?? [])
        setTotal(data.total ?? 0)
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => load(), [status])

  function handleCancel() {
    if (!cancelTarget) return
    setCancelLoading(true)
    adminFetchJson(`/api/admin/livraria/vendas/reservas/${cancelTarget.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'cancel' }),
    })
      .then(() => {
        setToast({ type: 'ok', message: 'Reserva cancelada.' })
        setCancelTarget(null)
        load()
      })
      .catch((e) => setToast({ type: 'err', message: e instanceof Error ? e.message : 'Erro ao cancelar.' }))
      .finally(() => setCancelLoading(false))
  }

  const formatDate = (s: string) => new Date(s).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
  const statusLabel: Record<string, string> = { OPEN: 'Aberta', CANCELLED: 'Cancelada', CONVERTED: 'Convertida' }

  return (
    <PageAccessGuard pageKey="livraria_reservas">
      <div className="p-4 sm:p-6">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/admin/livraria/vendas" className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600" aria-label="Voltar">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Bookmark size={24} />
              Reservas
            </h1>
            <p className="text-slate-500 text-sm">Reservas para compra futura</p>
          </div>
        </div>

        <div className="mb-4">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-slate-800 text-sm"
          >
            <option value="">Todos os status</option>
            <option value="OPEN">Aberta</option>
            <option value="CANCELLED">Cancelada</option>
            <option value="CONVERTED">Convertida</option>
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" text="Carregando..." />
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((r) => (
              <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-medium text-slate-800">{formatDate(r.created_at)}</span>
                    <span className="ml-2 text-sm text-slate-500">
                      {r.customer_name || 'Sem nome'} · {statusLabel[r.status] ?? r.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800">R$ {r.total_amount.toFixed(2)}</span>
                    {r.status === 'OPEN' && (
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => setCancelTarget(r)}
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>
                </div>
                <ul className="mt-2 text-sm text-slate-600 list-disc list-inside">
                  {r.items.map((i, idx) => (
                    <li key={idx}>{i.name} × {i.quantity} — R$ {i.total_price.toFixed(2)}</li>
                  ))}
                </ul>
              </div>
            ))}
            {items.length === 0 && (
              <p className="text-slate-500 text-center py-8">Nenhuma reserva encontrada.</p>
            )}
          </div>
        )}

        <ConfirmDialog
          open={!!cancelTarget}
          title="Cancelar reserva"
          message="Tem certeza que deseja cancelar esta reserva? Esta ação não pode ser desfeita."
          confirmLabel="Cancelar reserva"
          cancelLabel="Voltar"
          variant="danger"
          loading={cancelLoading}
          onConfirm={handleCancel}
          onCancel={() => setCancelTarget(null)}
        />
        {toast && (
          <Toast visible message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        )}
      </div>
    </PageAccessGuard>
  )
}
