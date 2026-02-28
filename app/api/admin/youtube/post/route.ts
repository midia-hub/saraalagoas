import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getValidAccessToken, uploadVideoToYouTube } from '@/lib/youtube'

/**
 * POST /api/admin/youtube/post
 *
 * Publica um vídeo no YouTube via Data API v3.
 *
 * Body:
 * {
 *   integrationId: string       — ID da linha em youtube_integrations
 *   videoUrl:      string       — URL pública do arquivo de vídeo
 *   title:         string       — Título do vídeo (max 100 chars)
 *   description?:  string       — Descrição
 *   tags?:         string[]     — Tags
 *   privacyStatus?: 'public' | 'unlisted' | 'private'
 *   categoryId?:   string       — ID da categoria YouTube (padrão: '29' Nonprofits)
 *   madeForKids?:  boolean
 * }
 */
export async function POST(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'create' })
  if (!access.ok) return access.response

  const body = await request.json().catch(() => ({}))
  const integrationId = String(body.integrationId ?? '').trim()
  const videoUrl      = String(body.videoUrl ?? '').trim()
  const title         = String(body.title    ?? '').trim()

  if (!integrationId) return NextResponse.json({ error: 'integrationId é obrigatório.' }, { status: 400 })
  if (!videoUrl)      return NextResponse.json({ error: 'videoUrl é obrigatório.' }, { status: 400 })
  if (!title)         return NextResponse.json({ error: 'title é obrigatório.' }, { status: 400 })

  const db = createSupabaseServerClient(request)

  // 1. Busca integração
  const { data: row, error: fetchErr } = await db
    .from('youtube_integrations')
    .select('id, access_token, refresh_token, token_expires_at, is_active')
    .eq('id', integrationId)
    .single()

  if (fetchErr || !row) {
    return NextResponse.json({ error: 'Integração não encontrada.' }, { status: 404 })
  }
  if (!row.is_active) {
    return NextResponse.json({ error: 'Integração inativa. Ative antes de postar.' }, { status: 400 })
  }

  // 2. Garante access token válido (refresh automático)
  const tokenResult = await getValidAccessToken({
    access_token:    row.access_token,
    refresh_token:   row.refresh_token,
    token_expires_at: row.token_expires_at,
  }).catch((e) => { throw new Error(`Token inválido: ${e.message}`) })

  // 3. Persiste tokens atualizados se houve refresh
  if (tokenResult.refreshed) {
    const newExpires = new Date(Date.now() + (tokenResult.tokens.expires_in ?? 3600) * 1000).toISOString()
    await db
      .from('youtube_integrations')
      .update({ access_token: tokenResult.accessToken, token_expires_at: newExpires })
      .eq('id', integrationId)
  }

  // 4. Upload do vídeo
  try {
    const result = await uploadVideoToYouTube({
      accessToken:   tokenResult.accessToken,
      title,
      description:   typeof body.description === 'string' ? body.description : '',
      tags:          Array.isArray(body.tags) ? body.tags : [],
      privacyStatus: (['public', 'unlisted', 'private'] as const).includes(body.privacyStatus)
        ? body.privacyStatus
        : 'public',
      categoryId:    typeof body.categoryId === 'string' ? body.categoryId : '29',
      madeForKids:   Boolean(body.madeForKids),
      videoUrl,
    })

    return NextResponse.json({
      ok: true,
      videoId:  result.videoId,
      videoUrl: result.videoUrl,
      title:    result.title,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[YouTube post] Upload error:', msg)
    return NextResponse.json({ error: `Erro ao enviar vídeo: ${msg}` }, { status: 500 })
  }
}
