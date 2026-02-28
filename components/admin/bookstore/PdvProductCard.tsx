'use client'

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
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
      <div className="aspect-square bg-slate-100 relative rounded-t-xl overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300 text-5xl font-light">
            –
          </div>
        )}
        {!inStock && (
          <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center">
            <span className="bg-white/90 text-slate-700 text-xs font-semibold px-2 py-1 rounded-full">Sem estoque</span>
          </div>
        )}
      </div>
      <div className="p-3 flex flex-col flex-1 min-w-0">
        <p className="font-semibold text-slate-800 line-clamp-2 text-sm leading-snug" title={product.name}>
          {product.name}
        </p>
        <p className="text-base font-bold text-[#c62737] mt-1.5">
          R$ {product.effective_price.toFixed(2)}
        </p>
        {inStock && (
          <p className="text-[11px] text-slate-400 mt-0.5">
            {product.current_stock} em estoque
          </p>
        )}
        <div className="mt-auto pt-3">
          {inStock ? (
            <button
              type="button"
              onClick={() => onAdd(product)}
              className="w-full py-2.5 rounded-xl bg-[#c62737] text-white text-sm font-semibold
                         hover:bg-[#9e1f2e] active:scale-[0.97] transition-all shadow-sm"
            >
              Adicionar
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onReserve(product)}
              className="w-full py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 text-sm font-semibold
                         hover:border-slate-300 hover:bg-slate-50 active:scale-[0.97] transition-all"
            >
              Reservar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
