import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

type RoomBody = {
  name?: string
  description?: string | null
  capacity?: number | null
  available_days?: number[]
  day_times?: Record<number, { start: string; end: string }>
  available_start_time?: string
  available_end_time?: string
  approval_person_id?: string | null
  active?: boolean
}

function sanitizeAvailableDays(days: unknown): number[] {
  if (!Array.isArray(days)) return []
  const unique = new Set<number>()
  for (const value of days) {
    const n = Number(value)
    if (Number.isInteger(n) && n >= 0 && n <= 6) unique.add(n)
  }
  return [...unique].sort((a, b) => a - b)
}

export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'reservas', action: 'view' })
  if (!access.ok) return access.response

  try {
    const supabase = createSupabaseAdminClient(request)
    const { data, error } = await supabase
      .from('rooms')
      .select('id, name, description, capacity, available_days, day_times, available_start_time, available_end_time, approval_person_id, active, created_at, approver:approval_person_id(id, full_name)')
      .order('name')

    if (error) {
      console.error('GET admin reservas/rooms:', error)
      return NextResponse.json({ error: 'Erro ao listar salas' }, { status: 500 })
    }

    return NextResponse.json({ rooms: data ?? [] })
  } catch (err) {
    console.error('GET admin reservas/rooms:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'reservas', action: 'create' })
  if (!access.ok) return access.response

  try {
    const body = (await request.json().catch(() => ({}))) as RoomBody
    const name = (body.name ?? '').trim()
    if (!name) return NextResponse.json({ error: 'Nome da sala e obrigatorio' }, { status: 400 })

    const payload: any = {
      name,
      description: body.description?.trim() || null,
      capacity: Number.isFinite(Number(body.capacity)) ? Number(body.capacity) : null,
      available_days: sanitizeAvailableDays(body.available_days),
      approval_person_id: body.approval_person_id || null,
      active: body.active !== false,
    }
    if (body.day_times) {
      payload.day_times = body.day_times
    } else {
      payload.available_start_time = body.available_start_time || '08:00'
      payload.available_end_time = body.available_end_time || '22:00'
    }

    const supabase = createSupabaseAdminClient(request)
    const { data, error } = await supabase
      .from('rooms')
      .insert(payload)
      .select('id, name, description, capacity, available_days, day_times, available_start_time, available_end_time, approval_person_id, active, created_at')
      .single()

    if (error) {
      console.error('POST admin reservas/rooms:', error)
      return NextResponse.json({ error: 'Erro ao criar sala' }, { status: 500 })
    }

    return NextResponse.json({ room: data }, { status: 201 })
  } catch (err) {
    console.error('POST admin reservas/rooms:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
