'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'

const PAYMENT_METHODS = [
  { value: 'Dinheiro', label: 'Dinheiro' },
  { value: 'Pix', label: 'Pix' },
  { value: 'Cartão', label: 'Cartão' },
  { value: 'Outro', label: 'Outro' },
]

export interface PaymentFormPayload {
  amount: number
  payment_method: string | null
  notes: string | null
  auto_allocate: boolean
  allocations?: Array<{ sale_id: string; amount: number }>
}

interface PendingSale {
  id: string
  sale_number: string
  created_at: string
  pending_amount: number
}

interface PaymentFormProps {
  pendingAmount: number
  pendingSales?: PendingSale[]
  onSubmit: (payload: PaymentFormPayload) => Promise<void>
  loading?: boolean
}

export function PaymentForm({
  pendingAmount,
  pendingSales = [],
  onSubmit,
  loading = false,
}: PaymentFormProps) {
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('Pix')
  const [notes, setNotes] = useState('')
  const [autoAllocate, setAutoAllocate] = useState(true)
  const [allocations, setAllocations] = useState<Record<string, string>>({})

  const amountNum = Math.max(0, parseFloat(amount) || 0)
  const canSubmit = amountNum > 0 && amountNum <= pendingAmount + 0.01

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    const payload: PaymentFormPayload = {
      amount: amountNum,
      payment_method: paymentMethod,
      notes: notes.trim() || null,
      auto_allocate: autoAllocate,
    }
    if (!autoAllocate && pendingSales.length > 0) {
      const allocList: Array<{ sale_id: string; amount: number }> = []
      let sum = 0
      for (const sale of pendingSales) {
        const v = parseFloat(allocations[sale.id] ?? '0') || 0
        if (v > 0) {
          allocList.push({ sale_id: sale.id, amount: v })
          sum += v
        }
      }
      if (Math.abs(sum - amountNum) > 0.01) {
        return
      }
      payload.allocations = allocList
    }
    await onSubmit(payload)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Valor (R$) *</label>
        <input
          type="number"
          step="0.01"
          min="0"
          max={pendingAmount}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0,00"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800"
          required
        />
        <p className="text-xs text-slate-500 mt-1">Saldo pendente: R$ {pendingAmount.toFixed(2)}</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Forma de pagamento</label>
        <select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800"
        >
          {PAYMENT_METHODS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Observação</label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800"
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="auto_allocate"
          checked={autoAllocate}
          onChange={(e) => setAutoAllocate(e.target.checked)}
          className="rounded border-slate-300"
        />
        <label htmlFor="auto_allocate" className="text-sm text-slate-700">
          Abater automaticamente das compras mais antigas
        </label>
      </div>
      {!autoAllocate && pendingSales.length > 0 && (
        <div className="border border-slate-200 rounded-lg p-3 space-y-2">
          <p className="text-sm font-medium text-slate-700">Rateio por compra</p>
          {pendingSales.map((sale) => (
            <div key={sale.id} className="flex items-center gap-2">
              <span className="text-sm text-slate-600 flex-1">
                {sale.sale_number} · R$ {sale.pending_amount.toFixed(2)} pendente
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                max={sale.pending_amount}
                value={allocations[sale.id] ?? ''}
                onChange={(e) => setAllocations((a) => ({ ...a, [sale.id]: e.target.value }))}
                className="w-24 px-2 py-1 border border-slate-300 rounded text-slate-800 text-sm"
                placeholder="0"
              />
            </div>
          ))}
        </div>
      )}
      <Button type="submit" loading={loading} disabled={!canSubmit}>
        Registrar pagamento
      </Button>
    </form>
  )
}
