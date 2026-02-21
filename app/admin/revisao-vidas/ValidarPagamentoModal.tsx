'use client'

import { useState } from 'react'
import { adminFetchJson } from '@/lib/admin-client'
import { Loader2, X, Check } from 'lucide-react'

interface ValidarPagamentoModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  registrationId: string
  personName?: string
  eventName?: string
}

export function ValidarPagamentoModal({
  isOpen,
  onClose,
  onSuccess,
  registrationId,
  personName,
  eventName,
}: ValidarPagamentoModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentMethod, setPaymentMethod] = useState('pix')
  const [amount, setAmount] = useState('') 
  const [notes, setNotes] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!paymentDate) {
      setError('Informe a data do pagamento')
      return
    }

    setLoading(true)
    setError('')
    try {
      await adminFetchJson(`/api/admin/consolidacao/revisao/registrations/${registrationId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          payment_status: 'validated',
          payment_date: paymentDate,
          payment_method: paymentMethod,
          amount: amount ? parseFloat(amount) : null,
          payment_notes: notes,
        }),
      })
      onSuccess()
      onClose()
    } catch (e: any) {
      setError(e.message || 'Erro ao validar pagamento')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/45"
        onClick={onClose}
      />

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h2 className="text-lg font-bold text-slate-900">Validar Pagamento</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          {personName && eventName && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 space-y-1">
              <p className="text-xs text-blue-600 font-semibold">Informações</p>
              <p className="text-sm text-blue-900">{personName}</p>
              <p className="text-xs text-blue-700">{eventName}</p>
            </div>
          )}

          {/* Data do Pagamento */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Data do Pagamento <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-purple-500 outline-none text-sm"
            />
          </div>

          {/* Método de Pagamento */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Método de Pagamento
            </label>
            <div className="space-y-2">
              {[
                { value: 'pix', label: 'PIX' },
                { value: 'dinheiro', label: 'Dinheiro' },
                { value: 'transferencia', label: 'Transferência' },
                { value: 'cheque', label: 'Cheque' },
              ].map((option) => (
                <label key={option.value} className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="payment_method"
                    value={option.value}
                    checked={paymentMethod === option.value}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-slate-700">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Valor (opcional) */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Valor (opcional)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="R$ 0,00"
              className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-purple-500 outline-none text-sm"
            />
          </div>

          {/* Observações */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Observações
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Informações adicionais sobre o pagamento"
              className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-purple-500 outline-none text-sm resize-none"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg border-2 border-slate-200 text-slate-700 font-semibold hover:bg-slate-100"
          >
            Cancelar
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 px-4 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Validando…' : 'Validar Pagamento'}
          </button>
        </div>
      </div>
    </div>
  )
}
