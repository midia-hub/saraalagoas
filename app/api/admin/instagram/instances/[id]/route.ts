import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseServerClient } from '@/lib/supabase-server'

type InstancePayload = {
  name?: string
  access_token?: string
  ig_user_id?: string
  token_expires_at?: string | null
  status?: 'connected' | 'disconnected'
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (params.id.startsWith('meta_ig:') || params.id.startsWith('meta_fb:')) {
    return NextResponse.json(
      { error: 'Instância gerenciada via Meta OAuth. Consulte em /admin/instancias.' },
      { status: 400 }
    )
  }
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'view' })
  if (!access.ok) return access.response
  const db = createSupabaseServerClient(request)

  const { data, error } = await db
    .from('instagram_instances')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (params.id.startsWith('meta_ig:') || params.id.startsWith('meta_fb:')) {
    return NextResponse.json(
      { error: 'Instância gerenciada via Meta OAuth. Edite em /admin/instancias.' },
      { status: 400 }
    )
  }
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'edit' })
  if (!access.ok) return access.response
  const db = createSupabaseServerClient(request)

  const body = (await request.json().catch(() => ({}))) as InstancePayload
  const updates: Record<string, string | null> = {
    updated_at: new Date().toISOString(),
  }

  if (typeof body.name === 'string') {
    const next = body.name.trim()
    if (!next) return NextResponse.json({ error: 'Nome não pode ficar vazio.' }, { status: 400 })
    updates.name = next
  }
  if (typeof body.access_token === 'string') {
    const next = body.access_token.trim()
    if (!next) return NextResponse.json({ error: 'access_token não pode ficar vazio.' }, { status: 400 })
    updates.access_token = next
  }
  if (typeof body.ig_user_id === 'string') {
    const next = body.ig_user_id.trim()
    if (!next) return NextResponse.json({ error: 'ig_user_id não pode ficar vazio.' }, { status: 400 })
    updates.ig_user_id = next
  }
  if (body.token_expires_at === null || typeof body.token_expires_at === 'string') {
    updates.token_expires_at = body.token_expires_at
  }
  if (body.status === 'connected' || body.status === 'disconnected') {
    updates.status = body.status
  }

  const { data, error } = await db
    .from('instagram_instances')
    .update(updates)
    .eq('id', params.id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (params.id.startsWith('meta_ig:') || params.id.startsWith('meta_fb:')) {
    return NextResponse.json(
      { error: 'Instância gerenciada via Meta OAuth. Desvincule em /admin/instancias.' },
      { status: 400 }
    )
  }
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'delete' })
  if (!access.ok) return access.response
  const db = createSupabaseServerClient(request)

  const { error } = await db
    .from('instagram_instances')
    .delete()
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
