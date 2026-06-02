import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

/**
 * POST /api/admin/modules/access/create-person
 * Cria um cadastro mínimo de pessoa para fins de liberação de acesso.
 * Body: { full_name: string, email: string }
 */
export async function POST(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'usuarios', action: 'edit' })
  if (!access.ok) return access.response

  const body = await request.json().catch(() => ({}))
  const fullName = ((body.full_name as string) ?? '').trim()
  const email    = ((body.email    as string) ?? '').trim()

  if (!fullName) return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
  if (!email)    return NextResponse.json({ error: 'E-mail é obrigatório' }, { status: 400 })

  const supabase = createSupabaseAdminClient(request)

  // Verifica se já existe pessoa com esse e-mail
  const { data: existing } = await supabase
    .from('people')
    .select('id, full_name, email')
    .ilike('email', email)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ person: existing, existingFound: true })
  }

  const { data: person, error } = await supabase
    .from('people')
    .insert({
      full_name:        fullName,
      email:            email,
      church_profile:   'Visitante',
      church_situation: 'Ativo',
    })
    .select('id, full_name, email')
    .single()

  if (error) {
    console.error('create-person for access:', error)
    return NextResponse.json({ error: 'Erro ao criar cadastro de pessoa.' }, { status: 500 })
  }

  return NextResponse.json({ person })
}
