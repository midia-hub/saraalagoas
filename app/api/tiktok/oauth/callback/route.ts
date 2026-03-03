import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import {
  getTikTokConfig,
  verifyTikTokState,
  exchangeTikTokCode,
  getTikTokUserInfo,
} from '@/lib/tiktok'

const DONE_BASE = '/admin/instancias/tiktok-done'

/**
 * GET /api/tiktok/oauth/callback
 * Callback do TikTok OAuth. Troca o code por tokens e salva a conta no DB.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code  = searchParams.get('code')
  const state = searchParams.get('state')
  const errorParam = searchParams.get('error')

  if (errorParam) {
    const desc = searchParams.get('error_description') ?? errorParam
    const doneUrl = new URL(DONE_BASE, request.nextUrl.origin)
    doneUrl.searchParams.set('error', '1')
    doneUrl.searchParams.set('error_description', encodeURIComponent(desc))
    return NextResponse.redirect(doneUrl.toString())
  }

  if (!code || !state) {
    const doneUrl = new URL(DONE_BASE, request.nextUrl.origin)
    doneUrl.searchParams.set('error', '1')
    doneUrl.searchParams.set('error_description', encodeURIComponent('Parâmetros inválidos.'))
    return NextResponse.redirect(doneUrl.toString())
  }

  const config = getTikTokConfig()

  const stateData = verifyTikTokState(state, config.stateSecret)
  if (!stateData) {
    const doneUrl = new URL(DONE_BASE, request.nextUrl.origin)
    doneUrl.searchParams.set('error', '1')
    doneUrl.searchParams.set('error_description', encodeURIComponent('State inválido (possível CSRF).'))
    return NextResponse.redirect(doneUrl.toString())
  }

  try {
    // 1. Troca code → tokens
    const tokens = await exchangeTikTokCode(code)

    // 2. Busca info do perfil usuário
    const profile = await getTikTokUserInfo(tokens.access_token)

    // 3. Salva no banco (suposto schema para TikTok igual ao YouTube)
    const db = createSupabaseServerClient(request)
    const expiresAt = new Date(Date.now() + (tokens.expires_in ?? 7200) * 1000).toISOString()
    const refreshExpiresAt = new Date(Date.now() + (tokens.refresh_expires_in ?? 31536000) * 1000).toISOString()

    // Upsert por open_id
    const { error: dbError } = await db
      .from('tiktok_integrations')
      .upsert(
        {
          open_id:               profile.open_id,
          display_name:          profile.display_name,
          handle:                profile.handle,
          avatar_url:            profile.avatar_url,
          access_token:          tokens.access_token,
          refresh_token:         tokens.refresh_token,
          token_expires_at:      expiresAt,
          refresh_expires_at:    refreshExpiresAt,
          scopes:                tokens.scope.split(','),
          is_active:             true,
          metadata:              { union_id: profile.union_id },
          created_by:            stateData.by || null,
        },
        { onConflict: 'open_id' }
      )

    if (dbError) throw new Error(dbError.message)

    const doneUrl = new URL(DONE_BASE, request.nextUrl.origin)
    doneUrl.searchParams.set('connected', '1')
    doneUrl.searchParams.set('display_name', encodeURIComponent(profile.display_name))
    doneUrl.searchParams.set('handle', encodeURIComponent(profile.handle))
    return NextResponse.redirect(doneUrl.toString())
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[TikTok OAuth callback]', msg)
    const doneUrl = new URL(DONE_BASE, request.nextUrl.origin)
    doneUrl.searchParams.set('error', '1')
    doneUrl.searchParams.set('error_description', encodeURIComponent(msg))
    return NextResponse.redirect(doneUrl.toString())
  }
}
