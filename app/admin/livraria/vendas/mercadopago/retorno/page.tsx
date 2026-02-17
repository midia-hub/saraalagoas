'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, Clock, XCircle, Loader2 } from 'lucide-react'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { Button } from '@/components/ui/Button'
import { adminFetchJson } from '@/lib/admin-client'

const STORAGE_KEY = 'mercadopago_pending_sale_id'
const POLL_INTERVAL_MS = 3000
const POLL_TIMEOUT_MS = 60000

type StatusState = 'success' | 'pending' | 'failure'

export default function MercadoPagoRetornoPage() {
  const searchParams = useSearchParams()
  const statusParam = (searchParams?.get('status') ?? '').toLowerCase() as StatusState
  const status: StatusState =
    statusParam === 'success' || statusParam === 'pending' || statusParam === 'failure'
      ? statusParam
      : 'pending'

  const saleIdFromQuery = searchParams?.get('sale_id') ?? null
  const [saleId, setSaleId] = useState<string | null>(saleIdFromQuery)
  const [pollStatus, setPollStatus] = useState<{
    status: string
    paid_at: string | null
  } | null>(null)
  const [pollError, setPollError] = useState<string | null>(null)
  const [redirecting, setRedirecting] = useState(false)

  useEffect(() => {
    if (saleIdFromQuery) setSaleId(saleIdFromQuery)
    else if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem(STORAGE_KEY)
      if (stored) {
        setSaleId(stored)
        sessionStorage.removeItem(STORAGE_KEY)
      }
    }
  }, [saleIdFromQuery])

  const fetchStatus = useCallback(async (): Promise<{ status: string; paid_at: string | null } | null> => {
    if (!saleId) return null
    try {
      const data = await adminFetchJson<{ status: string; paid_at?: string | null }>(
        `/api/admin/livraria/pdv/pagamentos/status?sale_id=${encodeURIComponent(saleId)}`
      )
      const err = data && (data as { error?: string }).error
      if (typeof err === 'string') throw new Error(err)
      return { status: (data as { status: string }).status, paid_at: (data as { paid_at?: string | null }).paid_at ?? null }
    } catch {
      return null
    }
  }, [saleId])

  useEffect(() => {
    if (!saleId || status === 'failure') return

    let cancelled = false
    const start = Date.now()

    const poll = async () => {
      if (cancelled) return
      const result = await fetchStatus()
      if (cancelled) return
      if (result) {
        setPollStatus(result)
        setPollError(null)
        if (result.status === 'PAID') {
          setRedirecting(true)
          window.location.href = `/admin/livraria/vendas/${saleId}/recibo`
          return
        }
      } else {
        setPollError('Não foi possível consultar o status.')
      }
      if (Date.now() - start < POLL_TIMEOUT_MS && !cancelled) {
        setTimeout(poll, POLL_INTERVAL_MS)
      }
    }

    poll()
    return () => {
      cancelled = true
    }
  }, [saleId, status, fetchStatus])

  const title =
    status === 'success'
      ? 'Pagamento recebido'
      : status === 'failure'
        ? 'Pagamento não concluído'
        : 'Pagamento em processamento'

  const message =
    status === 'success'
      ? 'Estamos confirmando o pagamento. Você pode aguardar aqui ou voltar ao PDV.'
      : status === 'failure'
        ? 'O pagamento não foi finalizado. Você pode tentar novamente no PDV.'
        : 'Aguarde enquanto confirmamos o pagamento. Esta página atualiza automaticamente.'

  return (
    <PageAccessGuard pageKey="livraria_pdv">
      <div className="p-4 sm:p-6 max-w-lg mx-auto">
        <div className="mb-6">
          <Link
            href="/admin/livraria/vendas"
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-800"
          >
            <ArrowLeft size={18} />
            Voltar ao PDV
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex flex-col items-center text-center">
            {status === 'success' && (
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                <CheckCircle className="text-emerald-600" size={28} />
              </div>
            )}
            {status === 'pending' && (
              <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mb-4">
                <Clock className="text-amber-600" size={28} />
              </div>
            )}
            {status === 'failure' && (
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <XCircle className="text-red-600" size={28} />
              </div>
            )}

            <h1 className="text-xl font-semibold text-slate-800 mb-2">{title}</h1>
            <p className="text-slate-600 text-sm mb-6">{message}</p>

            {saleId && status !== 'failure' && (
              <div className="w-full space-y-2">
                {pollStatus && pollStatus.status !== 'PAID' && (
                  <div className="flex items-center justify-center gap-2 text-slate-500 text-sm">
                    <Loader2 className="animate-spin" size={18} />
                    Consultando status...
                  </div>
                )}
                {pollError && (
                  <p className="text-amber-600 text-sm" role="alert">
                    {pollError}
                  </p>
                )}
                {redirecting && (
                  <p className="text-emerald-600 text-sm">Redirecionando para o recibo...</p>
                )}
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-center">
            <Link
              href="/admin/livraria/vendas"
              className="inline-flex items-center justify-center gap-2 font-medium rounded-lg px-4 py-2 text-sm bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
            >
              Ir para o PDV
            </Link>
          </div>
        </div>
      </div>
    </PageAccessGuard>
  )
}
