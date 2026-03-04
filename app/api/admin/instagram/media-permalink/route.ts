import { NextRequest, NextResponse } from 'next/server'
import { requireAccessAny } from '@/lib/admin-api'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getInstagramMediaPermalink } from '@/lib/meta'

/**
 * GET /api/admin/instagram/media-permalink?id=<scheduledPostId>
 *
 * Busca o permalink permanente de um post publicado no Instagram.
 * Usa o media_id armazenado em result_payload e o access_token da integração.
 */
export async function GET(request: NextRequest) {
  const access = await requireAccessAny(request, [
    { pageKey: 'instagram', action: 'view' },
    { pageKey: 'galeria', action: 'view' },
  ])
  if (!access.ok) return access.response

  const id = request.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'id da postagem é obrigatório.' }, { status: 400 })
  }

  const db = createSupabaseServerClient(request)

  const { data: post, error: postError } = await db
    .from('scheduled_social_posts')
    .select('id, instance_ids, result_payload, status')
    .eq('id', id)
    .single()

  if (postError || !post) {
    return NextResponse.json({ error: 'Postagem não encontrada.' }, { status: 404 })
  }

  const payload = post.result_payload as {
    instagramMediaId?: string | null
    facebookMediaId?: string | null
  } | null

  const instagramMediaId = payload?.instagramMediaId
  if (!instagramMediaId) {
    return NextResponse.json({ permalink: null, reason: 'media_id não disponível para esta postagem.' })
  }

  // Normalizar IDs das instâncias para encontrar a integração Meta
  const instanceIds: string[] = Array.isArray(post.instance_ids) ? post.instance_ids : []
  const integrationIds = instanceIds.map((id) => {
    let clean = id
    while (clean.startsWith('meta_ig:') || clean.startsWith('meta_fb:') || clean.startsWith('meta:')) {
      clean = clean.slice(clean.indexOf(':') + 1).trim()
    }
    return clean
  }).filter(Boolean)

  if (integrationIds.length === 0) {
    return NextResponse.json({ permalink: null, reason: 'Nenhuma integração Meta associada.' })
  }

  const { data: integrations } = await db
    .from('meta_integrations')
    .select('id, page_access_token')
    .in('id', integrationIds)
    .eq('is_active', true)
    .limit(1)

  const accessToken = (integrations?.[0] as { page_access_token?: string } | undefined)?.page_access_token
  if (!accessToken) {
    return NextResponse.json({ permalink: null, reason: 'Token de acesso não encontrado. Reconecte a conta.' })
  }

  const permalink = await getInstagramMediaPermalink({ mediaId: instagramMediaId, accessToken })
  return NextResponse.json({ permalink })
}
