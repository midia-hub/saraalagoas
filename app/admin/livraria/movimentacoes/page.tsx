'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Esta página foi unificada em /admin/livraria/estoque
// Redireciona automaticamente para a aba de histórico
export default function LivrariaMovimentacoesPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/admin/livraria/estoque?aba=historico')
  }, [router])
  return null
}
