import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

/**
 * GET /api/admin/consolidacao/revisao/anamneses
 *  ?event_id=   (filtra por evento)
 *  ?person_id=  (filtra por pessoa)
 *  ?q=          (busca por nome)
 */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'consolidacao', action: 'view' })
  if (!access.ok) return access.response

  try {
    const supabase = createSupabaseAdminClient(request)
    const sp = request.nextUrl.searchParams
    const eventId = sp.get('event_id') ?? ''
    const personId = sp.get('person_id') ?? ''
    const q = sp.get('q') ?? ''

    let query = supabase
      .from('revisao_vidas_anamneses')
      .select(
        'id, registration_id, event_id, person_id, form_data, photo_url, liability_accepted, submitted_at, created_at, updated_at'
      )
      .order('submitted_at', { ascending: false })

    if (eventId) query = query.eq('event_id', eventId)
    if (personId) query = query.eq('person_id', personId)

    const { data: anamneses, error } = await query
    if (error) {
      console.error('GET revisao/anamneses:', error)
      return NextResponse.json({ error: 'Erro ao listar anamneses.' }, { status: 500 })
    }

    if (!anamneses || anamneses.length === 0) {
      return NextResponse.json({ anamneses: [] })
    }

    // Enriquecer com pessoa, evento e secretário
    const pids = [...new Set(anamneses.map((a) => a.person_id).filter(Boolean))]
    const eids = [...new Set(anamneses.map((a) => a.event_id).filter(Boolean))]

    const [{ data: people }, { data: events }] = await Promise.all([
      pids.length > 0
        ? supabase.from('people').select('id, full_name, mobile_phone, blood_type').in('id', pids)
        : Promise.resolve({ data: [] }),
      eids.length > 0
        ? supabase.from('revisao_vidas_events').select('id, name, start_date').in('id', eids)
        : Promise.resolve({ data: [] }),
    ])

    const personMap = Object.fromEntries((people ?? []).map((p) => [p.id, p]))
    const eventMap = Object.fromEntries((events ?? []).map((e) => [e.id, e]))

    let enriched = anamneses.map((a) => ({
      ...a,
      person: a.person_id ? personMap[a.person_id] ?? null : null,
      event: a.event_id ? eventMap[a.event_id] ?? null : null,
    }))

    // Filtro por nome (client-side após join)
    if (q.trim()) {
      const lower = q.toLowerCase()
      enriched = enriched.filter(
        (a) =>
          a.person?.full_name?.toLowerCase().includes(lower) ||
          ((a.form_data as any)?.name ?? '').toLowerCase().includes(lower)
      )
    }

    return NextResponse.json({ anamneses: enriched })
  } catch (err) {
    console.error('GET revisao/anamneses error:', err)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
