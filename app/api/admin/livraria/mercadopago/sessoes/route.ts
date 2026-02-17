import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

/** GET - Lista sessões de caixa (abertas e fechadas). ?pos_id= para filtrar por caixa. */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'livraria_pdv', action: 'view' })
  if (!access.ok) return access.response
  const supabase = createSupabaseAdminClient(request)
  const { searchParams } = new URL(request.url)
  const posId = searchParams.get('pos_id')

  let query = supabase
    .from('livraria_caixa_sessao')
    .select(`
      id, pos_id, opened_at, closed_at, opening_balance, closing_balance, status, notes, created_at,
      pos:livraria_mp_pos(id, name, external_id, store:livraria_mp_store(name))
    `)
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

    const { data: row, error: insertError } = await supabase
      .from('livraria_caixa_sessao')
      .insert({
        pos_id,
        opening_balance,
        status: 'OPENED',
      })
      .select(`
        id, pos_id, opened_at, opening_balance, status,
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
