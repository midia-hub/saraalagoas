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
  const requiredScopes = ['pages_show_list', 'pages_read_engagement', 'instagram_basic', 'instagram_content_publish']
  const configuredScopes = (scopes || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const missingScopes = requiredScopes.filter((scope) => !configuredScopes.includes(scope))
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  function getJwtRole(token?: string): string | null {
    if (!token) return null
    try {
      const payloadPart = token.split('.')[1]
      const payloadJson = Buffer.from(payloadPart, 'base64url').toString('utf8')
      const payload = JSON.parse(payloadJson) as { role?: string }
      return payload.role || null
    } catch {
      return null
    }
  }

  const serviceRole = getJwtRole(serviceRoleKey)
  const isLocalhostRedirect =
    !!redirectUri && (redirectUri.startsWith('http://localhost') || redirectUri.startsWith('http://127.0.0.1'))

  const ok =
    !!appId &&
    appId.trim().length > 0 &&
    /^\d+$/.test(appId.trim()) && // App ID deve ser só números
    hasSecret &&
    !!redirectUri &&
    (redirectUri.startsWith('https://') || isLocalhostRedirect) &&
    hasStateSecret &&
    serviceRole === 'service_role' &&
    missingScopes.length === 0

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
        ? {
            set: true,
            isHttps: redirectUri.startsWith('https://'),
            isLocalhost: isLocalhostRedirect,
          }
        : { set: false },
      META_STATE_SECRET: { set: hasStateSecret },
      META_SCOPES: { set: !!scopes, length: (scopes || '').length },
      META_REQUIRED_SCOPES: {
        required: requiredScopes,
        configured: configuredScopes,
        missing: missingScopes,
        ok: missingScopes.length === 0,
      },
      SUPABASE_SERVICE_ROLE_KEY: {
        set: !!serviceRoleKey,
        role: serviceRole,
        isServiceRole: serviceRole === 'service_role',
      },
    },
  })
}
