/**
 * Meta (Facebook/Instagram) API Integration
 * 
 * Funções para OAuth, buscar páginas, e integrar com Instagram Business
 */

const META_API_VERSION = 'v21.0'
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`

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
  const appId = process.env.META_APP_ID
  const appSecret = process.env.META_APP_SECRET
  const redirectUri = process.env.META_REDIRECT_URI
  const scopes = process.env.META_SCOPES?.split(',') || []
  const stateSecret = process.env.META_STATE_SECRET

  if (!appId || !appSecret || !redirectUri || !stateSecret) {
    throw new Error('Configuração Meta incompleta. Verifique META_APP_ID, META_APP_SECRET, META_REDIRECT_URI e META_STATE_SECRET')
  }

  return {
    appId,
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
