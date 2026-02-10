import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseServerClient } from '@/lib/supabase-server'

/**
 * Lista todas as integrações Meta
 * 
 * GET /api/meta/integrations
 */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'view' })
  if (!access.ok) return access.response

  try {
    const db = createSupabaseServerClient(request)

    const { data, error } = await db
      .from('meta_integrations')
      .select('id, created_at, updated_at, facebook_user_name, page_name, instagram_username, is_active, token_expires_at, metadata')
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Erro ao listar integrações: ${error.message}`)
    }

    return NextResponse.json({ integrations: data || [] })
  } catch (error) {
    console.error('Error listing integrations:', error)
    const message = error instanceof Error ? error.message : 'Erro ao listar integrações'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
