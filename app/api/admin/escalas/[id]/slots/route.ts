import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

type Params = { params: { id: string } }

/** GET /api/admin/escalas/[id]/slots  – lista slots */
export async function GET(request: NextRequest, { params }: Params) {
  const access = await requireAccess(request, { pageKey: 'escalas', action: 'view' })
  if (!access.ok) return access.response

  const supabase = createSupabaseAdminClient(request)
  const { data, error } = await supabase
    .from('escalas_slots')
    .select('id, type, label, date, time_of_day, source_id, sort_order')
    .eq('link_id', params.id)
    .order('sort_order')

  if (error) return NextResponse.json({ error: 'Erro ao listar slots' }, { status: 500 })
  return NextResponse.json({ slots: data ?? [] })
}

/** POST /api/admin/escalas/[id]/slots  – adiciona evento customizado */
export async function POST(request: NextRequest, { params }: Params) {
  const access = await requireAccess(request, { pageKey: 'escalas', action: 'edit' })
  if (!access.ok) return access.response

  const body = await request.json().catch(() => ({}))
  if (!body.label || !body.date) {
    return NextResponse.json({ error: 'Nome e data são obrigatórios' }, { status: 400 })
  }

  const supabase = createSupabaseAdminClient(request)

  // Determina sort_order máximo
  const { data: maxRow } = await supabase
    .from('escalas_slots')
    .select('sort_order')
    .eq('link_id', params.id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  const nextOrder = (maxRow?.sort_order ?? -1) + 1

  const { data, error } = await supabase
    .from('escalas_slots')
    .insert({
      link_id: params.id,
      type: 'evento',
      label: (body.label as string).trim(),
      date: body.date as string,
      time_of_day: (body.time_of_day as string) ?? '19:00',
      source_id: null,
      sort_order: nextOrder,
    })
    .select('id, type, label, date, time_of_day, sort_order')
    .single()

  if (error) return NextResponse.json({ error: 'Erro ao adicionar slot' }, { status: 500 })
  return NextResponse.json({ slot: data }, { status: 201 })
}
