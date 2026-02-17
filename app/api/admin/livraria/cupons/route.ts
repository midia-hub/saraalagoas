import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

/** GET - lista cupons */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'livraria_cupons', action: 'view' })
  if (!access.ok) return access.response
  try {
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('active') !== 'false'
    const search = searchParams.get('search')?.trim() || ''

    const supabase = createSupabaseAdminClient(request)
    let q = supabase
      .from('bookstore_coupons')
      .select('id, code, description, discount_type, discount_value, min_purchase, valid_from, valid_until, usage_limit, used_count, active, created_at')
      .order('created_at', { ascending: false })

    if (activeOnly) q = q.eq('active', true)
    if (search) q = q.or(`code.ilike.%${search}%,description.ilike.%${search}%`)

    const { data, error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ items: data ?? [] })
  } catch (err) {
    console.error('GET livraria/cupons:', err)
    return NextResponse.json({ error: 'Erro ao listar cupons' }, { status: 500 })
  }
}

/** POST - criar cupom */
export async function POST(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'livraria_cupons', action: 'create' })
  if (!access.ok) return access.response
  try {
    const body = await request.json().catch(() => ({}))
    const code = (body.code && String(body.code).trim().toUpperCase()) || ''
    if (!code) return NextResponse.json({ error: 'Código do cupom é obrigatório.' }, { status: 400 })

    const discountType = body.discount_type === 'percent' ? 'percent' : 'value'
    const discountValue = Math.max(0, Number(body.discount_value) || 0)
    if (discountType === 'percent' && discountValue > 100) {
      return NextResponse.json({ error: 'Porcentagem não pode ser maior que 100.' }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient(request)
    const { data: existing } = await supabase
      .from('bookstore_coupons')
      .select('id')
      .ilike('code', code)
      .maybeSingle()
    if (existing) return NextResponse.json({ error: 'Já existe um cupom com este código.' }, { status: 400 })

    const row = {
      code,
      description: body.description ? String(body.description).trim() || null : null,
      discount_type: discountType,
      discount_value: discountValue,
      min_purchase: Math.max(0, Number(body.min_purchase) || 0),
      valid_from: body.valid_from ? new Date(body.valid_from).toISOString() : null,
      valid_until: body.valid_until ? new Date(body.valid_until).toISOString() : null,
      usage_limit: body.usage_limit != null ? (Number(body.usage_limit) > 0 ? Math.floor(Number(body.usage_limit)) : null) : null,
      active: body.active !== false,
    }

    const { data, error } = await supabase.from('bookstore_coupons').insert(row).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (err) {
    console.error('POST livraria/cupons:', err)
    return NextResponse.json({ error: 'Erro ao criar cupom' }, { status: 500 })
  }
}
