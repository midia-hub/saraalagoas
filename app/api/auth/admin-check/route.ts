import { NextRequest, NextResponse } from 'next/server'
import { getAccessSnapshotByToken } from '@/lib/rbac'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const accessToken = typeof body.accessToken === 'string' ? body.accessToken : ''

    if (!accessToken) {
      return NextResponse.json({ error: 'Token ausente.' }, { status: 400 })
    }
    const snapshot = await getAccessSnapshotByToken(accessToken)

    return NextResponse.json({
      isAdmin: snapshot.isAdmin,
      canAccessAdmin: snapshot.canAccessAdmin,
      profile: snapshot.legacyProfile,
      legacyProfile: snapshot.legacyProfile,
      role: snapshot.role,
      displayName: snapshot.displayName,
      personId: snapshot.personId,
      avatarUrl: snapshot.avatarUrl,
      permissions: snapshot.permissions,
      userId: snapshot.userId,
      email: snapshot.email,
      _debug_person_id: snapshot.personId, // Temporário para diagnóstico
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erro interno.'
    const status = message === 'Sessão inválida.' ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

