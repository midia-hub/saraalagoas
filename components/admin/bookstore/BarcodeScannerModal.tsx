'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface BarcodeScannerModalProps {
  open: boolean
  onClose: () => void
  onDetected: (code: string) => void
}

export function BarcodeScannerModal({ open, onClose, onDetected }: BarcodeScannerModalProps) {
  const videoRef = useRef<HTMLDivElement>(null)
  const quaggaRef = useRef<{ stop: () => void; offDetected: (h: (r: unknown) => void) => void } | null>(null)
  const onDetectedRef = useRef<((r: unknown) => void) | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !videoRef.current) return
    setError(null)
    let Quagga: {
      init: (c: object, cb: (err: unknown) => void) => void
      start: () => void
      stop: () => void
      onDetected: (h: (r: unknown) => void) => void
      offDetected: (h?: (r: unknown) => void) => void
    }
    const target = videoRef.current
    const onDetectedCb = (result: unknown) => {
      const r = result as { codeResult?: { code?: string } }
      const code = r?.codeResult?.code
      if (code) {
        quaggaRef.current?.stop()
        onDetected(code)
        onClose()
      }
    }
    onDetectedRef.current = onDetectedCb
    import('@ericblade/quagga2')
      .then((mod) => {
        Quagga = mod.default
        quaggaRef.current = Quagga
        Quagga.init(
          {
            locate: true,
            numOfWorkers: typeof navigator !== 'undefined' && navigator.hardwareConcurrency ? Math.min(4, navigator.hardwareConcurrency) : 4,
            locator: {
              patchSize: 'large',
              halfSample: true,
            },
            inputStream: {
              name: 'Live',
              type: 'LiveStream',
              target,
              size: 640,
              constraints: { width: 640, height: 480, facingMode: 'environment' },
              area: { top: '12%', right: '12%', bottom: '12%', left: '12%' },
            },
            decoder: {
              readers: ['ean_reader', 'ean_8_reader', 'code_128_reader', 'upc_reader', 'upc_e_reader', 'code_39_reader'],
            },
            canvas: {
              createOverlay: false,
            },
          },
          (err: unknown) => {
            if (err) {
              setError('Não foi possível acessar a câmera. Verifique as permissões.')
              return
            }
            Quagga.onDetected(onDetectedCb)
            Quagga.start()
          }
        )
      })
      .catch(() => setError('Erro ao carregar o leitor de código de barras.'))

    return () => {
      if (quaggaRef.current && onDetectedRef.current) {
        try {
          quaggaRef.current.offDetected(onDetectedRef.current)
          quaggaRef.current.stop()
        } catch (_) {}
      }
      quaggaRef.current = null
      onDetectedRef.current = null
    }
  }, [open, onClose, onDetected])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[300] flex flex-col bg-black"
      role="dialog"
      aria-modal="true"
      aria-label="Ler código de barras"
    >
      <div className="flex items-center justify-between p-3 bg-slate-900 text-white">
        <span className="font-medium">Aponte para o código de barras</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white/20"
          onClick={onClose}
          aria-label="Fechar"
        >
          <X size={20} />
        </Button>
      </div>
      <div className="flex-1 flex items-center justify-center min-h-0 p-4">
        <div ref={videoRef} className="w-full max-w-lg aspect-square bg-slate-800 rounded-lg overflow-hidden" />
      </div>
      {error && (
        <div className="p-4 bg-red-900/80 text-white text-sm text-center">
          {error}
        </div>
      )}
    </div>
  )
}
