import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

/**
 * GET  /api/admin/consolidacao/revisao/registrations  ?event_id=  &status=  &person_id=
 * POST /api/admin/consolidacao/revisao/registrations  (upsert por event_id+person_id)
 */

export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'consolidacao', action: 'view' })
  if (!access.ok) return access.response

  try {
    const supabase = createSupabaseAdminClient(request)
    const sp = request.nextUrl.searchParams
    const eventId = sp.get('event_id') ?? ''
    const status = sp.get('status') ?? ''
    const personId = sp.get('person_id') ?? ''

    let query = supabase
      .from('revisao_vidas_registrations')
      .select('*')
      .order('created_at', { ascending: false })

    if (eventId) query = query.eq('event_id', eventId)
    if (status) query = query.eq('status', status)
    if (personId) query = query.eq('person_id', personId)

    const { data: registrations, error } = await query
    if (error) {
      console.error('GET revisao/registrations:', error)
      return NextResponse.json({ error: 'Erro ao listar inscrições' }, { status: 500 })
    }

    if (!registrations || registrations.length === 0) {
      return NextResponse.json({ items: [] })
    }

    // Enriquecer com dados de pessoa
    const pids = [...new Set(registrations.map((r: Record<string, string>) => r.person_id).filter(Boolean))]
    const ldIds = [...new Set(registrations.map((r: Record<string, string | null>) => r.leader_person_id).filter(Boolean))]

    const { data: people } = await supabase
      .from('people')
      .select('id, full_name, mobile_phone, email')
      .in('id', pids)

    const { data: leaders } = ldIds.length > 0
      ? await supabase.from('people').select('id, full_name').in('id', ldIds)
      : { data: [] }

    const peopleMap = new Map((people ?? []).map((p: Record<string, string>) => [p.id, p]))
    const leaderMap = new Map((leaders ?? []).map((l: Record<string, string>) => [l.id, l]))

    const items = registrations.map((r: Record<string, unknown>) => ({
      ...r,
      person: peopleMap.get(r.person_id as string) ?? null,
      leader: r.leader_person_id ? leaderMap.get(r.leader_person_id as string) ?? null : null,
    }))

    return NextResponse.json({ items, registrations: items })
  } catch (err) {
    console.error('GET /api/admin/consolidacao/revisao/registrations:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'consolidacao', action: 'create' })
  if (!access.ok) return access.response

  try {
    const body = await request.json().catch(() => ({}))
    if (!body.event_id) return NextResponse.json({ error: 'event_id é obrigatório' }, { status: 400 })
    if (!body.person_id) return NextResponse.json({ error: 'person_id é obrigatório' }, { status: 400 })

    const supabase = createSupabaseAdminClient(request)

    const payload = {
      event_id: body.event_id,
      person_id: body.person_id,
      leader_person_id: body.leader_person_id ?? null,
      status: body.status ?? 'inscrito',
      notes: body.notes ?? null,
    }

    // Upsert pelo unique (event_id, person_id)
    const { data, error } = await supabase
      .from('revisao_vidas_registrations')
      .upsert(payload, { onConflict: 'event_id,person_id' })
      .select()
      .single()

    if (error) {
      console.error('POST revisao/registrations:', error)
      return NextResponse.json({ error: 'Erro ao inscrever pessoa' }, { status: 500 })
    }

    // Atualizar followup se person_id tiver um
    const { data: followup } = await supabase
      .from('consolidation_followups')
      .select('id')
      .eq('person_id', body.person_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (followup) {
      // Buscar data de início do evento
      const { data: event } = await supabase
        .from('revisao_vidas_events')
        .select('start_date')
        .eq('id', body.event_id)
        .single()

      await supabase
        .from('consolidation_followups')
        .update({
          status: 'inscrito_revisao',
          next_review_event_id: body.event_id,
          next_review_date: event?.start_date ?? null,
        })
        .eq('id', followup.id)
    }

    return NextResponse.json({ item: data }, { status: 201 })
  } catch (err) {
    console.error('POST /api/admin/consolidacao/revisao/registrations:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
