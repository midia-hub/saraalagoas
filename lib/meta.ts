/**
 * Meta (Facebook/Instagram) API Integration
 * 
 * Funções para OAuth, buscar páginas, e integrar com Instagram Business
 */

const META_API_VERSION = 'v21.0'
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`
/** Scopes necessários para publicar no Instagram e no Facebook (Page). */
const REQUIRED_INSTAGRAM_PUBLISH_SCOPES = [
  'pages_show_list',
  'pages_read_engagement',
  'instagram_basic',
  'instagram_content_publish',
  'pages_manage_posts', // obrigatório para publicar fotos/post na Página do Facebook
]

// ============================================================
// Types
// ============================================================

export type MetaUserProfile = {
  id: string
  name: string
}

export type MetaPage = {
  id: string
  name: string
  access_token: string
  category?: string
  tasks?: string[]
}

export type MetaInstagramAccount = {
  id: string
  username: string
  name?: string
  profile_picture_url?: string
  followers_count?: number
}

export type MetaOAuthConfig = {
  appId: string
  appSecret: string
  redirectUri: string
  scopes: string[]
  stateSecret: string
}

export type MetaTokenResponse = {
  access_token: string
  token_type: string
  expires_in?: number
}

export type MetaLongLivedTokenResponse = {
  access_token: string
  token_type: string
  expires_in?: number
}

// ============================================================
// Config
// ============================================================

export function getMetaConfig(): MetaOAuthConfig {
  const rawAppId = process.env.META_APP_ID?.trim() ?? ''
  const appSecret = process.env.META_APP_SECRET?.trim() ?? ''
  const redirectUri = process.env.META_REDIRECT_URI?.trim() ?? ''
  const envScopes =
    process.env.META_SCOPES?.split(',')
      .map((s) => s.trim())
      .filter(Boolean) || []
  const scopes = Array.from(
    new Set([
      ...(envScopes.length > 0 ? envScopes : REQUIRED_INSTAGRAM_PUBLISH_SCOPES),
      ...REQUIRED_INSTAGRAM_PUBLISH_SCOPES,
    ])
  )
  const stateSecret = process.env.META_STATE_SECRET?.trim() ?? ''

  if (!rawAppId || !appSecret || !redirectUri || !stateSecret) {
    throw new Error('Configuração Meta incompleta. Verifique META_APP_ID, META_APP_SECRET, META_REDIRECT_URI e META_STATE_SECRET')
  }

  // App ID do Meta é sempre numérico (15–16 dígitos)
  if (!/^\d{10,20}$/.test(rawAppId)) {
    throw new Error(
      'META_APP_ID inválido: deve conter apenas números (ex.: do Meta for Developers → Settings → Basic). ' +
        'Não use "ID do app do Instagram" de outra tela.'
    )
  }

  const isLocalhost = redirectUri.startsWith('http://localhost') || redirectUri.startsWith('http://127.0.0.1')
  if (!isLocalhost && !redirectUri.startsWith('https://')) {
    throw new Error('META_REDIRECT_URI deve ser HTTPS em produção (ex.: https://saraalagoas.com/api/meta/oauth/callback)')
  }

  return {
    appId: rawAppId,
    appSecret,
    redirectUri,
    scopes,
    stateSecret,
  }
}

// ============================================================
// OAuth URL Generation
// ============================================================

/**
 * Gera a URL de autorização Meta OAuth
 */
export function getMetaOAuthUrl(state: string): string {
  const config = getMetaConfig()
  
  const params = new URLSearchParams({
    client_id: config.appId,
    redirect_uri: config.redirectUri,
    state,
    scope: config.scopes.join(','),
    response_type: 'code',
    auth_type: 'rerequest',
  })

  return `https://www.facebook.com/${META_API_VERSION}/dialog/oauth?${params.toString()}`
}

// ============================================================
// State Management (CSRF Protection)
// ============================================================

/**
 * Cria um state assinado para proteção CSRF
 */
export async function createSignedState(data: Record<string, any> = {}): Promise<string> {
  const config = getMetaConfig()
  const payload = {
    ...data,
    timestamp: Date.now(),
    nonce: Math.random().toString(36).substring(7),
  }
  
  const payloadStr = JSON.stringify(payload)
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(payloadStr + config.stateSecret)
  
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  
  const state = Buffer.from(JSON.stringify({ payload, signature })).toString('base64url')
  return state
}

/**
 * Valida e extrai dados do state assinado
 */
export async function verifySignedState(state: string): Promise<Record<string, any> | null> {
  try {
    const config = getMetaConfig()
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'))
    const { payload, signature } = decoded
    
    const payloadStr = JSON.stringify(payload)
    const encoder = new TextEncoder()
    const dataBuffer = encoder.encode(payloadStr + config.stateSecret)
    
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const expectedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    
    if (signature !== expectedSignature) {
      return null
    }
    
    // Verificar timestamp (máximo 10 minutos)
    const age = Date.now() - payload.timestamp
    if (age > 10 * 60 * 1000) {
      return null
    }
    
    return payload
  } catch {
    return null
  }
}

