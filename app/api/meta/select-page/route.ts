import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { supabaseServer } from '@/lib/supabase-server'
import { getInstagramBusinessAccount, getPageAccessToken } from '@/lib/meta'

type SelectPageBody = {
  integration_id: string
  page_id: string
}

/**
 * Seleciona uma página e finaliza o vínculo com Instagram
 * 
 * POST /api/meta/select-page
 * Body: { integration_id, page_id }
 */
export async function POST(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'create' })
  if (!access.ok) return access.response

  try {
    const body = (await request.json()) as SelectPageBody
    const { integration_id, page_id } = body

    if (!integration_id || !page_id) {
      return NextResponse.json(
        { error: 'integration_id e page_id são obrigatórios' },
        { status: 400 }
      )
    }

    const db = supabaseServer

    // Buscar integração
    const { data: integration, error: fetchError } = await db
      .from('meta_integrations')
      .select('id, access_token, metadata')
      .eq('id', integration_id)
      .eq('created_by', access.snapshot.userId)
      .single()

    if (fetchError || !integration) {
      return NextResponse.json({ error: 'Integração não encontrada' }, { status: 404 })
    }

    // Buscar token da página
    const pageAccessToken = await getPageAccessToken(page_id, integration.access_token)

    // Buscar informações da página
    const { listUserPages } = await import('@/lib/meta')
    const pages = await listUserPages(integration.access_token)
    const selectedPage = pages.find(p => p.id === page_id)

    if (!selectedPage) {
      return NextResponse.json({ error: 'Página não encontrada' }, { status: 404 })
    }

    // Não permitir página que já está ativa em outra integração
    const { data: existing } = await db
      .from('meta_integrations')
      .select('id')
      .eq('page_id', page_id)
      .eq('created_by', access.snapshot.userId)
      .eq('is_active', true)
      .neq('id', integration_id)
      .limit(1)
      .maybeSingle()
    if (existing) {
      return NextResponse.json(
        { error: 'Esta página já está conectada e ativa na plataforma.' },
        { status: 409 }
      )
    }

    // Buscar conta Instagram Business vinculada
    let instagramAccountId: string | null = null
    let instagramUsername: string | null = null

    try {
      const igAccount = await getInstagramBusinessAccount(page_id, pageAccessToken)
      if (igAccount) {
        instagramAccountId = igAccount.id
        instagramUsername = igAccount.username
      }
    } catch {
      // Instagram não vinculado
    }

    // Atualizar integração com dados da página e Instagram
    const { data: updated, error: updateError } = await db
      .from('meta_integrations')
      .update({
        page_id: selectedPage.id,
        page_name: selectedPage.name,
        page_access_token: pageAccessToken,
        instagram_business_account_id: instagramAccountId,
        instagram_username: instagramUsername,
        is_active: true,
        metadata: { ...integration.metadata, pending_page_selection: false },
        updated_at: new Date().toISOString(),
      })
      .eq('id', integration_id)
      .eq('created_by', access.snapshot.userId)
      .select('id, page_id, page_name, instagram_username, is_active, updated_at')
      .single()

    if (updateError) {
      throw new Error(`Erro ao atualizar integração: ${updateError.message}`)
    }

    return NextResponse.json({
      success: true,
      integration: updated,
      has_instagram: !!instagramAccountId,
    })
  } catch (error) {
    console.error('Error selecting page:', error)
    const message = error instanceof Error ? error.message : 'Erro ao selecionar página'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
