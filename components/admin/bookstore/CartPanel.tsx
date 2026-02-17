'use client'

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
      <div className="p-3 border-b border-slate-200 bg-slate-50">
        <h3 className="font-semibold text-slate-800">Sacola</h3>
        <p className="text-xs text-slate-500">
          {saleItems.length} item(ns) para venda
          {reserveItems.length > 0 && ` · ${reserveItems.length} reserva(s)`}
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {items.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">Sacola vazia</p>
        ) : (
          items.map((item) => (
            <div
              key={`${item.product_id}-${item.mode}`}
              className="flex gap-2 p-2 rounded-lg border border-slate-100 bg-slate-50/50"
            >
              {item.image_url ? (
                <img src={item.image_url} alt="" className="w-12 h-12 object-cover rounded flex-shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded bg-slate-200 flex-shrink-0 flex items-center justify-center text-slate-400 text-xs">—</div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{item.name}</p>
                <p className="text-xs text-slate-500">
                  R$ {item.unit_price.toFixed(2)} × {item.quantity}
                  {item.mode === 'RESERVE' && <span className="ml-1 text-amber-600">(reserva)</span>}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <button
                    type="button"
                    className="w-6 h-6 rounded border border-slate-300 text-slate-600 flex items-center justify-center text-sm font-medium hover:bg-slate-100"
                    onClick={() => onQuantityChange(item.product_id, item.mode, -1)}
                    aria-label="Diminuir quantidade"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                  <button
                    type="button"
                    className="w-6 h-6 rounded border border-slate-300 text-slate-600 flex items-center justify-center text-sm font-medium hover:bg-slate-100 disabled:opacity-50"
                    onClick={() => onQuantityChange(item.product_id, item.mode, 1)}
                    disabled={item.mode === 'SALE' && item.quantity >= item.current_stock}
                    aria-label="Aumentar quantidade"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    className="ml-2 text-xs text-red-600 hover:underline"
                    onClick={() => onRemove(item.product_id, item.mode)}
                  >
                    Remover
                  </button>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-semibold text-slate-800">
                  R$ {(item.unit_price * item.quantity).toFixed(2)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="p-3 border-t border-slate-200 bg-slate-50 space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Subtotal</span>
          <span>R$ {subtotal.toFixed(2)}</span>
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between text-sm text-slate-600">
            <span>Desconto</span>
            <span>− R$ {discountAmount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between font-semibold text-slate-800 pt-1">
          <span>Total</span>
          <span>R$ {total.toFixed(2)}</span>
        </div>
        <Button
          type="button"
          className="w-full mt-3"
          onClick={onFinalize}
          disabled={!canFinalize}
          loading={finalizeLoading}
        >
          Finalizar compra
        </Button>
        {!caixaAberto && saleItems.length > 0 && (
          <p className="text-xs text-amber-700 mt-2">
            Abra um caixa em Livraria → Loja e Caixa (MP) para realizar vendas.
          </p>
        )}
        {hasReserveItems && saleItems.length > 0 && (
          <p className="text-xs text-amber-700 mt-2">
            Você tem itens reservados. Finalize apenas com itens em estoque ou mova para Reservas.
          </p>
        )}
      </div>
    </div>
  )
}
