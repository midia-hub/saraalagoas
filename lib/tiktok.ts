/**
 * lib/tiktok.ts
 * Helpers para integração com TikTok Business API via OAuth 2.0.
 * 
 * Variáveis de ambiente sugeridas:
 *   TIKTOK_CLIENT_KEY      — Client Key do TikTok for Developers
 *   TIKTOK_CLIENT_SECRET   — Client Secret
 *   TIKTOK_REDIRECT_URI    — URI de callback (ex: https://dominio.com/api/tiktok/oauth/callback)
 *   TIKTOK_STATE_SECRET    — Segredo para assinar o state (prevenção CSRF)
 */

import crypto from 'crypto'

// ─── Escopos solicitados ────────────────────────────────────────────────────
// Escopos básicos para leitura de perfil e postagem de vídeo
export const TIKTOK_SCOPES = [
  'user.info.basic',
  'video.upload',
  'video.publish',
]

// ─── Configuração (lida do ambiente) ───────────────────────────────────────
export function getTikTokConfig() {
  const clientKey    = process.env.TIKTOK_CLIENT_KEY ?? ''
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET ?? ''
  const redirectUri  = process.env.TIKTOK_REDIRECT_URI ?? ''
  const stateSecret  = process.env.TIKTOK_STATE_SECRET ?? ''

  const missing: string[] = []
  if (!clientKey)    missing.push('TIKTOK_CLIENT_KEY')
  if (!clientSecret) missing.push('TIKTOK_CLIENT_SECRET')
  if (!redirectUri)  missing.push('TIKTOK_REDIRECT_URI')
  if (!stateSecret)  missing.push('TIKTOK_STATE_SECRET')

  return { clientKey, clientSecret, redirectUri, stateSecret, missing }
}

// ─── State CSRF ─────────────────────────────────────────────────────────────
export function createTikTokState(secret: string, extra: Record<string, string> = {}): string {
  const payload = JSON.stringify({ nonce: crypto.randomBytes(16).toString('hex'), ...extra })
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  return Buffer.from(JSON.stringify({ payload, sig })).toString('base64url')
}

export function verifyTikTokState(state: string, secret: string): Record<string, string> | null {
  try {
    const { payload, sig } = JSON.parse(Buffer.from(state, 'base64url').toString())
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex')
    if (sig !== expected) return null
    return JSON.parse(payload)
  } catch {
    return null
  }
}

// ─── URL de autorização ─────────────────────────────────────────────────────
export function getTikTokAuthUrl(state: string): string {
  const { clientKey, redirectUri } = getTikTokConfig()
  const params = new URLSearchParams({
    client_key:    clientKey,
    scope:         TIKTOK_SCOPES.join(','),
    response_type: 'code',
    redirect_uri:  redirectUri,
    state,
  })
  return `https://www.tiktok.com/v2/auth/authorize/` + '?' + params.toString()
}

// ─── Troca de código por tokens ─────────────────────────────────────────────
export type TikTokTokens = {
  access_token:   string
  expires_in:     number
  open_id:        string
  refresh_token:  string
  refresh_expires_in: number
  scope:          string
  token_type:     string
}

export async function exchangeTikTokCode(code: string): Promise<TikTokTokens> {
  const { clientKey, clientSecret } = getTikTokConfig()
  
  const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key:    clientKey,
      client_secret: clientSecret,
      code,
      grant_type:    'authorization_code',
      // TikTok às vezes exige redirect_uri aqui também se foi usado no authorize
      redirect_uri:  process.env.TIKTOK_REDIRECT_URI ?? '',
    }).toString(),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error_description || err.error || `Token exchange failed: ${res.status}`)
  }

  return res.json()
}

// ─── Busca info do perfil ───────────────────────────────────────────────────
export type TikTokUserInfo = {
  open_id: string
  union_id: string
  avatar_url: string
  display_name: string
  handle: string
}

export async function getTikTokUserInfo(accessToken: string): Promise<TikTokUserInfo> {
  const res = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name,username', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `Failed to fetch TikTok user info: ${res.status}`)
  }

  const { data, error } = await res.json()
  if (error && error.code !== 'ok') {
    throw new Error(error.message || 'TikTok API error')
  }

  return {
    open_id:      data.user.open_id,
    union_id:     data.user.union_id,
    avatar_url:   data.user.avatar_url,
    display_name: data.user.display_name,
    handle:       data.user.username, // TikTok chama username o que o handle costuma ser
  }
}
