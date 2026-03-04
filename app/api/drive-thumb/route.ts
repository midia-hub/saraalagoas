/**
 * GET /api/drive-thumb?id=DRIVE_FILE_ID&sz=w400
 *
 * Proxy autenticado de thumbnail do Google Drive via Drive API v3.
 * - Busca o thumbnailLink via API (aceita Bearer token)
 * - Faz fetch do thumbnailLink com o mesmo token
 * - Retorna a imagem com Cache-Control de 24 h
 */
import { NextRequest, NextResponse } from 'next/server'
import { getDriveAccessToken } from '@/lib/drive'

const CACHE_SECONDS = 60 * 60 * 24  // 24 h no browser

// Cache do token em memória (tokens duram 1 h; renovamos com 5 min de margem)
let cachedToken: { value: string; expiresAt: number } | null = null

async function getToken(): Promise<string> {
  const now = Date.now()
  if (cachedToken && now < cachedToken.expiresAt) return cachedToken.value
  const token = await getDriveAccessToken()
  cachedToken = { value: token, expiresAt: now + 55 * 60 * 1000 }
  return token
}

/** Substitui ou acrescenta tamanho na URL do thumbnail (ex.: =s220 ou =w400) */
function applySize(url: string, sz: string): string {
  // Remove sufixo de tamanho existente e aplica o solicitado
  return url.replace(/=[swh]\d+(-[cpr][^&]*)?$/, '') + `=${sz}`
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const id = searchParams.get('id')?.trim()
  const sz = searchParams.get('sz') ?? 'w480'

  if (!id) return new NextResponse('Missing id', { status: 400 })

  try {
    const token = await getToken()
    const authHeader = { Authorization: `Bearer ${token}` }

    // 1. Busca o thumbnailLink via Drive API v3
    const metaRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?fields=thumbnailLink&supportsAllDrives=true`,
      { headers: authHeader }
    )
    if (!metaRes.ok) {
      return new NextResponse(null, { status: metaRes.status })
    }
    const meta = await metaRes.json() as { thumbnailLink?: string }
    if (!meta.thumbnailLink) {
      return new NextResponse('No thumbnail available', { status: 404 })
    }

    // 2. Ajusta tamanho e faz fetch da imagem com o mesmo token
    const thumbUrl = applySize(meta.thumbnailLink, sz)
    const imgRes = await fetch(thumbUrl, { headers: authHeader, redirect: 'follow' })
    if (!imgRes.ok) {
      return new NextResponse(null, { status: imgRes.status })
    }

    const contentType = imgRes.headers.get('content-type') ?? 'image/jpeg'
    if (contentType.includes('text/html')) {
      return new NextResponse(null, { status: 403 })
    }

    const buffer = await imgRes.arrayBuffer()
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': `public, max-age=${CACHE_SECONDS}, stale-while-revalidate=3600`,
      },
    })
  } catch (err) {
    console.error('[drive-thumb]', err)
    return new NextResponse(null, { status: 502 })
  }
}
