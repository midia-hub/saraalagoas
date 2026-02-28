'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, FileText, Calendar } from 'lucide-react'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { Spinner } from '@/components/ui/Spinner'
import { adminFetchJson } from '@/lib/admin-client'

type Report = {
  from: string
  to: string
  total_vendido_fiado_periodo: number
  total_recebido_periodo: number
  saldo_pendente_acumulado: number
  por_cliente: Array<{
    customer_id: string
    name: string
    total_compras: number
    total_pago: number
    total_pendente: number
    qtd_vendas: number
  }>
  serie_temporal: Array<{ date: string; vendas_fiado: number; recebimentos: number }>
}

export default function RelatorioFiadoPage() {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 30)
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState(start.toISOString().slice(0, 10))
  const [to, setTo] = useState(end.toISOString().slice(0, 10))

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('from', from)
      params.set('to', to)
      const data = await adminFetchJson<Report>(`/api/admin/livraria/relatorios/fiado?${params}`)
      setReport(data)
    } catch {
      setReport(null)
    } finally {
      setLoading(false)
    }
  }, [from, to])

  useEffect(() => {
    load()
  }, [load])

  return (
    <PageAccessGuard pageKey="livraria_fiado">
      <div className="p-4 sm:p-6 md:p-8">
        <div className="mb-6 flex items-center gap-3">
          <Link
            href="/admin/livraria/clientes?tab=fiado"
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
            aria-label="Voltar"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Relatório Fiado</h1>
            <p className="text-slate-500 text-sm">Compras e pagamentos por período</p>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-slate-500" />
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-slate-800"
            />
            <span className="text-slate-500">até</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-slate-800"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" text="Gerando relatório..." />
          </div>
        ) : report ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <p className="text-sm text-slate-600 mb-1">Vendido fiado (período)</p>
                <p className="text-2xl font-bold text-slate-800">R$ {report.total_vendido_fiado_periodo.toFixed(2)}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <p className="text-sm text-slate-600 mb-1">Recebido (período)</p>
                <p className="text-2xl font-bold text-emerald-600">R$ {report.total_recebido_periodo.toFixed(2)}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <p className="text-sm text-slate-600 mb-1">Saldo pendente acumulado</p>
                <p className="text-2xl font-bold text-amber-600">R$ {report.saldo_pendente_acumulado.toFixed(2)}</p>
              </div>
            </div>

            {report.por_cliente && report.por_cliente.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6">
                <h3 className="font-semibold text-slate-800 p-4 border-b border-slate-200">Por cliente</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="p-3 text-left font-medium">Cliente</th>
                        <th className="p-3 text-right font-medium">Compras</th>
                        <th className="p-3 text-right font-medium">Pago</th>
                        <th className="p-3 text-right font-medium">Pendente</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.por_cliente.map((r) => (
                        <tr key={r.customer_id} className="border-b border-slate-100">
                          <td className="p-3">
                            <Link href={`/admin/livraria/clientes/${r.customer_id}`} className="text-[#c62737] hover:underline">
                              {r.name}
                            </Link>
                          </td>
                          <td className="p-3 text-right">R$ {r.total_compras.toFixed(2)}</td>
                          <td className="p-3 text-right text-emerald-600">R$ {r.total_pago.toFixed(2)}</td>
                          <td className="p-3 text-right text-amber-600">R$ {r.total_pendente.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {report.serie_temporal && report.serie_temporal.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <h3 className="font-semibold text-slate-800 p-4 border-b border-slate-200">Série temporal (compras vs recebimentos)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="p-3 text-left font-medium">Data</th>
                        <th className="p-3 text-right font-medium">Vendas fiado</th>
                        <th className="p-3 text-right font-medium">Recebimentos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.serie_temporal.slice(-14).reverse().map((s) => (
                        <tr key={s.date} className="border-b border-slate-100">
                          <td className="p-3">{s.date}</td>
                          <td className="p-3 text-right">R$ {s.vendas_fiado.toFixed(2)}</td>
                          <td className="p-3 text-right text-emerald-600">R$ {s.recebimentos.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-slate-500">Não foi possível carregar o relatório.</p>
        )}
      </div>
    </PageAccessGuard>
  )
}
