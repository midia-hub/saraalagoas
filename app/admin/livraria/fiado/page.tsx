'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LivrariaFiadoRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/admin/livraria/clientes?tab=fiado')
  }, [router])
  return null
}
