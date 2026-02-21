import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { canAccessPerson } from '@/lib/people-access'

const REGISTRATION_SELECT = 'id, event_id, person_id, leader_person_id, status, notes, created_at, updated_at, anamnese_token, anamnese_completed, anamnese_completed_at, pre_revisao_aplicado, payment_status, payment_date, payment_method, amount, payment_notes, payment_validated_by, payment_validated_at'

function generateAnamneseToken() {
  return `${crypto.randomUUID().replace(/-/g, '')}${Date.now().toString(36)}`
}

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
      .select(REGISTRATION_SELECT)
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

    const missingTokens = registrations
      .filter((r: Record<string, unknown>) => !r.anamnese_token || String(r.anamnese_token).trim() === '')
      .map((r: Record<string, unknown>) => r.id as string)

    if (missingTokens.length > 0) {
      await Promise.all(missingTokens.map(async (id) => {
        await supabase
          .from('revisao_vidas_registrations')
          .update({ anamnese_token: generateAnamneseToken() })
          .eq('id', id)
      }))

      const { data: refreshed } = await supabase
        .from('revisao_vidas_registrations')
        .select(REGISTRATION_SELECT)
        .in('id', registrations.map((r: Record<string, unknown>) => r.id as string))

      if (refreshed?.length) {
        refreshed.sort((a, b) => new Date(String(b.created_at)).getTime() - new Date(String(a.created_at)).getTime())
        registrations.splice(0, registrations.length, ...refreshed)
      }
    }

    // Enriquecer com dados de pessoa
    const pids = [...new Set(registrations.map((r: Record<string, string>) => r.person_id).filter(Boolean))]
    const ldIds = [...new Set(registrations.map((r: Record<string, string | null>) => r.leader_person_id).filter(Boolean))]
    const evIds = [...new Set(registrations.map((r: Record<string, string>) => r.event_id).filter(Boolean))]

    const { data: people } = await supabase
      .from('people')
      .select('id, full_name, mobile_phone, email, avatar_url')
      .in('id', pids)

    const { data: leaders } = ldIds.length > 0
      ? await supabase.from('people').select('id, full_name').in('id', ldIds)
      : { data: [] }

    const { data: events } = evIds.length > 0
      ? await supabase.from('revisao_vidas_events').select('id, name, start_date, end_date, active, church_id').in('id', evIds)
      : { data: [] }

    const peopleMap = new Map((people ?? []).map((p: Record<string, string>) => [p.id, p]))
    const leaderMap = new Map((leaders ?? []).map((l: Record<string, string>) => [l.id, l]))
    const eventMap = new Map((events ?? []).map((ev: Record<string, string>) => [ev.id, ev]))

    const [{ data: anamneseRows }, { data: conversions }] = await Promise.all([
      registrations.length > 0
        ? supabase
            .from('revisao_vidas_anamneses')
            .select('registration_id, photo_url, form_data')
            .in('registration_id', registrations.map((r: Record<string, unknown>) => r.id as string))
        : Promise.resolve({ data: [] }),
      pids.length > 0
        ? supabase
            .from('conversoes')
            .select('person_id, team_id, created_at')
            .in('person_id', pids)
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [] }),
    ])

    const latestConversionByPerson = new Map<string, Record<string, unknown>>()
    for (const conv of (conversions ?? []) as Array<Record<string, unknown>>) {
      const pid = conv.person_id as string | null
      if (!pid || latestConversionByPerson.has(pid)) continue
      latestConversionByPerson.set(pid, conv)
    }

    const teamIds = [...new Set(
      Array.from(latestConversionByPerson.values())
        .map((conv) => conv.team_id as string | null)
        .filter(Boolean)
    )] as string[]

    const { data: teams } = teamIds.length > 0
      ? await supabase.from('teams').select('id, name').in('id', teamIds)
      : { data: [] }

    const teamMap = new Map((teams ?? []).map((team: Record<string, string>) => [team.id, team.name]))

    const anamneseMap = new Map((anamneseRows ?? []).map((row: Record<string, unknown>) => [
      row.registration_id as string,
      row,
    ]))

    // Calcular status dinâmico para cada registro
    const statusMap = new Map<string, string>()
    for (const reg of registrations) {
      const { data: statusResult, error: statusError } = await supabase
        .rpc('calculate_revisao_registration_status', { registration_id: reg.id as string })
      
      if (!statusError && statusResult) {
        statusMap.set(reg.id as string, statusResult)
      }
    }

    const items = registrations.map((r: Record<string, unknown>) => {
      const person = peopleMap.get(r.person_id as string) ?? null
      const anamnese = anamneseMap.get(r.id as string)
      const formData = (anamnese?.form_data && typeof anamnese.form_data === 'object')
        ? anamnese.form_data as Record<string, unknown>
        : null
      const formName = typeof formData?.name === 'string' ? formData.name.trim() : ''
      const questions = formData?.questions && typeof formData.questions === 'object'
        ? formData.questions as Record<string, Record<string, unknown>>
        : {}

      const fallbackPerson = person ?? {
        id: r.person_id as string,
        full_name: formName || '—',
        mobile_phone: null,
        email: null,
        avatar_url: null,
      }

      return {
        ...(r as Record<string, unknown>),
        ...r,
        calculated_status: statusMap.get(r.id as string) || r.status,
        person: fallbackPerson,
        leader: r.leader_person_id ? leaderMap.get(r.leader_person_id as string) ?? null : null,
        event: eventMap.get(r.event_id as string) ?? null,
        person_name: person?.full_name ?? formName ?? null,
        team_name: (() => {
          const conv = latestConversionByPerson.get(r.person_id as string)
          const teamId = conv?.team_id as string | null | undefined
          return teamId ? teamMap.get(teamId) ?? null : null
        })(),
        anamnese_photo_url: (() => {
          if (!anamnese) return null
          return (anamnese.photo_url as string | null) ?? null
        })(),
        anamnese_alert_count: Object.values(questions).filter((q) => q?.answer === 'sim').length,
      }
    })

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
    if (typeof body.pre_revisao_aplicado !== 'boolean') {
      return NextResponse.json({ error: 'pre_revisao_aplicado é obrigatório (true/false)' }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient(request)

    const leaderId = access.snapshot.personId
    if (!leaderId) {
      return NextResponse.json({ error: 'Líder responsável não identificado.' }, { status: 403 })
    }

    const hasLeadershipAccess = await canAccessPerson(access.snapshot, body.person_id)
    if (!hasLeadershipAccess) {
      return NextResponse.json({ error: 'Somente líderes na linha de discipulado podem inscrever.' }, { status: 403 })
    }

    const payload = {
      event_id: body.event_id,
      person_id: body.person_id,
      leader_person_id: leaderId,
      anamnese_token: generateAnamneseToken(),
      anamnese_completed: false,
      anamnese_completed_at: null,
      status: body.status ?? 'inscrito',
      notes: body.notes ?? null,
      pre_revisao_aplicado: body.pre_revisao_aplicado ?? false,
      payment_status: 'pending',
    }

    // Upsert pelo unique (event_id, person_id)
    const { data, error } = await supabase
      .from('revisao_vidas_registrations')
      .upsert(payload, { onConflict: 'event_id,person_id' })
      .select(REGISTRATION_SELECT)
      .single()

    if (error) {
      console.error('POST revisao/registrations:', error)
      return NextResponse.json({ error: 'Erro ao inscrever pessoa' }, { status: 500 })
    }

    // Atualizar followup se person_id tiver um
    const { data: followupToUpdate } = await supabase
      .from('consolidation_followups')
      .select('id')
      .eq('person_id', body.person_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (followupToUpdate) {
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
        .eq('id', followupToUpdate.id)
    }

    return NextResponse.json({ item: data }, { status: 201 })
  } catch (err) {
    console.error('POST /api/admin/consolidacao/revisao/registrations:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
