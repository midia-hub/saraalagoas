import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

/**
 * PATCH  /api/admin/consolidacao/revisao/registrations/[id]
 * DELETE /api/admin/consolidacao/revisao/registrations/[id]
 */

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const access = await requireAccess(request, { pageKey: 'consolidacao', action: 'edit' })
  if (!access.ok) return access.response

  try {
    const body = await request.json().catch(() => ({}))
    const supabase = createSupabaseAdminClient(request)

    const allowed = ['status', 'notes', 'leader_person_id']
    const patch: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in body) patch[key] = body[key] === '' ? null : body[key]
    }

    const { data, error } = await supabase
      .from('revisao_vidas_registrations')
      .update(patch)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('PATCH revisao/registrations:', error)
      return NextResponse.json({ error: 'Erro ao atualizar inscrição' }, { status: 500 })
    }

    // Se concluiu, atualizar followup
    if (patch.status === 'concluiu' && data?.person_id) {
      const { data: followup } = await supabase
        .from('consolidation_followups')
        .select('id')
        .eq('person_id', data.person_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (followup) {
        await supabase
          .from('consolidation_followups')
          .update({ status: 'concluiu_revisao' })
          .eq('id', followup.id)
      }
    }

    return NextResponse.json({ item: data })
  } catch (err) {
    console.error('PATCH revisao/registrations [id]:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const access = await requireAccess(request, { pageKey: 'consolidacao', action: 'delete' })
  if (!access.ok) return access.response

  try {
    const supabase = createSupabaseAdminClient(request)
    const { error } = await supabase.from('revisao_vidas_registrations').delete().eq('id', params.id)
    if (error) {
      console.error('DELETE revisao/registrations:', error)
      return NextResponse.json({ error: 'Erro ao remover inscrição' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('DELETE revisao/registrations [id]:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
