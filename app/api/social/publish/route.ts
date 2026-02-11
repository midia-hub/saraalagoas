import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getFileDownloadBuffer } from '@/lib/drive'
import {
  createInstagramMediaContainer,
  publishInstagramMediaWithRetry,
  waitForInstagramMediaContainerReady,
} from '@/lib/meta'
import type { SupabaseClient } from '@supabase/supabase-js'

const DRIVE_PREFIX = 'drive:'
const BUCKET = 'instagram_posts'
const META_API_VERSION = 'v21.0'
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`

type MetaSelection = {
  type: 'instagram' | 'facebook'
  integrationId: string
}

type MetaIntegrationRow = {
  id: string
  page_id: string | null
  page_name: string | null
  page_access_token: string | null
  instagram_business_account_id: string | null
  instagram_username: string | null
  is_active: boolean
}

function parseMetaSelection(instanceId: string): MetaSelection | null {
  if (instanceId.startsWith('meta_ig:')) {
    const integrationId = instanceId.slice('meta_ig:'.length).trim()
    if (integrationId) return { type: 'instagram', integrationId }
  }
  if (instanceId.startsWith('meta_fb:')) {
    const integrationId = instanceId.slice('meta_fb:'.length).trim()
    if (integrationId) return { type: 'facebook', integrationId }
  }
  return null
}

async function resolveDriveFileToPublicUrl(
  db: SupabaseClient,
  fileId: string,
  index: number,
  batchKey: string
): Promise<string> {
  const { buffer, contentType } = await getFileDownloadBuffer(fileId)
  const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg'
  const path = `meta-social/${batchKey}/${String(index + 1).padStart(2, '0')}.${ext}`

  const { error: uploadError } = await db.storage.from(BUCKET).upload(path, buffer, {
    upsert: true,
    contentType: contentType || 'image/jpeg',
  })
  if (uploadError) throw new Error(`Falha ao enviar mídia para storage: ${uploadError.message}`)

  const { data } = db.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

async function publishFacebookImage(params: {
  pageId: string
  pageAccessToken: string
  imageUrl: string
  message: string
}): Promise<{ id: string }> {
  const body = new URLSearchParams({
    url: params.imageUrl,
    caption: params.message || '',
    published: 'true',
    access_token: params.pageAccessToken,
  })

  const response = await fetch(`${META_API_BASE}/${params.pageId}/photos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: 'Falha ao publicar no Facebook' } }))
    throw new Error(`Facebook publish failed: ${err.error?.message || response.statusText}`)
  }

  return response.json()
}

/**
 * Publicação a partir da galeria. Cria draft, assets (source_url = drive:fileId) e jobs na fila.
 * Para não perder qualidade: ao processar, o job usa a imagem original (Drive) e envia para a rede.
 */
