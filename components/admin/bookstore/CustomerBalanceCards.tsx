'use client'

interface CustomerBalanceCardsProps {
  totalCompras: number
  totalPago: number
  totalPendente: number
  className?: string
}

export function CustomerBalanceCards({
  totalCompras,
  totalPago,
  totalPendente,
  className = '',
}: CustomerBalanceCardsProps) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 ${className}`}>
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <p className="text-sm text-slate-600 mb-1">Total comprado</p>
        <p className="text-xl font-bold text-slate-800">R$ {totalCompras.toFixed(2)}</p>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <p className="text-sm text-slate-600 mb-1">Total pago</p>
        <p className="text-xl font-bold text-emerald-600">R$ {totalPago.toFixed(2)}</p>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <p className="text-sm text-slate-600 mb-1">Saldo pendente</p>
        <p className="text-xl font-bold text-amber-600">R$ {totalPendente.toFixed(2)}</p>
      </div>
    </div>
  )
}
