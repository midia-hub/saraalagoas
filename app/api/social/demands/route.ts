import { NextRequest, NextResponse } from 'next/server'
import { requireAccessAny } from '@/lib/admin-api'
import { createSupabaseServerClient } from '@/lib/supabase-server'

/**
 * Lista demandas de postagem (fluxo de aprovação).
 * GET /api/social/demands
 */
export async function GET(request: NextRequest) {
  const access = await requireAccessAny(request, [
    { pageKey: 'instagram', action: 'view' },
    { pageKey: 'galeria', action: 'view' },
  ])
  if (!access.ok) return access.response

  const db = createSupabaseServerClient(request)

  const { data, error } = await db
    .from('social_post_demands')
    .select(
      `
      id,
      title,
      description,
      format,
      workflow_step,
      assigned_designer_id,
      assigned_copywriter_id,
      scheduled_post_id,
      created_by,
      created_at,
      updated_at
    `
    )
    .order('updated_at', { ascending: false })
    .limit(100)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data || [])
}
