import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

type RouteContext = { params: Promise<{ id: string }> }

/**
 * GET /api/admin/celulas/[id]
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const access = await requireAccess(request, { pageKey: 'celulas', action: 'view' })
  if (!access.ok) return access.response

  const { id } = await context.params
  const supabase = createSupabaseAdminClient(request)

  const { data, error } = await supabase
    .from('cells')
    .select(`
      *,
      church:churches(id, name),
      leader:people!leader_person_id(id, full_name),
      co_leader:people!co_leader_person_id(id, full_name),
      members:cell_lt_members(
        person:people(id, full_name)
      )
    `)
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('Erro ao buscar célula:', error)
    return NextResponse.json({ error: 'Erro ao buscar célula.' }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'Célula não encontrada.' }, { status: 404 })
  }

  return NextResponse.json({ item: data })
}

/**
 * PATCH /api/admin/celulas/[id]
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const access = await requireAccess(request, { pageKey: 'celulas', action: 'edit' })
  if (!access.ok) return access.response

  const { id } = await context.params
  try {
    const body = await request.json()
    const supabase = createSupabaseAdminClient(request)

    // Filtrar apenas campos permitidos para evitar erro de coluna inexistente
    const allowedFields = [
      'church_id', 'name', 'day_of_week', 'time_of_day', 'frequency',
      'leader_person_id', 'co_leader_person_id', 'cep', 'street',
      'address_number', 'neighborhood', 'city', 'state', 'latitude', 'longitude', 'status'
    ]

    const nullableUuidFields = new Set([
      'church_id',
      'leader_person_id',
      'co_leader_person_id'
    ])

    const nullableNumericFields = new Set([
      'latitude',
      'longitude'
    ])
    
    const payload: Record<string, any> = {
      updated_by: access.snapshot.userId,
      updated_at: new Date().toISOString(),
    }

    allowedFields.forEach(field => {
      if (body[field] === undefined) return
      const value = body[field]
      if (nullableUuidFields.has(field) && value === '') {
        payload[field] = null
        return
      }
      if (nullableNumericFields.has(field) && value === '') {
        payload[field] = null
        return
      }
      payload[field] = value
    })

    const { data, error } = await supabase
      .from('cells')
      .update(payload)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Erro ao atualizar célula:', error)
      return NextResponse.json({ error: 'Erro ao atualizar célula.' }, { status: 500 })
    }

    return NextResponse.json({ item: data })
  } catch (err) {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
  }
}

/**
 * DELETE /api/admin/celulas/[id]
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const access = await requireAccess(request, { pageKey: 'celulas', action: 'delete' })
  if (!access.ok) return access.response

  const { id } = await context.params
  const supabase = createSupabaseAdminClient(request)

  const { error } = await supabase
    .from('cells')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Erro ao excluir célula:', error)
    return NextResponse.json({ error: 'Erro ao excluir célula.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
