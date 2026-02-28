'use client'

import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export type CartItem = {
  product_id: string
  name: string
  image_url?: string | null
  unit_price: number
  quantity: number
  current_stock: number
  mode: 'SALE' | 'RESERVE'
}

interface CartPanelProps {
  items: CartItem[]
  discountAmount: number
  onQuantityChange: (productId: string, mode: 'SALE' | 'RESERVE', delta: number) => void
  onRemove: (productId: string, mode: 'SALE' | 'RESERVE') => void
  onFinalize: () => void
  finalizeLoading?: boolean
  /** Bloqueia finalizar se houver itens RESERVE na sacola de venda */
  hasReserveItems?: boolean
  /** false = caixa não aberto; desabilita finalizar e exibe aviso */
  caixaAberto?: boolean
}

export function CartPanel({
  items,
  discountAmount,
  onQuantityChange,
  onRemove,
  onFinalize,
  finalizeLoading = false,
  hasReserveItems = false,
  caixaAberto = true,
}: CartPanelProps) {
  const saleItems = items.filter((i) => i.mode === 'SALE')
  const reserveItems = items.filter((i) => i.mode === 'RESERVE')
  const subtotal = saleItems.reduce((s, i) => s + i.unit_price * i.quantity, 0)
  const total = Math.max(0, subtotal - discountAmount)
  const canFinalize = saleItems.length > 0 && !hasReserveItems && caixaAberto

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/70">
        <h3 className="font-bold text-slate-900">Sacola</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          {saleItems.length === 0 ? 'Nenhum item para venda' : `${saleItems.length} item(ns) para venda`}
          {reserveItems.length > 0 && ` · ${reserveItems.length} reserva(s)`}
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400">
            <p className="text-sm font-medium">Sacola vazia</p>
            <p className="text-xs mt-1">Adicione produtos para continuar</p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={`${item.product_id}-${item.mode}`}
              className="flex gap-3 p-3 rounded-xl border border-slate-100 bg-white shadow-sm"
            >
              {item.image_url ? (
                <img src={item.image_url} alt="" className="w-14 h-14 object-cover rounded-lg flex-shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-slate-100 flex-shrink-0 flex items-center justify-center text-slate-400 text-xs">—</div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-1">
                  <p className="text-sm font-semibold text-slate-800 leading-snug">{item.name}</p>
                  <button
                    type="button"
                    className="flex-shrink-0 p-1.5 -mr-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    onClick={() => onRemove(item.product_id, item.mode)}
                    aria-label="Remover item"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  R$ {item.unit_price.toFixed(2)} é un.
                  {item.mode === 'RESERVE' && <span className="ml-1 font-medium text-amber-600">(reserva)</span>}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="w-9 h-9 rounded-lg border border-slate-200 text-slate-700 flex items-center justify-center text-lg font-medium hover:bg-slate-100 active:scale-95 transition-all"
                      onClick={() => onQuantityChange(item.product_id, item.mode, -1)}
                      aria-label="Diminuir quantidade"
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-sm font-semibold text-slate-800">{item.quantity}</span>
                    <button
                      type="button"
                      className="w-9 h-9 rounded-lg border border-slate-200 text-slate-700 flex items-center justify-center text-lg font-medium hover:bg-slate-100 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      onClick={() => onQuantityChange(item.product_id, item.mode, 1)}
                      disabled={item.mode === 'SALE' && item.quantity >= item.current_stock}
                      aria-label="Aumentar quantidade"
                    >
                      +
                    </button>
                  </div>
                  <p className="text-sm font-bold text-slate-800">
                    R$ {(item.unit_price * item.quantity).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-1.5">
        <div className="flex justify-between text-sm text-slate-600">
          <span>Subtotal</span>
          <span>R$ {subtotal.toFixed(2)}</span>
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between text-sm text-slate-600">
            <span>Desconto</span>
            <span>- R$ {discountAmount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-base font-bold text-slate-900 pt-1 border-t border-slate-200">
          <span>Total</span>
          <span className="text-[#c62737]">R$ {total.toFixed(2)}</span>
        </div>
        <Button
          type="button"
          className="w-full mt-3 py-3 text-base"
          onClick={onFinalize}
          disabled={!canFinalize}
          loading={finalizeLoading}
        >
          Finalizar compra
        </Button>
        {!caixaAberto && saleItems.length > 0 && (
          <p className="text-xs text-amber-700 mt-2 text-center">
            Abra um caixa para realizar vendas.
          </p>
        )}
        {hasReserveItems && saleItems.length > 0 && (
          <p className="text-xs text-amber-700 mt-2 text-center">
            Você tem itens reservados. Finalize apenas com itens em estoque.
          </p>
        )}
      </div>
    </div>
  )
}
