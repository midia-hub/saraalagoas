'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function GaleriaViewRedirectPage() {
  const router = useRouter()
  const params = useParams()
  const tipo = params.tipo as string
  const slug = params.slug as string
  const date = params.date as string

  useEffect(() => {
    if (tipo && slug && date) {
      router.replace(`/admin/galeria/${tipo}/${slug}/${date}`)
    }
  }, [router, tipo, slug, date])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-600">Redirecionando para a galeria...</p>
    </div>
  )
}
