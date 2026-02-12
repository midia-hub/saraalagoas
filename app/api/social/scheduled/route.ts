import { NextRequest, NextResponse } from 'next/server'
import { requireAccessAny } from '@/lib/admin-api'
import { createSupabaseServerClient } from '@/lib/supabase-server'

/**
 * Lista postagens programadas (Meta) para o painel.
 * Retorna pending, published e failed.
 */
export async function GET(request: NextRequest) {
  const access = await requireAccessAny(request, [
    { pageKey: 'instagram', action: 'view' },
    { pageKey: 'galeria', action: 'view' },
  ])
  if (!access.ok) return access.response

  const db = createSupabaseServerClient(request)

  const { data, error } = await db
    .from('scheduled_social_posts')
    .select(
      `
      id,
      album_id,
      created_by,
      scheduled_at,
      instance_ids,
      destinations,
      caption,
      media_specs,
      status,
      published_at,
      error_message,
      created_at,
      galleries (
        id,
        title,
        type,
        date
      )
    `
    )
    .order('scheduled_at', { ascending: false })
    .limit(200)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data || [])
}
