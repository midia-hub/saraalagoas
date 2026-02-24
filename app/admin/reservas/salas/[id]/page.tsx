'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { adminFetchJson } from '@/lib/admin-client'

type Room = {
  id: string
  name: string
  description: string | null
  capacity: number | null
  available_days: number[]
  available_start_time: string
  available_end_time: string
  approval_person_id: string | null
  active: boolean
}

export default function SalaDetalhePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [room, setRoom] = useState<Room | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const run = async () => {
      const id = params?.id
      if (!id) return
      try {
        const json = await adminFetchJson<{ room: Room }>(`/api/admin/reservas/rooms/${id}`)
        setRoom(json.room)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar sala')
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [params?.id])

  return (
    <PageAccessGuard pageKey="reservas">
      <div className="p-6 md:p-8 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Detalhes da Sala</h1>
          <button className="rounded border px-3 py-2" onClick={() => router.push('/admin/reservas/salas')}>
            Voltar
          </button>
        </div>

        {loading ? <div>Carregando...</div> : null}
        {error ? <div className="text-red-600">{error}</div> : null}

        {room ? (
          <div className="rounded-xl border bg-white p-4 space-y-2 text-sm">
            <div><strong>Nome:</strong> {room.name}</div>
            <div><strong>Descricao:</strong> {room.description || '-'}</div>
            <div><strong>Capacidade:</strong> {room.capacity || '-'}</div>
            <div><strong>Dias:</strong> {(room.available_days || []).join(', ') || '-'}</div>
            <div><strong>Horario:</strong> {String(room.available_start_time).slice(0, 5)} - {String(room.available_end_time).slice(0, 5)}</div>
            <div><strong>Status:</strong> {room.active ? 'Ativa' : 'Inativa'}</div>
          </div>
        ) : null}
      </div>
    </PageAccessGuard>
  )
}
