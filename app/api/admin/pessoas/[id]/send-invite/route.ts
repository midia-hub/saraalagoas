import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

type RouteContext = {
  params: Promise<{ id: string }>
}

/**
 * POST /api/admin/pessoas/[id]/send-invite
 * Envia convite de cadastro para um email, vinculado a uma pessoa
 * Body: { email: string }
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const access = await requireAccess(request, { pageKey: 'pessoas', action: 'manage' })
  if (!access.ok) return access.response

  try {
    const { id: personId } = await context.params
    if (!personId) {
      return NextResponse.json({ error: 'ID da pessoa obrigatório' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const email = (body.email ?? '').trim()
    if (!email) {
      return NextResponse.json({ error: 'E-mail é obrigatório' }, { status: 400 })
    }

    const supabaseAdmin = createSupabaseAdminClient(request)

    // Verificar se a pessoa existe
    const { data: person, error: personError } = await supabaseAdmin
      .from('people')
      .select('id, full_name, email')
      .eq('id', personId)
      .single()

    if (personError || !person) {
      return NextResponse.json({ error: 'Pessoa não encontrada' }, { status: 404 })
    }

    // Verificar se o email já está registrado em uma conta Supabase
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const redirectTo = `${appUrl.replace(/\/$/, '')}/admin/completar-cadastro?person_id=${personId}`

    // Usar o admin SDK do Supabase para enviar convite
    const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: {
        person_id: personId,
        person_name: person.full_name,
      },
    })

    if (inviteError) {
      console.error('Erro ao enviar convite:', inviteError)
      if (
        inviteError.message.includes('already') ||
        inviteError.message.includes('User already registered')
      ) {
        return NextResponse.json(
          { error: 'Este e-mail já está registrado. O usuário pode fazer login normalmente.' },
          { status: 400 }
        )
      }
      return NextResponse.json({ error: 'Erro ao enviar convite: ' + inviteError.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      message: `Convite enviado para ${email}. O usuário receberá um link para completar o cadastro.`,
    })
  } catch (err) {
    console.error('POST pessoas/[id]/send-invite:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