// ============================================================
// Token Exchange
// ============================================================

/**
 * Troca o code por access_token (short-lived)
 */
export async function exchangeCodeForToken(code: string): Promise<MetaTokenResponse> {
  const config = getMetaConfig()
  
  const params = new URLSearchParams({
    client_id: config.appId,
    client_secret: config.appSecret,
    redirect_uri: config.redirectUri,
    code,
  })

  const response = await fetch(`${META_API_BASE}/oauth/access_token?${params.toString()}`, {
    method: 'GET',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Failed to exchange code' } }))
    throw new Error(`Meta token exchange failed: ${error.error?.message || response.statusText}`)
  }

  return response.json()
}

/**
 * Troca short-lived token por long-lived token (60 dias)
 */
export async function exchangeForLongLivedToken(shortToken: string): Promise<MetaLongLivedTokenResponse> {
  const config = getMetaConfig()
  
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: config.appId,
    client_secret: config.appSecret,
    fb_exchange_token: shortToken,
  })

  const response = await fetch(`${META_API_BASE}/oauth/access_token?${params.toString()}`, {
    method: 'GET',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Failed to get long-lived token' } }))
    throw new Error(`Meta long-lived token exchange failed: ${error.error?.message || response.statusText}`)
  }

  return response.json()
}

// ============================================================
// User Profile
// ============================================================

/**
 * Busca informações do perfil do usuário
 */
export async function getUserProfile(accessToken: string): Promise<MetaUserProfile> {
  const response = await fetch(
    `${META_API_BASE}/me?fields=id,name&access_token=${accessToken}`,
    { method: 'GET' }
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Failed to get user profile' } }))
    throw new Error(`Meta user profile failed: ${error.error?.message || response.statusText}`)
  }

  return response.json()
}

// ============================================================
// Pages
// ============================================================

/**
 * Lista todas as páginas do usuário
 */
export async function listUserPages(accessToken: string): Promise<MetaPage[]> {
  const response = await fetch(
    `${META_API_BASE}/me/accounts?fields=id,name,access_token,category,tasks&access_token=${accessToken}`,
    { method: 'GET' }
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Failed to list pages' } }))
    throw new Error(`Meta list pages failed: ${error.error?.message || response.statusText}`)
  }

  const data = await response.json()
  return data.data || []
}

type MetaPermissionItem = {
  permission?: string
  status?: string
}

/**
 * Lista permissões concedidas no OAuth atual.
 */
export async function listGrantedPermissions(accessToken: string): Promise<string[]> {
  const response = await fetch(
    `${META_API_BASE}/me/permissions?access_token=${accessToken}`,
    { method: 'GET' }
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Failed to list permissions' } }))
    throw new Error(`Meta list permissions failed: ${error.error?.message || response.statusText}`)
  }

  const data = await response.json() as { data?: MetaPermissionItem[] }
  return (data.data || [])
    .filter((item) => item?.permission && item?.status === 'granted')
    .map((item) => String(item.permission).trim())
    .filter(Boolean)
}

/**
 * Escopos mínimos para publicar no Instagram via Meta Graph API.
 */
export function getMissingRequiredInstagramPublishScopes(grantedScopes: string[]): string[] {
  const granted = new Set(grantedScopes.map((s) => s.trim()).filter(Boolean))
  return REQUIRED_INSTAGRAM_PUBLISH_SCOPES.filter((scope) => !granted.has(scope))
}

/**
 * Busca o token de uma página específica
 */
export async function getPageAccessToken(pageId: string, userAccessToken: string): Promise<string> {
  const response = await fetch(
    `${META_API_BASE}/${pageId}?fields=access_token&access_token=${userAccessToken}`,
    { method: 'GET' }
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Failed to get page token' } }))
    throw new Error(`Meta get page token failed: ${error.error?.message || response.statusText}`)
  }

  const data = await response.json()
  return data.access_token
}

// ============================================================
// Instagram Business Account
// ============================================================

/**
 * Busca a conta Instagram Business vinculada a uma página
 */
export async function getInstagramBusinessAccount(
  pageId: string,
  pageAccessToken: string
): Promise<MetaInstagramAccount | null> {
  const response = await fetch(
    `${META_API_BASE}/${pageId}?fields=instagram_business_account{id,username,name,profile_picture_url,followers_count}&access_token=${pageAccessToken}`,
    { method: 'GET' }
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Failed to get IG account' } }))
    throw new Error(`Meta get IG account failed: ${error.error?.message || response.statusText}`)
  }

  const data = await response.json()
  return data.instagram_business_account || null
}

