import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseServerClient } from '@/lib/supabase-server'

/**
 * GET /api/admin/youtube/integrations
 * Lista todos os canais do YouTube conectados.
 */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'view' })
  if (!access.ok) return access.response

  const db = createSupabaseServerClient(request)
  const { data, error } = await db
    .from('youtube_integrations')
    .select('id, created_at, updated_at, channel_id, channel_title, channel_custom_url, channel_thumbnail_url, token_expires_at, scopes, is_active, metadata')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ integrations: data ?? [] })
}
