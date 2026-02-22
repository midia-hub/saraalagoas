import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

/**
 * POST /api/admin/users/make-admin
 * Atribui permissão de admin a um usuário pelo email
 * Body: { email: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const email = typeof body?.email === 'string' ? body.email.toLowerCase().trim() : ''
    
    if (!email) {
      return NextResponse.json({ error: 'Email é obrigatório' }, { status: 400 })
    }

    // Buscar o usuário pelo email
    const { data: profile, error: profileError } = await supabaseServer
      .from('profiles')
      .select('id, email, role_id, person_id')
      .eq('email', email)
      .maybeSingle()

    if (profileError) {
      console.error('Erro ao buscar profile:', profileError)
      return NextResponse.json({ error: 'Erro ao buscar usuário' }, { status: 500 })
    }

    if (!profile) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Garantir que o usuário tem person_id
    if (!profile.person_id) {
      return NextResponse.json(
        { error: 'Este usuário precisa estar vinculado a uma Pessoa antes de receber acesso de administrador.' },
        { status: 400 }
      )
    }

    // Buscar a role de admin
    const { data: adminRole, error: roleError } = await supabaseServer
      .from('roles')
      .select('id, name, key')
      .eq('key', 'admin')
      .maybeSingle()

    if (roleError) {
      console.error('Erro ao buscar role admin:', roleError)
      return NextResponse.json({ error: 'Erro ao buscar role de admin' }, { status: 500 })
    }

    if (!adminRole) {
      return NextResponse.json(
        { error: 'Role de admin não encontrada no sistema' },
        { status: 400 }
      )
    }

    // Atualizar o profile com a role de admin
    const { error: updateError } = await supabaseServer
      .from('profiles')
      .update({
        role_id: adminRole.id,
        role: 'editor',
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id)

    if (updateError) {
      console.error('Erro ao atribuir admin:', updateError)
      return NextResponse.json({ error: updateError.message || 'Erro ao atribuir acesso' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `${email} agora é administrador do sistema`,
      profile: {
        id: profile.id,
        email: profile.email,
        role_id: adminRole.id,
      }
    })
  } catch (err) {
    console.error('POST /api/admin/users/make-admin error:', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
