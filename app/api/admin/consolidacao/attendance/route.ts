import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

/**
 * GET  /api/admin/consolidacao/attendance
 *   ?person_id=  &from=  &to=  &church_id=
 *   Retorna lista com totais e últimas presenças
 *
 * POST /api/admin/consolidacao/attendance
 *   Upsert de presença (service_id + person_id + attended_on é unique)
 */

export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'consolidacao', action: 'view' })
  if (!access.ok) return access.response

  try {
    const supabase = createSupabaseAdminClient(request)
    const sp = request.nextUrl.searchParams
    const personId = sp.get('person_id') ?? ''
    const from = sp.get('from') ?? ''
    const to = sp.get('to') ?? ''
    const churchId = sp.get('church_id') ?? ''

    let query = supabase
      .from('worship_attendance')
      .select('*, worship_services(id, name, day_of_week, time_of_day, church_id)')
      .order('attended_on', { ascending: false })

    if (personId) query = query.eq('person_id', personId)
    if (from) query = query.gte('attended_on', from)
    if (to) query = query.lte('attended_on', to)

    const { data, error } = await query
    if (error) {
      console.error('GET attendance:', error)
      return NextResponse.json({ error: 'Erro ao listar presenças' }, { status: 500 })
    }

    let items = data ?? []

    // Filtrar por church_id se necessário (via join)
    if (churchId) {
      items = items.filter((a: Record<string, unknown>) => {
        const svc = a.worship_services as Record<string, unknown> | null
        return svc?.church_id === churchId
      })
    }

    // Agrupado por pessoa (presente nos últimos 30 dias)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const cutoff = thirtyDaysAgo.toISOString().slice(0, 10)

    const summary: Record<string, { total_last30: number; last_dates: string[] }> = {}
    for (const a of items) {
      const att = a as Record<string, unknown>
      const pid = att.person_id as string
      if (!summary[pid]) summary[pid] = { total_last30: 0, last_dates: [] }
      if ((att.attended_on as string) >= cutoff && att.attended === true) {
        summary[pid].total_last30++
        if (summary[pid].last_dates.length < 5) {
          summary[pid].last_dates.push(att.attended_on as string)
        }
      }
    }

    return NextResponse.json({ items, summary, attendance: items })
  } catch (err) {
    console.error('GET /api/admin/consolidacao/attendance:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'consolidacao', action: 'create' })
  if (!access.ok) return access.response

  try {
    const body = await request.json().catch(() => ({}))
    if (!body.service_id) return NextResponse.json({ error: 'service_id é obrigatório' }, { status: 400 })
    if (!body.person_id) return NextResponse.json({ error: 'person_id é obrigatório' }, { status: 400 })
    if (!body.attended_on) return NextResponse.json({ error: 'attended_on é obrigatório' }, { status: 400 })

    const supabase = createSupabaseAdminClient(request)
    const userId = access.snapshot.userId

    const payload = {
      service_id: body.service_id,
      person_id: body.person_id,
      attended_on: body.attended_on,
      attended: body.attended !== false,
      notes: body.notes ?? null,
      leader_person_id: body.leader_person_id ?? null,
      registered_by_user_id: userId ?? null,
    }

    // Upsert pelo unique (service_id, person_id, attended_on)
    const { data, error } = await supabase
      .from('worship_attendance')
      .upsert(payload, { onConflict: 'service_id,person_id,attended_on' })
      .select()
      .single()

    if (error) {
      console.error('POST attendance:', error)
      return NextResponse.json({ error: 'Erro ao registrar presença' }, { status: 500 })
    }

    return NextResponse.json({ item: data }, { status: 201 })
  } catch (err) {
    console.error('POST /api/admin/consolidacao/attendance:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
