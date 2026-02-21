import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { supabaseServer } from '@/lib/supabase-server'
import { getPageAccessToken, getInstagramBusinessAccount, listUserPages } from '@/lib/meta'

/**
 * Cria uma nova integração Meta usando a mesma conta Facebook, mas outra página.
 * Assim o usuário pode usar várias páginas/contas Instagram sem refazer o OAuth.
 *
 * POST /api/meta/add-page
 * Body: { integration_id: string, page_id: string }
 */
export async function POST(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'create' })
  if (!access.ok) return access.response

  const body = await request.json().catch(() => ({}))
  const integrationId = typeof body.integration_id === 'string' ? body.integration_id.trim() : ''
  const pageId = typeof body.page_id === 'string' ? body.page_id.trim() : ''

  if (!integrationId || !pageId) {
    return NextResponse.json(
      { error: 'integration_id e page_id são obrigatórios' },
      { status: 400 }
    )
  }

  const db = supabaseServer

  const { data: source, error: fetchError } = await db
    .from('meta_integrations')
    .select('id, created_by, facebook_user_id, facebook_user_name, access_token, token_expires_at')
    .eq('id', integrationId)
    .eq('created_by', access.snapshot.userId)
    .single()

  if (fetchError || !source) {
    return NextResponse.json({ error: 'Integração não encontrada' }, { status: 404 })
  }

  if (!source.access_token) {
    return NextResponse.json({ error: 'Integração sem token de usuário' }, { status: 400 })
  }

  const pages = await listUserPages(source.access_token)
  const selectedPage = pages.find((p) => p.id === pageId)
  if (!selectedPage) {
    return NextResponse.json({ error: 'Página não encontrada ou sem acesso' }, { status: 404 })
  }

  const pageAccessToken = await getPageAccessToken(pageId, source.access_token)

  let instagramAccountId: string | null = null
  let instagramUsername: string | null = null
  try {
    const igAccount = await getInstagramBusinessAccount(pageId, pageAccessToken)
    if (igAccount) {
      instagramAccountId = igAccount.id
      instagramUsername = igAccount.username
    }
  } catch {
    // Página sem Instagram vinculado
  }

  // Não cadastrar página que já está ativa na plataforma
  const { data: existing } = await db
    .from('meta_integrations')
    .select('id')
    .eq('page_id', pageId)
    .eq('created_by', access.snapshot.userId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()
  if (existing) {
    return NextResponse.json(
      { error: 'Esta página já está conectada e ativa na plataforma.' },
      { status: 409 }
    )
  }

  const now = new Date().toISOString()
  const { data: newRow, error: insertError } = await db
    .from('meta_integrations')
    .insert({
      created_by: source.created_by,
      provider: 'meta',
      facebook_user_id: source.facebook_user_id,
      facebook_user_name: source.facebook_user_name,
      page_id: selectedPage.id,
      page_name: selectedPage.name,
      page_access_token: pageAccessToken,
      instagram_business_account_id: instagramAccountId,
      instagram_username: instagramUsername,
      access_token: source.access_token,
      token_expires_at: source.token_expires_at,
      is_active: true,
      metadata: {},
      created_at: now,
      updated_at: now,
    })
    .select('id, page_id, page_name, instagram_username, is_active, created_at, updated_at')
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    integration: newRow,
    has_instagram: !!instagramAccountId,
  })
}
