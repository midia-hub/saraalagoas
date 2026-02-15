import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { personUpdateSchema } from '@/lib/validators/person'
import { normalizeCpf, normalizePhone, normalizeDate } from '@/lib/validators/person'

type RouteContext = { params: Promise<{ id: string }> }

/**
 * GET /api/admin/people/[id]
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const access = await requireAccess(request, { pageKey: 'pessoas', action: 'view' })
  if (!access.ok) return access.response

  const { id } = await context.params
  if (!id) {
    return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })
  }

  const supabase = createSupabaseAdminClient(request)
  const { data: person, error } = await supabase
    .from('people')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('Erro ao buscar pessoa:', error)
    return NextResponse.json({ error: 'Erro ao buscar pessoa' }, { status: 500 })
  }
  if (!person) {
    return NextResponse.json({ error: 'Pessoa não encontrada' }, { status: 404 })
  }

  return NextResponse.json({ person })
}

/**
 * PATCH /api/admin/people/[id]
 * Atualização parcial
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const access = await requireAccess(request, { pageKey: 'pessoas', action: 'edit' })
  if (!access.ok) return access.response

  const { id } = await context.params
  if (!id) {
    return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })
  }

  const body = await request.json().catch(() => ({}))
  const parsed = personUpdateSchema.safeParse(body)
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors
      ? Object.values(parsed.error.flatten().fieldErrors).flat().join('; ')
      : 'Dados inválidos'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const row = parsed.data
  const payload: Record<string, unknown> = {}

  if (row.full_name !== undefined) payload.full_name = row.full_name
  if (row.church_profile !== undefined) payload.church_profile = row.church_profile
  if (row.church_situation !== undefined) payload.church_situation = row.church_situation
  if (row.church_role !== undefined) payload.church_role = row.church_role ?? null
  if (row.sex !== undefined) payload.sex = row.sex ?? null
  if (row.birth_date !== undefined) payload.birth_date = normalizeDate(row.birth_date) ?? null
  if (row.marital_status !== undefined) payload.marital_status = row.marital_status ?? null
  if (row.marriage_date !== undefined) payload.marriage_date = normalizeDate(row.marriage_date) ?? null
  if (row.rg !== undefined) payload.rg = row.rg ?? null
  if (row.cpf !== undefined) payload.cpf = normalizeCpf(row.cpf) ?? null
  if (row.special_needs !== undefined) payload.special_needs = row.special_needs ?? null
  if (row.cep !== undefined) payload.cep = row.cep ?? null
  if (row.city !== undefined) payload.city = row.city ?? null
  if (row.state !== undefined) payload.state = row.state ?? null
  if (row.neighborhood !== undefined) payload.neighborhood = row.neighborhood ?? null
  if (row.address_line !== undefined) payload.address_line = row.address_line ?? null
  if (row.email !== undefined) payload.email = (row.email && String(row.email).trim()) ? String(row.email).trim() : null
  if (row.mobile_phone !== undefined) payload.mobile_phone = normalizePhone(row.mobile_phone) ?? null
  if (row.phone !== undefined) payload.phone = normalizePhone(row.phone) ?? null
  if (row.entry_by !== undefined) payload.entry_by = row.entry_by ?? null
  if (row.entry_date !== undefined) payload.entry_date = normalizeDate(row.entry_date) ?? null
  if (row.status_in_church !== undefined) payload.status_in_church = row.status_in_church ?? null
  if (row.conversion_date !== undefined) payload.conversion_date = normalizeDate(row.conversion_date) ?? null
  if (row.is_baptized !== undefined) payload.is_baptized = row.is_baptized ?? null
  if (row.baptism_date !== undefined) payload.baptism_date = normalizeDate(row.baptism_date) ?? null
  if (row.is_leader !== undefined) payload.is_leader = row.is_leader ?? null
  if (row.is_pastor !== undefined) payload.is_pastor = row.is_pastor ?? null
  if (row.education_level !== undefined) payload.education_level = row.education_level ?? null
  if (row.profession !== undefined) payload.profession = row.profession ?? null
  if (row.nationality !== undefined) payload.nationality = row.nationality ?? null
  if (row.birthplace !== undefined) payload.birthplace = row.birthplace ?? null
  if (row.interviewed_by !== undefined) payload.interviewed_by = row.interviewed_by ?? null
  if (row.registered_by !== undefined) payload.registered_by = row.registered_by ?? null
  if (row.blood_type !== undefined) payload.blood_type = row.blood_type ?? null

  if (Object.keys(payload).length === 0) {
    const supabase = createSupabaseAdminClient(request)
    const { data: person } = await supabase.from('people').select('*').eq('id', id).single()
    return NextResponse.json({ person: person || null })
  }

  const supabase = createSupabaseAdminClient(request)
  const { data: person, error } = await supabase
    .from('people')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'CPF já cadastrado para outra pessoa.' }, { status: 409 })
    }
    console.error('Erro ao atualizar pessoa:', error)
    return NextResponse.json({ error: 'Erro ao atualizar pessoa' }, { status: 500 })
  }

  return NextResponse.json({ person })
}

/**
 * DELETE /api/admin/people/[id]
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const access = await requireAccess(request, { pageKey: 'pessoas', action: 'delete' })
  if (!access.ok) return access.response

  const { id } = await context.params
  if (!id) {
    return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })
  }

  const supabase = createSupabaseAdminClient(request)
  const { error } = await supabase.from('people').delete().eq('id', id)

  if (error) {
    if (error.code === '23503') {
      return NextResponse.json(
        { error: 'Não é possível excluir: pessoa está vinculada a usuário ou conversões.' },
        { status: 409 }
      )
    }
    console.error('Erro ao excluir pessoa:', error)
    return NextResponse.json({ error: 'Erro ao excluir pessoa' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
