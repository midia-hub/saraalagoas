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

  const { data: legacyRows, error } = await db
    .from('instagram_instances')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: metaRows, error: metaError } = await db
    .from('meta_integrations')
    .select(`
      id,
      created_at,
      updated_at,
      page_id,
      page_name,
      page_access_token,
      instagram_business_account_id,
      instagram_username,
      token_expires_at,
      is_active
    `)
    .eq('is_active', true)
    .order('updated_at', { ascending: false })

  if (metaError) return NextResponse.json({ error: metaError.message }, { status: 500 })

  const metaInstances = (metaRows || []).flatMap((row) => {
    const instances: Array<Record<string, unknown>> = []

    // Instância Instagram (Meta OAuth)
    if (row.instagram_business_account_id && row.page_access_token) {
      instances.push({
        id: `meta_ig:${row.id}`,
        name: row.instagram_username
          ? `${row.page_name || 'Instagram'} (@${row.instagram_username})`
          : (row.page_name || 'Instagram'),
        provider: 'instagram',
        access_token: '(gerenciado via Meta OAuth)',
        ig_user_id: row.instagram_business_account_id,
        token_expires_at: row.token_expires_at,
        status: 'connected',
        created_at: row.created_at,
        updated_at: row.updated_at,
        read_only: true,
        source: 'meta',
      })
    }

    // Instância Facebook (Meta OAuth)
    if (row.page_id && row.page_access_token) {
      instances.push({
        id: `meta_fb:${row.id}`,
        name: `${row.page_name || 'Página do Facebook'} (Facebook)`,
        provider: 'facebook',
        access_token: '(gerenciado via Meta OAuth)',
        ig_user_id: row.page_id,
        token_expires_at: row.token_expires_at,
        status: 'connected',
        created_at: row.created_at,
        updated_at: row.updated_at,
        read_only: true,
        source: 'meta',
      })
    }

    return instances
  })

  return NextResponse.json([...(metaInstances || []), ...((legacyRows as unknown[]) || [])])
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
