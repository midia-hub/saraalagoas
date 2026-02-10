import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createCarousel, createMediaContainer, publish } from '@/lib/instagram'
import { getFileDownloadBuffer } from '@/lib/drive'
import type { SupabaseClient } from '@supabase/supabase-js'

const DRIVE_PREFIX = 'drive:'
const BUCKET = 'instagram_posts'

type AssetRow = {
  id: string
  sort_order: number
  final_url: string | null
  source_url: string
}

/** Resolve a URL da imagem: se source_url for drive:fileId, baixa do Drive, envia ao storage e retorna a URL pública. */
async function resolveAssetImageUrl(
  db: SupabaseClient,
  draftId: string,
  asset: AssetRow,
  index: number
): Promise<string> {
  if (asset.final_url) return asset.final_url
  if (!asset.source_url.startsWith(DRIVE_PREFIX)) return asset.source_url

  const fileId = asset.source_url.slice(DRIVE_PREFIX.length)
  if (!fileId) throw new Error(`Asset ${asset.id}: source_url drive: sem fileId.`)

  const { buffer, contentType } = await getFileDownloadBuffer(fileId)
  const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg'
  const path = `${draftId}/${String(index + 1).padStart(2, '0')}.${ext}`

  const { error: uploadError } = await db.storage.from(BUCKET).upload(path, buffer, {
    upsert: true,
    contentType: contentType || 'image/jpeg',
  })
  if (uploadError) throw new Error(`Falha ao enviar imagem ao storage: ${uploadError.message}`)

  const { data } = db.storage.from(BUCKET).getPublicUrl(path)
  const publicUrl = data.publicUrl

  await db
    .from('instagram_post_assets')
    .update({ final_url: publicUrl, status: 'processed', updated_at: new Date().toISOString() })
    .eq('id', asset.id)

  return publicUrl
}

type JobRow = {
  id: string
  draft_id: string
  instance_id: string
  status: 'queued' | 'running' | 'published' | 'failed'
  run_at: string | null
  instagram_instances: {
    id: string
    name: string
    access_token: string
    ig_user_id: string
  } | null
  instagram_post_drafts: {
    id: string
    caption: string
    instagram_post_assets: Array<AssetRow>
  } | null
}

export async function POST(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'edit' })
  if (!access.ok) return access.response
  const db = createSupabaseServerClient(request)

  const nowIso = new Date().toISOString()
  const { data, error } = await db
    .from('instagram_post_jobs')
    .select(`
      id,
      draft_id,
      instance_id,
      status,
      run_at,
      instagram_instances (
        id,
        name,
        access_token,
        ig_user_id
      ),
      instagram_post_drafts (
        id,
        caption,
        instagram_post_assets (
          id,
          sort_order,
          final_url,
          source_url
        )
      )
    `)
    .eq('status', 'queued')
    .or(`run_at.is.null,run_at.lte.${nowIso}`)
    .order('created_at', { ascending: true })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const jobs = (data || []) as unknown as JobRow[]
  const results: Array<{ id: string; status: string; error?: string }> = []

  for (const job of jobs) {
    try {
      await db
        .from('instagram_post_jobs')
        .update({ status: 'running', updated_at: new Date().toISOString() })
        .eq('id', job.id)

      const instance = job.instagram_instances
      const draft = job.instagram_post_drafts
      if (!instance || !draft) {
        throw new Error('Job inválido: instância ou draft ausente.')
      }

      const assets = (draft.instagram_post_assets || [])
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order)

      if (!assets.length) {
        throw new Error('Draft sem imagens para publicar.')
      }

      const containerIds: string[] = []
      for (let i = 0; i < assets.length; i++) {
        const asset = assets[i]
        const imageUrl = await resolveAssetImageUrl(db, draft.id, asset, i)
        const container = await createMediaContainer({
          imageUrl,
          caption: '',
          accessToken: instance.access_token,
          igUserId: instance.ig_user_id,
        })
        containerIds.push(container.containerId)
      }

      const carousel = await createCarousel({
        childContainerIds: containerIds,
        caption: draft.caption || '',
        accessToken: instance.access_token,
        igUserId: instance.ig_user_id,
      })

      const publishResult = await publish({
        creationId: carousel.carouselContainerId,
        accessToken: instance.access_token,
        igUserId: instance.ig_user_id,
      })

      await db
        .from('instagram_post_jobs')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
          result_payload: {
            containerIds,
            carouselContainerId: carousel.carouselContainerId,
            mediaId: publishResult.mediaId,
          },
          error_message: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id)

      await db
        .from('instagram_post_drafts')
        .update({
          status: 'published',
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.draft_id)

      results.push({ id: job.id, status: 'published' })
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Falha inesperada.'
      await db
        .from('instagram_post_jobs')
        .update({
          status: 'failed',
          error_message: message,
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id)

      await db
        .from('instagram_post_drafts')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.draft_id)

      results.push({ id: job.id, status: 'failed', error: message })
    }
  }

  return NextResponse.json({ processed: results.length, results })
}
