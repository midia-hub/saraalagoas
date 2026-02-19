import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

type RouteContext = { params: Promise<{ id: string }> }

/**
 * GET /api/admin/celulas/[id]/people
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const access = await requireAccess(request, { pageKey: 'celulas', action: 'view' })
  if (!access.ok) return access.response

  const { id } = await context.params
  const supabase = createSupabaseAdminClient(request)

  const { data, error } = await supabase
    .from('cell_people')
    .select(`
      *,
      person:people(id, full_name)
    `)
    .eq('cell_id', id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Erro ao buscar pessoas da célula:', error)
    return NextResponse.json({ error: 'Erro ao buscar pessoas da célula.' }, { status: 500 })
  }

  return NextResponse.json({ items: data || [] })
}

/**
 * POST /api/admin/celulas/[id]/people
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const access = await requireAccess(request, { pageKey: 'celulas', action: 'edit' })
  if (!access.ok) return access.response

  const { id } = await context.params
  const supabase = createSupabaseAdminClient(request)

  try {
    const body = await request.json()
    const { person_id, full_name, phone, type } = body
    const normalizedName = typeof full_name === 'string' ? full_name.trim() : ''
    const normalizedPhone = typeof phone === 'string' ? phone.trim() : ''

    if (!person_id && !normalizedName) {
      return NextResponse.json({ error: 'full_name é obrigatório para visitante.' }, { status: 400 })
    }

    if (person_id) {
      const { data: existing, error: existingError } = await supabase
        .from('cell_people')
        .select(`*, person:people(id, full_name)`)
        .eq('cell_id', id)
        .eq('person_id', person_id)
        .maybeSingle()

      if (existingError) {
        return NextResponse.json({ error: 'Erro ao validar pessoa existente.' }, { status: 500 })
      }

      // Se já existe, permite atualizar o type se enviado
      if (existing) {
        if (type && type !== existing.type) {
          const { data: updated, error: updateError } = await supabase
            .from('cell_people')
            .update({ 
               type: type,
               updated_at: new Date().toISOString()
            })
            .eq('id', existing.id)
            .select(`*, person:people(id, full_name)`)
            .single()
            
          if (updateError) {
             console.error('Erro ao atualizar tipo do membro:', updateError)
             return NextResponse.json({ error: 'Erro ao atualizar tipo do membro.' }, { status: 500 })
          }
          return NextResponse.json({ item: updated })
        }
        return NextResponse.json({ item: existing })
      }
    }

    if (!person_id) {
      let visitorQuery = supabase
        .from('cell_people')
        .select(`*, person:people(id, full_name)`)
        .eq('cell_id', id)
        .ilike('full_name', normalizedName)
        .eq('status', 'active')

      if (normalizedPhone) {
        visitorQuery = visitorQuery.eq('phone', normalizedPhone)
      }

      const { data: existingVisitor, error: existingVisitorError } = await visitorQuery.maybeSingle()

      if (existingVisitorError) {
        return NextResponse.json({ error: 'Erro ao validar visitante existente.' }, { status: 500 })
      }

      if (existingVisitor) {
        return NextResponse.json({ item: existingVisitor })
      }
    }

    const payload = {
      cell_id: id,
      person_id: person_id || null,
      full_name: normalizedName || null,
      phone: normalizedPhone || null,
      type: 'visitor', // SEMPRE começa como visitante, obedecendo a regra de promoção automática
      status: 'active',
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('cell_people')
      .insert(payload)
      .select(`*, person:people(id, full_name)`)
      .single()

    if (error) {
      console.error('Erro ao criar pessoa da célula:', error)
      return NextResponse.json({ error: 'Erro ao criar pessoa da célula.' }, { status: 500 })
    }

    return NextResponse.json({ item: data })
  } catch (err) {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
  }
}

/**
 * PATCH /api/admin/celulas/[id]/people?personId=X
 * Atualiza um vínculo (ex.: promover para membro)
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const access = await requireAccess(request, { pageKey: 'celulas', action: 'edit' })
  if (!access.ok) return access.response

  const { id } = await (context as any).params
  const searchParams = request.nextUrl.searchParams
  const personId = searchParams.get('personId')

  if (!id || !personId) {
    return NextResponse.json({ error: 'Faltam parâmetros.' }, { status: 400 })
  }

  try {
    const body = await request.json()
    const { type, person_id } = body
    const supabase = createSupabaseAdminClient(request)

    const updateData: any = { updated_at: new Date().toISOString() }
    // Remoção da edição manual de tipo para obedecer a regra de promoção automática
    // if (type) updateData.type = type
    if (person_id) updateData.person_id = person_id

    const { data, error } = await supabase
      .from('cell_people')
      .update(updateData)
      .match({ id: personId, cell_id: id })
      .select(`*, person:people(id, full_name)`)
      .single()

    if (error) {
       return NextResponse.json({ error: `Erro ao atualizar vínculo: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ item: data })
  } catch (err: any) {
    return NextResponse.json({ error: `Falha na atualização: ${err.message}` }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/celulas/[id]/people?personId=X
 * Remove um membro ou visitante da célula
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const access = await requireAccess(request, { pageKey: 'celulas', action: 'edit' })
  if (!access.ok) return access.response

  const { id } = await (context as any).params
  const searchParams = request.nextUrl.searchParams
  const personId = searchParams.get('personId')

  if (!id || !personId) {
    return NextResponse.json({ error: 'Faltam parâmetros.' }, { status: 400 })
  }

  try {
    const supabase = createSupabaseAdminClient(request)

    // 1. Descobrir person_id para garantir limpeza total
    const { data: cp } = await supabase
      .from('cell_people')
      .select('person_id')
      .eq('id', personId)
      .maybeSingle()

    // 2. Limpar presenças por cell_person_id
    await supabase.from('cell_attendances').delete().eq('cell_person_id', personId)

    // 3. Limpar presenças por person_id (se disponível)
    if (cp?.person_id) {
      await supabase.from('cell_attendances').delete().match({ person_id: cp.person_id, cell_id: id })
    }

    // 4. Remover o vínculo final
    const { error } = await supabase.from('cell_people').delete().match({ id: personId, cell_id: id })

    if (error) {
       return NextResponse.json({ error: `Erro ao remover vínculo: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: `Falha na remoção: ${err.message}` }, { status: 500 })
  }
}
