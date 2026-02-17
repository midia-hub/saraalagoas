import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

/** PATCH - Fecha uma sessão de caixa (fechamento de caixa). */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireAccess(request, { pageKey: 'livraria_pdv', action: 'create' })
  if (!access.ok) return access.response

  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: 'id da sessão é obrigatório.' }, { status: 400 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const closing_balance = body.closing_balance != null ? Number(body.closing_balance) : null
    const notes = body.notes != null ? String(body.notes).trim() : null

    const supabase = createSupabaseAdminClient(request)
    const { data: session, error: fetchError } = await supabase
      .from('livraria_caixa_sessao')
      .select('id, status')
      .eq('id', id)
      .single()

    if (fetchError || !session) {
      return NextResponse.json({ error: 'Sessão não encontrada.' }, { status: 404 })
    }
    if ((session as { status: string }).status === 'CLOSED') {
      return NextResponse.json({ error: 'Esta sessão já está fechada.' }, { status: 400 })
    }

    const { data: updated, error: updateError } = await supabase
      .from('livraria_caixa_sessao')
      .update({
        status: 'CLOSED',
        closed_at: new Date().toISOString(),
        ...(closing_balance != null && { closing_balance }),
        ...(notes != null && { notes }),
      })
      .eq('id', id)
      .select(`
        id, pos_id, opened_at, closed_at, opening_balance, closing_balance, status, notes,
        pos:livraria_mp_pos(id, name)
      `)
      .single()

    if (updateError) {
      console.error('livraria_caixa_sessao update:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }
    return NextResponse.json(updated)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('PATCH livraria/mercadopago/sessoes/[id]:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
