import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

/**
 * GET /api/admin/celulas
 * Lista as células
 */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'celulas', action: 'view' })
  if (!access.ok) return access.response

  const { searchParams } = new URL(request.url)
  const churchId = searchParams.get('church_id')
  const status = searchParams.get('status')

  const supabase = createSupabaseAdminClient(request)

  const buildQuery = (withLt: boolean) => {
    let q = supabase
      .from('cells')
      .select(withLt ? `
        *,
        church:churches(id, name),
        leader:people!leader_person_id(id, full_name),
        co_leader:people!co_leader_person_id(id, full_name),
        lt:people!lt_person_id(id, full_name)
      ` : `
        *,
        church:churches(id, name),
        leader:people!leader_person_id(id, full_name),
        co_leader:people!co_leader_person_id(id, full_name)
      `)
      .order('name', { ascending: true })
    if (churchId) q = q.eq('church_id', churchId)
    if (status)   q = q.eq('status', status)
    return q
  }

  let { data, error } = await buildQuery(true)

  // Fallback: se lt_person_id ainda não existe no banco (migration pendente)
  if (error && error.message?.includes('lt_person_id')) {
    ;({ data, error } = await buildQuery(false))
  }

  if (error) {
    console.error('Erro ao buscar células:', error)
    return NextResponse.json({ error: 'Erro ao buscar células.' }, { status: 500 })
  }

  return NextResponse.json({ items: data || [] })
}

/**
 * POST /api/admin/celulas
 * Cria uma nova célula
 */
export async function POST(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'celulas', action: 'create' })
  if (!access.ok) return access.response

  try {
    const body = await request.json()
    const supabase = createSupabaseAdminClient(request)

    // Filtrar apenas campos permitidos
    const allowedFields = [
      'church_id', 'name', 'day_of_week', 'time_of_day', 'frequency',
      'leader_person_id', 'co_leader_person_id', 'lt_person_id', 'cep', 'street',
      'address_number', 'neighborhood', 'city', 'state', 'latitude', 'longitude', 'status'
    ]

    const payload: Record<string, any> = {
      created_by: access.snapshot.userId,
      updated_by: access.snapshot.userId,
    }

    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        let value = body[field]
        // Converter latitude/longitude para número
        if ((field === 'latitude' || field === 'longitude') && value !== '') {
          value = parseFloat(value)
          if (isNaN(value)) value = null
        }
        // Converter strings vazias para null
        if (value === '') value = null
        payload[field] = value
      }
    })

    const { data, error } = await supabase
      .from('cells')
      .insert(payload)
      .select()
      .single()

    if (error) {
      console.error('Erro ao criar célula:', error)
      return NextResponse.json({ error: 'Erro ao criar célula.' }, { status: 500 })
    }

    return NextResponse.json({ item: data })
  } catch (err) {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
  }
}
