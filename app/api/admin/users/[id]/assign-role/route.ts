import { NextRequest, NextResponse } from 'next/server'
import { getAccessSnapshotFromRequest, hasPermission } from '@/lib/rbac'
import { supabaseServer } from '@/lib/supabase-server'

type RouteContext = {
  params: {
    id: string
  }
}

/**
 * POST /api/admin/users/[id]/assign-role
 * Atribui uma role a um usuário
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const snapshot = await getAccessSnapshotFromRequest(request)

    if (!hasPermission(snapshot, 'usuarios', 'edit')) {
      return NextResponse.json(
        { error: 'Sem permissão para editar usuários' },
        { status: 403 }
      )
    }

    const { id: userId } = params
    const { role_id } = await request.json()

    if (!role_id) {
      return NextResponse.json({ error: 'role_id é obrigatório' }, { status: 400 })
    }

    // Verificar se a role existe
    const { data: role, error: roleError } = await supabaseServer
      .from('roles')
      .select('id, name, is_active')
      .eq('id', role_id)
      .maybeSingle()

    if (roleError || !role) {
      return NextResponse.json({ error: 'Role não encontrada' }, { status: 404 })
    }

    if (!role.is_active) {
      return NextResponse.json({ error: 'Role está inativa' }, { status: 400 })
    }

    // Verificar se o usuário existe
    const { data: user, error: userError } = await supabaseServer
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle()

    if (userError || !user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Atualizar role do usuário
    const { data: updatedProfile, error: updateError } = await supabaseServer
      .from('profiles')
      .update({ role_id })
      .eq('id', userId)
      .select()
      .single()

    if (updateError) {
      console.error('Erro ao atribuir role:', updateError)
      return NextResponse.json({ error: 'Erro ao atribuir role' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      profile: updatedProfile,
      message: `Role "${role.name}" atribuída com sucesso`
    })
  } catch (error) {
    console.error('Erro ao processar requisição:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
