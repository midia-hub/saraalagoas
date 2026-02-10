import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase-server'
import {
  verifySignedState,
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  getUserProfile,
  listUserPages,
} from '@/lib/meta'

const LOG_PREFIX = '[Meta OAuth]'

function safeErrorDescription(msg: string, maxLen = 180): string {
  return msg.replace(/\s+/g, ' ').slice(0, maxLen)
}

/**
 * Callback do OAuth Meta (Facebook)
 * 
 * GET /api/meta/oauth/callback?code=xxx&state=xxx
 * 
 * Recebe o code, valida state, troca por token e redireciona.
 * Logs: Vercel Dashboard → Logs (filtrar por "Meta OAuth").
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  function redirectTo(basePath: string, params: Record<string, string>): NextResponse {
    const redirectUrl = new URL(basePath, request.url)
    Object.entries(params).forEach(([k, v]) => v && redirectUrl.searchParams.set(k, v))
    return NextResponse.redirect(redirectUrl)
  }

  if (error) {
    console.warn(LOG_PREFIX, 'Facebook retornou erro:', error, errorDescription || '')
    return redirectTo('/admin/instancias/oauth-done', {
      error,
      error_description: errorDescription || 'Autorização negada',
    })
  }

  if (!code || !state) {
    console.warn(LOG_PREFIX, 'Parâmetros ausentes:', { hasCode: !!code, hasState: !!state })
    return redirectTo('/admin/instancias/oauth-done', {
      error: 'invalid_request',
      error_description: 'Código ou state ausente',
    })
  }

  try {
    console.log(LOG_PREFIX, '1/6 Validando state...')
    const stateData = await verifySignedState(state)
    if (!stateData) {
      console.warn(LOG_PREFIX, 'State inválido ou expirado')
      return redirectTo('/admin/instancias/oauth-done', {
        error: 'invalid_state',
        error_description: 'State inválido ou expirado',
      })
    }

    const isPopup = !!stateData.popup
    const donePath = isPopup ? '/admin/instancias/oauth-done' : '/admin/instancias'
    console.log(LOG_PREFIX, '2/6 State OK, userId:', stateData.userId)

    console.log(LOG_PREFIX, '3/6 Trocando code por token...')
    const tokenResponse = await exchangeCodeForToken(code)
    const shortToken = tokenResponse.access_token

    console.log(LOG_PREFIX, '4/6 Obtendo long-lived token...')
    const longLivedResponse = await exchangeForLongLivedToken(shortToken)
    const accessToken = longLivedResponse.access_token
    const expiresIn = longLivedResponse.expires_in

    const tokenExpiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : null

    console.log(LOG_PREFIX, '5/6 Buscando perfil e páginas...')
    const userProfile = await getUserProfile(accessToken)
    const pages = await listUserPages(accessToken)
    console.log(LOG_PREFIX, 'Páginas encontradas:', pages.length, '| Usuário:', userProfile.name)

    if (pages.length === 0) {
      return redirectTo(donePath, {
        error: 'no_pages',
        error_description: 'Nenhuma página encontrada. Você precisa ter uma Página do Facebook para conectar.',
      })
    }

    // Service role: o callback é acessado por redirecionamento do Facebook (sem JWT do usuário).
    // O usuário já foi validado pelo state assinado (stateData.userId).
    const db = createSupabaseServiceClient()

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

      console.log(LOG_PREFIX, '6/6 Salvando integração (1 página)...')
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
        console.error(LOG_PREFIX, 'Insert falhou:', insertError.message, insertError.code, insertError.details)
        throw new Error(`Erro ao salvar integração: ${insertError.message}`)
      }
      console.log(LOG_PREFIX, 'Sucesso: integração salva, redirecionando.')

      const successParams: Record<string, string> = { connected: '1' }
      if (instagramUsername) successParams.instagram = instagramUsername
      return redirectTo(donePath, successParams)
    }

    console.log(LOG_PREFIX, '6/6 Salvando integração pendente (múltiplas páginas)...')
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
      console.error(LOG_PREFIX, 'Insert pendente falhou:', insertError.message, insertError.code, insertError.details)
      throw new Error(`Erro ao salvar integração: ${insertError.message}`)
    }
    console.log(LOG_PREFIX, 'Sucesso: integração pendente salva, redirecionando para seleção.')

    const selectUrl = new URL('/admin/instancias/select', request.url)
    selectUrl.searchParams.set('integration_id', integration.id)
    if (isPopup) selectUrl.searchParams.set('popup', '1')
    return NextResponse.redirect(selectUrl)

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao processar OAuth'
    const full = err instanceof Error ? (err.stack || err.message) : String(err)
    console.error(LOG_PREFIX, 'Falha:', msg)
    console.error(LOG_PREFIX, 'Detalhes:', full)
    const donePath = '/admin/instancias/oauth-done'
    return redirectTo(donePath, {
      error: 'oauth_failed',
      error_description: safeErrorDescription(msg),
    })
  }
}
