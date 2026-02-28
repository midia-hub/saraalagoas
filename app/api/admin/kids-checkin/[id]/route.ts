import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { MESSAGE_ID_KIDS_CHECKOUT, sendDisparoRaw, getNomeExibicao } from '@/lib/disparos-webhook'

/**
 * PATCH /api/admin/kids-checkin/[id]
 * Registra checkout ou atualiza notas
 *
 * DELETE /api/admin/kids-checkin/[id]
 * Remove um check-in
 */

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireAccess(request, { pageKey: 'pessoas', action: 'edit' })
  if (!access.ok) return access.response

  const { id } = await params
  const body = await request.json()

  const supabase = createSupabaseAdminClient(request)

  const updates: Record<string, unknown> = {}
  if ('checked_out_at' in body) updates.checked_out_at = body.checked_out_at
  if ('notes' in body) updates.notes = body.notes
  if ('delivered_to_id' in body) updates.delivered_to_id = body.delivered_to_id ?? null
  if ('delivered_to_name' in body) updates.delivered_to_name = body.delivered_to_name ?? null

  const { data, error } = await supabase
    .from('kids_checkin')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('[kids-checkin PATCH]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // ── Envio automático de WhatsApp ──────────────────────────────────────────
  if (body.checked_out_at && data.guardian_id) {
    const { data: people, error: pError } = await supabase
      .from('people')
      .select('id, full_name, sex, mobile_phone, phone')
      .in('id', [data.child_id, data.guardian_id])

    const child = people?.find((p) => p.id === data.child_id)
    const guardian = people?.find((p) => p.id === data.guardian_id)

    const phone = guardian?.mobile_phone || guardian?.phone
    if (phone && !pError) {
      const sex = child?.sex?.toUpperCase() || ''
      const prefix = sex.startsWith('F') ? 'a ' : sex.startsWith('M') ? 'o ' : ''
      const now = new Date()
      // Envia disparo assíncrono (sem await para não travar a resposta da API)
      sendDisparoRaw({
        phone,
        messageId: MESSAGE_ID_KIDS_CHECKOUT,
        variables: {
          responsavel_nome: getNomeExibicao(guardian.full_name),
          crianca_nome: `${prefix}${getNomeExibicao(child?.full_name || '—')}`,
          culto_nome: data.service_name || 'Culto Sara Kids',
          data: now.toLocaleDateString('pt-BR'),
          hora_checkout: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        },
      }).then(result => {
        if (result) {
          supabase.from('disparos_log').insert({
            phone,
            nome: guardian.full_name,
            status_code: result.statusCode ?? null,
            source: 'kids',
            conversion_type: 'kids_checkout',
          }).then(({ error }) => { if (error) console.error('disparos_log kids_checkout:', error) })
        }
      }).catch(err => console.error('[kids-checkin PATCH WhatsApp Error]', err))
    }
  }

  return NextResponse.json({ checkin: data })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireAccess(request, { pageKey: 'pessoas', action: 'delete' })
  if (!access.ok) return access.response

  const { id } = await params
  const supabase = createSupabaseAdminClient(request)

  const { error } = await supabase
    .from('kids_checkin')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('[kids-checkin DELETE]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
