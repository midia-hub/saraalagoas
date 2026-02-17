import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { createStore } from '@/lib/payments/mercadopago/stores'
import type { StoreLocation, StoreBusinessHours } from '@/lib/payments/mercadopago/stores'

const UF_TO_STATE_NAME: Record<string, string> = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceará', DF: 'Distrito Federal',
  ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão', MT: 'Mato Grosso', MS: 'Mato Grosso do Sul', MG: 'Minas Gerais',
  PA: 'Pará', PB: 'Paraíba', PR: 'Paraná', PE: 'Pernambuco', PI: 'Piauí', RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte',
  RS: 'Rio Grande do Sul', RO: 'Rondônia', RR: 'Roraima', SC: 'Santa Catarina', SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins',
}

/** GET - Lista lojas cadastradas na plataforma (espelho do Mercado Pago). */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'livraria_pdv', action: 'view' })
  if (!access.ok) return access.response
  const supabase = createSupabaseAdminClient(request)
  const { data, error } = await supabase
    .from('livraria_mp_store')
    .select('id, mp_store_id, name, external_id, address_line, location, collector_id, created_at')
    .order('created_at', { ascending: false })
  if (error) {
    console.error('GET livraria/mercadopago/lojas:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data ?? [])
}

/**
 * POST - Cria uma loja no Mercado Pago e salva na plataforma.
 * Requer MERCADOPAGO_ACCESS_TOKEN e MERCADOPAGO_COLLECTOR_ID.
 */
export async function POST(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'livraria_pdv', action: 'create' })
  if (!access.ok) return access.response

  const userId = process.env.MERCADOPAGO_COLLECTOR_ID?.trim()
  if (!userId) {
    return NextResponse.json(
      {
        error:
          'MERCADOPAGO_COLLECTOR_ID não configurado. Defina o user_id da conta MP (em teste: Suas integrações > Credenciais de teste > Dados das credenciais de teste).',
      },
      { status: 503 }
    )
  }

  try {
    const body = await request.json().catch(() => ({}))
    const name = body.name ? String(body.name).trim() : null
    const location = body.location as StoreLocation | undefined
    const external_id = body.external_id != null ? String(body.external_id).trim() : undefined
    const business_hours = body.business_hours as Partial<
      Record<string, Array<{ open: string; close: string }>>
    > | undefined

    if (!name) {
      return NextResponse.json({ error: 'name é obrigatório.' }, { status: 400 })
    }
    if (!location || typeof location !== 'object') {
      return NextResponse.json(
        { error: 'location é obrigatório (street_number, street_name, city_name, state_name, latitude, longitude).' },
        { status: 400 }
      )
    }
    const { street_number, street_name, city_name, state_name, latitude, longitude } = location
    if (
      !street_name ||
      !city_name ||
      !state_name ||
      typeof latitude !== 'number' ||
      typeof longitude !== 'number'
    ) {
      return NextResponse.json(
        {
          error:
            'Preencha rua, cidade, estado, latitude e longitude. Use a busca por CEP na tela para preencher.',
        },
        { status: 400 }
      )
    }
    if (latitude === 0 && longitude === 0) {
      return NextResponse.json(
        { error: 'Informe uma localização válida (latitude e longitude diferentes de zero). Use a busca por CEP.' },
        { status: 400 }
      )
    }

    const stateNameStr = String(state_name).trim().toUpperCase()
    const stateNameForMp = UF_TO_STATE_NAME[stateNameStr] ?? String(state_name).trim()

    const store = await createStore(userId, {
      name,
      location: {
        street_number: String(street_number || 'S/N').trim() || 'S/N',
        street_name: String(street_name).trim(),
        city_name: String(city_name).trim(),
        state_name: stateNameForMp,
        latitude: Number(latitude),
        longitude: Number(longitude),
        reference: location.reference ? String(location.reference).trim() || undefined : undefined,
      },
      external_id: external_id || undefined,
      business_hours: business_hours as Partial<
        Record<'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday', StoreBusinessHours[]>
      > | undefined,
    })

    const supabase = createSupabaseAdminClient(request)
    const storedExternalId = store.external_id ?? external_id ?? null
    const { data: row, error: insertError } = await supabase
      .from('livraria_mp_store')
      .insert({
        mp_store_id: store.id,
        name: store.name,
        external_id: storedExternalId,
        address_line: store.location?.address_line ?? null,
        location: store.location ? { latitude: store.location.latitude, longitude: store.location.longitude, reference: store.location.reference } : null,
        collector_id: userId,
      })
      .select('id, mp_store_id, name, external_id, address_line, created_at')
      .single()

    if (insertError) console.error('livraria_mp_store insert:', insertError)
    return NextResponse.json({ ...store, platform_store_id: row?.id, platform: row })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('POST livraria/mercadopago/lojas:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
