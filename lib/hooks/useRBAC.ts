'use client'

import { useMemo } from 'react'
import { useAdminAccess } from '@/lib/admin-access-context'
import type { AccessSnapshot, PermissionAction, AppPermissionCode } from '@/lib/rbac-types'
import { hasPermission, hasAppPermission as hasAppPermissionRbac } from '@/lib/rbac'

/**
 * Constrói um AccessSnapshot a partir do valor do contexto admin existente.
 * Compatível com o formato esperado por hasPermission().
 */
function buildSnapshotFromContext(
  context: ReturnType<typeof useAdminAccess>
): AccessSnapshot | null {
  if (!context) return null
  return {
    userId: '',
    email: null,
    displayName: context.profileName || null,
    role: null,
    permissions: context.permissions ?? {},
    canAccessAdmin: context.canAccessAdmin,
    isAdmin: context.isAdmin,
  }
}

/**
 * Hook para acessar informações do sistema RBAC
 * 
 * Usa o mesmo contexto do AdminAccessProvider (useAdminAccess).
 * 
 * @example
 * ```tsx
 * const { snapshot, hasPermission, canView, canEdit, isAdmin } = useRBAC()
 * 
 * if (canEdit('galeria')) {
 *   return <EditButton />
 * }
 * ```
 */
export function useRBAC() {
  const context = useAdminAccess()

  // Snapshot derivado do contexto existente (compatível com hasPermission)
  const snapshot = useMemo(
    () => buildSnapshotFromContext(context),
    [
      context.loading,
      context.canAccessAdmin,
      context.isAdmin,
      context.profileName,
      context.permissions,
    ]
  )

  const { loading } = context

  // Funções auxiliares memorizadas
  const helpers = useMemo(() => {
    const checkPermission = (resourceKey: string, action: PermissionAction): boolean => {
      if (!snapshot) return false
      return hasPermission(snapshot, resourceKey, action)
    }

    return {
      /**
       * Verifica se o usuário tem uma permissão específica em um recurso
       */
      hasPermission: checkPermission,

      /**
       * Verifica se o usuário pode visualizar um recurso
       */
      canView: (resourceKey: string) => checkPermission(resourceKey, 'view'),

      /**
       * Verifica se o usuário pode criar em um recurso
       */
      canCreate: (resourceKey: string) => checkPermission(resourceKey, 'create'),

      /**
       * Verifica se o usuário pode editar em um recurso
       */
      canEdit: (resourceKey: string) => checkPermission(resourceKey, 'edit'),

      /**
       * Verifica se o usuário pode deletar em um recurso
       */
      canDelete: (resourceKey: string) => checkPermission(resourceKey, 'delete'),

      /**
       * Verifica se o usuário pode gerenciar completamente um recurso
       */
      canManage: (resourceKey: string) => checkPermission(resourceKey, 'manage'),

      /**
       * Verifica se o usuário tem uma função nomeada (ex: view_gallery, create_post)
       */
      hasAppPermission: (permissionCode: AppPermissionCode | string) =>
        snapshot ? hasAppPermissionRbac(snapshot, permissionCode) : false,

      /**
       * Verifica se o usuário é admin (acesso total)
       */
      isAdmin: snapshot?.isAdmin ?? false,

      /**
       * Verifica se o usuário pode acessar o painel admin
       */
      canAccessAdmin: snapshot?.canAccessAdmin ?? false,

      /**
       * Nome de exibição do usuário
       */
      displayName: snapshot?.displayName ?? null,

      /**
       * Email do usuário
       */
      email: snapshot?.email ?? null,

      /**
       * Role atual do usuário
       */
      role: snapshot?.role ?? null,

      /**
       * Todas as permissões do usuário
       */
      permissions: snapshot?.permissions ?? {},
    }
  }, [snapshot])

  return {
    snapshot,
    loading,
    ...helpers,
  }
}

/**
 * Hook para verificar uma permissão específica
 * Útil para condicionais simples
 * 
 * @example
 * ```tsx
 * const canEdit = usePermission('galeria', 'edit')
 * if (!canEdit) return null
 * ```
 */
export function usePermission(resourceKey: string, action: PermissionAction): boolean {
  const { hasPermission } = useRBAC()
  return hasPermission(resourceKey, action)
}

/**
 * Hook para verificar se é admin
 * 
 * @example
 * ```tsx
 * const isAdmin = useIsAdmin()
 * if (isAdmin) {
 *   return <AdminPanel />
 * }
 * ```
 */
export function useIsAdmin(): boolean {
  const { isAdmin } = useRBAC()
  return isAdmin
}
