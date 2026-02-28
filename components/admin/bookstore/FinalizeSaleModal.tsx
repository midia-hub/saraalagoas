'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/Button'
import { CustomSelect } from '@/components/ui/CustomSelect'
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
  /** Metodos de pagamento habilitados. Se omitido, mostra todos. */
  enabledMethods?: string[]
}

export function FinalizeSaleModal({
  open,
  total,
  onConfirm,
  onCancel,
  loading = false,
  enabledMethods,
}: FinalizeSaleModalProps) {
  const visibleOptions = useMemo(
    () =>
      enabledMethods && enabledMethods.length > 0
        ? PAYMENT_OPTIONS.filter((o) => enabledMethods.includes(o.value))
        : PAYMENT_OPTIONS,
    [enabledMethods]
  )

  const [paymentMethod, setPaymentMethod] = useState(() => visibleOptions[0]?.value ?? 'Pix')

  // Quando o modal abre ou os métodos mudam, garant que paymentMethod é válido
  useEffect(() => {
    if (open && !visibleOptions.find((o) => o.value === paymentMethod)) {
      setPaymentMethod(visibleOptions[0]?.value ?? 'Pix')
    }
  }, [open, visibleOptions, paymentMethod])
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
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="finalize-title"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden onClick={loading ? undefined : onCancel} />
      <div className="relative w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-slate-200 bg-white shadow-2xl max-h-[92vh] overflow-auto">

        {/* Cabeçalho */}
        <div className="sticky top-0 bg-white px-5 pt-5 pb-4 border-b border-slate-100 z-10">
          <h2 id="finalize-title" className="text-lg font-bold text-slate-900">Finalizar venda</h2>
          <div className="flex items-baseline gap-3 mt-1">
            <span className="text-sm text-slate-500">Total bruto: R$ {total.toFixed(2)}</span>
            {discount > 0 && (
              <span className="text-sm font-semibold text-[#c62737]">Líquido: R$ {netTotal.toFixed(2)}</span>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-5">

          {/* Cliente */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Cliente <span className="text-slate-400 font-normal">(opcional)</span></label>
            <CustomerPicker
              value={customer}
              onChange={setCustomer}
              placeholder="Buscar por nome ou telefone..."
            />
          </div>

          {/* Modalidade de pagamento */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-2">Modalidade</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSaleType('PAID')}
                className={`py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                  saleType === 'PAID'
                    ? 'border-[#c62737] bg-[#c62737]/5 text-[#c62737]'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                Pagar agora
              </button>
              <button
                type="button"
                onClick={() => canSelectCredit && setSaleType('CREDIT')}
                disabled={!canSelectCredit}
                className={`py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                  saleType === 'CREDIT'
                    ? 'border-[#c62737] bg-[#c62737]/5 text-[#c62737]'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Fiado
              </button>
            </div>
            {saleType === 'CREDIT' && !canSelectCredit && customer && (
              <p className="mt-1.5 text-xs text-amber-600" role="alert">
                Este cliente não está habilitado para compra fiado.
              </p>
            )}
            {saleType === 'CREDIT' && !customer && (
              <p className="mt-1.5 text-xs text-slate-500">Selecione um cliente habilitado para fiado.</p>
            )}
          </div>

          {/* Forma de pagamento */}
          {saleType === 'PAID' && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Forma de pagamento <span className="text-[#c62737]">*</span></label>
              <CustomSelect
                value={paymentMethod}
                onChange={setPaymentMethod}
                options={visibleOptions}
                placeholder="Selecionar..."
                allowEmpty={false}
              />
            </div>
          )}

          {/* Valor pago (Dinheiro — troco) */}
          {saleType === 'PAID' && paymentMethod === 'Dinheiro' && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Valor recebido <span className="text-slate-400 font-normal">(para calcular troco)</span>
              </label>
              <input
                type="number"
                step="0.01"
                min={netTotal}
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                placeholder={netTotal.toFixed(2)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800
                           focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20 outline-none transition-all
                           placeholder:text-slate-400"
              />
              {paidNum >= netTotal && netTotal > 0 && (
                <p className="mt-1.5 text-sm font-semibold text-emerald-700">
                  Troco: R$ {(paidNum - netTotal).toFixed(2)}
                </p>
              )}
            </div>
          )}

          {/* Valor pago (fiado parcial) */}
          {saleType === 'CREDIT' && netTotal > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Valor pago agora <span className="text-slate-400 font-normal">(opcional)</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max={netTotal}
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                placeholder="0"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800
                           focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20 outline-none transition-all
                           placeholder:text-slate-400"
              />
              <p className="text-xs text-slate-400 mt-1">Deixe em branco para registrar todo o valor como pendente.</p>
            </div>
          )}

          {/* Desconto */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Desconto</label>
            {appliedCoupon ? (
              <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="text-sm text-emerald-800">Cupom <strong>{appliedCoupon.code}</strong>: − R$ {appliedCoupon.discount_amount.toFixed(2)}</span>
                <button type="button" onClick={clearCoupon} className="text-sm font-medium text-emerald-700 hover:underline">Remover</button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setDiscountType('value')}
                    className={`py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                      discountType === 'value'
                        ? 'border-[#c62737] bg-[#c62737]/5 text-[#c62737]'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    Valor (R$)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType('percent')}
                    className={`py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                      discountType === 'percent'
                        ? 'border-[#c62737] bg-[#c62737]/5 text-[#c62737]'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    Porcentagem (%)
                  </button>
                </div>
                <input
                  type="number"
                  step={discountType === 'percent' ? '1' : '0.01'}
                  min="0"
                  max={discountType === 'percent' ? 100 : total}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder={discountType === 'percent' ? 'Ex: 10' : '0,00'}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800
                             focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20 outline-none transition-all
                             placeholder:text-slate-400 mb-2"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => { setCouponCode(e.target.value); setCouponError(null) }}
                    placeholder="Código do cupom"
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800
                               focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20 outline-none transition-all
                               placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={couponLoading || !couponCode.trim()}
                    className="px-4 py-2.5 rounded-xl border-2 border-slate-200 text-slate-700 text-sm font-semibold hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {couponLoading ? '...' : 'Aplicar'}
                  </button>
                </div>
                {couponError && <p className="mt-1 text-xs text-amber-600">{couponError}</p>}
                {discount > 0 && (
                  <p className="mt-1 text-xs text-emerald-700 font-medium">Desconto: − R$ {discount.toFixed(2)}</p>
                )}
              </>
            )}
          </div>

          {/* Observação */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Observação <span className="text-slate-400 font-normal">(opcional)</span></label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Ex: presente embrulhado, retirar segunda..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800
                         focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20 outline-none transition-all resize-none
                         placeholder:text-slate-400"
            />
          </div>

          {/* Ações */}
          <div className="flex gap-3 pt-1 pb-safe">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-700 text-sm font-semibold hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50 transition-all"
            >
              Cancelar
            </button>
            <Button
              type="submit"
              loading={loading}
              disabled={saleType === 'CREDIT' && (!customer || !canSelectCredit)}
              className="flex-1 py-3 text-base"
            >
              Confirmar venda
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
