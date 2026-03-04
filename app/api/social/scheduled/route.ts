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
      post_type,
      result_payload,
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
    .neq('status', 'cancelled')
    .order('scheduled_at', { ascending: false })
    .limit(200)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = data || []

  // Enriquecer com dados do usuário criador
  const createdByIds = Array.from(
    new Set(
      rows
        .map((r) => (r as { created_by?: string }).created_by)
        .filter(Boolean) as string[]
    )
  )

  const usersMap: Record<string, { id: string; full_name: string | null; email: string }> = {}
  if (createdByIds.length > 0) {
    const { data: usersData } = await db
      .from('profiles')
      .select('id, full_name, email, people(full_name)')
      .in('id', createdByIds)
    if (Array.isArray(usersData)) {
      for (const u of usersData) {
        if (u?.id) {
          const person = u.people as { full_name?: string | null } | null
          const displayName = u.full_name || person?.full_name || u.email?.split('@')[0] || null
          usersMap[u.id] = { id: u.id, full_name: displayName, email: u.email ?? '' }
        }
      }
    }
  }

  const result = rows.map((row) => {
    const createdBy = (row as { created_by?: string }).created_by
    return {
      ...row,
      created_by_user: createdBy ? (usersMap[createdBy] ?? null) : null,
    }
  })

  return NextResponse.json(result)
}
