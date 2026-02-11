import { NextRequest, NextResponse } from 'next/server'
import { getAccessSnapshotFromRequest, hasPermission } from '@/lib/rbac'
import { supabaseServer } from '@/lib/supabase-server'

/**
 * GET /api/admin/resources
 * Lista todos os recursos do sistema
 */
export async function GET(request: NextRequest) {
  try {
    const snapshot = await getAccessSnapshotFromRequest(request)

    if (!hasPermission(snapshot, 'roles', 'view')) {
      return NextResponse.json(
        { error: 'Sem permissão para visualizar recursos' },
        { status: 403 }
      )
    }

    const { data: resources, error } = await supabaseServer
      .from('resources')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Erro ao buscar recursos:', error)
      return NextResponse.json({ error: 'Erro ao buscar recursos' }, { status: 500 })
    }

    return NextResponse.json({ resources: resources || [] })
  } catch (error) {
    console.error('Erro ao processar requisição:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
