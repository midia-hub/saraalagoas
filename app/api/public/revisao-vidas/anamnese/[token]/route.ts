import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { createDefaultAnamneseData, normalizeAnamneseData, validateRequiredAnamnese } from '@/lib/revisao-anamnese'

export async function GET(request: NextRequest, { params }: { params: { token: string } }) {
  try {
    const token = (params.token ?? '').trim()
    if (!token) {
      return NextResponse.json({ error: 'Token inválido.' }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient(request)

    const { data: registration, error: regError } = await supabase
      .from('revisao_vidas_registrations')
      .select('id, event_id, person_id, leader_person_id, anamnese_completed_at, leader_name, team')
      .eq('anamnese_token', token)
      .maybeSingle()

    if (regError || !registration) {
      return NextResponse.json({ error: 'Link inválido ou expirado.' }, { status: 404 })
    }

    const [{ data: person }, { data: leader }, { data: event }, { data: anamnese }, { data: personConversion }, { data: leaderTeamLink }] = await Promise.all([
      registration.person_id
        ? supabase.from('people').select('id, full_name, mobile_phone, blood_type, metadata').eq('id', registration.person_id).maybeSingle()
        : Promise.resolve({ data: null }),
      registration.leader_person_id
        ? supabase.from('people').select('id, full_name').eq('id', registration.leader_person_id).maybeSingle()
        : Promise.resolve({ data: null }),
      registration.event_id
        ? supabase.from('revisao_vidas_events').select('id, name, start_date').eq('id', registration.event_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from('revisao_vidas_anamneses')
        .select('form_data, photo_url, liability_accepted, submitted_at')
        .eq('registration_id', registration.id)
        .maybeSingle(),
      registration.person_id
        ? supabase
            .from('conversoes')
            .select('team_id')
            .eq('person_id', registration.person_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      registration.leader_person_id
        ? supabase
            .from('team_leaders')
            .select('team_id')
            .eq('person_id', registration.leader_person_id)
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ])

    const personTeamId = (personConversion as { team_id?: string | null } | null)?.team_id ?? null
    const leaderTeamId = (leaderTeamLink as { team_id?: string | null } | null)?.team_id ?? null

    const [{ data: personTeam }, { data: leaderTeam }] = await Promise.all([
      personTeamId
        ? supabase.from('teams').select('id, name').eq('id', personTeamId).maybeSingle()
        : Promise.resolve({ data: null }),
      leaderTeamId
        ? supabase.from('teams').select('id, name').eq('id', leaderTeamId).maybeSingle()
        : Promise.resolve({ data: null }),
    ])

    const metadataAnamnese = (person?.metadata && typeof person.metadata === 'object')
      ? (person.metadata as Record<string, unknown>).revisao_vidas_anamnese
      : null

    const normalized = normalizeAnamneseData(anamnese?.form_data ?? metadataAnamnese)
    const data = {
      ...createDefaultAnamneseData(),
      ...normalized,
      name: normalized.name || person?.full_name || '',
      phone: normalized.phone || person?.mobile_phone || '',
      bloodType: normalized.bloodType || person?.blood_type || '',
      leader: normalized.leader || registration.leader_name || leader?.full_name || '',
      team: normalized.team || registration.team || personTeam?.name || leaderTeam?.name || '',
      photoUrl: normalized.photoUrl || anamnese?.photo_url || '',
    }

    return NextResponse.json({
      registrationId: registration.id,
      eventName: event?.name ?? 'Revisão de Vidas',
      eventDate: event?.start_date ?? null,
      anamneseCompletedAt: registration.anamnese_completed_at,
      liabilityAccepted: !!anamnese?.liability_accepted,
      data,
    })
  } catch (error) {
    console.error('GET public revisao anamnese:', error)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { token: string } }) {
  try {
    const token = (params.token ?? '').trim()
    if (!token) {
      return NextResponse.json({ error: 'Token inválido.' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const liabilityAccepted = !!body?.liabilityAccepted
    const data = normalizeAnamneseData(body?.data)

    const requiredError = validateRequiredAnamnese(data)
    if (requiredError) {
      return NextResponse.json({ error: requiredError }, { status: 400 })
    }

    if (!liabilityAccepted) {
      return NextResponse.json({ error: 'Confirme a responsabilidade pelas informações para enviar.' }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient(request)

    const { data: registration, error: regError } = await supabase
      .from('revisao_vidas_registrations')
      .select('id, event_id, person_id')
      .eq('anamnese_token', token)
      .maybeSingle()

    if (regError || !registration) {
      return NextResponse.json({ error: 'Link inválido ou expirado.' }, { status: 404 })
    }

    const nowIso = new Date().toISOString()
    const payload = {
      registration_id: registration.id,
      event_id: registration.event_id,
      person_id: registration.person_id,
      form_data: data,
      photo_url: data.photoUrl || null,
      liability_accepted: true,
      submitted_at: nowIso,
    }

    const { error: saveError } = await supabase
      .from('revisao_vidas_anamneses')
      .upsert(payload, { onConflict: 'registration_id' })

    if (saveError) {
      console.error('POST public revisao anamnese save:', saveError)
      return NextResponse.json({ error: 'Erro ao salvar formulário.' }, { status: 500 })
    }

    await supabase
      .from('revisao_vidas_registrations')
      .update({ anamnese_completed_at: nowIso })
      .eq('id', registration.id)

    if (registration.person_id) {
      const { data: personRow } = await supabase
        .from('people')
        .select('id, metadata')
        .eq('id', registration.person_id)
        .maybeSingle()

      if (personRow?.id) {
        const currentMetadata = (personRow.metadata && typeof personRow.metadata === 'object')
          ? personRow.metadata as Record<string, unknown>
          : {}

        const nextMetadata = {
          ...currentMetadata,
          revisao_vidas_anamnese: {
            ...data,
            liabilityAccepted: true,
            submittedAt: nowIso,
            registrationId: registration.id,
            eventId: registration.event_id,
          },
        }

        const personUpdates: Record<string, unknown> = { metadata: nextMetadata }

        const trimmedName = data.name.trim()
        const trimmedPhone = data.phone.trim()
        const trimmedBloodType = data.bloodType.trim()

        if (trimmedName) personUpdates.full_name = trimmedName
        if (trimmedPhone) personUpdates.mobile_phone = trimmedPhone
        if (trimmedBloodType) personUpdates.blood_type = trimmedBloodType

        await supabase
          .from('people')
          .update(personUpdates)
          .eq('id', registration.person_id)
      }
    }

    return NextResponse.json({ ok: true, submittedAt: nowIso })
  } catch (error) {
    console.error('POST public revisao anamnese:', error)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
