import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import {
  fetchInstagramRecentMedia,
  type InstagramMediaItem,
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
 * GET /api/meta/account-posts?integrationId=<id>&daysAgo=<n>
 *
 * Retorna posts do Instagram de uma integração específica,
 * incluindo insights completos: impressions, reach, saved, shares,
 * video_views, total_interactions, profile_visits, follows.
 */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'view' })
  if (!access.ok) return access.response

  const { searchParams } = new URL(request.url)
  const integrationId = searchParams.get('integrationId')
  const daysAgo = Math.min(90, Math.max(1, parseInt(searchParams.get('daysAgo') || '30', 10)))

  if (!integrationId) {
    return NextResponse.json({ error: 'integrationId é obrigatório.' }, { status: 400 })
  }

  const db = createSupabaseServerClient(request)

  const { data: row, error: fetchError } = await db
    .from('meta_integrations')
    .select('id, page_id, page_access_token, instagram_business_account_id, page_name, instagram_username')
    .eq('id', integrationId)
    .eq('created_by', access.snapshot.userId)
    .eq('is_active', true)
    .single()

  if (fetchError || !row) {
    return NextResponse.json(
      { error: 'Integração não encontrada ou sem acesso.' },
      { status: 404 }
    )
  }

  const integration = row as IntegrationRow
  const accountLabel = integration.instagram_username || integration.page_name || integration.id.slice(0, 8)

  const instagramPosts: InstagramMediaItem[] = []
  const errors: string[] = []

  if (integration.instagram_business_account_id && integration.page_access_token) {
    try {
      const media = await fetchInstagramRecentMedia({
        igUserId: integration.instagram_business_account_id,
        pageAccessToken: integration.page_access_token,
        accountName: accountLabel,
        integrationId: integration.id,
        daysAgo,
        withInsights: true,
      })
      instagramPosts.push(...media)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao buscar Instagram'
      errors.push(`Instagram: ${msg}`)
    }
  }

  // Totais agregados da conta
  const igTotals = instagramPosts.reduce(
    (acc, p) => {
      acc.likes += p.like_count ?? 0
      acc.comments += p.comments_count ?? 0
      acc.impressions += p.insights?.impressions ?? 0
      acc.reach += p.insights?.reach ?? 0
      acc.saved += p.insights?.saved ?? 0
      acc.shares += p.insights?.shares ?? 0
      acc.video_views += p.insights?.video_views ?? 0
      acc.total_interactions += p.insights?.total_interactions ?? 0
      acc.profile_visits += p.insights?.profile_visits ?? 0
      acc.follows += p.insights?.follows ?? 0
      return acc
    },
    {
      likes: 0,
      comments: 0,
      impressions: 0,
      reach: 0,
      saved: 0,
      shares: 0,
      video_views: 0,
      total_interactions: 0,
      profile_visits: 0,
      follows: 0,
    }
  )

  return NextResponse.json({
    account: {
      id: integration.id,
      name: accountLabel,
      instagram_username: integration.instagram_username ?? null,
      page_name: integration.page_name ?? null,
      has_instagram: !!integration.instagram_business_account_id,
      has_facebook: !!integration.page_id,
    },
    instagram: {
      posts: instagramPosts,
      totals: igTotals,
      count: instagramPosts.length,
    },
    facebook: {
      posts: [],
      totals: {
        likes: 0,
        comments: 0,
        shares: 0,
        impressions: 0,
        impressions_unique: 0,
        engaged_users: 0,
        clicks: 0,
      },
      count: 0,
    },
    daysAgo,
    errors: errors.length > 0 ? errors : undefined,
  })
}