/**
 * Busca detalhes de uma conta Instagram Business
 */
export async function getInstagramAccountDetails(
  igBusinessAccountId: string,
  accessToken: string
): Promise<MetaInstagramAccount> {
  const response = await fetch(
    `${META_API_BASE}/${igBusinessAccountId}?fields=id,username,name,profile_picture_url,followers_count&access_token=${accessToken}`,
    { method: 'GET' }
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Failed to get IG details' } }))
    throw new Error(`Meta get IG details failed: ${error.error?.message || response.statusText}`)
  }

  return response.json()
}

// ============================================================
// Publishing (Placeholder)
// ============================================================

/**
 * Cria um container de mídia para publicação no Instagram
 * @see https://developers.facebook.com/docs/instagram-api/guides/content-publishing
 */
export async function createInstagramMediaContainer(params: {
  igUserId: string
  imageUrl?: string
  videoUrl?: string
  caption?: string
  accessToken: string
}): Promise<{ id: string }> {
  const { igUserId, imageUrl, videoUrl, caption, accessToken } = params

  const body: any = {
    caption: caption || '',
    access_token: accessToken,
  }

  if (imageUrl) {
    body.image_url = imageUrl
  } else if (videoUrl) {
    body.video_url = videoUrl
    body.media_type = 'VIDEO'
  } else {
    throw new Error('imageUrl ou videoUrl é obrigatório')
  }

  const response = await fetch(
    `${META_API_BASE}/${igUserId}/media`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Failed to create container' } }))
    throw new Error(`Meta create container failed: ${error.error?.message || response.statusText}`)
  }

  return response.json()
}

/**
 * Publica um container de mídia no Instagram
 */
