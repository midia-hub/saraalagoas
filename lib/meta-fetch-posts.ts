/**
 * Busca as últimas postagens do Facebook e Instagram (Meta Graph API)
 * dos últimos 30 dias para as integrações conectadas.
 */

const META_API_VERSION = 'v21.0'
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`

const DAYS_AGO = 30

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
  /** Nome da conta (page/instagram) para exibição */
  account_name?: string
  integration_id?: string
}

export type FacebookPostItem = {
  id: string
  message?: string
  created_time: string
  full_picture?: string
  permalink_url?: string
  /** Nome da página para exibição */
  account_name?: string
  integration_id?: string
}

function getSinceTimestamp(): number {
  const since = new Date()
  since.setDate(since.getDate() - DAYS_AGO)
  return Math.floor(since.getTime() / 1000)
}

/**
 * Lista mídia do Instagram (feed/carrossel/reels) dos últimos 30 dias.
 * Usa time-based pagination (since/until) quando suportado.
 */
export async function fetchInstagramRecentMedia(params: {
  igUserId: string
  pageAccessToken: string
  accountName?: string
  integrationId?: string
}): Promise<InstagramMediaItem[]> {
  const { igUserId, pageAccessToken, accountName, integrationId } = params
  const since = getSinceTimestamp()
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

  return list
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
}

/**
 * Lista publicações da página do Facebook dos últimos 30 dias.
 * Usa published_posts com filtro since (quando suportado) ou busca e filtra por created_time.
 */
export async function fetchFacebookRecentPosts(params: {
  pageId: string
  pageAccessToken: string
  accountName?: string
  integrationId?: string
}): Promise<FacebookPostItem[]> {
  const { pageId, pageAccessToken, accountName, integrationId } = params
  const since = getSinceTimestamp()
  const fields = 'id,message,created_time,full_picture,permalink_url'

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

  return list
    .filter((item) => {
      const created = item?.created_time
      if (typeof created !== 'string') return false
      return new Date(created) >= sinceDate
    })
    .map((item) => ({
      id: String(item.id),
      message: typeof item.message === 'string' ? item.message : undefined,
      created_time: String(item.created_time),
      full_picture: typeof item.full_picture === 'string' ? item.full_picture : undefined,
      permalink_url: typeof item.permalink_url === 'string' ? item.permalink_url : undefined,
      account_name: accountName,
      integration_id: integrationId,
    }))
}
