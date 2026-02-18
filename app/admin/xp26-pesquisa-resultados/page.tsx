'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Dashboard XP26 foi movido para site público (sem login).
 * Redireciona para /xp26-resultados
 */
export default function Xp26PesquisaResultadosRedirectPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/xp26-resultados')
  }, [router])
  return (
    <div className="p-6 text-slate-600">
      Redirecionando para o dashboard da pesquisa XP26...
    </div>
  )
}
