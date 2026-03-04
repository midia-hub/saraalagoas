import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import {
  getInstagramMediaContainerStatus,
  publishInstagramMediaWithRetry,
} from '@/lib/meta'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const CRON_SECRET = process.env.CRON_SECRET
// Containers mais antigos que este limite são expirados (Meta expira em 24h)
const MAX_CONTAINER_AGE_HOURS = 12

/**
 * GET /api/cron/process-video-containers
 *
 * Chamado pelo Vercel Cron a cada 2 minutos.
 * Verifica o status de containers de vídeo (Reels) pendentes no Meta e
 * publica automaticamente quando o Meta sinalizar status FINISHED.
 *
 * Também aceita ?secret=<CRON_SECRET> para testes manuais.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const querySecret = searchParams.get('secret')
  const headerSecret = request.headers.get('authorization')?.replace('Bearer ', '')

  if (
    CRON_SECRET &&
    querySecret !== CRON_SECRET &&
    headerSecret !== CRON_SECRET
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createSupabaseAdminClient()
  const now = new Date().toISOString()
  const expiryThreshold = new Date(
    Date.now() - MAX_CONTAINER_AGE_HOURS * 60 * 60 * 1000
  ).toISOString()

  // Buscar containers pendentes ainda dentro do prazo
  const { data: containers, error: fetchError } = await db
    .from('pending_video_containers')
    .select('id, container_id, ig_user_id, integration_id, access_token, caption, created_by, instance_ids, destinations, scheduled_post_id, created_at, attempts')
    .eq('status', 'pending')
    .gt('created_at', expiryThreshold)
    .order('created_at', { ascending: true })
    .limit(10)

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  // Expirar containers muito antigos (Meta já os descartou)
  await db
    .from('pending_video_containers')
    .update({ status: 'expired', updated_at: now })
    .eq('status', 'pending')
    .lte('created_at', expiryThreshold)

  const list = containers || []
  const results: Array<{
    id: string
    containerId: string
    status: string
    error?: string
  }> = []

  for (const row of list) {
    const containerId: string = row.container_id
    const accessToken: string = row.access_token
    const igUserId: string = row.ig_user_id
    const attempts: number = row.attempts ?? 0

    try {
      const containerStatus = await getInstagramMediaContainerStatus({
        containerId,
        accessToken,
      })
      const code = (containerStatus.status_code || '').toUpperCase()

      // Atualizar contador de tentativas e timestamp
      await db
        .from('pending_video_containers')
        .update({ attempts: attempts + 1, last_checked_at: now, updated_at: now })
        .eq('id', row.id)

      if (code === 'FINISHED') {
        // Publicar o container
        const published = await publishInstagramMediaWithRetry({
          igUserId,
          creationId: containerId,
          accessToken,
        })

        await db
          .from('pending_video_containers')
          .update({
            status: 'published',
            published_at: now,
            media_id: published?.id ?? null,
            updated_at: now,
          })
          .eq('id', row.id)

        // Atualizar o registro no histórico de postagens
        if (row.scheduled_post_id) {
          await db
            .from('scheduled_social_posts')
            .update({
              status: 'published',
              published_at: now,
              error_message: null,
              updated_at: now,
            })
            .eq('id', row.scheduled_post_id)
        }

        results.push({ id: row.id, containerId, status: 'published' })
        continue
      }

      if (code === 'ERROR' || code === 'EXPIRED') {
        const errorMsg = `Meta container ${code}: ${
          containerStatus.status_message || containerStatus.status || 'sem detalhes'
        }`

        await db
          .from('pending_video_containers')
          .update({ status: 'failed', error_message: errorMsg, updated_at: now })
          .eq('id', row.id)

        if (row.scheduled_post_id) {
          await db
            .from('scheduled_social_posts')
            .update({ status: 'failed', error_message: errorMsg, updated_at: now })
            .eq('id', row.scheduled_post_id)
        }

        results.push({ id: row.id, containerId, status: 'failed', error: errorMsg })
        continue
      }

      // IN_PROGRESS ou outro — será verificado na próxima execução do cron
      results.push({ id: row.id, containerId, status: `waiting (${code})` })
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Erro inesperado.'
      console.error(`[process-video-containers] erro no container ${containerId}:`, message)
      results.push({ id: row.id, containerId, status: 'error', error: message })
    }
  }

  return NextResponse.json({
    processed: list.length,
    results,
    expiredThreshold: expiryThreshold,
  })
}
