import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { executeMetaPublish, type MediaEditInput } from '@/lib/publish-meta'

const CRON_SECRET = process.env.CRON_SECRET

type ScheduledRow = {
  id: string
  album_id: string
  created_by: string
  scheduled_at: string
  instance_ids: string[]
  destinations: { instagram: boolean; facebook: boolean }
  caption: string
  media_specs: Array<{ id: string; cropMode?: string; altText?: string }>
  status: string
}

/**
 * Processa postagens programadas cujo scheduled_at já passou.
 * Chamado pelo Painel ("Processar fila agora") ou por cron: POST com header "x-cron-secret: <CRON_SECRET>".
 */
export async function POST(request: NextRequest) {
  const isCron =
    typeof CRON_SECRET === 'string' &&
    CRON_SECRET.length > 0 &&
    request.headers.get('x-cron-secret') === CRON_SECRET

  if (!isCron) {
    const access = await requireAccess(request, { pageKey: 'instagram', action: 'edit' })
    if (!access.ok) return access.response
  }

  const db = createSupabaseServerClient(request)
  const now = new Date().toISOString()

  const { data: rows, error: fetchError } = await db
    .from('scheduled_social_posts')
    .select('id, album_id, created_by, scheduled_at, instance_ids, destinations, caption, media_specs, status')
    .eq('status', 'pending')
    .lte('scheduled_at', now)
    .order('scheduled_at', { ascending: true })
    .limit(20)

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
    const mediaEdits: MediaEditInput[] = mediaSpecs.map((spec) => ({
      id: spec.id,
      cropMode: (spec.cropMode as MediaEditInput['cropMode']) || 'original',
      altText: typeof spec.altText === 'string' ? spec.altText : '',
    }))

    await db
      .from('scheduled_social_posts')
      .update({ status: 'publishing', updated_at: now })
      .eq('id', row.id)

    try {
      const { metaResults } = await executeMetaPublish({
        db,
        userId,
        albumId: row.album_id,
        instanceIds,
        destinations,
        text: row.caption || '',
        mediaEdits,
      })

      const failed = metaResults.filter((r) => !r.ok)
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
