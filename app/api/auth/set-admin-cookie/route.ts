import { NextRequest, NextResponse } from 'next/server'
import { getAccessSnapshotByToken } from '@/lib/rbac'

/**
 * Define o cookie admin_access=1 de forma segura (HttpOnly).
 * Só deve ser chamado após login/completar-cadastro quando o usuário
 * já tiver canAccessAdmin (validado via admin-check).
 * Reduz risco de XSS definir o cookie manualmente.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const accessToken = typeof body.accessToken === 'string' ? body.accessToken : ''

    if (!accessToken) {
      return NextResponse.json({ error: 'Token ausente.' }, { status: 400 })
    }

    const snapshot = await getAccessSnapshotByToken(accessToken)
    if (!snapshot.canAccessAdmin) {
      return NextResponse.json({ error: 'Acesso negado ao painel.' }, { status: 403 })
    }

    const isHttps =
      request.headers.get('x-forwarded-proto') === 'https' ||
      (typeof request.url === 'string' && request.url.startsWith('https:'))
    const cookieParts = [
      'admin_access=1',
      'Path=/',
      'Max-Age=86400',
      'SameSite=Lax',
    ]
    if (isHttps) cookieParts.push('Secure')
    cookieParts.push('HttpOnly')

    const response = NextResponse.json({ ok: true })
    response.headers.set('Set-Cookie', cookieParts.join('; '))
    return response
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erro interno.'
    const status = message === 'Sessão inválida.' || message === 'Token ausente.' ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
