import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { createPos } from '@/lib/payments/mercadopago/stores'

/** GET - Lista caixas (POS) cadastrados na plataforma. */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'livraria_pdv', action: 'view' })
  if (!access.ok) return access.response
  const supabase = createSupabaseAdminClient(request)
  const { data, error } = await supabase
    .from('livraria_mp_pos')
    .select(`
      id, mp_pos_id, name, external_id, external_store_id, qr_image_url, status, created_at,
      store:livraria_mp_store(id, name, external_id)
    `)
    .order('created_at', { ascending: false })
  if (error) {
    console.error('GET livraria/mercadopago/caixas:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data ?? [])
}

/**
 * POST - Cria um caixa no Mercado Pago vinculado a uma loja e salva na plataforma.
 * Body: store_id (uuid da loja na plataforma), name, external_id (ex: LOJ001POS001). fixed_amount = true para integrado.
 */
export async function POST(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'livraria_pdv', action: 'create' })
  if (!access.ok) return access.response

  if (!process.env.MERCADOPAGO_ACCESS_TOKEN?.trim()) {
    return NextResponse.json(
      { error: 'MERCADOPAGO_ACCESS_TOKEN não configurado. Configure no .env e reinicie o servidor.' },
      { status: 503 }
    )
  }

  try {
    const body = await request.json().catch(() => ({}))
    const platform_store_id = body.store_id ? String(body.store_id).trim() : null
    const name = body.name ? String(body.name).trim() : null
    const external_id = body.external_id ? String(body.external_id).trim() : null
    const fixed_amount = body.fixed_amount !== false
    const category = body.category != null ? Number(body.category) : undefined

    if (!platform_store_id) {
      return NextResponse.json({ error: 'store_id é obrigatório (id da loja na plataforma).' }, { status: 400 })
    }
    if (!name) {
      return NextResponse.json({ error: 'name é obrigatório.' }, { status: 400 })
    }
    if (!external_id) {
      return NextResponse.json(
        { error: 'external_id é obrigatório (identificador único do caixa, até 40 caracteres, ex: LOJ001POS001).' },
        { status: 400 }
      )
    }

    const supabase = createSupabaseAdminClient(request)
    const { data: storeRow, error: storeError } = await supabase
      .from('livraria_mp_store')
      .select('id, mp_store_id, external_id')
      .eq('id', platform_store_id)
      .single()

    if (storeError || !storeRow) {
      return NextResponse.json({ error: 'Loja não encontrada.' }, { status: 404 })
    }

    const storeExternalId = (storeRow as { external_id: string | null }).external_id?.trim() || null
    if (!storeExternalId) {
      return NextResponse.json(
        {
          error:
            'Esta loja não possui código externo no Mercado Pago. Cadastre outra loja pela tela "Loja e Caixa" (o código é gerado automaticamente) ou edite a loja no painel do Mercado Pago.',
        },
        { status: 400 }
      )
    }

    const mp_store_id = (storeRow as { mp_store_id: number }).mp_store_id

    const pos = await createPos({
      name,
      fixed_amount,
      store_id: mp_store_id,
      external_store_id: storeExternalId,
      external_id,
      category,
    })

    const { data: row, error: insertError } = await supabase
      .from('livraria_mp_pos')
      .insert({
        store_id: platform_store_id,
        mp_pos_id: pos.id,
        name: pos.name,
        external_id: pos.external_id,
        external_store_id: pos.external_store_id,
        qr_image_url: pos.qr?.image ?? null,
        uuid: pos.uuid ?? null,
        status: pos.status ?? 'active',
      })
      .select('id, mp_pos_id, name, external_id, qr_image_url, status, created_at')
      .single()

    if (insertError) console.error('livraria_mp_pos insert:', insertError)
    return NextResponse.json({ ...pos, platform_pos_id: row?.id, platform: row })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('POST livraria/mercadopago/caixas:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
