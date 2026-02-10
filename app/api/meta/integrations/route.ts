import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { supabaseServer } from '@/lib/supabase-server'

/**
 * Lista todas as integrações Meta.
 * Usa service role após checagem de acesso para evitar que RLS oculte linhas
 * para usuários cujo perfil não satisfaça can_manage_meta_integrations('view').
 *
 * GET /api/meta/integrations
 */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'view' })
  if (!access.ok) return access.response

  try {
    const db = supabaseServer
    const all = request.nextUrl.searchParams.get('all') === '1'

    const { data: raw, error } = await db
      .from('meta_integrations')
      .select('id, created_at, updated_at, facebook_user_name, page_name, page_id, instagram_username, is_active, token_expires_at, metadata')
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Erro ao listar integrações: ${error.message}`)
    }

    const rows = raw || []
    const integrations = all
      ? rows
      : rows.filter((row) => (row.metadata as Record<string, unknown>)?.show_in_list !== false)

    return NextResponse.json({ integrations })
  } catch (error) {
    console.error('Error listing integrations:', error)
    const message = error instanceof Error ? error.message : 'Erro ao listar integrações'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
