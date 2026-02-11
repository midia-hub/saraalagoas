import { NextRequest, NextResponse } from 'next/server'
import { getAccessSnapshotFromRequest, hasPermission } from '@/lib/rbac'
import { supabaseServer } from '@/lib/supabase-server'

/**
 * GET /api/admin/app-permissions
 * Lista todas as funções nomeadas (app_permissions) do sistema
 */
export async function GET(request: NextRequest) {
  try {
    const snapshot = await getAccessSnapshotFromRequest(request)

    if (!hasPermission(snapshot, 'roles', 'view')) {
      return NextResponse.json(
        { error: 'Sem permissão para visualizar funções' },
        { status: 403 }
      )
    }

    const { data: appPermissions, error } = await supabaseServer
      .from('app_permissions')
      .select(
        `
        id,
        code,
        name,
        description,
        sort_order,
        is_active,
        resource_id,
        permission_id,
        resources ( key, name ),
        permissions ( action, name )
      `
      )
      .order('sort_order', { ascending: true })

    if (error) {
      const isMissingTable = error.code === '42P01' || error.message?.includes('does not exist')
      return NextResponse.json(
        {
          error: isMissingTable
            ? 'Tabela de funções (app_permissions) não encontrada. Aplique a migration das funções nomeadas.'
            : 'Erro ao buscar funções',
        },
        { status: isMissingTable ? 404 : 500 }
      )
    }

    return NextResponse.json({ app_permissions: appPermissions || [] })
  } catch (error) {
    console.error('Erro ao processar requisição:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
