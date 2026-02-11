import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { supabaseServer } from '@/lib/supabase-server'

/**
 * Atualiza uma integração Meta (ex: reativar/desativar)
 * 
 * PATCH /api/meta/integrations/[id]
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'edit' })
  if (!access.ok) return access.response

  try {
    const body = await request.json().catch(() => ({}))
    const { is_active, show_in_list } = body

    const db = supabaseServer

    const updates: { is_active?: boolean; metadata?: Record<string, unknown>; updated_at: string } = {
      updated_at: new Date().toISOString(),
    }
    if (typeof is_active === 'boolean') updates.is_active = is_active

    if (typeof show_in_list === 'boolean') {
      const { data: current } = await db
        .from('meta_integrations')
        .select('metadata')
        .eq('id', params.id)
        .eq('created_by', access.snapshot.userId)
        .single()
      const metadata = { ...((current?.metadata as Record<string, unknown>) || {}), show_in_list }
      updates.metadata = metadata
    }

    if (Object.keys(updates).length <= 1) {
      return NextResponse.json({ error: 'Envie is_active e/ou show_in_list' }, { status: 400 })
    }

    const { data, error } = await db
      .from('meta_integrations')
      .update(updates)
      .eq('id', params.id)
      .eq('created_by', access.snapshot.userId)
      .select()
      .single()

    if (error) {
      throw new Error(`Erro ao atualizar integração: ${error.message}`)
    }

    return NextResponse.json({ integration: data })
  } catch (error) {
    console.error('Error updating integration:', error)
    const message = error instanceof Error ? error.message : 'Erro ao atualizar integração'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * Remove uma integração Meta
 * 
 * DELETE /api/meta/integrations/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'delete' })
  if (!access.ok) return access.response

  try {
    const db = supabaseServer

    const { error } = await db
      .from('meta_integrations')
      .delete()
      .eq('id', params.id)
      .eq('created_by', access.snapshot.userId)

    if (error) {
      throw new Error(`Erro ao remover integração: ${error.message}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting integration:', error)
    const message = error instanceof Error ? error.message : 'Erro ao remover integração'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
