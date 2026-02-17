'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
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
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quantity-modal-title"
    >
      <div className="absolute inset-0 bg-black/50" aria-hidden onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <h2 id="quantity-modal-title" className="text-lg font-semibold text-slate-800">
          {title}
        </h2>
        {product && (
          <p className="mt-1 text-sm text-slate-600">
            {product.name}
          </p>
        )}
        {message && (
          <p className="mt-2 text-sm text-slate-500">
            {message}
          </p>
        )}
        <div className="mt-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">Quantidade</label>
          <input
            type="number"
            min={1}
            max={maxQty}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800"
            aria-describedby="quantity-modal-title"
          />
        </div>
        <div className="mt-6 flex gap-2 justify-end">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleConfirm}>
            {isReserve ? 'Reservar' : 'Adicionar à sacola'}
          </Button>
        </div>
      </div>
    </div>
  )
}
