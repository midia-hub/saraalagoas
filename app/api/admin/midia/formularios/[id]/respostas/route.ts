import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

type Params = { params: Promise<{ id: string }> }

const PAGE_SIZE = 20

export async function GET(request: NextRequest, { params }: Params) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'view' })
  if (!access.ok) return access.response

  const { id } = await params
  const db = createSupabaseAdminClient(request)
  const url = new URL(request.url)

  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10))
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')

  let query = db
    .from('formulario_respostas')
    .select('*', { count: 'exact' })
    .eq('formulario_id', id)
    .order('created_at', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

  if (from) query = query.gte('created_at', from)
  if (to) query = query.lte('created_at', to)

  const { data, error, count } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    items: data ?? [],
    total: count ?? 0,
    page,
    page_size: PAGE_SIZE,
  })
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'delete' })
  if (!access.ok) return access.response

  const { id } = await params
  const db = createSupabaseAdminClient(request)
  const body = (await request.json().catch(() => ({}))) as { resposta_id?: string }

  if (!body.resposta_id) {
    return NextResponse.json({ error: 'resposta_id é obrigatório.' }, { status: 400 })
  }

  const { error } = await db
    .from('formulario_respostas')
    .delete()
    .eq('id', body.resposta_id)
    .eq('formulario_id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
