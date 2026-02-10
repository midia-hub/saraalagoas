import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { listUserPages } from '@/lib/meta'

/**
 * Lista páginas disponíveis de uma integração Meta
 * 
 * GET /api/meta/pages?integration_id=xxx
 */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'view' })
  if (!access.ok) return access.response

  const integrationId = request.nextUrl.searchParams.get('integration_id')
  if (!integrationId) {
    return NextResponse.json({ error: 'integration_id é obrigatório' }, { status: 400 })
  }

  try {
    const db = createSupabaseServerClient(request)

    // Buscar integração
    const { data: integration, error } = await db
      .from('meta_integrations')
      .select('*')
      .eq('id', integrationId)
      .single()

    if (error || !integration) {
      return NextResponse.json({ error: 'Integração não encontrada' }, { status: 404 })
    }

    // Verificar se é do usuário ou se é admin
    if (integration.created_by !== access.snapshot.userId && !access.snapshot.isAdmin) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Listar páginas usando o access_token da integração
    const pages = await listUserPages(integration.access_token)

    return NextResponse.json({ pages })
  } catch (error) {
    console.error('Error listing pages:', error)
    const message = error instanceof Error ? error.message : 'Erro ao listar páginas'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
