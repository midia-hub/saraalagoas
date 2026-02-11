import { NextRequest, NextResponse } from 'next/server'
import { getAccessSnapshotFromRequest, hasPermission } from '@/lib/rbac'
import { supabaseServer } from '@/lib/supabase-server'
import { createSupabaseServiceClient } from '@/lib/supabase-server'

type RouteContext = { params: { id: string } }

/**
 * POST /api/admin/users/[id]/send-reset-password
 * Envia e-mail de redefinição de senha para o usuário (Supabase Auth recover)
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const snapshot = await getAccessSnapshotFromRequest(request)
    if (!hasPermission(snapshot, 'usuarios', 'edit')) {
      return NextResponse.json(
        { error: 'Sem permissão para gerenciar usuários' },
        { status: 403 }
      )
    }

    const { id } = params
    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })
    }

    const { data: profile, error: profileError } = await supabaseServer
      .from('profiles')
      .select('id, email')
      .eq('id', id)
      .maybeSingle()

    if (profileError || !profile?.email) {
      return NextResponse.json(
        { error: 'Usuário não encontrado ou sem e-mail' },
        { status: 404 }
      )
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.VERCEL_URL ||
      (request.nextUrl && `${request.nextUrl.protocol}//${request.nextUrl.host}`) ||
      'http://localhost:3000'
    const redirectTo = `${baseUrl.replace(/\/$/, '')}/redefinir-senha`

    const supabaseAdmin = createSupabaseServiceClient()
    const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(
      profile.email,
      { redirectTo }
    )

    if (resetError) {
      console.error('Erro ao enviar reset de senha:', resetError)
      return NextResponse.json(
        { error: 'Não foi possível enviar o e-mail de redefinição. Tente novamente.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'E-mail de redefinição de senha enviado.',
    })
  } catch (error) {
    console.error('Erro ao processar requisição:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
