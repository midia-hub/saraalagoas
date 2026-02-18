'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { adminFetchJson } from '@/lib/admin-client'
import { CheckCircle2, Loader2 } from 'lucide-react'

const REDIRECT_DELAY_SEC = 5

interface MercadoPagoOrderModalProps {
  open: boolean
  saleId: string
  saleNumber?: string
  /** String EMVCo para gerar QR (modo dynamic/hybrid). Quando presente, exibe a imagem do QR. */
  qrData: string | null
  /** ID da order no MP (para consulta/cancelamento). */
  orderId: string | null
  onClose: () => void
}

const QR_IMAGE_BASE = 'https://api.qrserver.com/v1/create-qr-code/'
const POLL_INTERVAL_MS = 2500
const MAX_CONSECUTIVE_ERRORS = 4

export function MercadoPagoOrderModal({
  open,
  saleId,
  saleNumber,
  qrData,
  orderId,
  onClose,
}: MercadoPagoOrderModalProps) {
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid' | 'failed' | null>(null)
  const [pollingUnavailable, setPollingUnavailable] = useState(false)

  useEffect(() => {
    if (!open || !saleId) return
    setPaymentStatus('pending')
    setPollingUnavailable(false)
    let consecutiveErrors = 0
    const check = async () => {
      try {
        const data = await adminFetchJson<{ status: string }>(
          `/api/admin/livraria/pdv/pagamentos/status/?sale_id=${encodeURIComponent(saleId)}`
        )
        consecutiveErrors = 0
        if (data?.status === 'PAID') {
          setPaymentStatus('paid')
          return true
        }
        if (data?.status === 'FAILED') {
          setPaymentStatus('failed')
          return true
        }
      } catch {
        consecutiveErrors += 1
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          setPollingUnavailable(true)
          return true
        }
      }
      return false
    }
    check()
    const id = setInterval(() => {
      check().then((done) => {
        if (done) clearInterval(id)
      })
    }, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [open, saleId])

  const [countdown, setCountdown] = useState(REDIRECT_DELAY_SEC)
  useEffect(() => {
    if (paymentStatus !== 'paid') return
    setCountdown(REDIRECT_DELAY_SEC)
  }, [paymentStatus])
  useEffect(() => {
    if (paymentStatus !== 'paid' || countdown <= 0) return
    const t = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          window.location.href = `/admin/livraria/vendas/${saleId}/recibo`
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [paymentStatus, saleId, countdown])

  if (!open) return null

  if (paymentStatus === 'paid') {
    return (
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mp-order-title"
      >
        <div className="absolute inset-0 bg-emerald-950/30 backdrop-blur-sm" aria-hidden />
        <div className="relative w-full max-w-sm rounded-2xl border-2 border-emerald-200 bg-white p-8 shadow-2xl text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" strokeWidth={2.5} />
          </div>
          <h2 id="mp-order-title" className="text-xl font-bold text-slate-800 mb-1">
            Pagamento confirmado!
          </h2>
          <p className="text-sm text-slate-600 mb-6">
            Obrigado. Em instantes você verá o recibo da venda.
          </p>
          <div className="rounded-xl bg-slate-100 px-4 py-3">
            <p className="text-sm font-medium text-slate-700">
              Redirecionando para o recibo em <span className="text-lg font-bold text-emerald-600 tabular-nums">{countdown}</span> {countdown === 1 ? 'segundo' : 'segundos'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  const qrImageUrl = qrData
    ? `${QR_IMAGE_BASE}?size=220x220&data=${encodeURIComponent(qrData)}`
    : null

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mp-order-title"
    >
      <div className="absolute inset-0 bg-black/50" aria-hidden onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <h2 id="mp-order-title" className="text-lg font-semibold text-slate-800 mb-2">
          Pagamento QR no caixa – Mercado Pago
        </h2>
        {qrImageUrl ? (
          <>
            <p className="text-sm text-slate-600 mb-4">
              O cliente pode escanear o QR Code abaixo com o app do Mercado Pago ou do banco. Ou usar o QR estático do caixa. <strong>Aguarde a confirmação nesta tela.</strong>
            </p>
            <div className="flex justify-center mb-4">
              <img
                src={qrImageUrl}
                alt="QR Code para pagamento no caixa"
                className="w-[220px] h-[220px] border border-slate-200 rounded-lg bg-white"
                width={220}
                height={220}
              />
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-600 mb-4">
            Order vinculada ao caixa. O cliente pode escanear o <strong>QR do caixa</strong> (Mercado Pago) para pagar. <strong>Aguarde a confirmação nesta tela.</strong>
          </p>
        )}
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 mb-4 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-amber-600 shrink-0" />
          <span className="text-sm text-amber-800">Aguardando confirmação do pagamento...</span>
        </div>
        {orderId && (
          <p className="text-xs text-slate-500 mb-4">
            Order: <code className="bg-slate-100 px-1 rounded">{orderId}</code>
          </p>
        )}
        {paymentStatus === 'failed' && (
          <p className="text-sm text-red-600 mb-4">Pagamento não aprovado. Você pode fechar e verificar no histórico.</p>
        )}

        {pollingUnavailable && (
          <div className="rounded-lg bg-slate-100 border border-slate-200 px-3 py-3 mb-4">
            <p className="text-sm text-slate-700 mb-2">
              Não foi possível confirmar o pagamento automaticamente (servidor inacessível ou sem conexão). Se você já pagou, confira o recibo.
            </p>
            <Button
              type="button"
              onClick={() => { window.location.href = `/admin/livraria/vendas/${saleId}/recibo` }}
              className="w-full"
            >
              Abrir recibo
            </Button>
          </div>
        )}

        <div className="flex justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Fechar (venda permanece pendente)
          </Button>
        </div>
      </div>
    </div>
  )
}
