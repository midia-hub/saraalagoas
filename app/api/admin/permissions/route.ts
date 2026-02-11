import { NextRequest, NextResponse } from 'next/server'
import { getAccessSnapshotFromRequest, hasPermission } from '@/lib/rbac'
import { supabaseServer } from '@/lib/supabase-server'

/**
 * GET /api/admin/permissions
 * Lista todas as permissões do sistema
 */
export async function GET(request: NextRequest) {
  try {
    const snapshot = await getAccessSnapshotFromRequest(request)

    if (!hasPermission(snapshot, 'roles', 'view')) {
      return NextResponse.json(
        { error: 'Sem permissão para visualizar permissões' },
        { status: 403 }
      )
    }

    const { data: permissions, error } = await supabaseServer
      .from('permissions')
      .select('*')
      .order('action', { ascending: true })

    if (error) {
      console.error('Erro ao buscar permissões:', error)
      return NextResponse.json({ error: 'Erro ao buscar permissões' }, { status: 500 })
    }

    return NextResponse.json({ permissions: permissions || [] })
  } catch (error) {
    console.error('Erro ao processar requisição:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
