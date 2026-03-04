import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import {
  executeMetaPublishWithUrls,
  resolveDriveFileToPublicUrl,
  type PostType,
} from '@/lib/publish-meta'
import { createInstagramReelContainer } from '@/lib/meta'
import { pollAndPublishContainers } from '@/lib/video-container-polling'
import sharp from 'sharp'

// Vercel: tempo máximo de execução (plano Pro suporta até 300s)
export const maxDuration = 300

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
  const db = createSupabaseServerClient(request)

  let instanceIds: string[] = Array.isArray(body.instanceIds)
    ? body.instanceIds
        .filter((v: unknown): v is string => typeof v === 'string')
        .slice(0, 20)
    : []

  // Suporte a Grupos de Publicação
  if (body.groupId && typeof body.groupId === 'string') {
    const { data: groupAccounts, error: groupError } = await db
      .from('publication_group_accounts')
      .select('account_id')
      .eq('group_id', body.groupId)

    if (groupError) {
      return NextResponse.json(
        { error: `Falha ao carregar grupo: ${groupError.message}` },
        { status: 500 }
      )
    }

    if (groupAccounts && groupAccounts.length > 0) {
      // Adiciona os IDs das contas do grupo à lista de instâncias
      // Preservando o formato esperado pelo extrator (meta_ig:uuid)
      const groupInstanceIds = groupAccounts.map(a => `meta_ig:${a.account_id}`)
      instanceIds = Array.from(new Set([...instanceIds, ...groupInstanceIds]))
    }
  }

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

  const customCover: string | undefined =
    postType === 'reel' && typeof body.customCover === 'string' && body.customCover.startsWith('data:image/')
      ? body.customCover
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

  const userId = access.snapshot.userId
  const batchKey = `${Date.now()}-${userId}`

  // Processar capa customizada se existir
  let customCoverPublicUrl: string | undefined = undefined
  if (customCover) {
    try {
      customCoverPublicUrl = await uploadBase64ToStorage(
        db,
        customCover,
        `direct/${batchKey}/reel_cover.jpg`
      )
    } catch (e) {
      console.error('[nova-postagem] erro ao subir capa customizada:', e)
    }
  }

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

  // Detectar se a mídia é vídeo: checar qualquer entrada upload com data:video/,
  // ou entrada url/gallery com extensão de vídeo
  const isVideoMedia = orderedMedia.some((e) => {
    if (e.type === 'upload') return typeof e.value === 'string' && e.value.startsWith('data:video/')
    if (e.type === 'url') return /\.(mp4|mov|avi|mkv|webm)$/i.test(e.value)
    return false // gallery: não é possível detectar vídeo antes do download
  })

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
    // Para reels, salva thumbOffset e coverUrl no primeiro item de media_specs
    // para que o cron possa usá-los ao publicar
    const mediaSpecs = mediaUrls.map((url, i) => {
      if (i === 0 && postType === 'reel') {
        return {
          url,
          ...(customCoverPublicUrl ? { coverUrl: customCoverPublicUrl } : {}),
          ...(!customCoverPublicUrl && thumbOffset !== undefined ? { thumbOffset } : {}),
        }
      }
      return { url }
    })
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
        publication_group_id: (body.groupId && typeof body.groupId === 'string') ? body.groupId : null,
        post_type: postType,
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

  // ── REEL DE VÍDEO (FLUXO ASSÍNCRONO) ────────────────────────────────────────
  // O Meta pode demorar minutos para processar um vídeo. Para não ultrapassar o
  // timeout da Vercel (300s), criamos o container, salvamos no banco e retornamos
  // imediatamente. O cron /api/cron/process-video-containers monitora o status e
  // publica automaticamente quando o Meta sinalizar FINISHED.
  if (postType === 'reel' && isVideoMedia && !scheduledAt) {
    const videoUrl = mediaUrls[0]
    const reelErrors: string[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const containerRows: any[] = []

    const { data: integrations, error: integrationsError } = await db
      .from('meta_integrations')
      .select('id,instagram_business_account_id,page_access_token,is_active')
      .in('id', integrationIds)
      .eq('created_by', userId)
      .eq('is_active', true)

    if (integrationsError) {
      return NextResponse.json({ error: integrationsError.message }, { status: 500 })
    }

    for (const integration of integrations || []) {
      if (!integration.instagram_business_account_id || !integration.page_access_token) {
        reelErrors.push(`Integração ${integration.id}: sem dados de conta Instagram.`)
        continue
      }
      try {
        const container = await createInstagramReelContainer({
          igUserId: integration.instagram_business_account_id,
          videoUrl,
          caption: text || '',
          shareToFeed: true,
          ...(customCoverPublicUrl ? { coverUrl: customCoverPublicUrl } : {}),
          ...(!customCoverPublicUrl && thumbOffset !== undefined ? { thumbOffset } : {}),
          accessToken: integration.page_access_token,
        })
        containerRows.push({
          container_id: container.id,
          ig_user_id: integration.instagram_business_account_id,
          integration_id: integration.id,
          access_token: integration.page_access_token,
          caption: text || '',
          video_url: videoUrl,
          created_by: userId,
          instance_ids: integrationIds,
          destinations,
          ...(customCoverPublicUrl ? { cover_url: customCoverPublicUrl } : {}),
          ...(thumbOffset !== undefined ? { thumb_offset: thumbOffset } : {}),
        })
      } catch (e) {
        reelErrors.push(
          `Integração ${integration.id}: ${
            e instanceof Error ? e.message : 'Falha ao criar container do Reel.'
          }`
        )
      }
    }

    if (containerRows.length === 0) {
      return NextResponse.json({
        ok: false,
        message: 'Nenhum container de Reel foi criado.',
        errors: reelErrors,
      })
    }

    // Criar log em scheduled_social_posts para obter o ID de referência
    const { data: logRow } = await db
      .from('scheduled_social_posts')
      .insert({
        album_id: null,
        created_by: userId,
        scheduled_at: new Date().toISOString(),
        instance_ids: integrationIds,
        destinations,
        caption: text,
        media_specs: mediaUrls.map((url) => ({ url })),
        status: 'video_processing',
        post_type: 'reel',
        publication_group_id:
          body.groupId && typeof body.groupId === 'string' ? body.groupId : null,
      })
      .select('id')
      .single()

    const rowsWithRef = containerRows.map((r) => ({
      ...r,
      scheduled_post_id: logRow?.id ?? null,
    }))

    // Polling inline: aguarda o Meta processar e publica automaticamente.
    // Containers que não terminam dentro do timeout vão para pending_video_containers
    // e serão publicados pelo cron diário (fallback).
    const pollResults = await pollAndPublishContainers({
      db,
      containers: rowsWithRef,
      maxWaitMs: 270_000,
    })

    const publishedCount = pollResults.filter((r) => r.status === 'published').length
    const timedOutCount = pollResults.filter((r) => r.status === 'timeout').length
    const failedCount = pollResults.filter((r) => r.status === 'failed').length
    const pollErrors = pollResults
      .filter((r) => r.status === 'failed')
      .map((r) => r.error)
      .filter(Boolean) as string[]

    let message: string
    if (publishedCount > 0 && timedOutCount === 0) {
      message = `Reel publicado com sucesso em ${publishedCount} conta(s).`
    } else if (publishedCount > 0 && timedOutCount > 0) {
      message = `Reel publicado em ${publishedCount} conta(s). ${timedOutCount} conta(s) ainda processando — serão publicadas automaticamente.`
    } else if (timedOutCount > 0) {
      message = `Reel em processamento em ${timedOutCount} conta(s). Será publicado automaticamente em breve.`
    } else {
      message = 'Nenhum Reel foi publicado com sucesso.'
    }

    return NextResponse.json({
      ok: publishedCount > 0 || timedOutCount > 0,
      published: publishedCount > 0,
      processing: timedOutCount > 0,
      message,
      errors: [...reelErrors, ...pollErrors],
      publishedCount,
      timedOutCount,
      failedCount,
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
      ...(customCoverPublicUrl ? { coverUrl: customCoverPublicUrl } : {}),
      ...(!customCoverPublicUrl && thumbOffset !== undefined ? { thumbOffset } : {}),
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
      post_type: postType,
      status: successCount > 0 ? 'published' : 'failed',
      published_at: successCount > 0 ? now : null,
      error_message: failedResults.length > 0 ? failedResults.map((r) => r.error).filter(Boolean).join('; ') : null,
      created_at: now,
      updated_at: now,
      publication_group_id: (body.groupId && typeof body.groupId === 'string') ? body.groupId : null,
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
    console.error('[nova-postagem] erro fatal na publicação imediata:', e)
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : 'Erro interno fatal ao publicar. Verifique os logs do servidor.',
      },
      { status: 500 }
    )
  }
}
