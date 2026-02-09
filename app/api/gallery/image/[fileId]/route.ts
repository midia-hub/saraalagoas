/**
 * GET /api/gallery/image/[fileId]
 * Retorna a imagem do Google Drive para exibição na galeria.
 * Query: ?w=400 para miniatura (menor payload no grid).
 * Só serve arquivos que existem em gallery_files (segurança).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getFileContentStream } from '@/lib/drive'

const CACHE_MAX_AGE = 60 * 60 * 24 * 7 // 7 dias
const CACHE_STALE = 60 * 60 * 24 * 30 // 30 dias stale-while-revalidate

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const { fileId: rawFileId } = await params
  const fileId = rawFileId?.replace(/\/$/, '').trim()
  if (!fileId) {
    return NextResponse.json({ error: 'fileId required' }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  const { data: fileRow } = await supabase
    .from('gallery_files')
    .select('drive_file_id')
    .eq('drive_file_id', fileId)
    .limit(1)
    .single()

  if (!fileRow) {
    return NextResponse.json({ error: 'Image not found' }, { status: 404 })
  }

  const widthParam = request.nextUrl.searchParams.get('w')
  const thumbWidth = widthParam ? Math.min(800, Math.max(200, parseInt(widthParam, 10) || 0)) : 0

  try {
    const { stream, mimeType } = await getFileContentStream(fileId)
    let buffer = await streamToBuffer(stream)

    let didResize = false
    if (thumbWidth > 0 && buffer.length > 0) {
      try {
        const sharp = (await import('sharp')).default
        buffer = await sharp(buffer)
          .resize(thumbWidth, thumbWidth, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 80, mozjpeg: true })
          .toBuffer()
        didResize = true
      } catch {
        // sharp não disponível ou falhou: envia imagem original
      }
    }

    const contentType = didResize ? 'image/jpeg' : mimeType
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': `public, max-age=${CACHE_MAX_AGE}, s-maxage=${CACHE_MAX_AGE}, stale-while-revalidate=${CACHE_STALE}`,
      },
    })
  } catch (error) {
    console.error('Gallery image stream error:', error)
    return NextResponse.json(
      { error: 'Failed to load image' },
      { status: 500 }
    )
  }
}

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of stream as AsyncIterable<Buffer | Uint8Array>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}
