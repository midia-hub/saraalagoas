import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { getYouTubeConfig, createYouTubeState, getYouTubeAuthUrl } from '@/lib/youtube'

/**
 * GET /api/youtube/oauth/start
 * Inicia o fluxo OAuth 2.0 com o Google para o YouTube.
 * Query: ?popup=1  →  retorna { url } em vez de redirecionar (para abrir em popup)
 */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'create' })
  if (!access.ok) return access.response

  const config = getYouTubeConfig()
  if (config.missing.length > 0) {
    return NextResponse.json(
      {
        error: `Configuração incompleta. Defina no .env: ${config.missing.join(', ')}. Veja .env.example.`,
      },
      { status: 503 }
    )
  }

  const state   = createYouTubeState(config.stateSecret, { by: access.snapshot.userId ?? '' })
  const authUrl = getYouTubeAuthUrl(state)

  const popup = request.nextUrl.searchParams.get('popup') === '1'
  if (popup) {
    return NextResponse.json({ url: authUrl })
  }
  return NextResponse.redirect(authUrl)
}
