import { NextResponse } from 'next/server'

/**
 * Verifica se as variáveis Meta estão configuradas (sem expor valores).
 * Útil para debug em produção: https://saraalagoas.com/api/meta/check-config
 *
 * DELETE esta rota após confirmar que está tudo OK.
 */
export async function GET() {
  const appId = process.env.META_APP_ID
  const hasSecret = !!process.env.META_APP_SECRET
  const redirectUri = process.env.META_REDIRECT_URI
  const hasStateSecret = !!process.env.META_STATE_SECRET
  const scopes = process.env.META_SCOPES

  const ok =
    !!appId &&
    appId.trim().length > 0 &&
    /^\d+$/.test(appId.trim()) && // App ID deve ser só números
    hasSecret &&
    !!redirectUri &&
    redirectUri.startsWith('https://') &&
    hasStateSecret

  return NextResponse.json({
    ok,
    message: ok
      ? 'Configuração Meta parece correta.'
      : 'Faltam variáveis ou valores inválidos. Veja detalhes.',
    checks: {
      META_APP_ID: appId
        ? {
            set: true,
            length: appId.length,
            isNumeric: /^\d+$/.test(appId.trim()),
            preview: `${appId.trim().slice(0, 4)}...${appId.trim().slice(-4)}`,
          }
        : { set: false },
      META_APP_SECRET: { set: hasSecret },
      META_REDIRECT_URI: redirectUri
        ? { set: true, value: redirectUri, isHttps: redirectUri.startsWith('https://') }
        : { set: false },
      META_STATE_SECRET: { set: hasStateSecret },
      META_SCOPES: { set: !!scopes, length: (scopes || '').length },
    },
  })
}
