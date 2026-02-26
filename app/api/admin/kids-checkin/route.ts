import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { MESSAGE_ID_KIDS_CHECKIN, sendDisparoRaw, getNomeExibicao } from '@/lib/disparos-webhook'

/**
 * GET /api/admin/kids-checkin
 * Lista os check-ins (filtrável por service_id e data)
 *
 * POST /api/admin/kids-checkin
 * Registra novo check-in de uma criança
 */

export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'pessoas', action: 'view' })
  if (!access.ok) return access.response

  const { searchParams } = new URL(request.url)
  const serviceId = searchParams.get('service_id')
  const date = searchParams.get('date') // YYYY-MM-DD

  const supabase = createSupabaseAdminClient(request)

  let query = supabase
    .from('kids_checkin')
    .select(
      `id, child_id, service_id, service_name, checked_in_at, checked_out_at,
       registered_by, registered_by_name, notes, guardian_id, guardian_name,
       delivered_to_id, delivered_to_name, created_at,
       child:people!child_id(id, full_name, birth_date),
       guardian:people!guardian_id(id, full_name, mobile_phone, phone)`
    )
    .order('checked_in_at', { ascending: false })
    .limit(200)

  if (serviceId) query = query.eq('service_id', serviceId)

  if (date) {
    const start = `${date}T00:00:00.000Z`
    const end = `${date}T23:59:59.999Z`
    query = query.gte('checked_in_at', start).lte('checked_in_at', end)
  }

  const { data, error } = await query

  if (error) {
    console.error('[kids-checkin GET]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ checkins: data ?? [] })
}

export async function POST(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'pessoas', action: 'create' })
  if (!access.ok) return access.response

  const body = await request.json()
  const { child_id, service_id, service_name, notes, guardian_id, guardian_name } = body

  if (!child_id || !service_id || !service_name) {
    return NextResponse.json(
      { error: 'Campos obrigatórios: child_id, service_id, service_name.' },
      { status: 400 }
    )
  }

  const { snapshot } = access
  const registered_by = snapshot.personId ?? null
  const registered_by_name = snapshot.displayName ?? snapshot.email ?? null

  const supabase = createSupabaseAdminClient(request)

  const { data, error } = await supabase
    .from('kids_checkin')
    .insert({
      child_id,
      service_id,
      service_name,
      notes: notes ?? null,
      guardian_id: guardian_id ?? null,
      guardian_name: guardian_name ?? null,
      registered_by,
      registered_by_name,
      checked_in_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error('[kids-checkin POST]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // ── Envio automático de WhatsApp ──────────────────────────────────────────
  if (guardian_id) {
    const { data: people, error: pError } = await supabase
      .from('people')
      .select('id, full_name, sex, mobile_phone, phone')
      .in('id', [child_id, guardian_id])

    const child = people?.find((p) => p.id === child_id)
    const guardian = people?.find((p) => p.id === guardian_id)

    const phone = guardian?.mobile_phone || guardian?.phone
    if (phone && !pError) {
      const sex = child?.sex?.toUpperCase() || ''
      const prefix = sex.startsWith('F') ? 'a ' : sex.startsWith('M') ? 'o ' : ''
      const now = new Date()
      // Envia disparo assíncrono (sem await para não travar a resposta da API)
      sendDisparoRaw({
        phone,
        messageId: MESSAGE_ID_KIDS_CHECKIN,
        variables: {
          responsavel_nome: getNomeExibicao(guardian.full_name),
          crianca_nome: `${prefix}${getNomeExibicao(child?.full_name || '—')}`,
          culto_nome: service_name || 'Culto Sara Kids',
          data: now.toLocaleDateString('pt-BR'),
          hora_checkin: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        },
      }).catch(err => console.error('[kids-checkin POST WhatsApp Error]', err))
    }
  }

  return NextResponse.json({ checkin: data }, { status: 201 })
}
