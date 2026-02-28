import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

const CONFIG_KEY = 'livraria_payment_methods'

export const ALL_PAYMENT_METHODS = [
  'Dinheiro',
  'Pix',
  'Cartão',
  'Mercado Pago',
  'QR no caixa',
  'Outro',
] as const

/** GET - Retorna as formas de pagamento habilitadas no PDV da livraria. */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'livraria_pdv', action: 'view' })
  if (!access.ok) return access.response

  const supabase = createSupabaseAdminClient(request)
  const { data, error } = await supabase
    .from('site_config')
    .select('value')
    .eq('key', CONFIG_KEY)
    .maybeSingle()

  if (error) {
    console.error('GET livraria/config/payment-methods:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const row = data as { value: { enabled?: string[] } } | null
  const enabled: string[] =
    Array.isArray(row?.value?.enabled) ? row!.value.enabled : [...ALL_PAYMENT_METHODS]

  return NextResponse.json({ enabled })
}

/** PATCH - Atualiza as formas de pagamento habilitadas no PDV da livraria. */
export async function PATCH(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'livraria_pdv', action: 'create' })
  if (!access.ok) return access.response

  const body = await request.json().catch(() => ({}))
  const enabled: string[] = Array.isArray(body.enabled)
    ? (body.enabled as string[]).filter((m) => (ALL_PAYMENT_METHODS as readonly string[]).includes(m))
    : [...ALL_PAYMENT_METHODS]

  const supabase = createSupabaseAdminClient(request)
  const { error } = await supabase.from('site_config').upsert(
    {
      key: CONFIG_KEY,
      value: { enabled },
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'key' }
  )

  if (error) {
    console.error('PATCH livraria/config/payment-methods:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ enabled })
}
