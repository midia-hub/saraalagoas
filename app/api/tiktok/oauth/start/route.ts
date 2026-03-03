import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { getTikTokConfig, createTikTokState, getTikTokAuthUrl } from '@/lib/tiktok'

/**
 * GET /api/tiktok/oauth/start
 * Inicia o fluxo OAuth 2.0 com o TikTok for Developers.
 * Query: ?popup=1  →  retorna { url } em vez de redirecionar (para abrir em popup)
 */
export async function GET(request: NextRequest) {
  // TikTok permissão vinculada à mesma config do Instagram/YouTube no admin (gerenciamento de mídias)
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'create' })
  if (!access.ok) return access.response

  const config = getTikTokConfig()
  if (config.missing.length > 0) {
    return NextResponse.json(
      {
        error: `Configuração TikTok incompleta. Defina no .env: ${config.missing.join(', ')}.`,
      },
      { status: 503 }
    )
  }

  const state   = createTikTokState(config.stateSecret, { by: access.snapshot.userId ?? '' })
  const authUrl = getTikTokAuthUrl(state)

  const popup = request.nextUrl.searchParams.get('popup') === '1'
  if (popup) {
    return NextResponse.json({ url: authUrl })
  }
  return NextResponse.redirect(authUrl)
}
