'use client'

import { Button } from '@/components/ui/Button'

export type PdvProduct = {
  id: string
  sku: string
  barcode: string | null
  name: string
  sale_price: number
  effective_price: number
  current_stock: number
  min_stock: number
  active: boolean
  image_url: string | null
  category_name: string | null
}

interface PdvProductCardProps {
  product: PdvProduct
  /** Abre o modal de quantidade para venda */
  onAdd: (product: PdvProduct) => void
  /** Abre o modal de quantidade para reserva */
  onReserve: (product: PdvProduct) => void
}

export function PdvProductCard({ product, onAdd, onReserve }: PdvProductCardProps) {
  const inStock = product.current_stock > 0

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="aspect-square bg-slate-100 relative">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400 text-4xl font-light">
            —
          </div>
        )}
        <div className="absolute bottom-1 left-1 right-1 text-xs text-slate-600 bg-white/90 rounded px-2 py-1 truncate">
          {product.name}
        </div>
      </div>
      <div className="p-3 flex flex-col flex-1 min-w-0">
        <p className="font-medium text-slate-800 line-clamp-2 text-sm leading-tight" title={product.name}>
          {product.name}
        </p>
        <p className="text-lg font-bold text-[#c62737] mt-1">
          R$ {product.effective_price.toFixed(2)}
        </p>
        <p className="text-xs text-slate-500 mt-0.5">
          {inStock ? `Em estoque: ${product.current_stock}` : 'Sem estoque'}
        </p>
        <div className="mt-auto pt-2">
          {inStock ? (
            <Button
              type="button"
              size="sm"
              className="w-full"
              onClick={() => onAdd(product)}
            >
              Adicionar
            </Button>
          ) : (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={() => onReserve(product)}
            >
              Reservar
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
