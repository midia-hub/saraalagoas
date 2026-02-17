import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

/** GET - lista pagamentos do cliente */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireAccess(request, { pageKey: 'livraria_clientes', action: 'view' })
  if (!access.ok) return access.response
  const { id: customerId } = await params
  if (!customerId) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  try {
    const supabase = createSupabaseAdminClient(request)
    const { data, error } = await supabase
      .from('bookstore_customer_payments')
      .select('id, amount, payment_method, notes, created_by, created_at')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ items: data ?? [] })
  } catch (err) {
    console.error('GET livraria/clientes/[id]/pagamentos:', err)
    return NextResponse.json({ error: 'Erro ao carregar pagamentos' }, { status: 500 })
  }
}

/** POST - registrar pagamento (allocations opcional; se ausente, FIFO nas vendas pendentes) */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireAccess(request, { pageKey: 'livraria_fiado', action: 'create' })
  if (!access.ok) return access.response
  const { id: customerId } = await params
  if (!customerId) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  try {
    const body = await request.json().catch(() => ({}))
    const amount = Number(body.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Informe um valor maior que zero.' }, { status: 400 })
    }

    const paymentMethod = body.payment_method ? String(body.payment_method).trim() || null : null
    const notes = body.notes ? String(body.notes).trim() || null : null
    const allocations = Array.isArray(body.allocations) ? body.allocations : []

    const supabase = createSupabaseAdminClient(request)
    const userId = access.snapshot?.userId ?? null

    // Verificar que o cliente existe
    const { data: customer, error: errCustomer } = await supabase
      .from('bookstore_customers')
      .select('id')
      .eq('id', customerId)
      .single()
    if (errCustomer || !customer) {
      return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 })
    }

    let allocationsToApply: Array<{ sale_id: string; amount: number }>

    if (allocations.length > 0) {
      const sumAlloc = allocations.reduce((s: number, a: { sale_id?: string; amount?: number }) => s + (Number(a.amount) || 0), 0)
      if (Math.abs(sumAlloc - amount) > 0.01) {
        return NextResponse.json({
          error: 'A soma dos valores por compra deve ser igual ao valor do pagamento.',
        }, { status: 400 })
      }
      allocationsToApply = allocations
        .filter((a: { sale_id?: string; amount?: number }) => a.sale_id && (Number(a.amount) || 0) > 0)
        .map((a: { sale_id: string; amount: number }) => ({ sale_id: a.sale_id, amount: Number(a.amount) }))
      if (allocationsToApply.reduce((s, a) => s + a.amount, 0) !== amount) {
        return NextResponse.json({
          error: 'A soma dos valores por compra deve ser igual ao valor do pagamento.',
        }, { status: 400 })
      }
    } else {
      // FIFO: buscar vendas pendentes do cliente (mais antiga primeiro)
      const { data: pendingSales, error: errSales } = await supabase
        .from('bookstore_sales')
        .select('id, pending_amount')
        .eq('customer_id', customerId)
        .gt('pending_amount', 0)
        .neq('status', 'CANCELLED')
        .order('created_at', { ascending: true })

      if (errSales) return NextResponse.json({ error: errSales.message }, { status: 500 })
      const sales = (pendingSales ?? []) as Array<{ id: string; pending_amount: number }>
      if (sales.length === 0) {
        return NextResponse.json({
          error: 'Este cliente não possui compras com saldo pendente para abater.',
        }, { status: 400 })
      }

      let remaining = amount
      allocationsToApply = []
      for (const sale of sales) {
        if (remaining <= 0) break
        const pending = Number(sale.pending_amount) || 0
        if (pending <= 0) continue
        const apply = Math.min(remaining, pending)
        allocationsToApply.push({ sale_id: sale.id, amount: apply })
        remaining -= apply
      }
      if (allocationsToApply.length === 0) {
        return NextResponse.json({
          error: 'Não há saldo pendente suficiente para abater.',
        }, { status: 400 })
      }
      const totalAlloc = allocationsToApply.reduce((s, a) => s + a.amount, 0)
      if (totalAlloc < amount - 0.01) {
        return NextResponse.json({
          error: `O saldo pendente total é R$ ${totalAlloc.toFixed(2)}. Ajuste o valor do pagamento ou use rateio manual.`,
        }, { status: 400 })
      }
    }

    // Validar que cada sale_id pertence ao customer_id e que pending_amount >= allocation
    for (const alloc of allocationsToApply) {
      const { data: sale, error: errSale } = await supabase
        .from('bookstore_sales')
        .select('id, customer_id, pending_amount')
        .eq('id', alloc.sale_id)
        .single()
      if (errSale || !sale) {
        return NextResponse.json({ error: `Venda ${alloc.sale_id} não encontrada.` }, { status: 400 })
      }
      if ((sale as { customer_id: string }).customer_id !== customerId) {
        return NextResponse.json({ error: 'A venda não pertence a este cliente.' }, { status: 400 })
      }
      const pending = Number((sale as { pending_amount: number }).pending_amount) || 0
      if (alloc.amount > pending) {
        return NextResponse.json({
          error: `O valor a abater na venda não pode ser maior que o saldo pendente (R$ ${pending.toFixed(2)}).`,
        }, { status: 400 })
      }
    }

    // Inserir pagamento
    const { data: payment, error: errPayment } = await supabase
      .from('bookstore_customer_payments')
      .insert({
        customer_id: customerId,
        amount,
        payment_method: paymentMethod,
        notes,
        created_by: userId,
      })
      .select()
      .single()

    if (errPayment || !payment) {
      return NextResponse.json({ error: errPayment?.message ?? 'Erro ao registrar pagamento' }, { status: 500 })
    }
    const paymentId = (payment as { id: string }).id

    // Inserir alocações e atualizar vendas
    for (const alloc of allocationsToApply) {
      await supabase.from('bookstore_payment_allocations').insert({
        payment_id: paymentId,
        sale_id: alloc.sale_id,
        amount: alloc.amount,
      })
      const { data: sale } = await supabase
        .from('bookstore_sales')
        .select('paid_amount, pending_amount')
        .eq('id', alloc.sale_id)
        .single()
      const paid = Number((sale as { paid_amount: number })?.paid_amount) || 0
      const pend = Number((sale as { pending_amount: number })?.pending_amount) || 0
      await supabase
        .from('bookstore_sales')
        .update({
          paid_amount: paid + alloc.amount,
          pending_amount: Math.max(0, pend - alloc.amount),
        })
        .eq('id', alloc.sale_id)
    }

    return NextResponse.json({
      payment,
      allocations: allocationsToApply,
      message: 'Pagamento registrado com sucesso.',
    })
  } catch (err) {
    console.error('POST livraria/clientes/[id]/pagamentos:', err)
    return NextResponse.json({ error: 'Erro ao registrar pagamento' }, { status: 500 })
  }
}