export async function publishInstagramMedia(params: {
  igUserId: string
  creationId: string
  accessToken: string
}): Promise<{ id: string }> {
  const { igUserId, creationId, accessToken } = params

  const body = {
    creation_id: creationId,
    access_token: accessToken,
  }

  const response = await fetch(
    `${META_API_BASE}/${igUserId}/media_publish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Failed to publish media' } }))
    throw new Error(`Meta publish media failed: ${error.error?.message || response.statusText}`)
  }

  return response.json()
}

type InstagramMediaContainerStatus = {
  status_code?: string
  status?: string
  status_message?: string
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isMediaNotReadyMessage(message: string): boolean {
  const normalized = message.toLowerCase()
  return (
    normalized.includes('media id is not available') ||
    normalized.includes('media is not ready') ||
    normalized.includes('creation id is not valid')
  )
}

/**
 * Consulta o status de processamento de um container de mídia.
 */
export async function getInstagramMediaContainerStatus(params: {
  containerId: string
  accessToken: string
}): Promise<InstagramMediaContainerStatus> {
  const { containerId, accessToken } = params

  const query = new URLSearchParams({
    // Alguns tipos (ex.: ShadowIGMediaBuilder) não aceitam status_message.
    fields: 'status_code,status',
    access_token: accessToken,
  })

  const response = await fetch(`${META_API_BASE}/${containerId}?${query.toString()}`, {
    method: 'GET',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Failed to read container status' } }))
    throw new Error(`Meta read container status failed: ${error.error?.message || response.statusText}`)
  }

  return response.json()
}

/**
 * Aguarda o container ficar pronto antes da publicação.
 */
export async function waitForInstagramMediaContainerReady(params: {
  containerId: string
  accessToken: string
  timeoutMs?: number
  pollIntervalMs?: number
}): Promise<void> {
  const { containerId, accessToken, timeoutMs = 45000, pollIntervalMs = 2000 } = params
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const status = await getInstagramMediaContainerStatus({ containerId, accessToken })
    const code = (status.status_code || '').toUpperCase()

    if (code === 'FINISHED') {
      return
    }
    if (code === 'ERROR' || code === 'EXPIRED') {
      throw new Error(
        `Meta media container failed: ${status.status_message || status.status || status.status_code || 'unknown status'}`
      )
    }

    await sleep(pollIntervalMs)
  }

  throw new Error('Meta media container timed out before becoming ready.')
}

/**
 * Publica com retries para erro transitório "Media ID is not available".
 */
export async function publishInstagramMediaWithRetry(params: {
  igUserId: string
  creationId: string
  accessToken: string
  maxAttempts?: number
  retryDelayMs?: number
}): Promise<{ id: string }> {
  const { igUserId, creationId, accessToken, maxAttempts = 3, retryDelayMs = 1500 } = params
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await publishInstagramMedia({ igUserId, creationId, accessToken })
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error('Falha ao publicar no Instagram.')
      lastError = normalizedError
      const isRetryable = isMediaNotReadyMessage(normalizedError.message)

      if (!isRetryable || attempt === maxAttempts) {
        throw normalizedError
      }

      await sleep(retryDelayMs * attempt)
    }
  }

  throw lastError || new Error('Falha ao publicar no Instagram.')
}

/**
 * Cria um container filho para usar em carrossel (múltiplas imagens).
 * Mesmo formato do container de imagem única (createInstagramMediaContainer): JSON com image_url.
 * A API infere IMAGE pela presença de image_url; is_carousel_item=true indica que é item de carrossel.
 */
export async function createInstagramCarouselItemContainer(params: {
  igUserId: string
  imageUrl: string
  accessToken: string
}): Promise<{ id: string }> {
  const { igUserId, imageUrl, accessToken } = params

  const body = {
    image_url: imageUrl,
    is_carousel_item: true,
    access_token: accessToken,
  }

  const response = await fetch(
    `${META_API_BASE}/${igUserId}/media`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  )

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    const msg = err?.error?.message || response.statusText
    throw new Error(`Meta create carousel item failed: ${msg}`)
  }

  return response.json()
}

/**
 * Cria um container de carrossel com múltiplas imagens
 */
export async function createInstagramCarouselContainer(params: {
  igUserId: string
  childContainerIds: string[]
  caption?: string
  accessToken: string
}): Promise<{ id: string }> {
  const { igUserId, childContainerIds, caption, accessToken } = params

  if (childContainerIds.length < 2) {
    throw new Error('Carrossel requer ao menos 2 imagens')
  }

  if (childContainerIds.length > 20) {
    throw new Error('Instagram limita carrosséis a 20 imagens')
  }

  const body = {
    media_type: 'CAROUSEL',
    children: childContainerIds,
    caption: caption || '',
    access_token: accessToken,
  }

  const response = await fetch(
    `${META_API_BASE}/${igUserId}/media`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Failed to create carousel' } }))
    throw new Error(`Meta create carousel failed: ${error.error?.message || response.statusText}`)
  }

  return response.json()
}

// ============================================================
// Collaboration / Collab Posts
// ============================================================

export type CollaborationInvite = {
  media_id: string
  media_owner_username: string
  caption: string
  media_url: string
}

export type CollaborationInvitesResponse = {
  data: CollaborationInvite[]
  paging?: {
    cursors?: {
      before?: string
      after?: string
    }
  }
}

export type Collaborator = {
  id: string
  username: string
  invite_status: 'Accepted' | 'Pending'
}

export type CollaboratorsResponse = {
  data: Collaborator[]
}

/**
 * Lista convites de colaboração recebidos para um usuário Instagram
 * @see https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/collaboration
 */
export async function fetchCollaborationInvites(params: {
  igUserId: string
  accessToken: string
  limit?: number
  after?: string
  before?: string
}): Promise<CollaborationInvitesResponse> {
  const { igUserId, accessToken, limit = 10, after, before } = params

  const query = new URLSearchParams({
    access_token: accessToken,
    limit: String(limit),
  })

  if (after) query.append('after', after)
  if (before) query.append('before', before)

  const response = await fetch(
    `${META_API_BASE}/${igUserId}/collaboration_invites?${query.toString()}`,
    { method: 'GET' }
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Failed to fetch collaboration invites' } }))
    throw new Error(`Meta fetch collaboration invites failed: ${error.error?.message || response.statusText}`)
  }

  return response.json()
}

/**
 * Aceita ou recusa um convite de colaboração
 * @see https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/collaboration
 */
export async function respondToCollaborationInvite(params: {
  igUserId: string
  mediaId: string
  accept: boolean
  accessToken: string
}): Promise<{ success: boolean }> {
  const { igUserId, mediaId, accept, accessToken } = params

  const query = new URLSearchParams({
    media_id: mediaId,
    accept: String(accept),
    access_token: accessToken,
  })

  const response = await fetch(
    `${META_API_BASE}/${igUserId}/collaboration_invites?${query.toString()}`,
    { method: 'POST' }
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Failed to respond to collaboration invite' } }))
    throw new Error(`Meta respond to collaboration invite failed: ${error.error?.message || response.statusText}`)
  }

  return response.json()
}

/**
 * Lista colaboradores de um post específico
 * @see https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-media/collaborators/
 */
export async function fetchMediaCollaborators(params: {
  mediaId: string
  accessToken: string
}): Promise<CollaboratorsResponse> {
  const { mediaId, accessToken } = params

  const response = await fetch(
    `${META_API_BASE}/${mediaId}/collaborators?access_token=${accessToken}`,
    { method: 'GET' }
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Failed to fetch collaborators' } }))
    throw new Error(`Meta fetch collaborators failed: ${error.error?.message || response.statusText}`)
  }

  return response.json()
}
