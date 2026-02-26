import type { SupabaseClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { getFileDownloadBuffer } from '@/lib/drive'
import {
  createInstagramMediaContainer,
  createInstagramCarouselItemContainer,
  createInstagramCarouselContainer,
  publishInstagramMediaWithRetry,
  waitForInstagramMediaContainerReady,
} from '@/lib/meta'

const BUCKET = 'instagram_posts'
const META_API_VERSION = 'v21.0'
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`

export type CropMode = 'original' | '1:1' | '1.91:1' | '4:5'
export type MediaEditInput = {
  id?: string
  cropMode?: CropMode
  altText?: string
  croppedUrl?: string
}

type MetaSelection = {
  type: 'instagram' | 'facebook'
  integrationId: string
}

type MetaIntegrationRow = {
  id: string
  page_id: string | null
  page_access_token: string | null
  instagram_business_account_id: string | null
  is_active: boolean
}

export type MetaPublishResult = {
  instanceId: string
  provider: 'instagram' | 'facebook'
  ok: boolean
  error?: string
}

export async function resolveDriveFileToPublicUrl(
  db: SupabaseClient,
  fileId: string,
  index: number,
  batchKey: string,
  edit?: MediaEditInput
): Promise<string> {
  const toJpeg = async (input: Buffer): Promise<Buffer> =>
    sharp(input).rotate().jpeg({ quality: 90, mozjpeg: true }).toBuffer()

  const cropByMode = async (input: Buffer, mode?: CropMode): Promise<Buffer> => {
    if (!mode || mode === 'original') return input
    const image = sharp(input).rotate()
    const metadata = await image.metadata()
    const width = metadata.width || 0
    const height = metadata.height || 0
    if (!width || !height) return input
    let targetRatio = 0
    if (mode === '1:1') targetRatio = 1
    if (mode === '1.91:1') targetRatio = 1.91
    if (mode === '4:5') targetRatio = 4 / 5
    if (!targetRatio) return input
    const currentRatio = width / height
    let cropWidth = width
    let cropHeight = height
    if (currentRatio > targetRatio) cropWidth = Math.floor(height * targetRatio)
    else cropHeight = Math.floor(width / targetRatio)
    const left = Math.max(0, Math.floor((width - cropWidth) / 2))
    const top = Math.max(0, Math.floor((height - cropHeight) / 2))
    return image.extract({ left, top, width: cropWidth, height: cropHeight }).toBuffer()
  }

  const parseDataUrl = (value?: string): Buffer | null => {
    if (!value || typeof value !== 'string') return null
    if (!value.startsWith('data:image/')) return null
    const comma = value.indexOf(',')
    if (comma < 0) return null
    try {
      return Buffer.from(value.slice(comma + 1), 'base64')
    } catch {
      return null
    }
  }

  const croppedBuffer = parseDataUrl(edit?.croppedUrl)
  const { buffer, contentType } = croppedBuffer
    ? { buffer: croppedBuffer, contentType: 'image/jpeg' }
    : await getFileDownloadBuffer(fileId)
  const safeContentType = (contentType || '').toLowerCase()
  if (!safeContentType.startsWith('image/')) {
    throw new Error(`Arquivo inválido para Instagram (apenas imagem): ${fileId}`)
  }
  const croppedByMode = croppedBuffer ? buffer : await cropByMode(buffer, edit?.cropMode)
  const normalizedBuffer = await toJpeg(croppedByMode)
  const path = `meta-social/${batchKey}/${String(index + 1).padStart(2, '0')}.jpg`
  const { error: uploadError } = await db.storage.from(BUCKET).upload(path, normalizedBuffer, {
    upsert: true,
    contentType: 'image/jpeg',
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

async function publishFacebookMultipleImages(params: {
  pageId: string
  pageAccessToken: string
  imageUrls: string[]
  message: string
}): Promise<{ id: string }> {
  const { pageId, pageAccessToken, imageUrls, message } = params
  const attachedMediaIds: string[] = []
  for (const imageUrl of imageUrls) {
    const body = new URLSearchParams({
      url: imageUrl,
      published: 'false',
      access_token: pageAccessToken,
    })
    const response = await fetch(`${META_API_BASE}/${pageId}/photos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: { message: 'Falha ao fazer upload da foto' } }))
      throw new Error(`Facebook photo upload failed: ${err.error?.message || response.statusText}`)
    }
    const result = await response.json()
    attachedMediaIds.push(result.id)
  }
  const attachedMedia = attachedMediaIds.map((id) => ({ media_fbid: id }))
  const postBody = {
    message: message || '',
    attached_media: attachedMedia,
    access_token: pageAccessToken,
  }
  const postResponse = await fetch(`${META_API_BASE}/${pageId}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(postBody),
  })
  if (!postResponse.ok) {
    const err = await postResponse.json().catch(() => ({ error: { message: 'Falha ao criar post no Facebook' } }))
    throw new Error(`Facebook feed post failed: ${err.error?.message || postResponse.statusText}`)
  }
  return postResponse.json()
}

function buildMetaSelections(
  instanceIds: string[],
  destinations: { instagram: boolean; facebook: boolean }
): MetaSelection[] {
  const metaSelections: MetaSelection[] = []
  const seen = new Set<string>()
  for (const instanceId of instanceIds) {
    let integrationId = ''
    if (instanceId.startsWith('meta_ig:')) integrationId = instanceId.slice('meta_ig:'.length).trim()
    else if (instanceId.startsWith('meta_fb:')) integrationId = instanceId.slice('meta_fb:'.length).trim()
    if (!integrationId || seen.has(integrationId)) continue
    seen.add(integrationId)
    if (destinations.instagram) metaSelections.push({ type: 'instagram', integrationId })
    if (destinations.facebook) metaSelections.push({ type: 'facebook', integrationId })
  }
  return metaSelections
}

export type ExecuteMetaPublishParams = {
  db: SupabaseClient
  userId: string
  albumId: string
  instanceIds: string[]
  destinations: { instagram: boolean; facebook: boolean }
  text: string
  mediaEdits: MediaEditInput[]
}

export type ExecuteMetaPublishWithUrlsParams = {
  db: SupabaseClient
  userId: string
  instanceIds: string[]
  destinations: { instagram: boolean; facebook: boolean }
  text: string
  /** URLs públicas das imagens já hospedadas (Supabase Storage ou outra CDN pública). */
  imageUrls: string[]
}

/**
 * Publica no Meta (Instagram e/ou Facebook) passando diretamente as URLs das imagens,
 * sem necessidade de álbum/Drive. Usado pelo fluxo "Nova Postagem" standalone.
 */
export async function executeMetaPublishWithUrls(params: ExecuteMetaPublishWithUrlsParams): Promise<{
  metaResults: MetaPublishResult[]
}> {
  const { db, userId, instanceIds, destinations, text, imageUrls } = params
  if (imageUrls.length === 0) return { metaResults: [] }

  const metaSelections = buildMetaSelections(instanceIds, destinations)
  const metaResults: MetaPublishResult[] = []

  const integrationIds = Array.from(new Set(metaSelections.map((s) => s.integrationId)))
  const { data: integrations, error: integrationsError } = await db
    .from('meta_integrations')
    .select('id,page_id,page_access_token,instagram_business_account_id,is_active')
    .in('id', integrationIds)
    .eq('created_by', userId)
    .eq('is_active', true)

  if (integrationsError) throw new Error(integrationsError.message)

  const map = new Map<string, MetaIntegrationRow>()
  ;(integrations || []).forEach((row) => map.set(row.id, row as MetaIntegrationRow))

  const availableMetaSelections = metaSelections.filter((selection) => {
    if (map.has(selection.integrationId)) return true
    const missingInstanceId =
      selection.type === 'instagram'
        ? `meta_ig:${selection.integrationId}`
        : `meta_fb:${selection.integrationId}`
    metaResults.push({
      instanceId: missingInstanceId,
      provider: selection.type,
      ok: false,
      error: 'Integração Meta não encontrada. Reconecte a conta em Configurações.',
    })
    return false
  })

  const firstImageUrl = imageUrls[0]
  const isMultipleImages = imageUrls.length > 1

  for (const selection of availableMetaSelections) {
    const instanceId =
      selection.type === 'instagram'
        ? `meta_ig:${selection.integrationId}`
        : `meta_fb:${selection.integrationId}`
    try {
      const integration = map.get(selection.integrationId)
      if (!integration) throw new Error('Integração Meta não encontrada.')
      if (!integration.page_access_token) throw new Error('Integração sem page_access_token.')

      if (selection.type === 'instagram') {
        if (!integration.instagram_business_account_id)
          throw new Error('Integração sem conta Instagram Business vinculada.')
        if (imageUrls.length > 10)
          throw new Error('Instagram permite no máximo 10 imagens por post (carrossel).')

        let containerId: string
        if (isMultipleImages) {
          const childContainerIds: string[] = []
          for (const imageUrl of imageUrls) {
            const childContainer = await createInstagramCarouselItemContainer({
              igUserId: integration.instagram_business_account_id,
              imageUrl,
              accessToken: integration.page_access_token,
            })
            if (!childContainer?.id) throw new Error('Falha ao criar container filho do carrossel.')
            childContainerIds.push(childContainer.id)
          }
          const carouselContainer = await createInstagramCarouselContainer({
            igUserId: integration.instagram_business_account_id,
            childContainerIds,
            caption: text || '',
            accessToken: integration.page_access_token,
          })
          if (!carouselContainer?.id) throw new Error('Falha ao criar container de carrossel.')
          containerId = carouselContainer.id
        } else {
          const container = await createInstagramMediaContainer({
            igUserId: integration.instagram_business_account_id,
            imageUrl: firstImageUrl,
            caption: text || '',
            accessToken: integration.page_access_token,
          })
          if (!container?.id) throw new Error('Meta create container failed.')
          containerId = container.id
        }
        await waitForInstagramMediaContainerReady({
          containerId,
          accessToken: integration.page_access_token,
        })
        await publishInstagramMediaWithRetry({
          igUserId: integration.instagram_business_account_id,
          creationId: containerId,
          accessToken: integration.page_access_token,
        })
      } else {
        if (!integration.page_id) throw new Error('Integração sem página do Facebook.')
        if (isMultipleImages) {
          await publishFacebookMultipleImages({
            pageId: integration.page_id,
            pageAccessToken: integration.page_access_token,
            imageUrls,
            message: text || '',
          })
        } else {
          await publishFacebookImage({
            pageId: integration.page_id,
            pageAccessToken: integration.page_access_token,
            imageUrl: firstImageUrl,
            message: text || '',
          })
        }
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

  return { metaResults }
}

/**
 * Executa a publicação no Meta (Instagram e/ou Facebook) com as mídias e texto fornecidos.
 * Usado tanto para publicação imediata quanto para postagens programadas.
 */
export async function executeMetaPublish(params: ExecuteMetaPublishParams): Promise<{
  metaResults: MetaPublishResult[]
}> {
  const { db, userId, albumId, instanceIds, destinations, text, mediaEdits } = params
  const mediaFileIds = mediaEdits
    .map((item) => (typeof item?.id === 'string' ? item.id.trim() : ''))
    .filter(Boolean)
  const mediaEditsById = new Map<string, MediaEditInput>()
  for (const item of mediaEdits) {
    const id = typeof item?.id === 'string' ? item.id.trim() : ''
    if (id) mediaEditsById.set(id, item)
  }
  if (mediaFileIds.length === 0) {
    return { metaResults: [] }
  }

  const metaSelections = buildMetaSelections(instanceIds, destinations)
  const metaResults: MetaPublishResult[] = []

  const integrationIds = Array.from(new Set(metaSelections.map((s) => s.integrationId)))
  const { data: integrations, error: integrationsError } = await db
    .from('meta_integrations')
    .select('id,page_id,page_access_token,instagram_business_account_id,is_active')
    .in('id', integrationIds)
    .eq('created_by', userId)
    .eq('is_active', true)

  if (integrationsError) {
    throw new Error(integrationsError.message)
  }

  const map = new Map<string, MetaIntegrationRow>()
  ;(integrations || []).forEach((row) => map.set(row.id, row as MetaIntegrationRow))

  const availableMetaSelections = metaSelections.filter((selection) => {
    if (map.has(selection.integrationId)) return true
    const missingInstanceId =
      selection.type === 'instagram' ? `meta_ig:${selection.integrationId}` : `meta_fb:${selection.integrationId}`
    metaResults.push({
      instanceId: missingInstanceId,
      provider: selection.type,
      ok: false,
      error: 'Integração Meta não encontrada. Reconecte a conta em Configurações do Instagram/Facebook.',
    })
    return false
  })

  const mediaUrls: string[] = []
  if (availableMetaSelections.length > 0) {
    const batchKey = `${Date.now()}-${userId}`
    for (let i = 0; i < mediaFileIds.length; i++) {
      const fileId = mediaFileIds[i]
      const edit = mediaEditsById.get(fileId)
      const url = await resolveDriveFileToPublicUrl(db, fileId, i, batchKey, edit)
      mediaUrls.push(url)
    }
  }

  const firstImageUrl = mediaUrls[0]
  const isMultipleImages = mediaUrls.length > 1

  for (const selection of availableMetaSelections) {
    const instanceId =
      selection.type === 'instagram' ? `meta_ig:${selection.integrationId}` : `meta_fb:${selection.integrationId}`
    try {
      const integration = map.get(selection.integrationId)
      if (!integration) throw new Error('Integração Meta não encontrada.')
      if (!integration.page_access_token) throw new Error('Integração sem page_access_token.')

      if (selection.type === 'instagram') {
        if (!integration.instagram_business_account_id) {
          throw new Error('Integração sem conta Instagram Business vinculada.')
        }
        if (mediaUrls.length > 10) {
          throw new Error('Instagram permite no máximo 10 imagens por post (carrossel).')
        }
        const urlsForCarousel = mediaUrls
        let containerId: string
        if (isMultipleImages) {
          const childContainerIds: string[] = []
          for (const imageUrl of urlsForCarousel) {
            const childContainer = await createInstagramCarouselItemContainer({
              igUserId: integration.instagram_business_account_id,
              imageUrl,
              accessToken: integration.page_access_token,
            })
            if (!childContainer?.id) throw new Error('Falha ao criar container filho do carrossel.')
            childContainerIds.push(childContainer.id)
          }
          const carouselContainer = await createInstagramCarouselContainer({
            igUserId: integration.instagram_business_account_id,
            childContainerIds,
            caption: text || '',
            accessToken: integration.page_access_token,
          })
          if (!carouselContainer?.id) throw new Error('Falha ao criar container de carrossel.')
          containerId = carouselContainer.id
        } else {
          const container = await createInstagramMediaContainer({
            igUserId: integration.instagram_business_account_id,
            imageUrl: firstImageUrl,
            caption: text || '',
            accessToken: integration.page_access_token,
          })
          if (!container?.id) throw new Error('Meta create container failed: ID do container não retornado.')
          containerId = container.id
        }
        await waitForInstagramMediaContainerReady({
          containerId,
          accessToken: integration.page_access_token,
        })
        await publishInstagramMediaWithRetry({
          igUserId: integration.instagram_business_account_id,
          creationId: containerId,
          accessToken: integration.page_access_token,
        })
      } else {
        if (!integration.page_id) throw new Error('Integração sem página do Facebook.')
        if (isMultipleImages) {
          await publishFacebookMultipleImages({
            pageId: integration.page_id,
            pageAccessToken: integration.page_access_token,
            imageUrls: mediaUrls,
            message: text || '',
          })
        } else {
          await publishFacebookImage({
            pageId: integration.page_id,
            pageAccessToken: integration.page_access_token,
            imageUrl: firstImageUrl,
            message: text || '',
          })
        }
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

  return { metaResults }
}
