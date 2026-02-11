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
    const requiredInstagramScopes = [
      'pages_show_list',
      'pages_read_engagement',
      'instagram_basic',
      'instagram_content_publish',
      'pages_manage_posts',
    ]

    const { data: raw, error } = await db
      .from('meta_integrations')
      .select('id, created_at, updated_at, facebook_user_name, page_name, page_id, instagram_username, is_active, token_expires_at, metadata, scopes, instagram_business_account_id, page_access_token')
      .eq('created_by', access.snapshot.userId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Erro ao listar integrações: ${error.message}`)
    }

    const rows = raw || []
    const integrations = (all
      ? rows
      : rows.filter((row) => (row.metadata as Record<string, unknown>)?.show_in_list !== false)
    ).map((row) => {
      const expiresAt = row.token_expires_at ? new Date(row.token_expires_at) : null
      const tokenExpired = !!(expiresAt && expiresAt < new Date())
      const grantedScopes = Array.isArray(row.scopes) ? row.scopes.filter((scope): scope is string => typeof scope === 'string') : []
      const missingScopes = requiredInstagramScopes.filter((scope) => !grantedScopes.includes(scope))
      const hasInstagramBusinessAccount = !!row.instagram_business_account_id
      const hasPageAccessToken = !!row.page_access_token
      const isInstagramReady =
        !!row.is_active &&
        hasInstagramBusinessAccount &&
        hasPageAccessToken &&
        !tokenExpired &&
        missingScopes.length === 0

      return {
        id: row.id,
        created_at: row.created_at,
        updated_at: row.updated_at,
        facebook_user_name: row.facebook_user_name,
        page_name: row.page_name,
        page_id: row.page_id,
        instagram_username: row.instagram_username,
        is_active: row.is_active,
        token_expires_at: row.token_expires_at,
        metadata: row.metadata,
        readiness: {
          instagram: {
            ready: isInstagramReady,
            hasInstagramBusinessAccount,
            hasPageAccessToken,
            tokenExpired,
            missingScopes,
          },
        },
      }
    })

    return NextResponse.json({ integrations })
  } catch (error) {
    console.error('Error listing integrations:', error)
    const message = error instanceof Error ? error.message : 'Erro ao listar integrações'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
