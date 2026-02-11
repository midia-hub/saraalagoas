import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase-server'
import {
  verifySignedState,
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  getUserProfile,
  listGrantedPermissions,
  getMissingRequiredInstagramPublishScopes,
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
    const grantedPermissions = await listGrantedPermissions(accessToken)
    const missingPermissions = getMissingRequiredInstagramPublishScopes(grantedPermissions)
    if (missingPermissions.length > 0) {
      return redirectTo(donePath, {
        error: 'missing_instagram_permissions',
        error_description: `Permissões ausentes para Instagram: ${missingPermissions.join(', ')}. Reconecte e aceite todas as permissões.`,
      })
    }
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

    // Conectar todas as páginas: uma integração por página (todas aparecem na plataforma)
    const { getInstagramBusinessAccount } = await import('@/lib/meta')
    let savedCount = 0
    const instagramNames: string[] = []

    for (const page of pages) {
      // Se a página já existir, atualiza tokens/permissões ao reconectar.
      const { data: existing, error: existingError } = await db
        .from('meta_integrations')
        .select('id')
        .eq('page_id', page.id)
        .limit(1)
        .maybeSingle()
      if (existingError) {
        console.error(LOG_PREFIX, 'Falha ao buscar integração existente:', page.id, existingError.message)
        continue
      }

      let instagramAccountId: string | null = null
      let instagramUsername: string | null = null
      try {
        const igAccount = await getInstagramBusinessAccount(page.id, page.access_token)
        if (igAccount) {
          instagramAccountId = igAccount.id
          instagramUsername = igAccount.username
          if (instagramUsername) instagramNames.push(instagramUsername)
        }
      } catch {
        // Página sem Instagram vinculado
      }

      // Prioriza Instagram: só salva integrações com conta IG Business vinculada.
      if (!instagramAccountId) {
        console.log(LOG_PREFIX, 'Página sem Instagram Business, ignorando:', page.id, page.name)
        continue
      }

      const payload = {
        provider: 'meta',
        facebook_user_id: userProfile.id,
        facebook_user_name: userProfile.name,
        page_id: page.id,
        page_name: page.name,
        page_access_token: page.access_token,
        instagram_business_account_id: instagramAccountId,
        instagram_username: instagramUsername,
        scopes: grantedPermissions,
        access_token: accessToken,
        token_expires_at: tokenExpiresAt,
        is_active: true,
      }

      if (existing?.id) {
        const { error: updateError } = await db
          .from('meta_integrations')
          .update({
            ...payload,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)

        if (updateError) {
          console.error(LOG_PREFIX, 'Update falhou para página', page.id, updateError.message)
          continue
        }
      } else {
        const { error: insertError } = await db
          .from('meta_integrations')
          .insert({
            ...payload,
            created_by: stateData.userId,
          })

        if (insertError) {
          console.error(LOG_PREFIX, 'Insert falhou para página', page.id, insertError.message)
          continue
        }
      }
      savedCount++
    }

    if (savedCount === 0) {
      return redirectTo(donePath, {
        error: 'no_instagram_business_account',
        error_description: 'Nenhuma Página com Instagram Business vinculada foi encontrada. Vincule uma conta profissional no Meta Business e tente novamente.',
      })
    }

    console.log(LOG_PREFIX, '6/6 Integrações salvas:', savedCount, 'de', pages.length)

    const successParams: Record<string, string> = { connected: '1', count: String(savedCount) }
    if (instagramNames.length > 0) successParams.instagram = instagramNames.join(',')
    return redirectTo(donePath, successParams)

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
