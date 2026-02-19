import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

type Ctx = { params: Promise<{ id: string }> }

/**
 * DELETE /api/admin/celulas/attendance/[id]
 * Remove um registro de presença específico
 */
export async function DELETE(request: NextRequest, ctx: Ctx) {
  const access = await requireAccess(request, { pageKey: 'celulas', action: 'edit' })
  if (!access.ok) return access.response

  const { id } = await ctx.params

  if (!id) {
    return NextResponse.json({ error: 'ID da presença é obrigatório.' }, { status: 400 })
  }

  try {
    const supabase = createSupabaseAdminClient(request)

    // Deletar o registro de presença
    const { error } = await supabase
      .from('cell_attendances')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Erro ao deletar presença:', error)
      return NextResponse.json({ error: 'Erro ao deletar presença.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/admin/celulas/attendance/[id]:', err)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
