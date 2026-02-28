/**
 * lib/youtube.ts
 * Helpers para integração com YouTube Data API v3 via Google OAuth 2.0.
 *
 * Variáveis de ambiente necessárias:
 *   YOUTUBE_CLIENT_ID      — ID do cliente OAuth no Google Cloud Console
 *   YOUTUBE_CLIENT_SECRET  — Segredo do cliente
 *   YOUTUBE_REDIRECT_URI   — URI de callback (ex: https://seusite.com/api/youtube/oauth/callback)
 *   YOUTUBE_STATE_SECRET   — Segredo para assinar o state (prevenção CSRF)
 */

import crypto from 'crypto'

// ─── Escopos solicitados ────────────────────────────────────────────────────
export const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.force-ssl',
  'openid',
  'email',
  'profile',
]

// ─── Configuração (lida do ambiente) ───────────────────────────────────────
export function getYouTubeConfig() {
  const clientId     = process.env.YOUTUBE_CLIENT_ID ?? ''
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET ?? ''
  const redirectUri  = process.env.YOUTUBE_REDIRECT_URI ?? ''
  const stateSecret  = process.env.YOUTUBE_STATE_SECRET ?? ''

  const missing: string[] = []
  if (!clientId)     missing.push('YOUTUBE_CLIENT_ID')
  if (!clientSecret) missing.push('YOUTUBE_CLIENT_SECRET')
  if (!redirectUri)  missing.push('YOUTUBE_REDIRECT_URI')
  if (!stateSecret)  missing.push('YOUTUBE_STATE_SECRET')

  return { clientId, clientSecret, redirectUri, stateSecret, missing }
}

// ─── State CSRF ─────────────────────────────────────────────────────────────
export function createYouTubeState(secret: string, extra: Record<string, string> = {}): string {
  const payload = JSON.stringify({ nonce: crypto.randomBytes(16).toString('hex'), ...extra })
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  return Buffer.from(JSON.stringify({ payload, sig })).toString('base64url')
}

export function verifyYouTubeState(state: string, secret: string): Record<string, string> | null {
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
export function getYouTubeAuthUrl(state: string): string {
  const { clientId, redirectUri } = getYouTubeConfig()
  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  redirectUri,
    response_type: 'code',
    scope:         YOUTUBE_SCOPES.join(' '),
    access_type:   'offline',
    prompt:        'consent',
    state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

// ─── Troca de código por tokens ─────────────────────────────────────────────
export type YouTubeTokens = {
  access_token:  string
  refresh_token: string | null
  expires_in:    number
  scope:         string
  token_type:    string
  id_token?:     string
}

export async function exchangeYouTubeCode(code: string): Promise<YouTubeTokens> {
  const { clientId, clientSecret, redirectUri } = getYouTubeConfig()
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id:     clientId,
      client_secret: clientSecret,
      redirect_uri:  redirectUri,
      grant_type:    'authorization_code',
    }).toString(),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error_description || err.error || `Token exchange failed: ${res.status}`)
  }
  return res.json()
}

// ─── Refresh de access token ────────────────────────────────────────────────
export async function refreshYouTubeToken(refreshToken: string): Promise<YouTubeTokens> {
  const { clientId, clientSecret } = getYouTubeConfig()
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id:     clientId,
      client_secret: clientSecret,
      grant_type:    'refresh_token',
    }).toString(),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error_description || err.error || `Token refresh failed: ${res.status}`)
  }
  return res.json()
}

// ─── Info do canal ──────────────────────────────────────────────────────────
export type YouTubeChannelInfo = {
  id:           string
  title:        string
  customUrl:    string
  thumbnailUrl: string
}

export async function getYouTubeChannelInfo(accessToken: string): Promise<YouTubeChannelInfo> {
  const url = 'https://www.googleapis.com/youtube/v3/channels?part=snippet,brandingSettings&mine=true'
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `Channel info failed: ${res.status}`)
  }
  const data = await res.json()
  const channel = data.items?.[0]
  if (!channel) throw new Error('Nenhum canal encontrado para este login Google.')
  return {
    id:           channel.id ?? '',
    title:        channel.snippet?.title ?? '',
    customUrl:    channel.snippet?.customUrl ?? '',
    thumbnailUrl: channel.snippet?.thumbnails?.default?.url ?? '',
  }
}

