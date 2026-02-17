import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

/** GET - Lista sessões de caixa (abertas e fechadas). ?pos_id= para filtrar por caixa. ?aberta_por_mim=1 retorna só a sessão aberta pelo usuário atual (para PDV). */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'livraria_pdv', action: 'view' })
  if (!access.ok) return access.response
  const supabase = createSupabaseAdminClient(request)
  const { searchParams } = new URL(request.url)
  const posId = searchParams.get('pos_id')
  const abertaPorMim = searchParams.get('aberta_por_mim') === '1' || searchParams.get('aberta_por_mim') === 'true'
  const userId = access.snapshot?.userId ?? null

  const selectFields = `
    id, pos_id, opened_at, closed_at, opening_balance, closing_balance, status, notes, opened_by, opened_by_name, created_at,
    pos:livraria_mp_pos(id, name, external_id, store:livraria_mp_store(name))
  `

  if (abertaPorMim && userId) {
    const { data: row, error } = await supabase
      .from('livraria_caixa_sessao')
      .select(selectFields)
      .eq('opened_by', userId)
      .eq('status', 'OPENED')
      .order('opened_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) {
      console.error('GET livraria/mercadopago/sessoes (aberta_por_mim):', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(row ?? null)
  }

  let query = supabase
    .from('livraria_caixa_sessao')
    .select(selectFields)
    .order('opened_at', { ascending: false })

  if (posId) query = query.eq('pos_id', posId)
  const { data, error } = await query
  if (error) {
    console.error('GET livraria/mercadopago/sessoes:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data ?? [])
}

/** POST - Abre uma sessão de caixa (abertura de caixa). */
export async function POST(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'livraria_pdv', action: 'create' })
  if (!access.ok) return access.response

  try {
    const body = await request.json().catch(() => ({}))
    const pos_id = body.pos_id ? String(body.pos_id).trim() : null
    const opening_balance = body.opening_balance != null ? Number(body.opening_balance) : 0

    if (!pos_id) {
      return NextResponse.json({ error: 'pos_id é obrigatório (id do caixa na plataforma).' }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient(request)

    const { data: openSession } = await supabase
      .from('livraria_caixa_sessao')
      .select('id')
      .eq('pos_id', pos_id)
      .eq('status', 'OPENED')
      .maybeSingle()

    if (openSession) {
      return NextResponse.json(
        { error: 'Já existe uma sessão aberta para este caixa. Feche-a antes de abrir outra.' },
        { status: 400 }
      )
    }

    const userId = access.snapshot?.userId ?? null
    const openedByName = body.opened_by_name != null ? String(body.opened_by_name).trim() || null : null
    const { data: row, error: insertError } = await supabase
      .from('livraria_caixa_sessao')
      .insert({
        pos_id,
        opening_balance,
        status: 'OPENED',
        ...(userId && { opened_by: userId }),
        ...(openedByName && { opened_by_name: openedByName }),
      })
      .select(`
        id, pos_id, opened_at, opening_balance, status, opened_by, opened_by_name,
        pos:livraria_mp_pos(id, name, external_id)
      `)
      .single()

    if (insertError) {
      console.error('livraria_caixa_sessao insert:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }
    return NextResponse.json(row)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('POST livraria/mercadopago/sessoes:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
