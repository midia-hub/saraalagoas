import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

const REVISAO_EVENTS_SELECT = 'id, name, church_id, start_date, end_date, active, secretary_person_id, created_at, updated_at'

/**
 * GET  /api/admin/consolidacao/revisao/events  ?church_id=  &active=
 * POST /api/admin/consolidacao/revisao/events
 */

export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'consolidacao', action: 'view' })
  if (!access.ok) return access.response

  try {
    const supabase = createSupabaseAdminClient(request)
    const sp = request.nextUrl.searchParams
    const churchId = sp.get('church_id') ?? ''
    const activeOnly = sp.get('active') === '1' || sp.get('active') === 'true'
    const limitParam = Number(sp.get('limit') ?? 0)
    const offsetParam = Number(sp.get('offset') ?? 0)
    const hasLimit = Number.isFinite(limitParam) && limitParam > 0
    const safeLimit = hasLimit ? Math.min(Math.floor(limitParam), 500) : 0
    const safeOffset = Number.isFinite(offsetParam) && offsetParam >= 0 ? Math.floor(offsetParam) : 0

    let query = supabase
      .from('revisao_vidas_events')
      .select(REVISAO_EVENTS_SELECT)
      .order('start_date', { ascending: false })

    if (churchId) query = query.eq('church_id', churchId)
    if (activeOnly) query = query.eq('active', true)
    if (hasLimit) query = query.range(safeOffset, safeOffset + safeLimit - 1)

    const { data: events, error } = await query
    if (error) {
      console.error('GET revisao/events:', error)
      return NextResponse.json({ error: 'Erro ao listar eventos' }, { status: 500 })
    }

    // Enriquecer com dados do secretário
    const secretaryIds = [...new Set(events?.filter(e => e.secretary_person_id).map((e: any) => e.secretary_person_id) ?? [])]
    const { data: secretaries } = secretaryIds.length > 0
      ? await supabase.from('people').select('id, full_name').in('id', secretaryIds)
      : { data: [] }

    const secretaryMap = new Map((secretaries ?? []).map((s: any) => [s.id, s]))
    const enriched = (events ?? []).map(e => ({
      ...e,
      secretary: e.secretary_person_id ? secretaryMap.get(e.secretary_person_id) ?? null : null,
    }))

    return NextResponse.json({ items: enriched, events: enriched })
  } catch (err) {
    console.error('GET /api/admin/consolidacao/revisao/events:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'consolidacao', action: 'create' })
  if (!access.ok) return access.response

  try {
    const body = await request.json().catch(() => ({}))
    const name = (body.name ?? '').trim()
    if (!name) return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
    if (!body.church_id) return NextResponse.json({ error: 'Igreja é obrigatória' }, { status: 400 })
    if (!body.start_date) return NextResponse.json({ error: 'Data de início é obrigatória' }, { status: 400 })

    const supabase = createSupabaseAdminClient(request)
    const { data, error } = await supabase
      .from('revisao_vidas_events')
      .insert({
        name,
        church_id: body.church_id,
        start_date: body.start_date,
        end_date: body.end_date ?? null,
        active: body.active !== false,
        secretary_person_id: body.secretary_person_id ?? null,
      })
      .select(REVISAO_EVENTS_SELECT)
      .single()

    if (error) {
      console.error('POST revisao/events:', error)
      return NextResponse.json({ error: 'Erro ao criar evento' }, { status: 500 })
    }

    return NextResponse.json({ item: data }, { status: 201 })
  } catch (err) {
    console.error('POST /api/admin/consolidacao/revisao/events:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
