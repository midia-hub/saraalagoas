'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { adminFetchJson } from '@/lib/admin-client'
import { CheckCircle2, Loader2 } from 'lucide-react'

interface MercadoPagoCheckoutModalProps {
  open: boolean
  saleId: string
  /** QR Code Pix em base64 (imagem) — quando presente, exibe pagamento Pix direto. */
  qrCodeBase64: string | null
  /** Código Pix copia e cola. */
  qrCode: string | null
  onClose: () => void
}

const POLL_INTERVAL_MS = 2500
const MAX_CONSECUTIVE_ERRORS = 4

export function MercadoPagoCheckoutModal({
  open,
  saleId,
  qrCodeBase64,
  qrCode,
  onClose,
}: MercadoPagoCheckoutModalProps) {
  const [copied, setCopied] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid' | 'failed' | null>(null)
  const [pollingUnavailable, setPollingUnavailable] = useState(false)

  const copyPixCode = useCallback(() => {
    if (!qrCode) return
    navigator.clipboard.writeText(qrCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [qrCode])

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

  useEffect(() => {
    if (paymentStatus !== 'paid') return
    const t = setTimeout(() => {
      window.location.href = `/admin/livraria/vendas/${saleId}/recibo`
    }, 1800)
    return () => clearTimeout(t)
  }, [paymentStatus, saleId])

  if (!open) return null

  if (paymentStatus === 'paid') {
    return (
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mp-checkout-title"
      >
        <div className="absolute inset-0 bg-black/50" aria-hidden />
        <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl text-center">
          <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-4" />
          <h2 id="mp-checkout-title" className="text-lg font-semibold text-slate-800 mb-2">
            Pagamento confirmado!
          </h2>
          <p className="text-sm text-slate-600 mb-4">
            Redirecionando para o recibo...
          </p>
          <div className="flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mp-checkout-title"
    >
      <div className="absolute inset-0 bg-black/50" aria-hidden onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <h2 id="mp-checkout-title" className="text-lg font-semibold text-slate-800 mb-2">
          Pagamento Pix – Mercado Pago
        </h2>
        <p className="text-sm text-slate-600 mb-4">
          Escaneie o QR Code com o app do seu banco ou use o código Pix copia e cola para pagar. <strong>Aguarde a confirmação nesta tela.</strong>
        </p>

        <div className="flex flex-col items-center gap-4 mb-4">
          {qrCodeBase64 ? (
            <img
              src={`data:image/png;base64,${qrCodeBase64}`}
              alt="QR Code Pix para pagamento"
              className="w-[220px] h-[220px] border border-slate-200 rounded-lg bg-white"
              width={220}
              height={220}
            />
          ) : (
            <div className="w-[220px] h-[220px] border border-slate-200 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 text-sm">
              QR Code não disponível
            </div>
          )}
          {qrCode && (
            <div className="w-full">
              <p className="text-xs text-slate-500 mb-1">Código Pix (copia e cola):</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={qrCode}
                  className="flex-1 text-xs p-2 border border-slate-200 rounded bg-slate-50 text-slate-700 truncate"
                />
                <Button type="button" variant="secondary" onClick={copyPixCode}>
                  {copied ? 'Copiado!' : 'Copiar'}
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 mb-4 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-amber-600 shrink-0" />
          <span className="text-sm text-amber-800">Aguardando confirmação do pagamento...</span>
        </div>

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
