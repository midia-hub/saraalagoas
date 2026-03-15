'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, X, RefreshCw } from 'lucide-react'
import { adminFetchJson } from '@/lib/admin-client'

type IntegrationHealth = {
  id: string
  name: string
  status: 'expired' | 'expiring_soon'
  daysLeft: number | null
}

type TokenHealthResponse = {
  items: IntegrationHealth[]
}

export function MetaTokenExpiryBanner() {
  const [items, setItems] = useState<IntegrationHealth[]>([])
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    adminFetchJson<TokenHealthResponse>('/api/meta/token-health')
      .then((data) => setItems(data.items || []))
      .catch(() => {})
  }, [])

  if (dismissed || items.length === 0) return null

  const expired = items.filter((i) => i.status === 'expired')
  const expiringSoon = items.filter((i) => i.status === 'expiring_soon')
  const hasExpired = expired.length > 0

  return (
    <div
      className={`relative flex items-start gap-3 px-4 py-3 text-sm ${
        hasExpired
          ? 'bg-red-50 border-b border-red-200 text-red-800'
          : 'bg-amber-50 border-b border-amber-200 text-amber-800'
      }`}
    >
      <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${hasExpired ? 'text-red-500' : 'text-amber-500'}`} />

      <div className="flex-1 min-w-0">
        {hasExpired ? (
          <>
            <span className="font-semibold">
              {expired.length === 1
                ? `Conexão expirada: ${expired[0].name}`
                : `${expired.length} conexões Meta expiradas`}
            </span>
            {' — '}
            as postagens no Instagram e Facebook estão bloqueadas até você reconectar.
            {expiringSoon.length > 0 && (
              <span className="ml-1 text-red-700">
                Outras {expiringSoon.length} conta(s) expiram em breve.
              </span>
            )}
          </>
        ) : (
          <>
            <span className="font-semibold">
              {expiringSoon.length === 1
                ? `Token expirando em breve: ${expiringSoon[0].name}`
                : `${expiringSoon.length} conexões Meta expiram em breve`}
            </span>
            {' — '}
            {expiringSoon[0].daysLeft != null
              ? `${expiringSoon[0].daysLeft} dia(s) restante(s).`
              : 'Reconecte para evitar interrupção nas postagens.'}
          </>
        )}
        <Link
          href="/admin/instancias"
          className={`ml-2 inline-flex items-center gap-1 font-medium underline underline-offset-2 ${
            hasExpired ? 'text-red-700 hover:text-red-900' : 'text-amber-700 hover:text-amber-900'
          }`}
        >
          <RefreshCw className="h-3 w-3" />
          Reconectar agora
        </Link>
      </div>

      <button
        onClick={() => setDismissed(true)}
        aria-label="Fechar aviso"
        className={`shrink-0 rounded p-0.5 transition-colors ${
          hasExpired ? 'hover:bg-red-100' : 'hover:bg-amber-100'
        }`}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
