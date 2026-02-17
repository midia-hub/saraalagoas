import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

/** GET - lista clientes com busca e filtros */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'livraria_clientes', action: 'view' })
  if (!access.ok) return access.response
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.trim() || ''
    const activeOnly = searchParams.get('active') !== 'false'
    const canCredit = searchParams.get('can_credit')
    const withPending = searchParams.get('with_pending') === 'true'
    const includeBalance = searchParams.get('include_balance') === 'true'

    const supabase = createSupabaseAdminClient(request)

    let q = supabase
      .from('bookstore_customers')
      .select(`
        id,
        name,
        phone,
        email,
        document,
        notes,
        can_buy_on_credit,
        credit_limit,
        active,
        created_at,
        updated_at
      `)
      .order('name')

    if (activeOnly) q = q.eq('active', true)
    if (canCredit === 'true') q = q.eq('can_buy_on_credit', true)
    if (canCredit === 'false') q = q.eq('can_buy_on_credit', false)

    if (search) {
      const term = `%${search}%`
      q = q.or(`name.ilike.${term},phone.ilike.${term},email.ilike.${term}`)
    }

    const { data: customers, error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    let list = (customers ?? []) as Array<{
      id: string
      name: string
      phone: string | null
      email: string | null
      can_buy_on_credit: boolean
      credit_limit: number
      active: boolean
      [k: string]: unknown
    }>

    let balanceMap = new Map<string, number>()
    if (withPending || includeBalance) {
      const { data: balanceRows } = await supabase.from('bookstore_customer_balance_view').select('customer_id, total_pendente')
      balanceMap = new Map((balanceRows ?? []).map((r: { customer_id: string; total_pendente: number }) => [r.customer_id, Number(r.total_pendente)]))
    }
    if (withPending) {
      list = list.filter((c) => (balanceMap.get(c.id) ?? 0) > 0)
    }
    if (includeBalance) {
      list = list.map((c) => ({ ...c, total_pendente: balanceMap.get(c.id) ?? 0 }))
    }

    return NextResponse.json({ items: list })
  } catch (err) {
    console.error('GET livraria/clientes:', err)
    return NextResponse.json({ error: 'Erro ao listar clientes' }, { status: 500 })
  }
}

/** POST - criar cliente */
export async function POST(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'livraria_clientes', action: 'create' })
  if (!access.ok) return access.response
  try {
    const body = await request.json().catch(() => ({}))
    const name = (body.name && String(body.name).trim()) || null
    if (!name) return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 })

    const supabase = createSupabaseAdminClient(request)
    const row = {
      name,
      phone: body.phone ? String(body.phone).trim() || null : null,
      email: body.email ? String(body.email).trim() || null : null,
      document: body.document ? String(body.document).trim() || null : null,
      notes: body.notes ? String(body.notes).trim() || null : null,
      can_buy_on_credit: !!body.can_buy_on_credit,
      credit_limit: Math.max(0, Number(body.credit_limit) || 0),
      active: body.active !== false,
    }

    const { data, error } = await supabase.from('bookstore_customers').insert(row).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (err) {
    console.error('POST livraria/clientes:', err)
    return NextResponse.json({ error: 'Erro ao criar cliente' }, { status: 500 })
  }
}
