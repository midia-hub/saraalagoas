import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireAccess(request, { pageKey: 'reservas', action: 'edit' })
  if (!access.ok) return access.response

  const { id } = await params
  const supabase = createSupabaseAdminClient(request)

  try {
    const { data: reservation, error: reservationError } = await supabase
      .from('room_reservations')
      .select('id, status')
      .eq('id', id)
      .maybeSingle()

    if (reservationError || !reservation) {
      return NextResponse.json({ error: 'Reserva nao encontrada' }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))
    const reason = (body?.reason ?? '').toString().trim() || null

    const { data: updated, error: updateError } = await supabase
      .from('room_reservations')
      .update({ status: 'cancelled', cancelled_reason: reason })
      .eq('id', id)
      .select('id, status, cancelled_reason')
      .single()

    if (updateError) {
      return NextResponse.json({ error: 'Erro ao cancelar reserva' }, { status: 500 })
    }

    return NextResponse.json({ success: true, reservation: updated })
  } catch (err) {
    console.error('cancel reservation exception:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
