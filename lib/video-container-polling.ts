/**
 * Utilitário de polling inline para containers de vídeo do Meta (Reels).
 *
 * Em vez de depender de um cron frequente (incompatível com o plano Hobby da
 * Vercel), as rotas que criam Reels chamam esta função logo após criar o
 * container. Ela fica em loop consultando o status da Meta API a cada 5 s e
 * publica automaticamente ao receber FINISHED.
 *
 * Containers que não terminam dentro de `maxWaitMs` são salvos na tabela
 * `pending_video_containers` para serem processados pelo cron diário (fallback).
 */

import {
  getInstagramMediaContainerStatus,
  publishInstagramMediaWithRetry,
} from '@/lib/meta'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any

const DEFAULT_POLL_INTERVAL_MS = 5_000

export interface VideoContainerRow {
  container_id: string
  ig_user_id: string
  integration_id: string
  access_token: string
  caption: string
  video_url?: string
  created_by: string
  instance_ids: string[]
  destinations: { instagram: boolean; facebook: boolean }
  scheduled_post_id?: string | null
  cover_url?: string
  thumb_offset?: number
}

export type PollStatus = 'published' | 'failed' | 'timeout'

export interface PollResult {
  container_id: string
  status: PollStatus
  media_id?: string
  error?: string
}

/**
 * Faz polling na Meta API para cada container até FINISHED ou timeout.
 *
 * - FINISHED → publica via Meta e atualiza `scheduled_social_posts`
 * - ERROR / EXPIRED → marca como falha em `scheduled_social_posts`
 * - timeout → salva containers restantes em `pending_video_containers`
 *   (cron diário como fallback)
 *
 * @param maxWaitMs Tempo máximo de espera em ms (padrão 270 s — seguro para
 *   funções Vercel com maxDuration=300).
 */
export async function pollAndPublishContainers({
  db,
  containers,
  maxWaitMs = 270_000,
}: {
  db: AnySupabase
  containers: VideoContainerRow[]
  maxWaitMs?: number
}): Promise<PollResult[]> {
  const results: PollResult[] = []
  const pending = containers.map((c) => ({ ...c, done: false }))
  const deadline = Date.now() + maxWaitMs

  while (pending.some((c) => !c.done)) {
    for (const row of pending) {
      if (row.done) continue

      try {
        const containerStatus = await getInstagramMediaContainerStatus({
          containerId: row.container_id,
          accessToken: row.access_token,
        })
        const code = (containerStatus.status_code || '').toUpperCase()

        if (code === 'FINISHED') {
          const published = await publishInstagramMediaWithRetry({
            igUserId: row.ig_user_id,
            creationId: row.container_id,
            accessToken: row.access_token,
          })

          const ts = new Date().toISOString()
          if (row.scheduled_post_id) {
            await db
              .from('scheduled_social_posts')
              .update({
                status: 'published',
                published_at: ts,
                error_message: null,
                updated_at: ts,
              })
              .eq('id', row.scheduled_post_id)
          }

          results.push({
            container_id: row.container_id,
            status: 'published',
            media_id: published?.id,
          })
          row.done = true
          continue
        }

        if (code === 'ERROR' || code === 'EXPIRED') {
          const errMsg = `Meta container ${code}: ${
            containerStatus.status_message ||
            containerStatus.status ||
            'sem detalhes'
          }`
          const ts = new Date().toISOString()
          if (row.scheduled_post_id) {
            await db
              .from('scheduled_social_posts')
              .update({ status: 'failed', error_message: errMsg, updated_at: ts })
              .eq('id', row.scheduled_post_id)
          }

          results.push({ container_id: row.container_id, status: 'failed', error: errMsg })
          row.done = true
        }
        // IN_PROGRESS ou outro: aguarda próxima rodada
      } catch (e) {
        // Erro de rede: logamos e tentamos de novo na próxima rodada
        console.error(
          `[pollAndPublishContainers] erro no container ${row.container_id}:`,
          e instanceof Error ? e.message : e
        )
      }
    }

    if (pending.every((c) => c.done)) break

    if (Date.now() >= deadline) break

    await new Promise<void>((resolve) => setTimeout(resolve, DEFAULT_POLL_INTERVAL_MS))
  }

  // Containers que não terminaram: salvar como fallback para o cron diário
  const timedOut = pending.filter((c) => !c.done)
  if (timedOut.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const rows = timedOut.map(({ done: _done, ...rest }) => rest)
    const { error } = await db.from('pending_video_containers').insert(rows)
    if (error) {
      console.error(
        '[pollAndPublishContainers] erro ao salvar containers pendentes como fallback:',
        error.message
      )
    }
    for (const c of timedOut) {
      results.push({ container_id: c.container_id, status: 'timeout' })
    }
  }

  return results
}
