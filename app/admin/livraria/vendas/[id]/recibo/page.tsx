'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Printer, History } from 'lucide-react'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { adminFetchJson } from '@/lib/admin-client'

type Receipt = {
  id: string
  sale_number: string
  customer_name: string | null
  customer_phone: string | null
  payment_method: string | null
  subtotal: number
  discount_amount: number
  total_amount: number
  notes: string | null
  status: string
  created_at: string
  operator_name: string | null
  items: Array<{ name: string; quantity: number; unit_price: number; total_price: number }>
}

export default function ReciboPage({ params }: { params: { id: string } }) {
  const id = params.id
  const [data, setData] = useState<Receipt | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    adminFetchJson<Receipt>(`/api/admin/livraria/pdv/vendas/${id}/recibo`)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [id])

  function handlePrint() {
    window.print()
  }

  const formatDate = (s: string) => new Date(s).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' })

  return (
    <PageAccessGuard pageKey="livraria_vendas">
      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
          <Link href="/admin/livraria/vendas" className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600" aria-label="Voltar">
            <ArrowLeft size={20} />
          </Link>
          <Link href="/admin/livraria/vendas/historico">
            <Button type="button" variant="secondary" size="sm">
              <History size={16} className="mr-1" />
              Ver histórico
            </Button>
          </Link>
          <Button type="button" variant="secondary" size="sm" onClick={handlePrint}>
            <Printer size={16} className="mr-1" />
            Imprimir
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" text="Carregando recibo..." />
          </div>
        ) : data ? (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm print:shadow-none print:border-0">
            <h1 className="text-xl font-bold text-slate-800 mb-1">Recibo de venda</h1>
            <p className="text-slate-600 font-mono font-medium">{data.sale_number}</p>
            <p className="text-sm text-slate-500 mt-2">{formatDate(data.created_at)}</p>
            {data.operator_name && (
              <p className="text-sm text-slate-600 mt-1">Operador: {data.operator_name}</p>
            )}
            {data.customer_name && (
              <p className="text-sm text-slate-600 mt-1">Cliente: {data.customer_name}</p>
            )}
            {data.customer_phone && (
              <p className="text-sm text-slate-600">Telefone: {data.customer_phone}</p>
            )}

            <table className="w-full mt-6 text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 font-medium text-slate-700">Item</th>
                  <th className="text-right py-2 font-medium text-slate-700">Qtd</th>
                  <th className="text-right py-2 font-medium text-slate-700">Valor un.</th>
                  <th className="text-right py-2 font-medium text-slate-700">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((i, idx) => (
                  <tr key={idx} className="border-b border-slate-100">
                    <td className="py-2 text-slate-800">{i.name}</td>
                    <td className="py-2 text-right">{i.quantity}</td>
                    <td className="py-2 text-right">R$ {i.unit_price.toFixed(2)}</td>
                    <td className="py-2 text-right">R$ {i.total_price.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-4 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Subtotal</span>
                <span>R$ {data.subtotal.toFixed(2)}</span>
              </div>
              {data.discount_amount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Desconto</span>
                  <span>− R$ {data.discount_amount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-slate-800 pt-2 border-t border-slate-200">
                <span>Total</span>
                <span>R$ {data.total_amount.toFixed(2)}</span>
              </div>
            </div>

            <p className="mt-4 text-sm text-slate-600">Forma de pagamento: {data.payment_method ?? '—'}</p>
            {data.notes && (
              <p className="mt-2 text-sm text-slate-500">Observações: {data.notes}</p>
            )}
          </div>
        ) : (
          <p className="text-slate-500">Recibo não encontrado.</p>
        )}
      </div>
    </PageAccessGuard>
  )
}