export async function POST(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'galeria', action: 'view' })
  if (!access.ok) return access.response

  const body = await request.json().catch(() => ({}))
  const albumId = typeof body.albumId === 'string' ? body.albumId.trim() : ''
  const instanceIds = Array.isArray(body.instanceIds)
    ? (body.instanceIds as string[]).filter((id): id is string => typeof id === 'string')
    : []
  const text = typeof body.text === 'string' ? body.text : ''
  const mediaEdits = Array.isArray(body.mediaEdits) ? body.mediaEdits : []

  if (!albumId) {
    return NextResponse.json({ error: 'albumId é obrigatório.' }, { status: 400 })
  }
  if (instanceIds.length === 0) {
    return NextResponse.json({ error: 'Selecione ao menos uma conta em "Postar em".' }, { status: 400 })
  }
  if (mediaEdits.length === 0) {
    return NextResponse.json({ error: 'Selecione ao menos uma mídia para publicar.' }, { status: 400 })
  }

  const db = createSupabaseServerClient(request)
  const userId = access.snapshot.userId
  const now = new Date().toISOString()

  const mediaFileIds = mediaEdits
    .map((item: { id?: string }) => (typeof item?.id === 'string' ? item.id.trim() : ''))
    .filter(Boolean)
  if (mediaFileIds.length === 0) {
    return NextResponse.json({ error: 'Nenhuma mídia válida (id de arquivo obrigatório).' }, { status: 400 })
  }

  const metaSelections = instanceIds
    .map((id) => parseMetaSelection(id))
    .filter((v): v is MetaSelection => !!v)
  const legacyInstanceIds = instanceIds.filter((id) => !parseMetaSelection(id))

  // Garantir que a galeria existe
  const { data: gallery, error: galleryError } = await db
    .from('galleries')
    .select('id')
    .eq('id', albumId)
    .maybeSingle()

  if (galleryError || !gallery) {
    return NextResponse.json({ error: 'Galeria não encontrada.' }, { status: 404 })
  }

  let draftId: string | null = null
  let jobCount = 0

  // Fluxo legado: mantém fila/jobs para instâncias da tabela instagram_instances.
  if (legacyInstanceIds.length > 0) {
    const { data: draft, error: draftError } = await db
      .from('instagram_post_drafts')
      .insert({
        gallery_id: albumId,
        created_by: userId,
        status: 'ready',
        caption: text,
        preset: '4:5',
        publish_mode: 'now',
        scheduled_at: null,
        created_at: now,
        updated_at: now,
      })
      .select('id')
      .single()

    if (draftError || !draft?.id) {
      return NextResponse.json(
        { error: draftError?.message ?? 'Falha ao criar o rascunho da postagem.' },
        { status: 500 }
      )
    }

    draftId = draft.id

    const assetRows = mediaFileIds.map((fileId: string, index: number) => ({
      draft_id: draftId,
      source_url: `${DRIVE_PREFIX}${fileId}`,
      sort_order: index,
      status: 'pending',
      created_at: now,
      updated_at: now,
    }))

    const { error: assetsError } = await db.from('instagram_post_assets').insert(assetRows)
    if (assetsError) {
      await db.from('instagram_post_drafts').delete().eq('id', draftId)
      return NextResponse.json({ error: assetsError.message }, { status: 500 })
    }

    const jobRows = legacyInstanceIds.map((instanceId: string) => ({
      draft_id: draftId,
      instance_id: instanceId,
      status: 'queued',
      run_at: null,
      created_by: userId,
      created_at: now,
      updated_at: now,
    }))

    const { error: jobsError } = await db.from('instagram_post_jobs').insert(jobRows)
    if (jobsError) {
      return NextResponse.json({ error: jobsError.message }, { status: 500 })
    }
    jobCount = jobRows.length

    const baseUrl = request.nextUrl?.origin ?? process.env.NEXT_PUBLIC_VERCEL_URL ?? process.env.VERCEL_URL
    const token = request.headers.get('authorization') || request.headers.get('Authorization')
    if (baseUrl && token) {
      try {
        await fetch(`${baseUrl}/api/admin/instagram/jobs/run-due`, {
          method: 'POST',
          headers: { Authorization: token, 'Content-Type': 'application/json' },
        })
      } catch {
        // Ignora falha ao chamar run-due; os jobs continuam na fila e podem ser processados depois
      }
    }
  }

  // Fluxo Meta: publica imediatamente para as instâncias virtuais (Instagram/Facebook via OAuth Meta).
  const metaResults: Array<{ instanceId: string; provider: 'instagram' | 'facebook'; ok: boolean; error?: string }> = []
  if (metaSelections.length > 0) {
    const integrationIds = Array.from(new Set(metaSelections.map((s) => s.integrationId)))
    const { data: integrations, error: integrationsError } = await db
      .from('meta_integrations')
      .select('id,page_id,page_name,page_access_token,instagram_business_account_id,instagram_username,is_active')
      .in('id', integrationIds)
      .eq('is_active', true)

    if (integrationsError) {
      return NextResponse.json({ error: integrationsError.message }, { status: 500 })
    }

    const map = new Map<string, MetaIntegrationRow>()
    ;(integrations || []).forEach((row) => map.set(row.id, row as MetaIntegrationRow))

    const availableMetaSelections = metaSelections.filter((selection) => {
      const hasIntegration = map.has(selection.integrationId)
      if (hasIntegration) return true

      const missingInstanceId = selection.type === 'instagram'
        ? `meta_ig:${selection.integrationId}`
        : `meta_fb:${selection.integrationId}`

      metaResults.push({
        instanceId: missingInstanceId,
        provider: selection.type,
        ok: false,
        error: 'Integração Meta não encontrada. Reconecte a conta em Instâncias (Meta).',
      })
      return false
    })

    const mediaUrls: string[] = []
    if (availableMetaSelections.length > 0) {
      const batchKey = `${Date.now()}-${userId}`
      for (let i = 0; i < mediaFileIds.length; i++) {
        const url = await resolveDriveFileToPublicUrl(db, mediaFileIds[i], i, batchKey)
        mediaUrls.push(url)
      }
    }

    const firstImageUrl = mediaUrls[0]
    for (const selection of availableMetaSelections) {
      const instanceId = selection.type === 'instagram'
        ? `meta_ig:${selection.integrationId}`
        : `meta_fb:${selection.integrationId}`
      try {
        const integration = map.get(selection.integrationId)
        if (!integration) throw new Error('Integração Meta não encontrada.')
        if (!integration.page_access_token) throw new Error('Integração sem page_access_token.')

        if (selection.type === 'instagram') {
          if (!integration.instagram_business_account_id) {
            throw new Error('Integração sem conta Instagram Business vinculada.')
          }
          const container = await createInstagramMediaContainer({
            igUserId: integration.instagram_business_account_id,
            imageUrl: firstImageUrl,
            caption: text || '',
            accessToken: integration.page_access_token,
          })
          if (!container?.id) {
            throw new Error('Meta create container failed: ID do container não retornado.')
          }
          await waitForInstagramMediaContainerReady({
            containerId: container.id,
            accessToken: integration.page_access_token,
          })
          await publishInstagramMediaWithRetry({
            igUserId: integration.instagram_business_account_id,
            creationId: container.id,
            accessToken: integration.page_access_token,
          })
        } else {
          if (!integration.page_id) throw new Error('Integração sem página do Facebook.')
          await publishFacebookImage({
            pageId: integration.page_id,
            pageAccessToken: integration.page_access_token,
            imageUrl: firstImageUrl,
            message: text || '',
          })
        }

        metaResults.push({ instanceId, provider: selection.type, ok: true })
      } catch (e) {
        metaResults.push({
          instanceId,
          provider: selection.type,
          ok: false,
          error: e instanceof Error ? e.message : 'Falha ao publicar no Meta.',
        })
      }
    }
  }

  const metaSuccess = metaResults.filter((r) => r.ok).length
  const metaFailed = metaResults.length - metaSuccess

  let message = ''
  if (jobCount > 0) {
    message += `Post enviado para fila em ${jobCount} instância(s) legado. `
  }
  if (metaResults.length > 0) {
    message += `Publicação Meta: ${metaSuccess} sucesso(s), ${metaFailed} falha(s). `
    if (mediaFileIds.length > 1) {
      message += 'No fluxo Meta direto, foi usada a primeira mídia selecionada.'
    }
  }
  if (!message) {
    message = 'Nenhuma instância válida encontrada para publicação.'
  }

  return NextResponse.json({
    ok: metaFailed === 0,
    message: message.trim(),
    draftId,
    jobCount,
    metaResults,
  })
}
