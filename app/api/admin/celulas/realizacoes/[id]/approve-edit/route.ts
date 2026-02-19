import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { hasAppPermission } from '@/lib/rbac'
import { APP_PERMISSION_CODES } from '@/lib/rbac-types'

type RouteContext = { params: Promise<{ id: string }> }

/**
 * POST /api/admin/celulas/realizacoes/[id]/approve-edit
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const access = await requireAccess(request, { pageKey: 'celulas', action: 'edit' })
  if (!access.ok) return access.response

  if (!hasAppPermission(access.snapshot, APP_PERMISSION_CODES.CELLS_APPROVE_EDIT)) {
    return NextResponse.json({ error: 'Permissão insuficiente.' }, { status: 403 })
  }

  const { id } = await context.params
  const supabase = createSupabaseAdminClient(request)

  const { error } = await supabase
    .from('cell_realizations')
    .update({
      requires_approval: false,
      approval_status: 'approved',
      approved_by: access.snapshot.userId,
      approved_at: new Date().toISOString()
    })
    .eq('id', id)

  if (error) {
    console.error('Erro ao aprovar edição:', error)
    return NextResponse.json({ error: 'Erro ao aprovar edição.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
