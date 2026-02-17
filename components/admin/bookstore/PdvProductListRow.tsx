'use client'

import { Button } from '@/components/ui/Button'
import type { PdvProduct } from './PdvProductCard'

interface PdvProductListRowProps {
  product: PdvProduct
  onAdd: (product: PdvProduct) => void
  onReserve: (product: PdvProduct) => void
}

export function PdvProductListRow({ product, onAdd, onReserve }: PdvProductListRowProps) {
  const inStock = product.current_stock > 0

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50/50">
      <td className="p-2 w-12">
        {product.image_url ? (
          <img src={product.image_url} alt="" className="w-10 h-10 object-cover rounded" />
        ) : (
          <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center text-slate-400 text-sm">—</div>
        )}
      </td>
      <td className="p-2 font-medium text-slate-800">{product.name}</td>
      <td className="p-2 text-slate-600 text-sm">{product.sku}</td>
      <td className="p-2 font-semibold text-[#c62737]">R$ {product.effective_price.toFixed(2)}</td>
      <td className="p-2 text-sm text-slate-600">
        {inStock ? product.current_stock : '—'}
      </td>
      <td className="p-2">
        {inStock ? (
          <Button type="button" size="sm" onClick={() => onAdd(product)}>
            Adicionar
          </Button>
        ) : (
          <Button type="button" variant="secondary" size="sm" onClick={() => onReserve(product)}>
            Reservar
          </Button>
        )}
      </td>
    </tr>
  )
}
