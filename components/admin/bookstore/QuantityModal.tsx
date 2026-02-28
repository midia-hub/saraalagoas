'use client'

import { useState, useEffect } from 'react'
import { Plus, Minus } from 'lucide-react'
import type { PdvProduct } from './PdvProductCard'

interface QuantityModalProps {
  open: boolean
  product: PdvProduct | null
  mode: 'SALE' | 'RESERVE'
  onConfirm: (quantity: number) => void
  onCancel: () => void
}

export function QuantityModal({ open, product, mode, onConfirm, onCancel }: QuantityModalProps) {
  const [quantity, setQuantity] = useState(1)

  useEffect(() => {
    if (open && product) {
      setQuantity(1)
    }
  }, [open, product])

  if (!open) return null

  const maxQty = mode === 'SALE' && product ? product.current_stock : 9999
  const isReserve = mode === 'RESERVE'
  const title = isReserve ? 'Reservar para compra futura' : 'Quantidade'
  const message = isReserve
    ? 'Sem estoque agora. Vamos reservar para você comprar depois.'
    : product
      ? `Máximo: ${product.current_stock}`
      : ''

  function handleConfirm() {
    const q = Math.max(1, Math.min(maxQty, quantity))
    onConfirm(q)
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quantity-modal-title"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden onClick={onCancel} />
      <div className="relative w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="px-5 pt-5 pb-3">
          {isReserve && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 mb-2">
              Reserva
            </span>
          )}
          <h2 id="quantity-modal-title" className="text-lg font-bold text-slate-900">
            {title}
          </h2>
          {product && (
            <p className="mt-0.5 text-sm text-slate-500 leading-snug">{product.name}</p>
          )}
          {message && (
            <p className="mt-1.5 text-xs text-slate-400">{message}</p>
          )}
        </div>

        {/* Controle de quantidade */}
        <div className="px-5 py-4 border-t border-slate-100">
          <label className="block text-xs font-medium text-slate-700 mb-3">Quantidade</label>
          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-12 h-12 rounded-xl border-2 border-slate-200 flex items-center justify-center text-slate-600 hover:border-slate-300 hover:bg-slate-50 active:scale-95 transition-all disabled:opacity-40"
              disabled={quantity <= 1}
              aria-label="Diminuir"
            >
              <Minus size={20} />
            </button>
            <input
              type="number"
              min={1}
              max={maxQty}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Math.min(maxQty, parseInt(e.target.value, 10) || 1)))}
              className="w-20 text-center text-2xl font-bold text-slate-900 bg-transparent outline-none border-b-2 border-slate-200 focus:border-[#c62737] pb-1 transition-colors"
              aria-label="Quantidade"
            />
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
              className="w-12 h-12 rounded-xl border-2 border-slate-200 flex items-center justify-center text-slate-600 hover:border-slate-300 hover:bg-slate-50 active:scale-95 transition-all disabled:opacity-40"
              disabled={quantity >= maxQty}
              aria-label="Aumentar"
            >
              <Plus size={20} />
            </button>
          </div>
          {!isReserve && product && (
            <p className="text-center text-xs text-slate-400 mt-2">
              R$ {product.effective_price.toFixed(2)} · Total: <strong className="text-slate-700">R$ {(product.effective_price * quantity).toFixed(2)}</strong>
            </p>
          )}
        </div>

        {/* Ações */}
        <div className="px-5 pb-6 pt-2 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-700 text-sm font-semibold hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98] transition-all"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 py-3 rounded-xl bg-[#c62737] text-white text-sm font-semibold hover:bg-[#9e1f2e] active:scale-[0.98] transition-all shadow-sm"
          >
            {isReserve ? 'Reservar' : 'Adicionar à sacola'}
          </button>
        </div>
      </div>
    </div>
  )
}
