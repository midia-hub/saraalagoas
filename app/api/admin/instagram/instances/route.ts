import { NextRequest, NextResponse } from 'next/server'
import { requireAccess, requireAccessAny } from '@/lib/admin-api'
import { createSupabaseServerClient } from '@/lib/supabase-server'

type InstancePayload = {
  name?: string
  provider?: string
  access_token?: string
  ig_user_id?: string
  token_expires_at?: string | null
  status?: 'connected' | 'disconnected'
}

export async function GET(request: NextRequest) {
  // Quem pode ver galeria pode listar instâncias para escolher destino ao criar post
  const access = await requireAccessAny(request, [
    { pageKey: 'instagram', action: 'view' },
    { pageKey: 'galeria', action: 'view' },
  ])
  if (!access.ok) return access.response
  const db = createSupabaseServerClient(request)

  const { data, error } = await db
    .from('instagram_instances')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'create' })
  if (!access.ok) return access.response
  const db = createSupabaseServerClient(request)

  const body = (await request.json().catch(() => ({}))) as InstancePayload
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const provider = body.provider === 'instagram' ? 'instagram' : 'instagram'
  const accessToken = typeof body.access_token === 'string' ? body.access_token.trim() : ''
  const igUserId = typeof body.ig_user_id === 'string' ? body.ig_user_id.trim() : ''
  const tokenExpiresAt = typeof body.token_expires_at === 'string' ? body.token_expires_at : null
  const status = body.status === 'connected' ? 'connected' : 'disconnected'

  if (!name) return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 })
  if (!accessToken) return NextResponse.json({ error: 'access_token é obrigatório.' }, { status: 400 })
  if (!igUserId) return NextResponse.json({ error: 'ig_user_id é obrigatório.' }, { status: 400 })

  const { data, error } = await db
    .from('instagram_instances')
    .insert({
      name,
      provider,
      access_token: accessToken,
      ig_user_id: igUserId,
      token_expires_at: tokenExpiresAt,
      status,
      created_by: access.snapshot.userId,
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