// ─── Upload de vídeo para o YouTube ─────────────────────────────────────────
export type YouTubeVideoInput = {
  accessToken:  string
  title:        string
  description?: string
  tags?:        string[]
  categoryId?:  string   // ex: '22' = People & Blogs, '29' = Nonprofits & Activism
  privacyStatus?: 'public' | 'unlisted' | 'private'
  videoUrl:     string   // URL pública do vídeo (Drive CDN ou Storage)
  madeForKids?: boolean
}

export type YouTubeVideoResult = {
  videoId:   string
  videoUrl:  string
  title:     string
}

export async function uploadVideoToYouTube(input: YouTubeVideoInput): Promise<YouTubeVideoResult> {
  // 1. Download do vídeo (para re-enviar ao YouTube)
  const videoRes = await fetch(input.videoUrl)
  if (!videoRes.ok) throw new Error(`Não foi possível baixar o vídeo: ${videoRes.status}`)
  const videoBuffer = await videoRes.arrayBuffer()
  const contentType = videoRes.headers.get('content-type') || 'video/mp4'

  // 2. Metadados
  const metadata = {
    snippet: {
      title:       input.title.slice(0, 100),
      description: input.description ?? '',
      tags:        input.tags ?? [],
      categoryId:  input.categoryId ?? '22',
    },
    status: {
      privacyStatus: input.privacyStatus ?? 'public',
      selfDeclaredMadeForKids: input.madeForKids ?? false,
    },
  }

  // 3. Upload multipart
  const boundary = '-------YouTubeUploadBoundary' + Date.now()
  const metaJson = JSON.stringify(metadata)
  const CRLF = '\r\n'

  const textPart =
    `--${boundary}${CRLF}` +
    `Content-Type: application/json; charset=UTF-8${CRLF}${CRLF}` +
    `${metaJson}${CRLF}`

  const textBytes = new TextEncoder().encode(textPart)
  const binaryHeader = new TextEncoder().encode(
    `--${boundary}${CRLF}Content-Type: ${contentType}${CRLF}${CRLF}`
  )
  const endBoundary = new TextEncoder().encode(`${CRLF}--${boundary}--`)

  const body = new Uint8Array(
    textBytes.length + binaryHeader.length + videoBuffer.byteLength + endBoundary.length
  )
  let offset = 0
  body.set(textBytes, offset);      offset += textBytes.length
  body.set(binaryHeader, offset);   offset += binaryHeader.length
  body.set(new Uint8Array(videoBuffer), offset); offset += videoBuffer.byteLength
  body.set(endBoundary, offset)

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status',
    {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${input.accessToken}`,
        'Content-Type': `multipart/related; boundary="${boundary}"`,
      },
      body,
    }
  )
  if (!uploadRes.ok) {
    const err = await uploadRes.json().catch(() => ({}))
    throw new Error(err.error?.message || `Upload failed: ${uploadRes.status}`)
  }
  const result = await uploadRes.json()
  const videoId = result.id as string
  return {
    videoId,
    videoUrl:  `https://www.youtube.com/watch?v=${videoId}`,
    title:     result.snippet?.title ?? input.title,
  }
}

// ─── Utilitário: obtém access token válido (refresh se expirado) ────────────
export async function getValidAccessToken(row: {
  access_token:    string
  refresh_token:   string | null
  token_expires_at: string | null
}): Promise<{ accessToken: string; refreshed: false } | { accessToken: string; refreshed: true; tokens: YouTubeTokens }> {
  const now = Date.now()
  const expiresAt = row.token_expires_at ? new Date(row.token_expires_at).getTime() : 0
  // Atualiza se expira em menos de 5 min
  if (expiresAt - now > 5 * 60 * 1000) {
    return { accessToken: row.access_token, refreshed: false }
  }
  if (!row.refresh_token) {
    throw new Error('Token expirado e sem refresh_token. Reconecte o canal.')
  }
  const tokens = await refreshYouTubeToken(row.refresh_token)
  return { accessToken: tokens.access_token, refreshed: true, tokens }
}
