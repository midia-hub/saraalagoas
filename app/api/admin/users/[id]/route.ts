import { NextRequest, NextResponse } from 'next/server'
import { getAccessSnapshotFromRequest, hasPermission } from '@/lib/rbac'
import { supabaseServer } from '@/lib/supabase-server'
import { createSupabaseServiceClient } from '@/lib/supabase-server'

type RouteContext = { params: { id: string } }

/**
 * GET /api/admin/users/[id]
 * Retorna dados do usuário para edição
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const snapshot = await getAccessSnapshotFromRequest(request)
    if (!hasPermission(snapshot, 'usuarios', 'view')) {
      return NextResponse.json(
        { error: 'Sem permissão para visualizar usuários' },
        { status: 403 }
      )
    }

    const { id } = params
    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })
    }

    const { data: profile, error } = await supabaseServer
      .from('profiles')
      .select('id, email, full_name, role_id, created_at')
      .eq('id', id)
      .maybeSingle()

    if (error || !profile) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ user: profile })
  } catch (error) {
    console.error('Erro ao buscar usuário:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/users/[id]
 * Atualiza informações do usuário (ex.: full_name)
 */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const snapshot = await getAccessSnapshotFromRequest(request)
    if (!hasPermission(snapshot, 'usuarios', 'edit')) {
      return NextResponse.json(
        { error: 'Sem permissão para editar usuários' },
        { status: 403 }
      )
    }

    const { id } = params
    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const updates: { full_name?: string } = {}
    if (typeof body.full_name === 'string') {
      updates.full_name = body.full_name.trim() || null
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'Nenhum campo válido para atualizar' },
        { status: 400 }
      )
    }

    const { data: updated, error } = await supabaseServer
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Erro ao atualizar usuário:', error)
      return NextResponse.json({ error: 'Erro ao atualizar usuário' }, { status: 500 })
    }

    return NextResponse.json({ user: updated })
  } catch (error) {
    console.error('Erro ao processar requisição:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/users/[id]
 * Remove o usuário (auth + profile em cascata)
 */
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const snapshot = await getAccessSnapshotFromRequest(request)
    if (!hasPermission(snapshot, 'usuarios', 'delete')) {
      return NextResponse.json(
        { error: 'Sem permissão para excluir usuários' },
        { status: 403 }
      )
    }

    const { id } = params
    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })
    }

    const supabaseAdmin = createSupabaseServiceClient()
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(id)

    if (deleteError) {
      console.error('Erro ao excluir usuário:', deleteError)
      const msg =
        deleteError.message?.toLowerCase().includes('owner') ||
        deleteError.message?.toLowerCase().includes('storage')
          ? 'Não foi possível excluir: usuário pode ser dono de arquivos no Storage. Remova ou reassigne os itens primeiro.'
          : 'Erro ao excluir usuário.'
      return NextResponse.json({ error: msg }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Usuário excluído' })
  } catch (error) {
    console.error('Erro ao processar requisição:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
