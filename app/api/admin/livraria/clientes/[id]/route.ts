import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

/** GET - detalhe do cliente (com saldo da view) */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireAccess(request, { pageKey: 'livraria_clientes', action: 'view' })
  if (!access.ok) return access.response
  const { id } = await params
  if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  try {
    const supabase = createSupabaseAdminClient(request)
    const { data: customer, error } = await supabase
      .from('bookstore_customers')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !customer) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })

    const { data: balance } = await supabase
      .from('bookstore_customer_balance_view')
      .select('total_compras, total_pago, total_pendente, qtd_vendas, qtd_vendas_pendentes')
      .eq('customer_id', id)
      .single()

    return NextResponse.json({
      ...customer,
      balance: balance
        ? {
            total_compras: Number(balance.total_compras),
            total_pago: Number(balance.total_pago),
            total_pendente: Number(balance.total_pendente),
            qtd_vendas: Number(balance.qtd_vendas),
            qtd_vendas_pendentes: Number(balance.qtd_vendas_pendentes),
          }
        : { total_compras: 0, total_pago: 0, total_pendente: 0, qtd_vendas: 0, qtd_vendas_pendentes: 0 },
    })
  } catch (err) {
    console.error('GET livraria/clientes/[id]:', err)
    return NextResponse.json({ error: 'Erro ao carregar cliente' }, { status: 500 })
  }
}

/** PATCH - editar cliente */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireAccess(request, { pageKey: 'livraria_clientes', action: 'edit' })
  if (!access.ok) return access.response
  const { id } = await params
  if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  try {
    const body = await request.json().catch(() => ({}))
    const supabase = createSupabaseAdminClient(request)

    const updates: Record<string, unknown> = {}
    if (body.name !== undefined) updates.name = String(body.name).trim() || null
    if (body.phone !== undefined) updates.phone = body.phone ? String(body.phone).trim() || null : null
    if (body.email !== undefined) updates.email = body.email ? String(body.email).trim() || null : null
    if (body.document !== undefined) updates.document = body.document ? String(body.document).trim() || null : null
    if (body.notes !== undefined) updates.notes = body.notes ? String(body.notes).trim() || null : null
    if (body.can_buy_on_credit !== undefined) updates.can_buy_on_credit = !!body.can_buy_on_credit
    if (body.credit_limit !== undefined) updates.credit_limit = Math.max(0, Number(body.credit_limit) || 0)
    if (body.active !== undefined) updates.active = !!body.active

    if (Object.keys(updates).length === 0) {
      const { data } = await supabase.from('bookstore_customers').select('*').eq('id', id).single()
      return NextResponse.json(data ?? { error: 'Cliente não encontrado' }, data ? { status: 200 } : { status: 404 })
    }

    const { data, error } = await supabase
      .from('bookstore_customers')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
    return NextResponse.json(data)
  } catch (err) {
    console.error('PATCH livraria/clientes/[id]:', err)
    return NextResponse.json({ error: 'Erro ao atualizar cliente' }, { status: 500 })
  }
}

/** DELETE - desativar cliente (soft: active = false) */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireAccess(request, { pageKey: 'livraria_clientes', action: 'delete' })
  if (!access.ok) return access.response
  const { id } = await params
  if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  try {
    const supabase = createSupabaseAdminClient(request)
    const { data, error } = await supabase
      .from('bookstore_customers')
      .update({ active: false })
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
    return NextResponse.json({ ok: true, message: 'Cliente desativado.' })
  } catch (err) {
    console.error('DELETE livraria/clientes/[id]:', err)
    return NextResponse.json({ error: 'Erro ao desativar cliente' }, { status: 500 })
  }
}
