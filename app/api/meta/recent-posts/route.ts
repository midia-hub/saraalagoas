import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import {
  fetchInstagramRecentMedia,
  fetchFacebookRecentPosts,
  type InstagramMediaItem,
  type FacebookPostItem,
} from '@/lib/meta-fetch-posts'

type IntegrationRow = {
  id: string
  page_id: string | null
  page_access_token: string | null
  instagram_business_account_id: string | null
  page_name: string | null
  instagram_username: string | null
}

/**
 * GET /api/meta/recent-posts
 * Retorna as últimas postagens do Instagram e Facebook dos últimos 30 dias
 * para todas as integrações Meta conectadas do usuário.
 */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'view' })
  if (!access.ok) return access.response

  const db = createSupabaseServerClient(request)

  const { data: integrations, error: fetchError } = await db
    .from('meta_integrations')
    .select('id, page_id, page_access_token, instagram_business_account_id, page_name, instagram_username')
    .eq('created_by', access.snapshot.userId)
    .eq('is_active', true)

  if (fetchError) {
    return NextResponse.json(
      { error: fetchError.message ?? 'Erro ao buscar integrações.' },
      { status: 500 }
    )
  }

  const rows = (integrations || []) as IntegrationRow[]
  const instagramResults: InstagramMediaItem[] = []
  const facebookResults: FacebookPostItem[] = []
  const errors: string[] = []

  for (const row of rows) {
    const accountLabel = row.instagram_username || row.page_name || row.page_id || row.id

    if (row.instagram_business_account_id && row.page_access_token) {
      try {
        const media = await fetchInstagramRecentMedia({
          igUserId: row.instagram_business_account_id,
          pageAccessToken: row.page_access_token,
          accountName: accountLabel,
          integrationId: row.id,
        })
        instagramResults.push(...media)
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Erro ao buscar Instagram'
        errors.push(`Instagram (${accountLabel}): ${msg}`)
      }
    }

    if (row.page_id && row.page_access_token) {
      try {
        const posts = await fetchFacebookRecentPosts({
          pageId: row.page_id,
          pageAccessToken: row.page_access_token,
          accountName: accountLabel,
          integrationId: row.id,
        })
        facebookResults.push(...posts)
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Erro ao buscar Facebook'
        errors.push(`Facebook (${accountLabel}): ${msg}`)
      }
    }
  }

  // Ordenar por data (mais recente primeiro)
  instagramResults.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  facebookResults.sort(
    (a, b) => new Date(b.created_time).getTime() - new Date(a.created_time).getTime()
  )

  return NextResponse.json({
    instagram: instagramResults,
    facebook: facebookResults,
    errors: errors.length > 0 ? errors : undefined,
  })
}
