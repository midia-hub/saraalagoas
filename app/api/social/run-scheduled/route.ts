import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'
import { executeMetaPublish, executeMetaPublishWithUrls, type MediaEditInput } from '@/lib/publish-meta'

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
}

/**
 * Lógica central: busca e publica todas as postagens pendentes cujo scheduled_at já passou.
 * Usada tanto pelo cron automático (GET) quanto pelo disparo manual do painel (POST).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processScheduledPosts(db: any) {
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

    const isDirectUrlPost =
      mediaSpecs.length > 0 &&
      mediaSpecs.every((spec) => typeof spec.url === 'string' && spec.url.startsWith('http'))

    await db
      .from('scheduled_social_posts')
      .update({ status: 'publishing', updated_at: now })
      .eq('id', row.id)

    try {
      let failed: Array<{ ok: boolean; error?: string }> = []

      if (isDirectUrlPost) {
        const imageUrls = mediaSpecs.map((s) => s.url as string)
        const { metaResults } = await executeMetaPublishWithUrls({
          db,
          userId,
          instanceIds,
          destinations,
          text: row.caption || '',
          imageUrls,
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
