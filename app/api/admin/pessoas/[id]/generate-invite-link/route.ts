import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

type RouteContext = { params: Promise<{ id: string }> }

/**
 * POST /api/admin/pessoas/[id]/generate-invite-link
 * Gera link de cadastro sem enviar e-mail.
 * Body: { email: string, profile?: string }
 * Retorna: { link } ou { linkedExisting: true, message }
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const access = await requireAccess(request, { pageKey: 'usuarios', action: 'edit' })
  if (!access.ok) return access.response

  const { id: personId } = await context.params
  if (!personId) return NextResponse.json({ error: 'ID da pessoa obrigatório' }, { status: 400 })

  const body = await request.json().catch(() => ({}))
  const email   = ((body.email   as string) ?? '').trim()
  const profile = ((body.profile as string) ?? '').trim()

  if (!email) return NextResponse.json({ error: 'E-mail é obrigatório' }, { status: 400 })

  const supabase = createSupabaseAdminClient(request)

  const { data: person } = await supabase
    .from('people')
    .select('id, full_name, email')
    .eq('id', personId)
    .maybeSingle()

  if (!person) return NextResponse.json({ error: 'Pessoa não encontrada' }, { status: 404 })

  // Se já existe perfil com esse e-mail → apenas vincular
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id, person_id')
    .ilike('email', email)
    .maybeSingle()

  if (existingProfile?.id) {
    if (existingProfile.person_id !== personId) {
      await supabase
        .from('profiles')
        .update({ person_id: personId, updated_at: new Date().toISOString() })
        .eq('id', existingProfile.id)
    }
    return NextResponse.json({
      linkedExisting: true,
      message: `Usuário com e-mail ${email} já possui conta e foi vinculado ao cadastro.`,
    })
  }

  // Gera link de convite sem enviar e-mail
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const redirectTo = `${appUrl.replace(/\/$/, '')}/admin/completar-cadastro?person_id=${personId}`

  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'invite',
    email,
    options: {
      redirectTo,
      data: { person_id: personId, person_name: person.full_name, profile },
    },
  })

  if (linkError) {
    console.error('generate-invite-link error:', linkError)
    if (linkError.message.includes('already') || linkError.message.includes('User already registered')) {
      return NextResponse.json({ error: 'Este e-mail já está registrado no sistema.' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erro ao gerar link: ' + linkError.message }, { status: 500 })
  }

  const link = (linkData as any)?.properties?.action_link as string | undefined
  if (!link) return NextResponse.json({ error: 'Link não pôde ser gerado.' }, { status: 500 })

  return NextResponse.json({ link })
}
