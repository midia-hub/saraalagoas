import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

function normalizeLinkType(raw: string): 'culto' | 'arena' | 'evento' | null {
  if (raw === 'culto' || raw === 'arena' || raw === 'evento') return raw
  return null
}

export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'view' })
  if (!access.ok) return access.response

  try {
    const churchId = request.nextUrl.searchParams.get('church_id') ?? ''
    const supabase = createSupabaseAdminClient(request)

    let query = supabase
      .from('media_agenda_items')
      .select(`
        id,
        church_id,
        link_type,
        worship_service_id,
        arena_id,
        event_id,
        notes,
        send_to_media,
        created_at,
        churches(name),
        worship_services(name),
        arenas(name),
        media_agenda_events(name)
      `)
      .order('created_at', { ascending: false })

    if (churchId) query = query.eq('church_id', churchId)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: 'Erro ao listar agenda.' }, { status: 500 })

    const items = (data ?? []).map((row: any) => {
      const linkLabel =
        row.link_type === 'culto'
          ? row.worship_services?.name
          : row.link_type === 'arena'
            ? row.arenas?.name
            : row.media_agenda_events?.name

      return {
        id: row.id,
        churchId: row.church_id,
        churchName: row.churches?.name ?? 'Igreja',
        linkType: row.link_type,
        linkId: row.worship_service_id || row.arena_id || row.event_id,
        linkLabel: linkLabel ?? 'Vínculo sem nome',
        sendToMedia: !!row.send_to_media,
        notes: row.notes ?? '',
      }
    })

    return NextResponse.json({ items })
  } catch {
    return NextResponse.json({ error: 'Erro interno ao listar agenda.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'create' })
  if (!access.ok) return access.response

  try {
    const body = await request.json().catch(() => ({}))
    const churchId = String(body.churchId ?? '').trim()
    const linkType = normalizeLinkType(String(body.linkType ?? ''))
    const linkId = String(body.linkId ?? '').trim()
    const sendToMedia = body.sendToMedia !== false
    const notes = String(body.notes ?? '').trim()

    if (!churchId) return NextResponse.json({ error: 'Igreja é obrigatória.' }, { status: 400 })
    if (!linkType) return NextResponse.json({ error: 'Tipo de vínculo inválido.' }, { status: 400 })
    if (!linkId) return NextResponse.json({ error: 'Vínculo é obrigatório.' }, { status: 400 })

    const payload: Record<string, unknown> = {
      church_id: churchId,
      link_type: linkType,
      notes,
      send_to_media: sendToMedia,
      created_by: access.snapshot.userId,
      worship_service_id: null,
      arena_id: null,
      event_id: null,
    }

    if (linkType === 'culto') payload.worship_service_id = linkId
    if (linkType === 'arena') payload.arena_id = linkId
    if (linkType === 'evento') payload.event_id = linkId

    const supabase = createSupabaseAdminClient(request)

    const insertRes = await supabase
      .from('media_agenda_items')
      .insert(payload)
      .select(`
        id,
        church_id,
        link_type,
        worship_service_id,
        arena_id,
        event_id,
        notes,
        send_to_media,
        churches(name),
        worship_services(name),
        arenas(name),
        media_agenda_events(name)
      `)
      .single()

    if (insertRes.error || !insertRes.data) {
      return NextResponse.json({ error: 'Não foi possível criar o item de agenda.' }, { status: 500 })
    }

    const row: any = insertRes.data
    const linkLabel =
      linkType === 'culto'
        ? row.worship_services?.name
        : linkType === 'arena'
          ? row.arenas?.name
          : row.media_agenda_events?.name

    if (sendToMedia) {
      await supabase.from('media_demands').insert({
        source_type: 'agenda',
        church_id: churchId,
        agenda_item_id: row.id,
        event_id: row.event_id,
        title: `Demanda da agenda: ${linkLabel ?? 'Item sem nome'}`,
        description: notes || 'Demanda gerada automaticamente pelo item de agenda.',
        status: 'pendente',
        created_by: access.snapshot.userId,
      })
    }

    const item = {
      id: row.id,
      churchId: row.church_id,
      churchName: row.churches?.name ?? 'Igreja',
      linkType,
      linkId,
      linkLabel: linkLabel ?? 'Vínculo sem nome',
      sendToMedia: !!row.send_to_media,
      notes: row.notes ?? '',
    }

    return NextResponse.json({ item }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro interno ao criar item de agenda.' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'delete' })
  if (!access.ok) return access.response

  try {
    const id = request.nextUrl.searchParams.get('id') ?? ''
    if (!id) return NextResponse.json({ error: 'ID do item é obrigatório.' }, { status: 400 })

    const supabase = createSupabaseAdminClient(request)
    const { error } = await supabase.from('media_agenda_items').delete().eq('id', id)
    if (error) return NextResponse.json({ error: 'Erro ao excluir item de agenda.' }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Erro interno ao excluir item de agenda.' }, { status: 500 })
  }
}
