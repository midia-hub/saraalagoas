import type { SupabaseClient } from '@supabase/supabase-js'
import sharp from 'sharp'

const BUCKET = 'instagram_posts'

/**
 * Envia data URL (imagem ou vídeo) ao bucket `instagram_posts` e retorna a URL pública.
 * Usado pela nova postagem e pelo upload em etapas (evita corpo JSON gigante / 413).
 */
export async function uploadDataUrlToInstagramPostsBucket(
  db: SupabaseClient,
  base64DataUrl: string,
  path: string
): Promise<string> {
  const comma = base64DataUrl.indexOf(',')
  if (comma < 0) throw new Error('base64 inválido: separador "," não encontrado.')
  const buffer = Buffer.from(base64DataUrl.slice(comma + 1), 'base64')

  const mimeMatch = base64DataUrl.match(/^data:([^;]+);base64,/)
  const mime = mimeMatch?.[1] ?? 'image/jpeg'
  const isVideo = mime.startsWith('video/')

  let finalBuffer: Buffer
  let contentType: string

  if (isVideo) {
    finalBuffer = buffer
    contentType = mime
  } else {
    finalBuffer = await sharp(buffer).rotate().jpeg({ quality: 90, mozjpeg: true }).toBuffer()
    contentType = 'image/jpeg'
  }

  const { error } = await db.storage
    .from(BUCKET)
    .upload(path, finalBuffer, { upsert: true, contentType })

  if (error) throw new Error(`Falha ao enviar mídia: ${error.message}`)

  const { data } = db.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}
