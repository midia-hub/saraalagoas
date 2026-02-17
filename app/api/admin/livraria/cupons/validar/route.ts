import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

/** GET - valida cupom e retorna desconto aplicável (para PDV) */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'livraria_pdv', action: 'create' })
  if (!access.ok) return access.response
  try {
    const { searchParams } = new URL(request.url)
    const code = (searchParams.get('code') || '').trim().toUpperCase()
    const subtotal = Math.max(0, parseFloat(searchParams.get('subtotal') ?? '0') || 0)
    if (!code) return NextResponse.json({ error: 'Informe o código do cupom.' }, { status: 400 })

    const supabase = createSupabaseAdminClient(request)
    const { data: coupon, error } = await supabase
      .from('bookstore_coupons')
      .select('id, code, description, discount_type, discount_value, min_purchase, valid_from, valid_until, usage_limit, used_count, active')
      .eq('active', true)
      .ilike('code', code)
      .maybeSingle()

    if (error) return NextResponse.json({ error: 'Erro ao validar cupom.' }, { status: 500 })
    if (!coupon) return NextResponse.json({ error: 'Cupom não encontrado ou inativo.' }, { status: 404 })

    const now = new Date().toISOString()
    if ((coupon as { valid_from: string | null }).valid_from && (coupon as { valid_from: string }).valid_from > now) {
      return NextResponse.json({ error: 'Este cupom ainda não está válido.' }, { status: 400 })
    }
    if ((coupon as { valid_until: string | null }).valid_until && (coupon as { valid_until: string }).valid_until < now) {
      return NextResponse.json({ error: 'Este cupom está vencido.' }, { status: 400 })
    }

    const minPurchase = Number((coupon as { min_purchase: number }).min_purchase) || 0
    if (subtotal < minPurchase) {
      return NextResponse.json({
        error: `Compra mínima para este cupom: R$ ${minPurchase.toFixed(2)}.`,
      }, { status: 400 })
    }

    const usageLimit = (coupon as { usage_limit: number | null }).usage_limit
    const usedCount = Number((coupon as { used_count: number }).used_count) || 0
    if (usageLimit != null && usedCount >= usageLimit) {
      return NextResponse.json({ error: 'Este cupom atingiu o limite de uso.' }, { status: 400 })
    }

    const discountType = (coupon as { discount_type: string }).discount_type
    const discountValue = Number((coupon as { discount_value: number }).discount_value) || 0
    let discountAmount = 0
    if (discountType === 'percent') {
      const p = Math.min(100, Math.max(0, discountValue))
      discountAmount = (subtotal * p) / 100
    } else {
      discountAmount = Math.min(subtotal, Math.max(0, discountValue))
    }

    return NextResponse.json({
      valid: true,
      coupon_id: (coupon as { id: string }).id,
      code: (coupon as { code: string }).code,
      description: (coupon as { description: string | null }).description,
      discount_type: discountType,
      discount_value: discountValue,
      discount_amount: Math.round(discountAmount * 100) / 100,
    })
  } catch (err) {
    console.error('GET livraria/cupons/validar:', err)
    return NextResponse.json({ error: 'Erro ao validar cupom' }, { status: 500 })
  }
}
