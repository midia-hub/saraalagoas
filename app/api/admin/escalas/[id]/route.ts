import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

type Params = { params: { id: string } }

/** GET /api/admin/escalas/[id]  – detalhe + slots + respostas resumidas */
export async function GET(request: NextRequest, { params }: Params) {
  const access = await requireAccess(request, { pageKey: 'escalas', action: 'view' })
  if (!access.ok) return access.response

  const supabase = createSupabaseAdminClient(request)

  const [{ data: link }, { data: slots }, { data: respostas }] = await Promise.all([
    supabase
      .from('escalas_links')
      .select('id, token, ministry, month, year, label, status, church:churches(id, name)')
      .eq('id', params.id)
      .single(),
    supabase
      .from('escalas_slots')
      .select('id, type, label, date, time_of_day, source_id, sort_order')
      .eq('link_id', params.id)
      .order('sort_order'),
    supabase
      .from('escalas_respostas')
      .select('person_id, slot_id, disponivel, observacao')
      .eq('link_id', params.id),
  ])

  if (!link) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  return NextResponse.json({ link, slots: slots ?? [], respostas: respostas ?? [] })
}

/** PATCH /api/admin/escalas/[id]  – altera status (active/closed) ou label */
export async function PATCH(request: NextRequest, { params }: Params) {
  const access = await requireAccess(request, { pageKey: 'escalas', action: 'edit' })
  if (!access.ok) return access.response

  const body = await request.json().catch(() => ({}))
  const supabase = createSupabaseAdminClient(request)

  const update: Record<string, unknown> = {}
  if (body.status) update.status = body.status
  if ('label' in body) update.label = body.label

  const { data, error } = await supabase
    .from('escalas_links')
    .update(update)
    .eq('id', params.id)
    .select('id, status, label')
    .single()

  if (error) return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 })
  return NextResponse.json({ link: data })
}

/** DELETE /api/admin/escalas/[id] */
export async function DELETE(request: NextRequest, { params }: Params) {
  const access = await requireAccess(request, { pageKey: 'escalas', action: 'delete' })
  if (!access.ok) return access.response

  const supabase = createSupabaseAdminClient(request)
  await supabase.from('escalas_links').delete().eq('id', params.id)
  return NextResponse.json({ ok: true })
}
