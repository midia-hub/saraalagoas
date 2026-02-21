import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

const REVISAO_EVENT_SELECT = 'id, name, church_id, start_date, end_date, active, secretary_person_id, created_at, updated_at'

/**
 * GET    /api/admin/consolidacao/revisao/events/[id]
 * PATCH  /api/admin/consolidacao/revisao/events/[id]
 * DELETE /api/admin/consolidacao/revisao/events/[id]
 */

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const access = await requireAccess(request, { pageKey: 'consolidacao', action: 'view' })
  if (!access.ok) return access.response

  try {
    const supabase = createSupabaseAdminClient(request)
    const { data: event, error } = await supabase
      .from('revisao_vidas_events')
      .select(REVISAO_EVENT_SELECT)
      .eq('id', params.id)
      .single()

    if (error || !event) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })

    // Enriquecer com dados do secretário
    let secretary = null
    if (event.secretary_person_id) {
      const { data: sec } = await supabase
        .from('people')
        .select('id, full_name, mobile_phone, email')
        .eq('id', event.secretary_person_id)
        .single()
      secretary = sec
    }

    return NextResponse.json({ item: { ...event, secretary } })
  } catch (err) {
    console.error('GET revisao/events [id]:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const access = await requireAccess(request, { pageKey: 'consolidacao', action: 'edit' })
  if (!access.ok) return access.response

  try {
    const body = await request.json().catch(() => ({}))
    const supabase = createSupabaseAdminClient(request)

    const allowed = ['name', 'church_id', 'start_date', 'end_date', 'active', 'secretary_person_id']
    const patch: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in body) patch[key] = body[key] === '' ? null : body[key]
    }
    if (patch.name) patch.name = String(patch.name).trim()

    const { data, error } = await supabase
      .from('revisao_vidas_events')
      .update(patch)
      .eq('id', params.id)
      .select(REVISAO_EVENT_SELECT)
      .single()

    if (error) {
      console.error('PATCH revisao/events:', error)
      return NextResponse.json({ error: 'Erro ao atualizar evento' }, { status: 500 })
    }
    return NextResponse.json({ item: data })
  } catch (err) {
    console.error('PATCH revisao/events [id]:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const access = await requireAccess(request, { pageKey: 'consolidacao', action: 'delete' })
  if (!access.ok) return access.response

  try {
    const supabase = createSupabaseAdminClient(request)
    const { error } = await supabase.from('revisao_vidas_events').delete().eq('id', params.id)
    if (error) {
      console.error('DELETE revisao/events:', error)
      return NextResponse.json({ error: 'Erro ao remover evento' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('DELETE revisao/events [id]:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
