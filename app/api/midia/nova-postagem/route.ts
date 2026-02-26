import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import {
  executeMetaPublishWithUrls,
  resolveDriveFileToPublicUrl,
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
  const normalized = await sharp(buffer)
    .rotate()
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer()

  const { error } = await db.storage
    .from(BUCKET)
    .upload(path, normalized, { upsert: true, contentType: 'image/jpeg' })

  if (error) throw new Error(`Falha ao enviar imagem: ${error.message}`)

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

  const integrationIds = Array.from(
    new Set(
      instanceIds
        .map((id) => {
          const value = id.trim()
          if (value.startsWith('meta_ig:')) return value.slice('meta_ig:'.length).trim()
          if (value.startsWith('meta_fb:')) return value.slice('meta_fb:'.length).trim()
          return value
        })
        .filter((id) =>
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
        )
    )
  )

  const destinations = {
    instagram: Boolean(body.destinations?.instagram ?? true),
    facebook: Boolean(body.destinations?.facebook ?? false),
  }

  const text: string =
    typeof body.text === 'string' ? body.text : ''

  // Mídia pode vir como lista ordenada com tipo: { type: 'upload'|'gallery', value: string }[]
  // OU no formato legado com arrays separados (imageDataUrls + galleryFileIds)
  type MediaEntry =
    | { type: 'upload'; value: string }
    | { type: 'gallery'; value: string }

  let orderedMedia: MediaEntry[] = []

  if (Array.isArray(body.orderedMedia)) {
    orderedMedia = (
      body.orderedMedia as Array<{ type: string; value: string }>
    )
      .filter(
        (e) =>
          (e.type === 'upload' || e.type === 'gallery') &&
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
      { error: 'Adicione pelo menos uma imagem.' },
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

  // Processar todas as mídias em ordem para obter URLs públicas
  const imageUrls: string[] = []
  try {
    for (let i = 0; i < orderedMedia.length; i++) {
      const entry = orderedMedia[i]
      const path = `direct/${batchKey}/${String(i + 1).padStart(2, '0')}.jpg`
      if (entry.type === 'upload') {
        const publicUrl = await uploadBase64ToStorage(
          db,
          entry.value,
          path
        )
        imageUrls.push(publicUrl)
      } else {
        // Arquivo da galeria (Drive): resolver via resolveDriveFileToPublicUrl
        const publicUrl = await resolveDriveFileToPublicUrl(
          db,
          entry.value,
          i,
          batchKey
        )
        imageUrls.push(publicUrl)
      }
    }
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : 'Falha ao processar as imagens.',
      },
      { status: 500 }
    )
  }

  // AGENDAMENTO
  if (scheduledAt) {
    const mediaSpecs = imageUrls.map((url) => ({ url }))
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
      instanceIds,
      destinations,
      text,
      imageUrls,
    })

    const successCount = metaResults.filter((r) => r.ok).length
    const failedResults = metaResults.filter((r) => !r.ok)

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
