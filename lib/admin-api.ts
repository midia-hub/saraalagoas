import { NextRequest, NextResponse } from 'next/server'
import {
  getAccessSnapshotFromRequest,
  hasPermission,
  type AccessSnapshot,
  type PermissionAction,
} from '@/lib/rbac'

export type PermissionRequirement = {
  pageKey: string
  action: PermissionAction
}

export async function requireAccess(
  request: NextRequest,
  requirement: PermissionRequirement
): Promise<{ ok: true; snapshot: AccessSnapshot } | { ok: false; response: NextResponse }> {
  try {
    const snapshot = await getAccessSnapshotFromRequest(request)
    if (!snapshot.canAccessAdmin) {
      return {
        ok: false,
        response: NextResponse.json({ error: 'Acesso negado.' }, { status: 403 }),
      }
    }

    if (!hasPermission(snapshot, requirement.pageKey, requirement.action)) {
      return {
        ok: false,
        response: NextResponse.json({ error: 'Permissão insuficiente.' }, { status: 403 }),
      }
    }

    return { ok: true, snapshot }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não autorizado.'
    return {
      ok: false,
      response: NextResponse.json({ error: message }, { status: 401 }),
    }
  }
}

/** Revisão de Vidas — aceita permissão nova (revisao_vidas) e legado (consolidacao). */
export async function requireRevisaoVidasAccess(
  request: NextRequest,
  action: PermissionAction = 'view'
): Promise<{ ok: true; snapshot: AccessSnapshot } | { ok: false; response: NextResponse }> {
  return requireAccessAny(request, [
    { pageKey: 'revisao_vidas', action },
    { pageKey: 'consolidacao', action },
  ])
}

/** Sara Kids — aceita permissão do módulo ou legado (pessoas). */
export async function requireSaraKidsAccess(
  request: NextRequest,
  action: PermissionAction = 'view'
): Promise<{ ok: true; snapshot: AccessSnapshot } | { ok: false; response: NextResponse }> {
  return requireAccessAny(request, [
    { pageKey: 'sara_kids', action },
    { pageKey: 'pessoas', action },
  ])
}

/** Liderança — aceita liderança, cultos (APIs) ou legado (pessoas). */
export async function requireLiderancaAccess(
  request: NextRequest,
  action: PermissionAction = 'view'
): Promise<{ ok: true; snapshot: AccessSnapshot } | { ok: false; response: NextResponse }> {
  return requireAccessAny(request, [
    { pageKey: 'lideranca', action },
    { pageKey: 'cultos', action },
    { pageKey: 'pessoas', action },
  ])
}

/** Permite acesso se o usuário tiver qualquer uma das permissões indicadas. */
export async function requireAccessAny(
  request: NextRequest,
  requirements: PermissionRequirement[]
): Promise<{ ok: true; snapshot: AccessSnapshot } | { ok: false; response: NextResponse }> {
  try {
    const snapshot = await getAccessSnapshotFromRequest(request)
    if (!snapshot.canAccessAdmin) {
      return {
        ok: false,
        response: NextResponse.json({ error: 'Acesso negado.' }, { status: 403 }),
      }
    }

    const allowed = requirements.some((r) => hasPermission(snapshot, r.pageKey, r.action))
    if (!allowed) {
      return {
        ok: false,
        response: NextResponse.json({ error: 'Permissão insuficiente.' }, { status: 403 }),
      }
    }

    return { ok: true, snapshot }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não autorizado.'
    return {
      ok: false,
      response: NextResponse.json({ error: message }, { status: 401 }),
    }
  }
}

export async function requireAdmin(
  request: NextRequest
): Promise<{ ok: true; snapshot: AccessSnapshot } | { ok: false; response: NextResponse }> {
  try {
    const snapshot = await getAccessSnapshotFromRequest(request)
    if (!snapshot.isAdmin) {
      return {
        ok: false,
        response: NextResponse.json({ error: 'Acesso permitido apenas para administradores.' }, { status: 403 }),
      }
    }
    return { ok: true, snapshot }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não autorizado.'
    return {
      ok: false,
      response: NextResponse.json({ error: message }, { status: 401 }),
    }
  }
}
