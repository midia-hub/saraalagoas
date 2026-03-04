import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'
import { executeMetaPublish, executeMetaPublishWithUrls, type MediaEditInput } from '@/lib/publish-meta'
import { createInstagramReelContainer } from '@/lib/meta'
import { pollAndPublishContainers } from '@/lib/video-container-polling'

export const dynamic = 'force-dynamic'

const CRON_SECRET = process.env.CRON_SECRET

type ScheduledRow = {
  id: string
  album_id: string | null
  created_by: string
  scheduled_at: string
  instance_ids: string[]
  destinations: { instagram: boolean; facebook: boolean }
  caption: string
  media_specs: Array<{ id?: string; url?: string; cropMode?: string; altText?: string }>
  status: string
  post_type?: string
}

/**
 * Lógica central: busca e publica todas as postagens pendentes cujo scheduled_at já passou.
 * Usada tanto pelo cron automático (GET) quanto pelo disparo manual do painel (POST).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processScheduledPosts(db: any) {
  const now = new Date().toISOString()

  // Usa UPDATE...FOR UPDATE SKIP LOCKED...RETURNING via RPC para "reivindicar"
  // os posts de forma atômica — evita que execuções simultâneas do cron
  // publiquem o mesmo post duas vezes (race condition).
  const { data: rows, error: fetchError } = await db
    .rpc('claim_pending_scheduled_posts', { p_limit: 20 })

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  const list = (rows || []) as ScheduledRow[]
  const results: Array<{ id: string; status: 'published' | 'failed'; error?: string }> = []

  for (const row of list) {
    const userId = row.created_by
    const instanceIds = Array.isArray(row.instance_ids) ? row.instance_ids : []
    const destinations =
      row.destinations && typeof row.destinations === 'object'
        ? {
            instagram: Boolean((row.destinations as { instagram?: boolean }).instagram),
            facebook: Boolean((row.destinations as { facebook?: boolean }).facebook),
          }
        : { instagram: true, facebook: false }
    const mediaSpecs = Array.isArray(row.media_specs) ? row.media_specs : []

    const isDirectUrlPost =
      mediaSpecs.length > 0 &&
      mediaSpecs.every((spec) => typeof spec.url === 'string' && spec.url.startsWith('http'))

    // Status já foi definido como 'publishing' atomicamente pelo claim_pending_scheduled_posts

    try {
      let failed: Array<{ ok: boolean; error?: string }> = []

      if (isDirectUrlPost) {
        const imageUrls = mediaSpecs.map((s) => s.url as string)
        const isReelVideo = row.post_type === 'reel' &&
          imageUrls.length === 1

        // Reels de vídeo: fluxo assíncrono para não bloquear o cron aguardando
        // o processamento do vídeo pelo Meta (pode demorar minutos).
        if (isReelVideo) {
          const videoUrl = imageUrls[0]
          const reelErrors: string[] = []
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const containerRows: any[] = []

          const { data: integrations } = await db
            .from('meta_integrations')
            .select('id,instagram_business_account_id,page_access_token,is_active')
            .in('id', instanceIds)
            .eq('is_active', true)

          // Recupera thumbOffset e coverUrl salvos no primeiro item de media_specs
          const firstSpec = mediaSpecs[0] as { url?: string; thumbOffset?: number; coverUrl?: string }
          const reelThumbOffset = typeof firstSpec?.thumbOffset === 'number' ? firstSpec.thumbOffset : undefined
          const reelCoverUrl = typeof firstSpec?.coverUrl === 'string' ? firstSpec.coverUrl : undefined

          for (const integration of integrations || []) {
            if (!integration.instagram_business_account_id || !integration.page_access_token) continue
            try {
              const container = await createInstagramReelContainer({
                igUserId: integration.instagram_business_account_id,
                videoUrl,
                caption: row.caption || '',
                shareToFeed: true,
                accessToken: integration.page_access_token,
                ...(reelCoverUrl ? { coverUrl: reelCoverUrl } : {}),
                ...(!reelCoverUrl && reelThumbOffset !== undefined ? { thumbOffset: reelThumbOffset } : {}),
              })
              containerRows.push({
                container_id: container.id,
                ig_user_id: integration.instagram_business_account_id,
                integration_id: integration.id,
                access_token: integration.page_access_token,
                caption: row.caption || '',
                video_url: videoUrl,
                created_by: userId,
                instance_ids: instanceIds,
                destinations,
                scheduled_post_id: row.id,
              })
            } catch (e) {
              reelErrors.push(e instanceof Error ? e.message : 'Falha ao criar container.')
            }
          }

          if (containerRows.length === 0) {
            const errMsg = reelErrors.join('; ') || 'Nenhum container de Reel foi criado.'
            await db
              .from('scheduled_social_posts')
              .update({ status: 'failed', error_message: errMsg, updated_at: new Date().toISOString() })
              .eq('id', row.id)
            results.push({ id: row.id, status: 'failed', error: errMsg })
            continue
          }

          // Polling inline — publica assim que o Meta sinalizar FINISHED.
          // Containers não concluídos no prazo vão para pending_video_containers
          // e serão publicados pelo cron diário (fallback automático).
          const pollResults = await pollAndPublishContainers({
            db,
            containers: containerRows,
            maxWaitMs: 85_000,
          })

          const publishedCount = pollResults.filter((r) => r.status === 'published').length
          const timedOutCount = pollResults.filter((r) => r.status === 'timeout').length
          const pollErrors = pollResults
            .filter((r) => r.status === 'failed')
            .map((r) => r.error)
            .filter(Boolean) as string[]
          const allErrors = [...reelErrors, ...pollErrors]

          // Se nenhum publicou mas algum ainda processa, manter como video_processing
          if (timedOutCount > 0 && publishedCount === 0) {
            await db
              .from('scheduled_social_posts')
              .update({ status: 'video_processing', error_message: null, updated_at: new Date().toISOString() })
              .eq('id', row.id)
          }

          results.push({
            id: row.id,
            status: publishedCount > 0 || timedOutCount > 0 ? 'published' : 'failed',
            ...(allErrors.length > 0 ? { error: allErrors.join('; ') } : {}),
          })
          continue
        }

        // Detecta se a mídia é vídeo (stories/reels de vídeo precisam de isVideo: true)
        const isVideoMedia =
          imageUrls.length === 1 &&
          /\.(mp4|mov|avi|mkv|webm)$/i.test(imageUrls[0])

        const { metaResults } = await executeMetaPublishWithUrls({
          db,
          userId,
          instanceIds,
          destinations,
          text: row.caption || '',
          imageUrls,
          postType: (row.post_type as 'feed' | 'reel' | 'story') || 'feed',
          isVideo: isVideoMedia,
        })
        failed = metaResults.filter((r) => !r.ok)
      } else {
        const mediaEdits: MediaEditInput[] = mediaSpecs
          .filter((spec) => typeof spec.id === 'string' && spec.id)
          .map((spec) => ({
            id: spec.id as string,
            cropMode: (spec.cropMode as MediaEditInput['cropMode']) || 'original',
            altText: typeof spec.altText === 'string' ? spec.altText : '',
          }))

        const { metaResults } = await executeMetaPublish({
          db,
          userId,
          albumId: row.album_id ?? '',
          instanceIds,
          destinations,
          text: row.caption || '',
          mediaEdits,
          postType: (row.post_type as 'feed' | 'reel' | 'story') || 'feed',
        })
        failed = metaResults.filter((r) => !r.ok)
      }

      const allOk = failed.length === 0

      await db
        .from('scheduled_social_posts')
        .update({
          status: allOk ? 'published' : 'failed',
          published_at: allOk ? now : null,
          error_message: allOk ? null : failed.map((r) => r.error).filter(Boolean).join('; '),
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id)

      results.push({
        id: row.id,
        status: allOk ? 'published' : 'failed',
        ...(allOk ? {} : { error: failed.map((r) => r.error).join('; ') }),
      })
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Falha ao publicar.'
      await db
        .from('scheduled_social_posts')
        .update({
          status: 'failed',
          error_message: message,
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id)

      results.push({ id: row.id, status: 'failed', error: message })
    }
  }

  return NextResponse.json({ processed: results.length, results })
}

// ─────────────────────────────────────────────────────────────────────────────
// GET — chamado automaticamente pelo Vercel Cron a cada 5 minutos
//       Vercel envia: Authorization: Bearer <CRON_SECRET>
//       Também aceita ?secret=<CRON_SECRET> para testes manuais
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const querySecret  = searchParams.get('secret')
  const headerSecret = request.headers.get('authorization')?.replace('Bearer ', '')

  if (
    CRON_SECRET &&
    querySecret !== CRON_SECRET &&
    headerSecret !== CRON_SECRET
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Cron usa service-role para não depender de sessão de usuário
  const db = createSupabaseAdminClient()
  return processScheduledPosts(db)
}

// ─────────────────────────────────────────────────────────────────────────────
// POST — disparo manual pelo painel de admin
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'edit' })
  if (!access.ok) return access.response

  const db = createSupabaseServerClient(request)
  return processScheduledPosts(db)
}
