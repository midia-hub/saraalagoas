import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import {
  verifySignedState,
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  getUserProfile,
  listUserPages,
} from '@/lib/meta'

/**
 * Callback do OAuth Meta (Facebook)
 * 
 * GET /api/meta/oauth/callback?code=xxx&state=xxx
 * 
 * Recebe o code, valida state, troca por token e redireciona
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // Tratar erro de autorização
  if (error) {
    const redirectUrl = new URL('/admin/instancias', request.url)
    redirectUrl.searchParams.set('error', error)
    redirectUrl.searchParams.set('error_description', errorDescription || 'Autorização negada')
    return NextResponse.redirect(redirectUrl)
  }

  // Validar parâmetros
  if (!code || !state) {
    const redirectUrl = new URL('/admin/instancias', request.url)
    redirectUrl.searchParams.set('error', 'invalid_request')
    redirectUrl.searchParams.set('error_description', 'Código ou state ausente')
    return NextResponse.redirect(redirectUrl)
  }

  try {
    // Validar state (CSRF protection)
    const stateData = await verifySignedState(state)
    if (!stateData) {
      const redirectUrl = new URL('/admin/instancias', request.url)
      redirectUrl.searchParams.set('error', 'invalid_state')
      redirectUrl.searchParams.set('error_description', 'State inválido ou expirado')
      return NextResponse.redirect(redirectUrl)
    }

    // Trocar code por token
    const tokenResponse = await exchangeCodeForToken(code)
    const shortToken = tokenResponse.access_token

    // Trocar por long-lived token (60 dias)
    const longLivedResponse = await exchangeForLongLivedToken(shortToken)
    const accessToken = longLivedResponse.access_token
    const expiresIn = longLivedResponse.expires_in

    // Calcular data de expiração
    const tokenExpiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : null

    // Buscar informações do usuário
    const userProfile = await getUserProfile(accessToken)

    // Buscar páginas do usuário
    const pages = await listUserPages(accessToken)

    // Verificar se há páginas
    if (pages.length === 0) {
      const redirectUrl = new URL('/admin/instancias', request.url)
      redirectUrl.searchParams.set('error', 'no_pages')
      redirectUrl.searchParams.set('error_description', 'Nenhuma página encontrada. Você precisa ter uma Página do Facebook para conectar.')
      return NextResponse.redirect(redirectUrl)
    }

    // Criar cliente Supabase
    const db = createSupabaseServerClient(request)

    // Se houver apenas uma página, conectar automaticamente
    if (pages.length === 1) {
      const page = pages[0]
      
      // Buscar Instagram Business Account (se houver)
      let instagramAccountId: string | null = null
      let instagramUsername: string | null = null

      try {
        const { getInstagramBusinessAccount } = await import('@/lib/meta')
        const igAccount = await getInstagramBusinessAccount(page.id, page.access_token)
        if (igAccount) {
          instagramAccountId = igAccount.id
          instagramUsername = igAccount.username
        }
      } catch {
        // Instagram não vinculado ou erro ao buscar
      }

      // Salvar integração no banco
      const { error: insertError } = await db
        .from('meta_integrations')
        .insert({
          created_by: stateData.userId,
          provider: 'meta',
          facebook_user_id: userProfile.id,
          facebook_user_name: userProfile.name,
          page_id: page.id,
          page_name: page.name,
          page_access_token: page.access_token,
          instagram_business_account_id: instagramAccountId,
          instagram_username: instagramUsername,
          access_token: accessToken,
          token_expires_at: tokenExpiresAt,
          is_active: true,
        })

      if (insertError) {
        throw new Error(`Erro ao salvar integração: ${insertError.message}`)
      }

      // Redirecionar para página de sucesso
      const redirectUrl = new URL(stateData.redirectTo || '/admin/instancias', request.url)
      redirectUrl.searchParams.set('connected', '1')
      if (instagramAccountId) {
        redirectUrl.searchParams.set('instagram', instagramUsername || '')
      }
      return NextResponse.redirect(redirectUrl)
    }

    // Se houver múltiplas páginas, salvar dados temporários e redirecionar para seleção
    // Salvar uma integração "pendente" com apenas os dados do usuário
    const { data: integration, error: insertError } = await db
      .from('meta_integrations')
      .insert({
        created_by: stateData.userId,
        provider: 'meta',
        facebook_user_id: userProfile.id,
        facebook_user_name: userProfile.name,
        access_token: accessToken,
        token_expires_at: tokenExpiresAt,
        is_active: false, // Ainda não está ativa até selecionar página
        metadata: { pending_page_selection: true, pages_count: pages.length },
      })
      .select('id')
      .single()

    if (insertError) {
      throw new Error(`Erro ao salvar integração: ${insertError.message}`)
    }

    // Redirecionar para página de seleção de página
    const redirectUrl = new URL('/admin/instancias/select', request.url)
    redirectUrl.searchParams.set('integration_id', integration.id)
    return NextResponse.redirect(redirectUrl)

  } catch (error) {
    console.error('Meta OAuth callback error:', error)
    const redirectUrl = new URL('/admin/instancias', request.url)
    redirectUrl.searchParams.set('error', 'oauth_failed')
    redirectUrl.searchParams.set('error_description', error instanceof Error ? error.message : 'Erro ao processar OAuth')
    return NextResponse.redirect(redirectUrl)
  }
}
