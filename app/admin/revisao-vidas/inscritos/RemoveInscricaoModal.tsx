'use client'

import { useState } from 'react'
import { Loader2, AlertTriangle, X } from 'lucide-react'

interface RemoveInscricaoModalProps {
  isOpen: boolean
  personName: string
  eventName: string
  onClose: () => void
  onConfirm: () => Promise<void>
  isDeleting?: boolean
}

export function RemoveInscricaoModal({
  isOpen,
  personName,
  eventName,
  onClose,
  onConfirm,
  isDeleting = false,
}: RemoveInscricaoModalProps) {
  const [error, setError] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  if (!isOpen) return null

  async function handleConfirm() {
    setIsProcessing(true)
    setError('')
    try {
      await onConfirm()
      onClose()
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao remover inscrição')
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-red-100 bg-red-50/50">
          <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-red-900">Remover Inscrição?</h2>
            <p className="text-xs text-red-700 mt-0.5">Esta ação não pode ser desfeita</p>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="ml-auto p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="bg-slate-50 rounded-xl p-4 space-y-2">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pessoa</p>
              <p className="text-sm font-semibold text-slate-900 mt-1">{personName}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Evento</p>
              <p className="text-sm font-semibold text-slate-900 mt-1">{eventName}</p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-900">
              <span className="font-semibold">✓ Boa notícia:</span> A pessoa poderá se inscrever novamente neste evento após a remoção.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl border border-slate-200 text-slate-600 hover:bg-white transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={isProcessing || isDeleting}
            className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
          >
            {isProcessing || isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Removendo...
              </>
            ) : (
              'Remover Inscrição'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
