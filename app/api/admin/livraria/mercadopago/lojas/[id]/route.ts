import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

/**
 * PATCH - Atualiza uma loja na plataforma (nome, endereço). Não altera no Mercado Pago.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireAccess(request, { pageKey: 'livraria_pdv', action: 'create' })
  if (!access.ok) return access.response

  const id = (await params).id?.trim()
  if (!id) return NextResponse.json({ error: 'ID da loja é obrigatório.' }, { status: 400 })

  try {
    const body = await request.json().catch(() => ({}))
    const name = body.name != null ? String(body.name).trim() : undefined
    const address_line = body.address_line != null ? String(body.address_line).trim() || null : undefined
    const location = body.location as { latitude?: number; longitude?: number; reference?: string } | undefined

    if (!name && address_line === undefined && !location) {
      return NextResponse.json(
        { error: 'Envie ao menos um campo para atualizar: name, address_line ou location.' },
        { status: 400 }
      )
    }

    const supabase = createSupabaseAdminClient(request)
    const updates: Record<string, unknown> = {}
    if (name !== undefined) updates.name = name
    if (address_line !== undefined) updates.address_line = address_line
    if (location !== undefined) {
      updates.location = {
        ...(typeof location.latitude === 'number' && { latitude: location.latitude }),
        ...(typeof location.longitude === 'number' && { longitude: location.longitude }),
        ...(location.reference != null && { reference: String(location.reference) }),
      }
    }

    const { data, error } = await supabase
      .from('livraria_mp_store')
      .update(updates)
      .eq('id', id)
      .select('id, mp_store_id, name, external_id, address_line, location, created_at')
      .single()

    if (error) {
      if (error.code === 'PGRST116') return NextResponse.json({ error: 'Loja não encontrada.' }, { status: 404 })
      console.error('PATCH livraria/mercadopago/lojas/[id]:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('PATCH livraria/mercadopago/lojas/[id]:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * DELETE - Remove a loja da plataforma (e os caixas vinculados em cascata). Não remove no Mercado Pago.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireAccess(request, { pageKey: 'livraria_pdv', action: 'create' })
  if (!access.ok) return access.response

  const id = (await params).id?.trim()
  if (!id) return NextResponse.json({ error: 'ID da loja é obrigatório.' }, { status: 400 })

  try {
    const supabase = createSupabaseAdminClient(request)
    const { error } = await supabase.from('livraria_mp_store').delete().eq('id', id)

    if (error) {
      console.error('DELETE livraria/mercadopago/lojas/[id]:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('DELETE livraria/mercadopago/lojas/[id]:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
