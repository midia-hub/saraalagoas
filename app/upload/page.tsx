'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function UploadRedirectPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/admin/upload')
  }, [router])
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-600">Redirecionando para o upload...</p>
    </div>
  )
}
