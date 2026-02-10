import { NextRequest, NextResponse } from 'next/server'
import { Readable } from 'stream'
import { getFileDownloadStream, getFileThumbnailBuffer } from '@/lib/drive'

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
  const fileId = request.nextUrl.searchParams.get('fileId')
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

      const thumb = await getFileThumbnailBuffer(fileId, thumbSize)
      if (thumb) {
        thumbCache.set(cacheKey, {
          expiresAt: Date.now() + THUMB_CACHE_MS,
          contentType: thumb.contentType,
          buffer: thumb.buffer,
        })
        return new Response(new Uint8Array(thumb.buffer), {
          headers: {
            'Content-Type': thumb.contentType,
            'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
          },
        })
      }
    }

    // full: stream do arquivo original (qualidade preservada para postagem)
    const { stream, contentType } = await getFileDownloadStream(fileId)
    const webStream = Readable.toWeb(stream) as ReadableStream<Uint8Array>
    return new Response(webStream, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[gallery/image]', fileId, mode, message)
    const isConfig = /credenciais|token|GOOGLE|não foi possível/i.test(message)
    return NextResponse.json(
      { error: isConfig ? 'Configuração do Google Drive ausente ou inválida. Veja docs/VERCEL-DRIVE-ENV.md' : 'Imagem não encontrada' },
      { status: isConfig ? 503 : 404 }
    )
  }
}
