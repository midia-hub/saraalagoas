import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

type RouteContext = { params: Promise<{ id: string; personId: string }> }

/**
 * DELETE /api/admin/celulas/[id]/people/[personId]
 * Remove um membro ou visitante da célula
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const access = await requireAccess(request, { pageKey: 'celulas', action: 'edit' })
  if (!access.ok) return access.response

  const { id, personId } = await context.params

  if (!id || !personId) {
    return NextResponse.json({ error: 'IDs obrigatórios.' }, { status: 400 })
  }

  try {
    const supabase = createSupabaseAdminClient(request)

    // Deletar o relacionamento (personId é o cell_people.id)
    const { error } = await supabase
      .from('cell_people')
      .delete()
      .eq('id', personId)
      .eq('cell_id', id)

    if (error) {
      console.error('Erro ao remover pessoa da célula:', error)
      return NextResponse.json({ error: 'Erro ao remover pessoa.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/admin/celulas/[id]/people/[personId]:', err)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
