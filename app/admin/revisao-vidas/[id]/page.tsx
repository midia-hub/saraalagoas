'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function RevisaoVidasEventPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()

  useEffect(() => {
    const id = params?.id
    if (id) {
      router.replace(`/admin/revisao-vidas/inscritos?event_id=${id}`)
      return
    }
    router.replace('/admin/revisao-vidas/inscritos')
  }, [params, router])

  return null
}
