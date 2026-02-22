import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { canAccessPerson } from '@/lib/people-access'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  const access = await requireAccess(request, { pageKey: 'pessoas', action: 'view' })
  if (!access.ok) return access.response

  const { id } = await context.params
  if (!id) {
    return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })
  }

  const allowed = await canAccessPerson(access.snapshot, id)
  if (!allowed) {
    return NextResponse.json({ error: 'Acesso negado para esta pessoa.' }, { status: 403 })
  }

  const supabase = createSupabaseAdminClient(request)

  const { data: person, error: personError } = await supabase
    .from('people')
    .select('id, email')
    .eq('id', id)
    .maybeSingle()

  if (personError) {
    console.error('GET people/[id]/user-link person error:', personError)
    return NextResponse.json({ error: 'Erro ao buscar pessoa.' }, { status: 500 })
  }

  if (!person) {
    return NextResponse.json({ error: 'Pessoa não encontrada.' }, { status: 404 })
  }

  const { data: linkedUser, error: linkedUserError } = await supabase
    .from('profiles')
    .select('id, email, full_name, person_id, role, role_id, access_profile_id')
    .eq('person_id', id)
    .maybeSingle()

  if (linkedUserError) {
    console.error('GET people/[id]/user-link linked profile error:', linkedUserError)
    return NextResponse.json({ error: 'Erro ao verificar vínculo de usuário.' }, { status: 500 })
  }

  let emailUser = null as null | {
    id: string
    email: string | null
    full_name: string | null
    person_id: string | null
    role: string | null
    role_id: string | null
    access_profile_id: string | null
  }

  if (!linkedUser && person.email?.trim()) {
    const { data: profileByEmail } = await supabase
      .from('profiles')
      .select('id, email, full_name, person_id, role, role_id, access_profile_id')
      .ilike('email', person.email.trim())
      .maybeSingle()

    emailUser = profileByEmail ?? null
  }

  return NextResponse.json({
    linked: !!linkedUser,
    user: linkedUser ?? null,
    emailUser,
  })
}

/**
 * PATCH /api/admin/people/[id]/user-link
 * Atualiza o perfil de acesso (role_id + access_profile_id) do usuário vinculado a esta pessoa.
 * Body: { role_id: string }
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const access = await requireAccess(request, { pageKey: 'usuarios', action: 'edit' })
  if (!access.ok) return access.response

  const { id } = await context.params
  if (!id) {
    return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })
  }

  const body = await request.json().catch(() => ({}))
  const { role_id } = body as { role_id: string | null }

  const supabase = createSupabaseAdminClient(request)

  // Verificar que o perfil vinculado existe
  const { data: linkedProfile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role_id, access_profile_id')
    .eq('person_id', id)
    .maybeSingle()

  if (profileError) {
    return NextResponse.json({ error: 'Erro ao buscar perfil vinculado.' }, { status: 500 })
  }
  if (!linkedProfile) {
    return NextResponse.json({ error: 'Nenhum usuário vinculado a esta pessoa.' }, { status: 404 })
  }

  // Buscar o access_profile_id correspondente ao role_id (pelo nome da role → access_profile)
  let newAccessProfileId: string | null = linkedProfile.access_profile_id
  if (role_id) {
    const { data: role } = await supabase
      .from('roles')
      .select('id, name')
      .eq('id', role_id)
      .maybeSingle()

    if (role) {
      const { data: ap } = await supabase
        .from('access_profiles')
        .select('id')
        .ilike('name', role.name)
        .maybeSingle()
      if (ap) newAccessProfileId = ap.id
    }
  } else {
    newAccessProfileId = null
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      role_id: role_id ?? null,
      access_profile_id: newAccessProfileId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', linkedProfile.id)

  if (updateError) {
    console.error('PATCH user-link update error:', updateError)
    return NextResponse.json({ error: 'Erro ao atualizar perfil de acesso.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
