import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { getMetaOAuthUrl, createSignedState } from '@/lib/meta'

/**
 * Inicia o fluxo OAuth com Meta (Facebook)
 * 
 * GET /api/meta/oauth/start
 * 
 * Redireciona para a página de autorização do Facebook
 */
export async function GET(request: NextRequest) {
  // Apenas usuários com permissão de criar no Instagram
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'create' })
  if (!access.ok) return access.response

  try {
    const isPopup = request.nextUrl.searchParams.get('popup') === '1'

    const state = await createSignedState({
      userId: access.snapshot.userId,
      redirectTo: request.nextUrl.searchParams.get('redirect_to') || '/admin/instancias',
      popup: isPopup,
    })

    const authUrl = getMetaOAuthUrl(state)

    return NextResponse.json({ url: authUrl })
  } catch (error) {
    console.error('[META OAuth] Error:', error)
    const raw = error instanceof Error ? error.message : 'Erro ao iniciar OAuth'
    // Mensagem amigável para erros de configuração conhecidos
    const message =
      raw.includes('inválido') && raw.includes('META_APP_ID')
        ? 'META_APP_ID inválido. Use o ID numérico do app em Meta for Developers (Settings → Basic).'
        : raw.includes('Configuração Meta incompleta') || raw.includes('META_')
          ? 'Configuração Meta incompleta no servidor. No .env defina: META_APP_ID, META_APP_SECRET, META_REDIRECT_URI (ex.: http://localhost:3001/api/meta/oauth/callback) e META_STATE_SECRET. Veja .env.example.'
          : raw
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
