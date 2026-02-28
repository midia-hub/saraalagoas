import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import {
  executeMetaPublishWithUrls,
  resolveDriveFileToPublicUrl,
  type PostType,
} from '@/lib/publish-meta'
import sharp from 'sharp'

const BUCKET = 'instagram_posts'

/**
 * Faz upload de base64 para Supabase Storage e retorna a URL pública.
 */
async function uploadBase64ToStorage(
  db: ReturnType<typeof createSupabaseServerClient>,
  base64DataUrl: string,
  path: string
): Promise<string> {
  const comma = base64DataUrl.indexOf(',')
  if (comma < 0)
    throw new Error('base64 inválido: separador "," não encontrado.')
  const buffer = Buffer.from(base64DataUrl.slice(comma + 1), 'base64')

  // Detectar tipo de mídia pelo header do data URL
  const mimeMatch = base64DataUrl.match(/^data:([^;]+);base64,/)
  const mime = mimeMatch?.[1] ?? 'image/jpeg'
  const isVideo = mime.startsWith('video/')

  let finalBuffer: Buffer
  let contentType: string

  if (isVideo) {
    // Vídeos: sem processamento sharp, upload direto
    finalBuffer = buffer
    contentType = mime
  } else {
    // Imagens: normalizar com sharp
    finalBuffer = await sharp(buffer)
      .rotate()
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer()
    contentType = 'image/jpeg'
  }

  const { error } = await db.storage
    .from(BUCKET)
    .upload(path, finalBuffer, { upsert: true, contentType })

  if (error) throw new Error(`Falha ao enviar mídia: ${error.message}`)

  const { data } = db.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

/**
 * POST /api/midia/nova-postagem
 *
 * Body:
 * {
 *   instanceIds:    string[]   – IDs no formato "meta_ig:<uuid>" ou "meta_fb:<uuid>"
 *   destinations:  { instagram: boolean; facebook: boolean }
 *   text:          string      – Legenda do post
 *   postType?:     'feed' | 'reel' | 'story'  – Tipo de postagem (padrão: 'feed')
 *   orderedMedia:  Array<{ type: 'upload'; value: string } | { type: 'gallery'; value: string }>
 *                  – Lista ordenada de mídias (upload = base64, gallery = Drive fileId)
 *   scheduledAt?:  string      – ISO 8601 para agendamento (omitir = publicar agora)
 * }
 */
export async function POST(request: NextRequest) {
  const access = await requireAccess(request, {
    pageKey: 'instagram',
    action: 'view',
  })
  if (!access.ok) return access.response

  const body = await request.json().catch(() => ({}))

  const instanceIds: string[] = Array.isArray(body.instanceIds)
    ? body.instanceIds
        .filter((v: unknown): v is string => typeof v === 'string')
        .slice(0, 20)
    : []

  const isUuid = (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  const extractIntegrationId = (rawValue: string): string => {
    let value = rawValue.trim()
    while (value.startsWith('meta_ig:') || value.startsWith('meta_fb:')) {
      value = value.slice(value.indexOf(':') + 1).trim()
    }
    return isUuid(value) ? value : ''
  }

  const integrationIds = Array.from(
    new Set(
      instanceIds
        .map(extractIntegrationId)
        .filter(Boolean)
    )
  )

  const destinations = {
    instagram: Boolean(body.destinations?.instagram ?? true),
    facebook: Boolean(body.destinations?.facebook ?? false),
  }

  const text: string =
    typeof body.text === 'string' ? body.text : ''

  const postType: PostType =
    body.postType === 'reel' || body.postType === 'story' ? body.postType : 'feed'

  const thumbOffset: number | undefined =
    postType === 'reel' && typeof body.thumbOffset === 'number' && body.thumbOffset > 0
      ? Math.round(body.thumbOffset)
      : undefined

  // Mídia pode vir como lista ordenada com tipo: { type: 'upload'|'gallery', value: string }[]
  // OU no formato legado com arrays separados (imageDataUrls + galleryFileIds)
  type MediaEntry =
    | { type: 'upload'; value: string }
    | { type: 'gallery'; value: string }
    | { type: 'url'; value: string }

  let orderedMedia: MediaEntry[] = []

  if (Array.isArray(body.orderedMedia)) {
    orderedMedia = (
      body.orderedMedia as Array<{ type: string; value: string }>
    )
      .filter(
        (e) =>
          (e.type === 'upload' || e.type === 'gallery' || e.type === 'url') &&
          typeof e.value === 'string'
      )
      .slice(0, 10) as MediaEntry[]
  } else {
    // Legado: arrays separados
    const rawDataUrls: string[] = Array.isArray(body.imageDataUrls)
      ? body.imageDataUrls.filter(
          (v: unknown): v is string => typeof v === 'string'
        )
      : []
    const galleryFileIds: string[] = Array.isArray(body.galleryFileIds)
      ? body.galleryFileIds.filter(
          (v: unknown): v is string => typeof v === 'string'
        )
      : []
    orderedMedia = [
      ...rawDataUrls.map((v): MediaEntry => ({ type: 'upload', value: v })),
      ...galleryFileIds.map(
        (v): MediaEntry => ({ type: 'gallery', value: v })
      ),
    ].slice(0, 10)
  }

  const scheduledAt: string | null =
    typeof body.scheduledAt === 'string' && body.scheduledAt.trim()
      ? body.scheduledAt.trim()
      : null

  // Validações
  if (instanceIds.length === 0) {
    return NextResponse.json(
      { error: 'Selecione pelo menos uma conta.' },
      { status: 400 }
    )
  }
  if (integrationIds.length === 0) {
    return NextResponse.json(
      { error: 'Selecione pelo menos uma integração Meta válida.' },
      { status: 400 }
    )
  }
  if (!destinations.instagram && !destinations.facebook) {
    return NextResponse.json(
      {
        error:
          'Selecione pelo menos um canal (Instagram ou Facebook).',
      },
      { status: 400 }
    )
  }
  if (orderedMedia.length === 0) {
    return NextResponse.json(
      { error: 'Adicione pelo menos uma mídia.' },
      { status: 400 }
    )
  }
  // Reel e Story: apenas 1 item de mídia
  if ((postType === 'reel' || postType === 'story') && orderedMedia.length > 1) {
    return NextResponse.json(
      { error: `${postType === 'reel' ? 'Reels' : 'Stories'} aceitam apenas 1 mídia.` },
      { status: 400 }
    )
  }
  if (scheduledAt) {
    const scheduledDate = new Date(scheduledAt)
    if (
      isNaN(scheduledDate.getTime()) ||
      scheduledDate.getTime() <= Date.now()
    ) {
      return NextResponse.json(
        {
          error:
            'A data/hora de agendamento deve ser no futuro.',
        },
        { status: 400 }
      )
    }
  }

  const db = createSupabaseServerClient(request)
  const userId = access.snapshot.userId
  const batchKey = `direct-${Date.now()}-${userId.slice(0, 8)}`

  // Detectar se a mídia é vídeo (base no tipo da primeira entrada upload)
  const firstUpload = orderedMedia.find((e) => e.type === 'upload')
  const isVideoMedia =
    typeof firstUpload?.value === 'string' &&
    firstUpload.value.startsWith('data:video/')

  // Processar todas as mídias em ordem para obter URLs públicas
  const mediaUrls: string[] = []
  try {
    for (let i = 0; i < orderedMedia.length; i++) {
      const entry = orderedMedia[i]
      // Detectar se este item é vídeo para usar extensão correta
      const isItemVideo =
        entry.type === 'upload' &&
        typeof entry.value === 'string' &&
        entry.value.startsWith('data:video/')
      const ext = isItemVideo ? 'mp4' : 'jpg'
      const path = `direct/${batchKey}/${String(i + 1).padStart(2, '0')}.${ext}`
      if (entry.type === 'upload') {
        const publicUrl = await uploadBase64ToStorage(
          db,
          entry.value,
          path
        )
        mediaUrls.push(publicUrl)
      } else if (entry.type === 'gallery') {
        // Arquivo da galeria (Drive): resolver via resolveDriveFileToPublicUrl
        const publicUrl = await resolveDriveFileToPublicUrl(
          db,
          entry.value,
          i,
          batchKey
        )
        mediaUrls.push(publicUrl)
      } else {
        const url = entry.value.trim()
        if (!/^https?:\/\//i.test(url)) {
          throw new Error('URL de mídia inválida para refazer postagem.')
        }
        mediaUrls.push(url)
      }
    }
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : 'Falha ao processar as mídias.',
      },
      { status: 500 }
    )
  }

  // AGENDAMENTO
  if (scheduledAt) {
    const mediaSpecs = mediaUrls.map((url) => ({ url }))
    const { data: scheduled, error: scheduledError } = await db
      .from('scheduled_social_posts')
      .insert({
        album_id: null,
        created_by: userId,
        scheduled_at: new Date(scheduledAt).toISOString(),
        instance_ids: integrationIds,
        destinations,
        caption: text,
        media_specs: mediaSpecs,
        status: 'pending',
        // Campo extra para contexto (não bloqueia se não existir na tabela)
        ...(postType !== 'feed' ? { post_type: postType } : {}),
      })
      .select('id')
      .single()

    if (scheduledError) {
      return NextResponse.json(
        { error: scheduledError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      scheduled: true,
      scheduledAt: new Date(scheduledAt).toISOString(),
      id: scheduled?.id,
      message: `Postagem agendada para ${new Date(scheduledAt).toLocaleString('pt-BR')}.`,
    })
  }

  // PUBLICAÇÃO IMEDIATA
  try {
    const { metaResults } = await executeMetaPublishWithUrls({
      db,
      userId,
      instanceIds: integrationIds,
      destinations,
      text,
      imageUrls: mediaUrls,
      postType,
      isVideo: isVideoMedia,
      ...(thumbOffset !== undefined ? { thumbOffset } : {}),
    })

    const successCount = metaResults.filter((r) => r.ok).length
    const failedResults = metaResults.filter((r) => !r.ok)
    const now = new Date().toISOString()

    const { error: logError } = await db.from('scheduled_social_posts').insert({
      album_id: null,
      created_by: userId,
      scheduled_at: now,
      instance_ids: integrationIds,
      destinations,
      caption: text,
      media_specs: mediaUrls.map((url) => ({ url })),
      status: successCount > 0 ? 'published' : 'failed',
      published_at: successCount > 0 ? now : null,
      error_message: failedResults.length > 0 ? failedResults.map((r) => r.error).filter(Boolean).join('; ') : null,
      created_at: now,
      updated_at: now,
    })
    if (logError) {
      console.error('[nova-postagem] falha ao registrar log da postagem imediata:', logError.message)
    }

    const message =
      successCount > 0
        ? `Publicado com sucesso em ${successCount} conta(s).`
        : 'Nenhuma conta publicou com sucesso.'

    return NextResponse.json({
      ok: successCount > 0,
      metaResults,
      message,
      errors: failedResults.map((r) => r.error).filter(Boolean),
    })
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : 'Erro interno ao publicar.',
      },
      { status: 500 }
    )
  }
}
