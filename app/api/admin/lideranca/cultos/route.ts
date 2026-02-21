import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

function normalizeArenaDay(day: string | null | undefined): number {
  const value = (day ?? '').toLowerCase()
  if (value === 'sun') return 0
  if (value === 'mon') return 1
  if (value === 'tue') return 2
  if (value === 'wed') return 3
  if (value === 'thu') return 4
  if (value === 'fri') return 5
  if (value === 'sat') return 6
  return 0
}

function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * GET /api/admin/lideranca/cultos
 * Lista os cultos (worship_services) vinculados à igreja do líder logado.
 */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'cultos', action: 'view' })
  if (!access.ok) return access.response

  try {
    const personId = access.snapshot.personId
    if (!personId) {
      return NextResponse.json({ error: 'Perfil do usuário não contém vínculo com pessoa.' }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient(request)

    // 1. Descobrir a igreja do líder via célula que lidera ou church_pastors
    let churchId: string | null = null

    // Tenta por célula liderada
    let ledCell: { church_id: string | null } | null = null
    const { data: ledCellActive, error: ledCellActiveError } = await supabase
      .from('cells')
      .select('church_id')
      .eq('leader_person_id', personId)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()

    if (ledCellActiveError) {
      const { data: ledCellFallback } = await supabase
        .from('cells')
        .select('church_id')
        .eq('leader_person_id', personId)
        .limit(1)
        .maybeSingle()
      ledCell = ledCellFallback
    } else {
      ledCell = ledCellActive
    }

    if (ledCell?.church_id) {
      churchId = ledCell.church_id
    } else {
      // Tenta por vínculo pastor
      const { data: pastorRow } = await supabase
        .from('church_pastors')
        .select('church_id')
        .eq('person_id', personId)
        .limit(1)
        .maybeSingle()
      if (pastorRow?.church_id) churchId = pastorRow.church_id
    }

    if (!churchId) {
      // Sem vínculo com nenhuma igreja encontrado — devolve lista vazia
      console.warn('Lideranca/Cultos: nenhuma igreja encontrada para personId:', personId)
      return NextResponse.json([])
    }

    // 2. Listar cultos da igreja do líder
    const { data: churchCultos, error: churchCultosError } = await supabase
      .from('worship_services')
      .select('id, name, day_of_week, time_of_day, church_id, active')
      .eq('church_id', churchId)
      .eq('active', true)
      .order('day_of_week')
      .order('time_of_day')

    if (churchCultosError) {
      console.error('Lideranca/Cultos: erro ao listar cultos da igreja:', churchCultosError)
      return NextResponse.json({ error: 'Erro ao listar cultos' }, { status: 500 })
    }

    const { data: churchArenas, error: churchArenasError } = await supabase
      .from('arenas')
      .select('id, name, day_of_week, time_of_day, church_id, is_active')
      .eq('church_id', churchId)
      .eq('is_active', true)
      .order('day_of_week')
      .order('time_of_day')

    if (churchArenasError) {
      console.error('Lideranca/Cultos: erro ao listar arenas da igreja:', churchArenasError)
      return NextResponse.json({ error: 'Erro ao listar cultos' }, { status: 500 })
    }

    const existingServiceKeys = new Set(
      (churchCultos ?? []).map((service: { name: string; day_of_week: number; time_of_day: string }) =>
        `${normalizeName(service.name)}|${Number(service.day_of_week)}|${String(service.time_of_day).slice(0, 5)}`
      )
    )

    const arenaAsServices = (churchArenas ?? []).flatMap((arena: {
      id: string
      name: string
      day_of_week: string
      time_of_day: string
      church_id: string
    }) => {
      const arenaDay = normalizeArenaDay(arena.day_of_week)
      const arenaKey = `${normalizeName(arena.name)}|${arenaDay}|${String(arena.time_of_day).slice(0, 5)}`
      if (existingServiceKeys.has(arenaKey)) return []

      return [{
        id: `arena:${arena.id}`,
        name: arena.name,
        day_of_week: arenaDay,
        time_of_day: arena.time_of_day,
        church_id: arena.church_id,
        active: true,
        source: 'arena',
        arena_id: arena.id,
      }]
    })

    const result = [...(churchCultos ?? []), ...arenaAsServices]
      .sort((a, b) => {
        const aDay = Number((a as { day_of_week?: number }).day_of_week ?? 0)
        const bDay = Number((b as { day_of_week?: number }).day_of_week ?? 0)
        if (aDay !== bDay) return aDay - bDay
        const aTime = String((a as { time_of_day?: string }).time_of_day ?? '')
        const bTime = String((b as { time_of_day?: string }).time_of_day ?? '')
        return aTime.localeCompare(bTime)
      })

    return NextResponse.json(result)
  } catch (err) {
    console.error('GET /api/admin/lideranca/cultos exception:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
