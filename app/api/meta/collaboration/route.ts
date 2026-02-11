import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import {
  fetchCollaborationInvites,
  respondToCollaborationInvite,
  fetchMediaCollaborators,
} from '@/lib/meta'

/**
 * GET - Lista convites de colaboração recebidos
 */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'view' })
  if (!access.ok) return access.response

  const db = createSupabaseServerClient(request)
  const userId = access.snapshot.userId

  const { searchParams } = request.nextUrl
  const action = searchParams.get('action') || 'list_invites'
  const integrationId = searchParams.get('integrationId') || ''
  const mediaId = searchParams.get('mediaId') || ''
  const limit = parseInt(searchParams.get('limit') || '20', 10)
  const after = searchParams.get('after') || undefined
  const before = searchParams.get('before') || undefined

  if (!integrationId) {
    return NextResponse.json(
      { error: 'integrationId é obrigatório.' },
      { status: 400 }
    )
  }

  // Buscar integração do usuário
  const { data: integration, error: integrationError } = await db
    .from('meta_integrations')
    .select('id, instagram_business_account_id, page_access_token, is_active')
    .eq('id', integrationId)
    .eq('created_by', userId)
    .eq('is_active', true)
    .maybeSingle()

  if (integrationError || !integration) {
    return NextResponse.json(
      { error: 'Integração não encontrada ou inativa.' },
      { status: 404 }
    )
  }

  if (!integration.instagram_business_account_id) {
    return NextResponse.json(
      { error: 'Integração sem conta Instagram Business vinculada.' },
      { status: 400 }
    )
  }

  if (!integration.page_access_token) {
    return NextResponse.json(
      { error: 'Token de acesso não disponível.' },
      { status: 400 }
    )
  }

  try {
    if (action === 'list_invites') {
      // Listar convites de colaboração recebidos
      const invites = await fetchCollaborationInvites({
        igUserId: integration.instagram_business_account_id,
        accessToken: integration.page_access_token,
        limit,
        after,
        before,
      })

      return NextResponse.json({
        ok: true,
        invites: invites.data || [],
        paging: invites.paging,
      })
    } else if (action === 'list_collaborators') {
      // Listar colaboradores de um post específico
      if (!mediaId) {
        return NextResponse.json(
          { error: 'mediaId é obrigatório para listar colaboradores.' },
          { status: 400 }
        )
      }

      const collaborators = await fetchMediaCollaborators({
        mediaId,
        accessToken: integration.page_access_token,
      })

      return NextResponse.json({
        ok: true,
        collaborators: collaborators.data || [],
      })
    } else {
      return NextResponse.json(
        { error: 'Ação inválida. Use action=list_invites ou action=list_collaborators.' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Erro ao buscar colaborações:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Falha ao buscar colaborações.',
      },
      { status: 500 }
    )
  }
}

/**
 * POST - Aceita ou recusa um convite de colaboração
 */
export async function POST(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'create' })
  if (!access.ok) return access.response

  const db = createSupabaseServerClient(request)
  const userId = access.snapshot.userId

  const body = await request.json().catch(() => ({}))
  const integrationId = typeof body.integrationId === 'string' ? body.integrationId.trim() : ''
  const mediaId = typeof body.mediaId === 'string' ? body.mediaId.trim() : ''
  const accept = typeof body.accept === 'boolean' ? body.accept : null

  if (!integrationId || !mediaId || accept === null) {
    return NextResponse.json(
      { error: 'integrationId, mediaId e accept são obrigatórios.' },
      { status: 400 }
    )
  }

  // Buscar integração do usuário
  const { data: integration, error: integrationError } = await db
    .from('meta_integrations')
    .select('id, instagram_business_account_id, page_access_token, is_active')
    .eq('id', integrationId)
    .eq('created_by', userId)
    .eq('is_active', true)
    .maybeSingle()

  if (integrationError || !integration) {
    return NextResponse.json(
      { error: 'Integração não encontrada ou inativa.' },
      { status: 404 }
    )
  }

  if (!integration.instagram_business_account_id) {
    return NextResponse.json(
      { error: 'Integração sem conta Instagram Business vinculada.' },
      { status: 400 }
    )
  }

  if (!integration.page_access_token) {
    return NextResponse.json(
      { error: 'Token de acesso não disponível.' },
      { status: 400 }
    )
  }

  try {
    const result = await respondToCollaborationInvite({
      igUserId: integration.instagram_business_account_id,
      mediaId,
      accept,
      accessToken: integration.page_access_token,
    })

    return NextResponse.json({
      ok: true,
      success: result.success,
      message: accept
        ? 'Convite de colaboração aceito com sucesso!'
        : 'Convite de colaboração recusado.',
    })
  } catch (error) {
    console.error('Erro ao responder convite de colaboração:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Falha ao responder convite.',
      },
      { status: 500 }
    )
  }
}
