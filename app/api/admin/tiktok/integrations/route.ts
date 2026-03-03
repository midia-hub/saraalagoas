import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseServerClient } from '@/lib/supabase-server'

/**
 * GET /api/admin/tiktok/integrations
 * Lista todos os perfis do TikTok conectados.
 */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'view' })
  if (!access.ok) return access.response

  const db = createSupabaseServerClient(request)
  const { data, error } = await db
    .from('tiktok_integrations')
    .select('id, created_at, updated_at, open_id, display_name, handle, avatar_url, token_expires_at, is_active, metadata')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
