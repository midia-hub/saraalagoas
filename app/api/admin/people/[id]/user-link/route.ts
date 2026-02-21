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
