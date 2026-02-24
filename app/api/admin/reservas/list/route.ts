import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

function getMonthRangeInUtc(reference = new Date()) {
  const start = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), 1, 0, 0, 0))
  const end = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() + 1, 1, 0, 0, 0))
  return { startIso: start.toISOString(), endIso: end.toISOString() }
}

export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'reservas', action: 'view' })
  if (!access.ok) return access.response

  try {
    const roomId = request.nextUrl.searchParams.get('room_id') ?? ''
    const status = request.nextUrl.searchParams.get('status') ?? ''
    const dateFrom = request.nextUrl.searchParams.get('date_from') ?? ''
    const dateTo = request.nextUrl.searchParams.get('date_to') ?? ''

    const supabase = createSupabaseAdminClient(request)

    let query = supabase
      .from('room_reservations')
      .select(
        'id, room_id, requester_person_id, requester_name, requester_phone, team_id, start_datetime, end_datetime, people_count, reason, status, approved_by, approved_at, cancelled_reason, created_at, room:room_id(id, name), team:team_id(id, name)'
      )
      .order('start_datetime', { ascending: true })

    if (roomId) query = query.eq('room_id', roomId)
    if (status) query = query.eq('status', status)
    if (dateFrom) query = query.gte('start_datetime', `${dateFrom}T00:00:00.000Z`)
    if (dateTo) query = query.lte('start_datetime', `${dateTo}T23:59:59.999Z`)

    const { data: reservations, error } = await query
    if (error) {
      console.error('GET admin reservas/list:', error)
      return NextResponse.json({ error: 'Erro ao listar reservas' }, { status: 500 })
    }

    const { count: pendingCount } = await supabase
      .from('room_reservations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    const { startIso: monthStart, endIso: monthEnd } = getMonthRangeInUtc()
    const { count: approvedMonthCount } = await supabase
      .from('room_reservations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved')
      .gte('start_datetime', monthStart)
      .lt('start_datetime', monthEnd)

    const { data: usageRows } = await supabase
      .from('room_reservations')
      .select('room_id, status, room:room_id(name)')
      .in('status', ['approved', 'pending'])

    const usageMap = new Map<string, { room_id: string; room_name: string; count: number }>()
    for (const row of usageRows ?? []) {
      const roomName = (row.room as { name?: string } | null)?.name ?? String(row.room_id)
      const key = String(row.room_id)
      const current = usageMap.get(key)
      if (current) {
        current.count += 1
      } else {
        usageMap.set(key, { room_id: key, room_name: roomName, count: 1 })
      }
    }

    const mostUsedRooms = [...usageMap.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    const nowIso = new Date().toISOString()
    const { data: upcoming } = await supabase
      .from('room_reservations')
      .select('id, start_datetime, end_datetime, status, requester_name, room:room_id(name)')
      .in('status', ['approved', 'pending'])
      .gte('start_datetime', nowIso)
      .order('start_datetime', { ascending: true })
      .limit(10)

    return NextResponse.json({
      reservations: reservations ?? [],
      stats: {
        pending_count: pendingCount ?? 0,
        approved_month_count: approvedMonthCount ?? 0,
        most_used_rooms: mostUsedRooms,
        upcoming: upcoming ?? [],
      },
    })
  } catch (err) {
    console.error('GET admin reservas/list exception:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
