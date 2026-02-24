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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireAccess(request, { pageKey: 'reservas', action: 'view' })
  if (!access.ok) return access.response

  const { id } = await params
  const supabase = createSupabaseAdminClient(request)

  const { data, error } = await supabase
    .from('rooms')
    .select('id, name, description, capacity, available_days, available_start_time, available_end_time, approval_person_id, active, created_at')
    .eq('id', id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: 'Erro ao carregar sala' }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Sala nao encontrada' }, { status: 404 })

  return NextResponse.json({ room: data })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireAccess(request, { pageKey: 'reservas', action: 'edit' })
  if (!access.ok) return access.response

  const { id } = await params
  const body = (await request.json().catch(() => ({}))) as RoomBody

  const payload: Record<string, unknown> = {}
  if (body.name !== undefined) payload.name = String(body.name).trim()
  if (body.description !== undefined) payload.description = body.description?.trim() || null
  if (body.capacity !== undefined) payload.capacity = Number.isFinite(Number(body.capacity)) ? Number(body.capacity) : null
  if (body.available_days !== undefined) payload.available_days = sanitizeAvailableDays(body.available_days)
  if (body.day_times !== undefined) payload.day_times = body.day_times
  if (body.available_start_time !== undefined) payload.available_start_time = body.available_start_time
  if (body.available_end_time !== undefined) payload.available_end_time = body.available_end_time
  if (body.approval_person_id !== undefined) payload.approval_person_id = body.approval_person_id || null
  if (body.active !== undefined) payload.active = !!body.active

  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
  }

  const supabase = createSupabaseAdminClient(request)
  const { data, error } = await supabase
    .from('rooms')
    .update(payload)
    .eq('id', id)
    .select('id, name, description, capacity, available_days, day_times, available_start_time, available_end_time, approval_person_id, active, created_at')
    .single()

  if (error) {
    console.error('PATCH admin reservas/rooms/[id]:', error)
    return NextResponse.json({ error: 'Erro ao atualizar sala' }, { status: 500 })
  }

  return NextResponse.json({ room: data })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireAccess(request, { pageKey: 'reservas', action: 'delete' })
  if (!access.ok) return access.response

  const { id } = await params
  const supabase = createSupabaseAdminClient(request)

  const { count, error: countError } = await supabase
    .from('room_reservations')
    .select('*', { count: 'exact', head: true })
    .eq('room_id', id)

  if (countError) return NextResponse.json({ error: 'Erro ao validar exclusao' }, { status: 500 })

  if ((count ?? 0) > 0) {
    const { error: disableError } = await supabase
      .from('rooms')
      .update({ active: false })
      .eq('id', id)
    if (disableError) return NextResponse.json({ error: 'Erro ao desativar sala' }, { status: 500 })
    return NextResponse.json({ success: true, softDeleted: true })
  }

  const { error } = await supabase.from('rooms').delete().eq('id', id)
  if (error) return NextResponse.json({ error: 'Erro ao excluir sala' }, { status: 500 })

  return NextResponse.json({ success: true })
}
