import { NextRequest, NextResponse } from 'next/server'
import { Readable } from 'stream'
import {
  getFileDownloadStream,
  getFileThumbnailBuffer,
  getPublicDriveImageBuffer,
  normalizeDriveFileId,
  getDriveAccessToken,
  resizeThumbnailUrl,
} from '@/lib/drive'
import { supabaseServer } from '@/lib/supabase-server'

/**
 * Fallback: usa o thumbnail_link armazenado no banco + token OAuth da service account para
 * fazer proxy da miniatura, contornando arquivos inacessíveis pelo fileId (sem permissão).
 * Isso espelha exatamente o que getFileThumbnailBuffer faz, mas sem precisar chamar a API
 * do Drive (que falha quando a SA não contém o arquivo no escopo dele).
 */
async function getDbThumbnailBuffer(
  fileId: string,
  size: number,
): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    const { data } = await supabaseServer
      .from('gallery_files')
      .select('thumbnail_link')
      .eq('drive_file_id', fileId)
      .maybeSingle()

    if (!data?.thumbnail_link) return null

    const url = resizeThumbnailUrl(data.thumbnail_link, size)

    // Tenta com token OAuth da service account (igual a getFileThumbnailBuffer)
    try {
      const accessToken = await getDriveAccessToken()
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(10_000),
      })
      if (res.ok) {
        const contentType = res.headers.get('content-type') || 'image/jpeg'
        if (/^image\//i.test(contentType)) {
          return { buffer: Buffer.from(await res.arrayBuffer()), contentType }
        }
      }
    } catch { /* ignora, tenta sem token */ }

    // Tenta sem token (arquivos públicos)
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
    if (!res.ok) return null
    const contentType = res.headers.get('content-type') || 'image/jpeg'
    if (!/^image\//i.test(contentType)) return null
    return { buffer: Buffer.from(await res.arrayBuffer()), contentType }
  } catch {
    return null
  }
}

type ThumbCacheEntry = {
  expiresAt: number
  contentType: string
  buffer: Buffer
}

const THUMB_CACHE_MS = 15 * 60 * 1000
const thumbCache = new Map<string, ThumbCacheEntry>()

/**
 * Proxy de imagem do Google Drive para carregar no site (evita CORS e links que não carregam em <img>).
 * - mode=full: arquivo original, sem redimensionar — use sempre para publicação nas redes.
 * - mode=thumb: miniatura para listagens e prévias (não usar para postar).
 */
export async function GET(request: NextRequest) {
  const rawFileId = request.nextUrl.searchParams.get('fileId') || ''
  const fileId = normalizeDriveFileId(rawFileId)
  const mode = request.nextUrl.searchParams.get('mode') === 'thumb' ? 'thumb' : 'full'
  const sizeParam = Number(request.nextUrl.searchParams.get('size') || '480')
  const thumbSize = Number.isFinite(sizeParam) ? Math.max(120, Math.min(sizeParam, 1024)) : 480

  if (!fileId) {
    return NextResponse.json({ error: 'fileId obrigatório' }, { status: 400 })
  }
  try {
    if (mode === 'thumb') {
      const cacheKey = `${fileId}:${thumbSize}`
      const cached = thumbCache.get(cacheKey)
      if (cached && cached.expiresAt > Date.now()) {
        return new Response(new Uint8Array(cached.buffer), {
          headers: {
            'Content-Type': cached.contentType,
            'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
          },
        })
      }

      // Cada fallback isolado: se um lançar exceção não interrompe a cadeia inteira.

      // 1ª tentativa: thumbnail via Drive API (service account)
      try {
        const thumb = await getFileThumbnailBuffer(fileId, thumbSize)
        if (thumb) {
          thumbCache.set(cacheKey, { expiresAt: Date.now() + THUMB_CACHE_MS, ...thumb })
          return new Response(new Uint8Array(thumb.buffer), {
            headers: { 'Content-Type': thumb.contentType, 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800' },
          })
        }
      } catch { /* continua */ }

      // 2ª tentativa: URLs públicas do Drive
      try {
        const publicThumb = await getPublicDriveImageBuffer(fileId, 'thumb', thumbSize)
        if (publicThumb) {
          thumbCache.set(cacheKey, { expiresAt: Date.now() + THUMB_CACHE_MS, ...publicThumb })
          return new Response(new Uint8Array(publicThumb.buffer), {
            headers: { 'Content-Type': publicThumb.contentType, 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800' },
          })
        }
      } catch { /* continua */ }

      // 3ª tentativa: thumbnail_link salvo no banco + token OAuth da SA
      try {
        const dbThumb = await getDbThumbnailBuffer(fileId, thumbSize)
        if (dbThumb) {
          thumbCache.set(cacheKey, { expiresAt: Date.now() + THUMB_CACHE_MS, ...dbThumb })
          return new Response(new Uint8Array(dbThumb.buffer), {
            headers: { 'Content-Type': dbThumb.contentType, 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800' },
          })
        }
      } catch { /* continua */ }

      return NextResponse.json({ error: 'Imagem não encontrada.' }, { status: 404 })
    }

    // full: stream do arquivo original (qualidade preservada para postagem)

    // 1ª tentativa: download direto via Drive API
    try {
      const { stream, contentType } = await getFileDownloadStream(fileId)
      const webStream = Readable.toWeb(stream) as ReadableStream<Uint8Array>
      return new Response(webStream, {
        headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800' },
      })
    } catch { /* continua */ }

    // 2ª tentativa: URLs públicas do Drive
    try {
      const publicFull = await getPublicDriveImageBuffer(fileId, 'full')
      if (publicFull) {
        return new Response(new Uint8Array(publicFull.buffer), {
          headers: { 'Content-Type': publicFull.contentType, 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800' },
        })
      }
    } catch { /* continua */ }

    // 3ª tentativa: thumbnail_link do banco em alta resolução
    try {
      const dbFull = await getDbThumbnailBuffer(fileId, 1024)
      if (dbFull) {
        return new Response(new Uint8Array(dbFull.buffer), {
          headers: { 'Content-Type': dbFull.contentType, 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800' },
        })
      }
    } catch { /* continua */ }

    return NextResponse.json({ error: 'Imagem não encontrada.' }, { status: 404 })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[gallery/image]', fileId, mode, message)
    const isConfig = /credenciais|token|GOOGLE|não foi possível/i.test(message)
    const isPermission = /permissão|compartilh|forbidden|permission/i.test(message)
    let status = 404
    let errorMsg = 'Imagem não encontrada.'
    if (isConfig) {
      status = 503
      errorMsg = 'Configuração do Google Drive ausente ou inválida. Configure GOOGLE_SERVICE_ACCOUNT_JSON e GOOGLE_DRIVE_ROOT_FOLDER_ID na Vercel.'
    } else if (isPermission) {
      status = 403
      errorMsg = 'Sem permissão no Drive. Compartilhe a pasta do Drive com o e-mail da Service Account (Editor ou Visualizador).'
    }
    return NextResponse.json({ error: errorMsg }, { status })
  }
}
