import { NextRequest, NextResponse } from 'next/server'
import { requireAccessAny } from '@/lib/admin-api'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  // Quem pode ver galeria pode listar instâncias para escolher destino ao criar post
  const access = await requireAccessAny(request, [
    { pageKey: 'instagram', action: 'view' },
    { pageKey: 'galeria', action: 'view' },
  ])
  if (!access.ok) return access.response
  const db = createSupabaseServerClient(request)
  const userId = access.snapshot.userId

  const requiredInstagramScopes = [
    'pages_show_list',
    'pages_read_engagement',
    'instagram_basic',
    'instagram_content_publish',
  ]

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
      is_active,
      scopes
    `)
    .eq('created_by', userId)
    .eq('is_active', true)
    .order('updated_at', { ascending: false })

  if (metaError) return NextResponse.json({ error: metaError.message }, { status: 500 })

  const metaInstances = (metaRows || []).flatMap((row) => {
    const expiresAt = row.token_expires_at ? new Date(row.token_expires_at) : null
    const tokenExpired = !!(expiresAt && expiresAt < new Date())
    const grantedScopes = Array.isArray(row.scopes) ? row.scopes.filter((s): s is string => typeof s === 'string') : []
    const missingScopes = requiredInstagramScopes.filter((scope) => !grantedScopes.includes(scope))
    const hasPageAccessToken = !!row.page_access_token
    const hasInstagramBusinessAccount = !!row.instagram_business_account_id
    const isReadyForPosting =
      hasPageAccessToken &&
      hasInstagramBusinessAccount &&
      !tokenExpired &&
      missingScopes.length === 0

    if (!isReadyForPosting) return []

    const instances: Array<Record<string, unknown>> = []

    // Instância Instagram (Meta OAuth) — só quando autorização de postagem ok
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

    // Instância Facebook (Meta OAuth) — mesmo token, mesma validação
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

  const forPosting = request.nextUrl.searchParams.get('forPosting') === '1'
  const instagramOnly = request.nextUrl.searchParams.get('instagramOnly') === '1'

  const metaList = forPosting ? metaInstances : (metaRows || []).flatMap((row: (typeof metaRows)[number]) => {
    const instances: Array<Record<string, unknown>> = []
    if (row.instagram_business_account_id && row.page_access_token) {
      instances.push({
        id: `meta_ig:${row.id}`,
        name: row.instagram_username ? `${row.page_name || 'Instagram'} (@${row.instagram_username})` : (row.page_name || 'Instagram'),
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

  let scopedMetaList = metaList
  if (instagramOnly) {
    scopedMetaList = scopedMetaList.filter((instance) => instance.provider === 'instagram')
  }

  return NextResponse.json(scopedMetaList)
}

export async function POST() {
  return NextResponse.json(
    { error: 'Integrações manuais foram desativadas. Use apenas Instâncias (Meta).' },
    { status: 410 }
  )
}
