import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

/** PATCH - cancelar reserva (status -> CANCELLED) */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireAccess(request, { pageKey: 'livraria_reservas', action: 'manage' })
  if (!access.ok) return access.response
  const { id } = await params
  try {
    const body = await request.json().catch(() => ({}))
    const action = body.action === 'cancel' ? 'cancel' : null

    if (action !== 'cancel') {
      return NextResponse.json({ error: 'Use action: "cancel" para cancelar a reserva.' }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient(request)
    const { data, error } = await supabase
      .from('bookstore_reservations')
      .update({ status: 'CANCELLED' })
      .eq('id', id)
      .in('status', ['OPEN'])
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) {
      return NextResponse.json({ error: 'Reserva não encontrada ou já está cancelada.' }, { status: 404 })
    }
    return NextResponse.json({ ok: true, reservation: data })
  } catch (err) {
    console.error('PATCH livraria/vendas/reservas/[id]:', err)
    return NextResponse.json({ error: 'Erro ao cancelar reserva' }, { status: 500 })
  }
}
