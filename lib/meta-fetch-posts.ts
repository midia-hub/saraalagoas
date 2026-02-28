/**
 * Busca as últimas postagens do Facebook e Instagram (Meta Graph API)
 * dos últimos 30 dias para as integrações conectadas.
 */

const META_API_VERSION = 'v21.0'
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`

const DAYS_AGO = 30

export type InstagramInsights = {
  impressions?: number
  reach?: number
  saved?: number
  video_views?: number
  shares?: number
  total_interactions?: number
  profile_visits?: number
  follows?: number
  /** Engajamento = curtidas + comentários + salvamentos + compartilhamentos */
  engagement_rate?: number
}

export type InstagramMediaItem = {
  id: string
  caption?: string
  media_type?: string
  media_url?: string
  thumbnail_url?: string
  timestamp: string
  permalink?: string
  like_count?: number
  comments_count?: number
  insights?: InstagramInsights
  /** Nome da conta (page/instagram) para exibição */
  account_name?: string
  integration_id?: string
}

export type FacebookInsights = {
  impressions?: number
  impressions_unique?: number
  engaged_users?: number
  reactions?: number
  shares?: number
  clicks?: number
}

export type FacebookPostItem = {
  id: string
  message?: string
  created_time: string
  full_picture?: string
  permalink_url?: string
  like_count?: number
  comments_count?: number
  shares_count?: number
  insights?: FacebookInsights
  /** Nome da página para exibição */
  account_name?: string
  integration_id?: string
}

export function getSinceTimestamp(daysAgo = DAYS_AGO): number {
  const since = new Date()
  since.setDate(since.getDate() - daysAgo)
  return Math.floor(since.getTime() / 1000)
}

/**
 * Busca insights (impressions, reach, saved, video_views, shares) de um media do Instagram.
 * A API Insights não funciona para mídia de álbum filho; nesse caso retorna null.
 */
export async function fetchInstagramMediaInsights(
  mediaId: string,
  pageAccessToken: string,
  mediaType?: string,
): Promise<InstagramInsights | null> {
  // Reels e vídeos têm métricas diferentes
  const isVideo = mediaType === 'VIDEO' || mediaType === 'REELS'
  const metrics = [
    'impressions',
    'reach',
    'saved',
    'shares',
    'total_interactions',
    'profile_visits',
    'follows',
    ...(isVideo ? ['video_views'] : []),
  ].join(',')

  const url = new URL(`${META_API_BASE}/${mediaId}/insights`)
  url.searchParams.set('metric', metrics)
  url.searchParams.set('access_token', pageAccessToken)

  const res = await fetch(url.toString())
  if (!res.ok) return null // mídia de álbum filho não suporta insights

  const json = (await res.json()) as { data?: Array<{ name: string; values?: Array<{ value: number }>; value?: number }> }
  if (!Array.isArray(json.data)) return null

  const insightsObj: InstagramInsights = {}
  for (const entry of json.data) {
    const val: number | undefined =
      typeof entry.value === 'number'
        ? entry.value
        : Array.isArray(entry.values) && entry.values.length > 0
        ? entry.values[entry.values.length - 1].value
        : undefined
    if (val !== undefined) {
      (insightsObj as Record<string, number>)[entry.name] = val
    }
  }
  return insightsObj
}

/**
 * Lista mídia do Instagram (feed/carrossel/reels) dos últimos N dias.
 * Usa time-based pagination (since/until) quando suportado.
 */
export async function fetchInstagramRecentMedia(params: {
  igUserId: string
  pageAccessToken: string
  accountName?: string
  integrationId?: string
  daysAgo?: number
  withInsights?: boolean
}): Promise<InstagramMediaItem[]> {
  const { igUserId, pageAccessToken, accountName, integrationId, daysAgo = DAYS_AGO, withInsights = false } = params
  const since = getSinceTimestamp(daysAgo)
  const fields = 'id,caption,media_type,media_url,thumbnail_url,timestamp,permalink,like_count,comments_count'

  const url = new URL(`${META_API_BASE}/${igUserId}/media`)
  url.searchParams.set('fields', fields)
  url.searchParams.set('access_token', pageAccessToken)
  url.searchParams.set('since', String(since))
  url.searchParams.set('limit', '100')

  const response = await fetch(url.toString(), { method: 'GET' })

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(`Instagram media: ${err.error?.message || response.statusText}`)
  }

  const data = (await response.json()) as { data?: Array<Record<string, unknown>> }
  const list = Array.isArray(data?.data) ? data.data : []

  const items: InstagramMediaItem[] = list
    .filter((item) => item && typeof item.timestamp === 'string')
    .map((item) => ({
      id: String(item.id),
      caption: typeof item.caption === 'string' ? item.caption : undefined,
      media_type: typeof item.media_type === 'string' ? item.media_type : undefined,
      media_url: typeof item.media_url === 'string' ? item.media_url : undefined,
      thumbnail_url: typeof item.thumbnail_url === 'string' ? item.thumbnail_url : undefined,
      timestamp: String(item.timestamp),
      permalink: typeof item.permalink === 'string' ? item.permalink : undefined,
      like_count: typeof item.like_count === 'number' ? item.like_count : undefined,
      comments_count: typeof item.comments_count === 'number' ? item.comments_count : undefined,
      account_name: accountName,
      integration_id: integrationId,
    }))

  // Busca insights para cada post (em paralelo, até 10 por vez para não sobrecarregar a API)
  if (withInsights) {
    const CHUNK = 10
    for (let i = 0; i < items.length; i += CHUNK) {
      const chunk = items.slice(i, i + CHUNK)
      await Promise.all(
        chunk.map(async (item) => {
          const ins = await fetchInstagramMediaInsights(item.id, pageAccessToken, item.media_type).catch(() => null)
          if (ins) item.insights = ins
        })
      )
    }
  }

  return items
}

/**
 * Lista publicações da página do Facebook dos últimos N dias, com curtidas, comentários e compartilhamentos.
 */
export async function fetchFacebookRecentPosts(params: {
  pageId: string
  pageAccessToken: string
  accountName?: string
  integrationId?: string
  daysAgo?: number
  withInsights?: boolean
}): Promise<FacebookPostItem[]> {
  const { pageId, pageAccessToken, accountName, integrationId, daysAgo = DAYS_AGO, withInsights = false } = params
  const since = getSinceTimestamp(daysAgo)
  const fields = 'id,message,created_time,full_picture,permalink_url,likes.summary(true),comments.summary(true),shares'

  const url = new URL(`${META_API_BASE}/${pageId}/published_posts`)
  url.searchParams.set('fields', fields)
  url.searchParams.set('access_token', pageAccessToken)
  url.searchParams.set('limit', '100')
  url.searchParams.set('since', String(since))

  const response = await fetch(url.toString(), { method: 'GET' })

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(`Facebook posts: ${err.error?.message || response.statusText}`)
  }

  const data = (await response.json()) as { data?: Array<Record<string, unknown>> }
  const list = Array.isArray(data?.data) ? data.data : []
  const sinceDate = new Date(since * 1000)

  const items: FacebookPostItem[] = list
    .filter((item) => {
      const created = item?.created_time
      if (typeof created !== 'string') return false
      return new Date(created) >= sinceDate
    })
    .map((item) => {
      const likeSummary = (item.likes as Record<string, unknown> | undefined)?.summary as Record<string, unknown> | undefined
      const commentSummary = (item.comments as Record<string, unknown> | undefined)?.summary as Record<string, unknown> | undefined
      const sharesObj = item.shares as Record<string, unknown> | undefined
      return {
        id: String(item.id),
        message: typeof item.message === 'string' ? item.message : undefined,
        created_time: String(item.created_time),
        full_picture: typeof item.full_picture === 'string' ? item.full_picture : undefined,
        permalink_url: typeof item.permalink_url === 'string' ? item.permalink_url : undefined,
        like_count: typeof likeSummary?.total_count === 'number' ? likeSummary.total_count : undefined,
        comments_count: typeof commentSummary?.total_count === 'number' ? commentSummary.total_count : undefined,
        shares_count: typeof sharesObj?.count === 'number' ? sharesObj.count : undefined,
        account_name: accountName,
        integration_id: integrationId,
      }
    })

  // Insights do Facebook via API de pós-insights
  if (withInsights) {
    const CHUNK = 10
    for (let i = 0; i < items.length; i += CHUNK) {
      const chunk = items.slice(i, i + CHUNK)
      await Promise.all(
        chunk.map(async (post) => {
          try {
            const insUrl = new URL(`${META_API_BASE}/${post.id}/insights`)
            insUrl.searchParams.set('metric', 'post_impressions,post_impressions_unique,post_engaged_users,post_clicks')
            insUrl.searchParams.set('access_token', pageAccessToken)
            const insRes = await fetch(insUrl.toString())
            if (!insRes.ok) return
            const insJson = (await insRes.json()) as { data?: Array<{ name: string; values?: Array<{ value: number }>; value?: number }> }
            if (!Array.isArray(insJson.data)) return
            const ins: FacebookInsights = {}
            for (const entry of insJson.data) {
              const val: number | undefined =
                Array.isArray(entry.values) && entry.values.length > 0
                  ? entry.values[entry.values.length - 1].value
                  : typeof entry.value === 'number' ? entry.value : undefined
              if (val !== undefined) {
                if (entry.name === 'post_impressions') ins.impressions = val
                if (entry.name === 'post_impressions_unique') ins.impressions_unique = val
                if (entry.name === 'post_engaged_users') ins.engaged_users = val
                if (entry.name === 'post_clicks') ins.clicks = val
              }
            }
            if (items[i]) post.insights = ins
          } catch { /* silencioso */ }
        })
      )
    }
  }

  return items
}
