'use client'

import type { PdvProduct } from './PdvProductCard'

interface PdvProductListRowProps {
  product: PdvProduct
  onAdd: (product: PdvProduct) => void
  onReserve: (product: PdvProduct) => void
}

export function PdvProductListRow({ product, onAdd, onReserve }: PdvProductListRowProps) {
  const inStock = product.current_stock > 0

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
      <td className="px-3 py-2.5 w-14">
        {product.image_url ? (
          <img src={product.image_url} alt="" className="w-12 h-12 object-cover rounded-lg" />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-slate-300 text-lg">–</div>
        )}
      </td>
      <td className="px-3 py-2.5">
        <p className="font-semibold text-slate-800 text-sm leading-snug">{product.name}</p>
        {product.category_name && (
          <p className="text-xs text-slate-400 mt-0.5">{product.category_name}</p>
        )}
      </td>
      <td className="px-3 py-2.5 text-slate-500 text-xs font-mono hidden sm:table-cell">{product.sku}</td>
      <td className="px-3 py-2.5">
        <span className="font-bold text-[#c62737] text-sm">R$ {product.effective_price.toFixed(2)}</span>
      </td>
      <td className="px-3 py-2.5 hidden md:table-cell">
        {inStock ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            {product.current_stock}
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-200">
            Esgotado
          </span>
        )}
      </td>
      <td className="px-3 py-2.5 text-right">
        {inStock ? (
          <button
            type="button"
            onClick={() => onAdd(product)}
            className="px-3 py-2 rounded-xl bg-[#c62737] text-white text-sm font-semibold hover:bg-[#9e1f2e] active:scale-95 transition-all shadow-sm"
          >
            Adicionar
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onReserve(product)}
            className="px-3 py-2 rounded-xl border-2 border-slate-200 text-slate-600 text-sm font-semibold hover:border-slate-300 hover:bg-slate-50 active:scale-95 transition-all"
          >
            Reservar
          </button>
        )}
      </td>
    </tr>
  )
}
