import { NextRequest, NextResponse } from 'next/server'
import { getAccessSnapshotByToken } from '@/lib/rbac'
import { setAdminAuthCookies } from '@/lib/admin-auth-cookies'

/**
 * Define cookies de sessão admin (HttpOnly) compartilhados entre subdomínios.
 * Só deve ser chamado após login/completar-cadastro quando o usuário
 * já tiver canAccessAdmin (validado via admin-check).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const accessToken = typeof body.accessToken === 'string' ? body.accessToken : ''
    const refreshToken = typeof body.refreshToken === 'string' ? body.refreshToken : ''

    if (!accessToken) {
      return NextResponse.json({ error: 'Token ausente.' }, { status: 400 })
    }
    if (!refreshToken) {
      return NextResponse.json({ error: 'Refresh token ausente.' }, { status: 400 })
    }

    const snapshot = await getAccessSnapshotByToken(accessToken)
    if (!snapshot.canAccessAdmin) {
      return NextResponse.json({ error: 'Acesso negado ao painel.' }, { status: 403 })
    }

    const response = NextResponse.json({ ok: true })
    setAdminAuthCookies(response, request, refreshToken)
    return response
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erro interno.'
    const status = message === 'Sessão inválida.' || message === 'Token ausente.' ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
