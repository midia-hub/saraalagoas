'use client'

import { useState, useEffect } from 'react'
import { adminFetchJson } from '@/lib/admin-client'
import { PaymentForm, type PaymentFormPayload } from './PaymentForm'

interface PendingSale {
  id: string
  sale_number: string
  created_at: string
  pending_amount: number
}

interface AllocatePaymentModalProps {
  open: boolean
  customerId: string
  customerName: string
  onSuccess: () => void
  onCancel: () => void
  onSubmit: (payload: PaymentFormPayload) => Promise<void>
  loading?: boolean
}

/** Modal para registrar pagamento do cliente (usado a partir da lista de fiado ou do detalhe do cliente). */
export function AllocatePaymentModal({
  open,
  customerId,
  customerName,
  onSuccess,
  onCancel,
  onSubmit,
  loading = false,
}: AllocatePaymentModalProps) {
  const [pendingAmount, setPendingAmount] = useState(0)
  const [pendingSales, setPendingSales] = useState<PendingSale[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !customerId) return
    setLoadError(null)
    Promise.all([
      adminFetchJson<{ balance: { total_pendente: number } }>(`/api/admin/livraria/clientes/${customerId}`).then(
        (d) => d.balance?.total_pendente ?? 0
      ),
      adminFetchJson<{ items: Array<{ id: string; sale_number: string; created_at: string; pending_amount: number }> }>(
        `/api/admin/livraria/clientes/${customerId}/compras`
      ).then((d) => (d.items ?? []).filter((s) => s.pending_amount > 0)),
    ])
      .then(([pend, sales]) => {
        setPendingAmount(pend)
        setPendingSales(
          sales.map((s) => ({
            id: s.id,
            sale_number: s.sale_number,
            created_at: s.created_at,
            pending_amount: s.pending_amount,
          }))
        )
      })
      .catch(() => setLoadError('Erro ao carregar saldo.'))
  }, [open, customerId])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="allocate-payment-title"
    >
      <div className="absolute inset-0 bg-black/50" aria-hidden onClick={loading ? undefined : onCancel} />
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl max-h-[90vh] overflow-auto">
        <h2 id="allocate-payment-title" className="text-lg font-semibold text-slate-800 mb-2">
          Registrar pagamento
        </h2>
        <p className="text-sm text-slate-600 mb-4">Cliente: {customerName}</p>
        {loadError ? (
          <p className="text-amber-600 text-sm">{loadError}</p>
        ) : pendingAmount <= 0 ? (
          <p className="text-slate-500 text-sm">Este cliente não possui saldo pendente.</p>
        ) : (
          <PaymentForm
            pendingAmount={pendingAmount}
            pendingSales={pendingSales}
            onSubmit={async (payload) => {
              await onSubmit(payload)
              onSuccess()
            }}
            loading={loading}
          />
        )}
        <div className="mt-4">
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-slate-600 hover:text-slate-800"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
