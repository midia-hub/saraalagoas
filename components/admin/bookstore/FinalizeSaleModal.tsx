'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { CustomerPicker, type CustomerOption } from './CustomerPicker'
import { adminFetchJson } from '@/lib/admin-client'

const PAYMENT_OPTIONS = [
  { value: 'Dinheiro', label: 'Dinheiro' },
  { value: 'Pix', label: 'Pix' },
  { value: 'Cartão', label: 'Cartão' },
  { value: 'Mercado Pago', label: 'Mercado Pago (Pix online)' },
  { value: 'QR no caixa', label: 'QR no caixa (Mercado Pago)' },
  { value: 'Outro', label: 'Outro' },
]

export type SaleType = 'PAID' | 'CREDIT'

export interface FinalizeSalePayload {
  payment_method: string
  customer_id: string | null
  customer_name: string
  customer_phone: string
  sale_type: SaleType
  notes: string
  discount_amount: number
  discount_type?: 'value' | 'percent'
  discount_value?: number
  coupon_code?: string | null
  paid_amount?: number
}

interface FinalizeSaleModalProps {
  open: boolean
  total: number
  onConfirm: (payload: FinalizeSalePayload) => void
  onCancel: () => void
  loading?: boolean
}

export function FinalizeSaleModal({
  open,
  total,
  onConfirm,
  onCancel,
  loading = false,
}: FinalizeSaleModalProps) {
  const [paymentMethod, setPaymentMethod] = useState('Pix')
  const [customer, setCustomer] = useState<CustomerOption | null>(null)
  const [saleType, setSaleType] = useState<SaleType>('PAID')
  const [notes, setNotes] = useState('')
  const [discountType, setDiscountType] = useState<'value' | 'percent'>('value')
  const [discountValue, setDiscountValue] = useState('')
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount_amount: number } | null>(null)
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError] = useState<string | null>(null)
  const [paidAmount, setPaidAmount] = useState('')

  const canSelectCredit = !!customer?.can_buy_on_credit

  if (!open) return null

  let discount = 0
  if (appliedCoupon) {
    discount = appliedCoupon.discount_amount
  } else if (discountType === 'percent') {
    const p = Math.min(100, Math.max(0, parseFloat(discountValue) || 0))
    discount = (total * p) / 100
  } else {
    discount = Math.min(total, Math.max(0, parseFloat(discountValue) || 0))
  }
  discount = Math.round(discount * 100) / 100
  const netTotal = Math.max(0, total - discount)
  const paidNum = Math.max(0, parseFloat(paidAmount) || 0)

  async function handleApplyCoupon() {
    const code = couponCode.trim()
    if (!code) return
    setCouponError(null)
    setCouponLoading(true)
    try {
      const res = await adminFetchJson<{ valid: boolean; code: string; discount_amount: number }>(
        `/api/admin/livraria/cupons/validar/?code=${encodeURIComponent(code)}&subtotal=${total}`
      )
      if (res.valid && res.discount_amount > 0) {
        setAppliedCoupon({ code: res.code, discount_amount: res.discount_amount })
      } else {
        setCouponError('Cupom não aplicou desconto.')
      }
    } catch (e) {
      setCouponError(e instanceof Error ? e.message : 'Cupom inválido.')
    } finally {
      setCouponLoading(false)
    }
  }

  function clearCoupon() {
    setAppliedCoupon(null)
    setCouponCode('')
    setCouponError(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (saleType === 'CREDIT' && !customer) return
    if (saleType === 'CREDIT' && !canSelectCredit) return
    const payload: FinalizeSalePayload = {
      payment_method: saleType === 'PAID' ? paymentMethod : 'Fiado',
      customer_id: customer?.id ?? null,
      customer_name: customer?.name ?? '',
      customer_phone: customer?.phone ?? '',
      sale_type: saleType,
      notes: notes.trim(),
      discount_amount: discount,
      ...(saleType === 'CREDIT' && paidNum > 0 && paidNum < netTotal ? { paid_amount: paidNum } : undefined),
    }
    if (appliedCoupon) {
      payload.coupon_code = appliedCoupon.code
    } else if (discount > 0) {
      payload.discount_type = discountType
      payload.discount_value = discountType === 'percent' ? Math.min(100, parseFloat(discountValue) || 0) : discount
    }
    onConfirm(payload)
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="finalize-title"
    >
      <div className="absolute inset-0 bg-black/50" aria-hidden onClick={loading ? undefined : onCancel} />
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl max-h-[90vh] overflow-auto">
        <h2 id="finalize-title" className="text-lg font-semibold text-slate-800 mb-4">
          Finalizar venda
        </h2>
        <p className="text-sm text-slate-600 mb-4">Total: R$ {total.toFixed(2)} · Líquido: R$ {netTotal.toFixed(2)}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Cliente (opcional)</label>
            <CustomerPicker
              value={customer}
              onChange={setCustomer}
              placeholder="Buscar por nome ou telefone..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Pagamento</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="saleType"
                  checked={saleType === 'PAID'}
                  onChange={() => setSaleType('PAID')}
                  className="rounded border-slate-300"
                />
                <span>Pagar agora</span>
              </label>
              <label className={`flex items-center gap-2 ${canSelectCredit ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}>
                <input
                  type="radio"
                  name="saleType"
                  checked={saleType === 'CREDIT'}
                  onChange={() => canSelectCredit && setSaleType('CREDIT')}
                  disabled={!canSelectCredit}
                  className="rounded border-slate-300"
                />
                <span>Fiado</span>
              </label>
            </div>
            {saleType === 'CREDIT' && !canSelectCredit && customer && (
              <p className="mt-1 text-sm text-amber-600" role="alert">
                Este cliente não está habilitado para compra fiado.
              </p>
            )}
            {saleType === 'CREDIT' && !customer && (
              <p className="mt-1 text-sm text-slate-500">Selecione um cliente habilitado para fiado.</p>
            )}
          </div>

          {saleType === 'PAID' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Forma de pagamento *</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800"
                required
              >
                {PAYMENT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          )}

          {saleType === 'CREDIT' && netTotal > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Valor pago agora (opcional)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max={netTotal}
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800"
              />
              <p className="text-xs text-slate-500 mt-1">Deixe em branco para deixar todo o valor como pendente.</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Desconto</label>
            {appliedCoupon ? (
              <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                <span className="text-sm text-emerald-800">Cupom <strong>{appliedCoupon.code}</strong>: − R$ {appliedCoupon.discount_amount.toFixed(2)}</span>
                <button type="button" onClick={clearCoupon} className="text-sm text-emerald-700 hover:underline">Remover</button>
              </div>
            ) : (
              <>
                <div className="flex gap-4 mb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="discountType"
                      checked={discountType === 'value'}
                      onChange={() => setDiscountType('value')}
                      className="rounded border-slate-300"
                    />
                    <span className="text-sm">Valor (R$)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="discountType"
                      checked={discountType === 'percent'}
                      onChange={() => setDiscountType('percent')}
                      className="rounded border-slate-300"
                    />
                    <span className="text-sm">Porcentagem (%)</span>
                  </label>
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step={discountType === 'percent' ? '1' : '0.01'}
                    min="0"
                    max={discountType === 'percent' ? 100 : total}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder={discountType === 'percent' ? 'Ex: 10' : '0,00'}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-slate-800"
                  />
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => { setCouponCode(e.target.value); setCouponError(null) }}
                    placeholder="Código do cupom"
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-slate-800"
                  />
                  <Button type="button" variant="secondary" onClick={handleApplyCoupon} disabled={couponLoading || !couponCode.trim()}>
                    {couponLoading ? '...' : 'Aplicar'}
                  </Button>
                </div>
                {couponError && <p className="mt-1 text-sm text-amber-600">{couponError}</p>}
              </>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Observação (opcional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800"
            />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
              Cancelar
            </Button>
            <Button
              type="submit"
              loading={loading}
              disabled={saleType === 'CREDIT' && (!customer || !canSelectCredit)}
            >
              Confirmar venda
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
