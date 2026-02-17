import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

const PREFIX = 'SARA-AL-'

function effectivePrice(salePrice: number, discountType: string | null, discountValue: number | null): number {
  const base = Number(salePrice) || 0
  if (!discountType || discountType === 'value') {
    return Math.max(0, base - Math.max(0, Number(discountValue) || 0))
  }
  if (discountType === 'percent') {
    const p = Math.min(100, Math.max(0, Number(discountValue) || 0))
    return Math.max(0, base * (1 - p / 100))
  }
  return base
}

/** Gera sale_number no formato SARA-AL-YYYYMMDD-0001 (contador diário) */
async function nextSaleNumber(supabase: ReturnType<typeof createSupabaseAdminClient>): Promise<string> {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const pattern = `${PREFIX}${today}-%`
  const { data } = await supabase
    .from('bookstore_sales')
    .select('sale_number')
    .like('sale_number', pattern)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  const last = (data as { sale_number?: string } | null)?.sale_number
  let seq = 1
  if (last) {
    const parts = last.split('-')
    const num = parseInt(parts[parts.length - 1] ?? '0', 10)
    if (!Number.isNaN(num)) seq = num + 1
  }
  return `${PREFIX}${today}-${String(seq).padStart(4, '0')}`
}

/** POST - criar venda (finalizar sacola): valida estoque, cria sale + items + movimentos, atualiza current_stock */
export async function POST(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'livraria_pdv', action: 'create' })
  if (!access.ok) return access.response
  try {
    const body = await request.json().catch(() => ({}))
    const customerId = body.customer_id ? String(body.customer_id).trim() || null : null
    const saleType = (body.sale_type === 'CREDIT' ? 'CREDIT' : 'PAID') as 'PAID' | 'CREDIT'
    const paidNow = Math.max(0, Number(body.paid_amount) || 0)
    const customerName = body.customer_name ? String(body.customer_name).trim() || null : null
    const customerPhone = body.customer_phone ? String(body.customer_phone).trim() || null : null
    const paymentMethod = body.payment_method ? String(body.payment_method).trim() : null
    const discountTypeInput = body.discount_type === 'percent' ? 'percent' : 'value'
    const discountValueInput = Math.max(0, Number(body.discount_value) || 0)
    const discountAmountInput = Math.max(0, Number(body.discount_amount) || 0)
    const couponCode = (body.coupon_code && String(body.coupon_code).trim()) || null
    const notes = body.notes ? String(body.notes).trim() || null : null
    const items = Array.isArray(body.items) ? body.items : []
    const caixaSessaoId = body.caixa_sessao_id ? String(body.caixa_sessao_id).trim() || null : null

    if (items.length === 0) {
      return NextResponse.json({ error: 'Adicione ao menos um item para finalizar a venda.' }, { status: 400 })
    }
    if (!caixaSessaoId) {
      return NextResponse.json(
        { error: 'Caixa não está aberto. Abra um caixa em Livraria → Loja e Caixa (MP) para realizar vendas.' },
        { status: 400 }
      )
    }

    const supabase = createSupabaseAdminClient(request)
    const userId = access.snapshot?.userId ?? null

    const { data: sessao, error: errSessao } = await supabase
      .from('livraria_caixa_sessao')
      .select('id, status, opened_by')
      .eq('id', caixaSessaoId)
      .single()
    if (errSessao || !sessao) {
      return NextResponse.json({ error: 'Sessão de caixa não encontrada.' }, { status: 404 })
    }
    const sessaoRow = sessao as { id: string; status: string; opened_by: string | null }
    if (sessaoRow.status !== 'OPENED') {
      return NextResponse.json(
        { error: 'Esta sessão de caixa está fechada. Abra um caixa em Loja e Caixa para vender.' },
        { status: 400 }
      )
    }
    if (sessaoRow.opened_by && userId && sessaoRow.opened_by !== userId) {
      return NextResponse.json(
        { error: 'Esta sessão foi aberta por outro usuário. Use seu próprio caixa aberto para vender.' },
        { status: 403 }
      )
    }

    let finalCustomerId: string | null = customerId
    let finalCustomerName = customerName
    let finalCustomerPhone = customerPhone
    let finalPaymentMethod = saleType === 'PAID' ? (paymentMethod || 'Outro') : (paymentMethod || 'Fiado')

    const isMercadoPago = finalPaymentMethod === 'Mercado Pago'
    const isQrNoCaixa = finalPaymentMethod === 'QR no caixa'
    if (saleType === 'PAID') {
      const validPayment = ['Dinheiro', 'Pix', 'Cartão', 'Outro', 'Mercado Pago', 'QR no caixa'].includes(finalPaymentMethod)
      if (!validPayment) {
        return NextResponse.json({ error: 'Forma de pagamento inválida. Use: Dinheiro, Pix, Cartão, Mercado Pago, QR no caixa ou Outro.' }, { status: 400 })
      }
    }

    if (saleType === 'CREDIT' && !customerId) {
      return NextResponse.json({ error: 'Selecione um cliente para venda fiado.' }, { status: 400 })
    }

    // Buscar produtos e preços atuais; validar estoque
    const saleItems: Array<{ product_id: string; quantity: number; unit_price: number; total_price: number; name: string }> = []
    let subtotal = 0

    for (const row of items) {
      const productId = row.product_id
      const quantity = parseInt(String(row.quantity), 10)
      if (!productId || quantity <= 0) continue

      const { data: prod, error: errProd } = await supabase
        .from('bookstore_products')
        .select('id, name, sale_price, discount_type, discount_value, current_stock')
        .eq('id', productId)
        .single()

      if (errProd || !prod) {
        return NextResponse.json({ error: `Produto não encontrado: ${productId}` }, { status: 400 })
      }
      const currentStock = Number((prod as { current_stock: number }).current_stock) ?? 0
      if (currentStock < quantity) {
        const name = (prod as { name: string }).name
        return NextResponse.json(
          { error: `Estoque insuficiente para "${name}". Disponível: ${currentStock}.` },
          { status: 400 }
        )
      }

      const unitPrice = effectivePrice(
        (prod as { sale_price: number }).sale_price,
        (prod as { discount_type: string | null }).discount_type,
        (prod as { discount_value: number | null }).discount_value
      )
      const totalPrice = unitPrice * quantity
      subtotal += totalPrice
      saleItems.push({
        product_id: productId,
        quantity,
        unit_price: unitPrice,
        total_price: totalPrice,
        name: (prod as { name: string }).name,
      })
    }

    if (saleItems.length === 0) {
      return NextResponse.json({ error: 'Nenhum item válido para venda.' }, { status: 400 })
    }

    let discountAmount = 0
    let saleDiscountType: 'value' | 'percent' | null = null
    let saleDiscountValue: number | null = null
    let couponId: string | null = null
    let couponCodeStored: string | null = null

    if (couponCode) {
      const codeUpper = couponCode.trim().toUpperCase()
      const { data: coupon, error: errCoupon } = await supabase
        .from('bookstore_coupons')
        .select('id, code, discount_type, discount_value, min_purchase, valid_from, valid_until, usage_limit, used_count, active')
        .eq('active', true)
        .ilike('code', codeUpper)
        .maybeSingle()
      if (errCoupon || !coupon) {
        return NextResponse.json({ error: 'Cupom não encontrado ou inativo.' }, { status: 400 })
      }
      const now = new Date().toISOString()
      const validFrom = (coupon as { valid_from: string | null }).valid_from
      const validUntil = (coupon as { valid_until: string | null }).valid_until
      if (validFrom && validFrom > now) {
        return NextResponse.json({ error: 'Este cupom ainda não está válido.' }, { status: 400 })
      }
      if (validUntil && validUntil < now) {
        return NextResponse.json({ error: 'Este cupom está vencido.' }, { status: 400 })
      }
      const minPurchase = Number((coupon as { min_purchase: number }).min_purchase) || 0
      if (subtotal < minPurchase) {
        return NextResponse.json({ error: `Compra mínima para este cupom: R$ ${minPurchase.toFixed(2)}.` }, { status: 400 })
      }
      const usageLimit = (coupon as { usage_limit: number | null }).usage_limit
      const usedCount = Number((coupon as { used_count: number }).used_count) || 0
      if (usageLimit != null && usedCount >= usageLimit) {
        return NextResponse.json({ error: 'Este cupom atingiu o limite de uso.' }, { status: 400 })
      }
      const cType = (coupon as { discount_type: string }).discount_type
      const cValue = Number((coupon as { discount_value: number }).discount_value) || 0
      if (cType === 'percent') {
        discountAmount = (subtotal * Math.min(100, cValue)) / 100
      } else {
        discountAmount = Math.min(subtotal, cValue)
      }
      discountAmount = Math.round(discountAmount * 100) / 100
      couponId = (coupon as { id: string }).id
      couponCodeStored = (coupon as { code: string }).code
      saleDiscountType = cType as 'value' | 'percent'
      saleDiscountValue = cValue
    } else {
      if (discountTypeInput === 'percent') {
        discountAmount = (subtotal * Math.min(100, discountValueInput)) / 100
      } else {
        discountAmount = Math.min(subtotal, discountAmountInput > 0 ? discountAmountInput : discountValueInput)
      }
      discountAmount = Math.round(discountAmount * 100) / 100
      saleDiscountType = discountTypeInput
      saleDiscountValue = discountTypeInput === 'percent' ? discountValueInput : discountAmount
    }

    const totalAmount = Math.max(0, subtotal - discountAmount)
    const netTotal = totalAmount

    if (customerId) {
      const { data: customer, error: errCust } = await supabase
        .from('bookstore_customers')
        .select('id, name, phone, can_buy_on_credit, credit_limit')
        .eq('id', customerId)
        .eq('active', true)
        .single()
      if (!errCust && customer) {
        finalCustomerName = finalCustomerName || (customer as { name: string }).name
        finalCustomerPhone = finalCustomerPhone || (customer as { phone: string | null }).phone
        if (saleType === 'CREDIT') {
          const canCredit = (customer as { can_buy_on_credit: boolean }).can_buy_on_credit
          if (!canCredit) {
            return NextResponse.json({ error: 'Este cliente não está habilitado para compra fiado.' }, { status: 400 })
          }
          const creditLimit = Number((customer as { credit_limit: number }).credit_limit) || 0
          if (creditLimit > 0) {
            const { data: balanceRow } = await supabase
              .from('bookstore_customer_balance_view')
              .select('total_pendente')
              .eq('customer_id', customerId)
              .single()
            const currentPending = Number((balanceRow as { total_pendente: number } | null)?.total_pendente) || 0
            if (currentPending + netTotal > creditLimit) {
              return NextResponse.json({
                error: `Limite de crédito excedido. Saldo pendente: R$ ${currentPending.toFixed(2)}; limite: R$ ${creditLimit.toFixed(2)}.`,
              }, { status: 400 })
            }
          }
        }
      }
    }

    const paidAmount = saleType === 'PAID' ? netTotal : Math.min(netTotal, paidNow)
    const pendingAmount = Math.max(0, netTotal - paidAmount)

    const saleNumber = await nextSaleNumber(supabase)

    const receiptJson = {
      sale_number: saleNumber,
      items: saleItems.map((i) => ({ product_id: i.product_id, name: i.name, quantity: i.quantity, unit_price: i.unit_price, total_price: i.total_price })),
      subtotal,
      discount_amount: discountAmount,
      discount_type: saleDiscountType,
      coupon_code: couponCodeStored,
      total_amount: totalAmount,
      payment_method: finalPaymentMethod,
      customer_name: finalCustomerName,
      customer_phone: finalCustomerPhone,
      sale_type: saleType,
      paid_amount: paidAmount,
      pending_amount: pendingAmount,
      notes,
      created_at: new Date().toISOString(),
    }

    const insertSale: Record<string, unknown> = {
      sale_number: saleNumber,
      customer_id: finalCustomerId,
      customer_name: finalCustomerName,
      customer_phone: finalCustomerPhone,
      payment_method: finalPaymentMethod,
      total_amount: totalAmount,
      discount_amount: discountAmount,
      sale_type: saleType,
      paid_amount: paidAmount,
      pending_amount: pendingAmount,
      notes,
      status: isMercadoPago || isQrNoCaixa ? 'PENDING' : 'PAID',
      receipt_json: receiptJson,
      created_by: userId,
      caixa_sessao_id: caixaSessaoId,
    }
    if (isMercadoPago || isQrNoCaixa) {
      insertSale.payment_provider = 'MERCADOPAGO'
    }
    if (saleDiscountType) insertSale.discount_type = saleDiscountType
    if (couponId) insertSale.coupon_id = couponId
    if (couponCodeStored) insertSale.coupon_code = couponCodeStored

    const { data: sale, error: errSale } = await supabase
      .from('bookstore_sales')
      .insert(insertSale)
      .select()
      .single()

    if (errSale || !sale) {
      return NextResponse.json({ error: errSale?.message ?? 'Erro ao registrar venda' }, { status: 500 })
    }
    const saleId = (sale as { id: string }).id

    if (couponId) {
      const { data: cou } = await supabase.from('bookstore_coupons').select('used_count').eq('id', couponId).single()
      if (cou) {
        await supabase.from('bookstore_coupons').update({ used_count: Number((cou as { used_count: number }).used_count) + 1 }).eq('id', couponId)
      }
    }

    const insertedItems = saleItems.map((i) => ({
      sale_id: saleId,
      product_id: i.product_id,
      quantity: i.quantity,
      unit_price: i.unit_price,
      total_price: i.total_price,
    }))
    const { error: errItems } = await supabase.from('bookstore_sale_items').insert(insertedItems)
    if (errItems) {
      return NextResponse.json({ error: errItems.message }, { status: 500 })
    }

    if (!isMercadoPago) {
      for (const item of saleItems) {
        const { data: prod } = await supabase.from('bookstore_products').select('current_stock').eq('id', item.product_id).single()
        const current = Number((prod as { current_stock: number } | null)?.current_stock) ?? 0
        const newStock = Math.max(0, current - item.quantity)
        await supabase.from('bookstore_stock_movements').insert({
          product_id: item.product_id,
          movement_type: 'EXIT_SALE',
          quantity: item.quantity,
          reference_type: 'SALE',
          reference_id: saleId,
          notes: `Venda ${saleNumber}`,
          created_by: userId,
        })
        await supabase.from('bookstore_products').update({ current_stock: newStock }).eq('id', item.product_id)
      }
    }

    return NextResponse.json({
      sale_id: saleId,
      sale_number: saleNumber,
      total_amount: totalAmount,
      subtotal,
      discount_amount: discountAmount,
      items: saleItems,
      created_at: (sale as { created_at: string }).created_at,
      created_by: userId,
      ...(isMercadoPago && { needs_mercadopago_checkout: true }),
      ...(isQrNoCaixa && { needs_qr_order: true }),
    })
  } catch (err) {
    console.error('POST livraria/pdv/vendas:', err)
    return NextResponse.json({ error: 'Erro ao registrar venda' }, { status: 500 })
  }
}
