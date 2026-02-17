import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

/** POST - Fecha a sessão de caixa aberta pelo usuário atual (fechamento ao sair da plataforma). */
export async function POST(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'livraria_pdv', action: 'create' })
  if (!access.ok) return access.response

  const userId = access.snapshot?.userId
  if (!userId) {
    return NextResponse.json({ error: 'Usuário não identificado.' }, { status: 401 })
  }

  try {
    const supabase = createSupabaseAdminClient(request)
    const body = await request.json().catch(() => ({}))
    const notes = body.notes != null ? String(body.notes).trim() : 'Fechamento automático ao sair da plataforma.'
    const now = new Date().toISOString()

    const { data: updated, error: updateError } = await supabase
      .from('livraria_caixa_sessao')
      .update({
        status: 'CLOSED',
        closed_at: now,
        notes: notes || 'Fechamento automático ao sair da plataforma.',
      })
      .eq('opened_by', userId)
      .eq('status', 'OPENED')
      .select('id')

    if (updateError) {
      console.error('close-mine update:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }
    const count = Array.isArray(updated) ? updated.length : (updated ? 1 : 0)
    return NextResponse.json({ ok: true, message: count > 0 ? `${count} sessão(ões) fechada(s).` : 'Nenhuma sessão aberta por você.' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('POST sessoes/close-mine:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
