import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { getTodayBrasilia } from '@/lib/date-utils'

function getBrasiliaDayRange(reference = new Date()) {
  const todayStr = getTodayBrasilia()
  const startIso = `${todayStr}T03:00:00.000Z`
  const end = new Date(startIso)
  end.setUTCDate(end.getUTCDate() + 1)
  return { startIso, endIso: end.toISOString() }
}

function getMonthRangeInUtc(reference = new Date()) {
  const start = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), 1, 0, 0, 0))
  const end = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() + 1, 1, 0, 0, 0))
  return { startIso: start.toISOString(), endIso: end.toISOString() }
}

export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'reservas', action: 'view' })
  if (!access.ok) return access.response

  try {
    const supabase = createSupabaseAdminClient(request)
    const { startIso: todayStart, endIso: todayEnd } = getBrasiliaDayRange()
    const { startIso: monthStart, endIso: monthEnd } = getMonthRangeInUtc()

    const [
      { count: pendentes },
      { count: aprovadas_hoje },
      { count: rejeitadas_mes },
      { count: total_salas },
      { count: salas_disponiveis },
    ] = await Promise.all([
      supabase
        .from('room_reservations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending'),
      supabase
        .from('room_reservations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved')
        .gte('approved_at', todayStart)
        .lt('approved_at', todayEnd),
      supabase
        .from('room_reservations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'rejected')
        .gte('created_at', monthStart)
        .lt('created_at', monthEnd),
      supabase.from('rooms').select('*', { count: 'exact', head: true }),
      supabase.from('rooms').select('*', { count: 'exact', head: true }).eq('active', true),
    ])

    return NextResponse.json({
      pendentes: pendentes ?? 0,
      aprovadas_hoje: aprovadas_hoje ?? 0,
      rejeitadas_mes: rejeitadas_mes ?? 0,
      total_salas: total_salas ?? 0,
      salas_disponiveis: salas_disponiveis ?? 0,
    })
  } catch (err) {
    console.error('GET admin reservas/stats exception:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
