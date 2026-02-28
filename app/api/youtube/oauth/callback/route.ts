import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import {
  getYouTubeConfig,
  verifyYouTubeState,
  exchangeYouTubeCode,
  getYouTubeChannelInfo,
} from '@/lib/youtube'

const DONE_BASE = '/admin/instancias/youtube-done'

/**
 * GET /api/youtube/oauth/callback
 * Callback do Google OAuth. Troca o code por tokens e salva o canal no DB.
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

  const config = getYouTubeConfig()

  const stateData = verifyYouTubeState(state, config.stateSecret)
  if (!stateData) {
    const doneUrl = new URL(DONE_BASE, request.nextUrl.origin)
    doneUrl.searchParams.set('error', '1')
    doneUrl.searchParams.set('error_description', encodeURIComponent('State inválido (possível CSRF).'))
    return NextResponse.redirect(doneUrl.toString())
  }

  try {
    // 1. Troca code → tokens
    const tokens = await exchangeYouTubeCode(code)

    // 2. Busca info do canal
    const channel = await getYouTubeChannelInfo(tokens.access_token)

    // 3. Salva no banco
    const db = createSupabaseServerClient(request)
    const expiresAt = new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString()

    // Upsert por channel_id
    const { error: dbError } = await db
      .from('youtube_integrations')
      .upsert(
        {
          channel_id:            channel.id,
          channel_title:         channel.title,
          channel_custom_url:    channel.customUrl,
          channel_thumbnail_url: channel.thumbnailUrl,
          access_token:          tokens.access_token,
          refresh_token:         tokens.refresh_token,
          token_expires_at:      expiresAt,
          scopes:                tokens.scope.split(' '),
          is_active:             true,
          metadata:              {},
          created_by:            stateData.by || null,
        },
        { onConflict: 'channel_id' }
      )

    if (dbError) throw new Error(dbError.message)

    const doneUrl = new URL(DONE_BASE, request.nextUrl.origin)
    doneUrl.searchParams.set('connected', '1')
    doneUrl.searchParams.set('channel', encodeURIComponent(channel.title))
    doneUrl.searchParams.set('handle', encodeURIComponent(channel.customUrl))
    return NextResponse.redirect(doneUrl.toString())
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[YouTube OAuth callback]', msg)
    const doneUrl = new URL(DONE_BASE, request.nextUrl.origin)
    doneUrl.searchParams.set('error', '1')
    doneUrl.searchParams.set('error_description', encodeURIComponent(msg))
    return NextResponse.redirect(doneUrl.toString())
  }
}
