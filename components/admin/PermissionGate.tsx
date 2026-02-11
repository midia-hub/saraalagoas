'use client'

import { ReactNode } from 'react'
import { useRBAC } from '@/lib/hooks/useRBAC'
import type { PermissionAction } from '@/lib/rbac-types'

interface PermissionGateProps {
  /**
   * Chave do recurso a verificar
   */
  resource: string

  /**
   * Ação/permissão necessária
   */
  action: PermissionAction

  /**
   * Conteúdo a ser renderizado se o usuário tiver permissão
   */
  children: ReactNode

  /**
   * Conteúdo alternativo a ser renderizado se o usuário NÃO tiver permissão
   * Se não fornecido, não renderiza nada
   */
  fallback?: ReactNode

  /**
   * Se true, renderiza o fallback mesmo para admins
   * Por padrão, admins sempre passam pela verificação
   */
  strictForAdmin?: boolean
}

/**
 * Componente que controla a renderização baseado em permissões
 * 
 * @example
 * ```tsx
 * <PermissionGate resource="galeria" action="edit">
 *   <EditButton />
 * </PermissionGate>
 * 
 * <PermissionGate 
 *   resource="usuarios" 
 *   action="delete" 
 *   fallback={<p>Sem permissão</p>}
 * >
 *   <DeleteButton />
 * </PermissionGate>
 * ```
 */
export function PermissionGate({
  resource,
  action,
  children,
  fallback = null,
  strictForAdmin = false,
}: PermissionGateProps) {
  const { hasPermission, isAdmin, loading } = useRBAC()

  // Enquanto carrega, não renderiza nada
  if (loading) {
    return null
  }

  // Admins sempre têm acesso (a menos que strictForAdmin seja true)
  if (isAdmin && !strictForAdmin) {
    return <>{children}</>
  }

  // Verifica permissão
  const canAccess = hasPermission(resource, action)

  if (canAccess) {
    return <>{children}</>
  }

  return <>{fallback}</>
}

/**
 * Componente que renderiza apenas para admins
 * 
 * @example
 * ```tsx
 * <AdminOnly>
 *   <AdvancedSettings />
 * </AdminOnly>
 * ```
 */
export function AdminOnly({ 
  children, 
  fallback = null 
}: { 
  children: ReactNode
  fallback?: ReactNode 
}) {
  const { isAdmin, loading } = useRBAC()

  if (loading) {
    return null
  }

  return isAdmin ? <>{children}</> : <>{fallback}</>
}

/**
 * Componente que renderiza apenas se o usuário puder visualizar um recurso
 * 
 * @example
 * ```tsx
 * <CanView resource="usuarios">
 *   <UsersList />
 * </CanView>
 * ```
 */
export function CanView({ 
  resource, 
  children, 
  fallback = null 
}: { 
  resource: string
  children: ReactNode
  fallback?: ReactNode 
}) {
  return (
    <PermissionGate resource={resource} action="view" fallback={fallback}>
      {children}
    </PermissionGate>
  )
}

/**
 * Componente que renderiza apenas se o usuário puder criar em um recurso
 */
export function CanCreate({ 
  resource, 
  children, 
  fallback = null 
}: { 
  resource: string
  children: ReactNode
  fallback?: ReactNode 
}) {
  return (
    <PermissionGate resource={resource} action="create" fallback={fallback}>
      {children}
    </PermissionGate>
  )
}

/**
 * Componente que renderiza apenas se o usuário puder editar em um recurso
 */
export function CanEdit({ 
  resource, 
  children, 
  fallback = null 
}: { 
  resource: string
  children: ReactNode
  fallback?: ReactNode 
}) {
  return (
    <PermissionGate resource={resource} action="edit" fallback={fallback}>
      {children}
    </PermissionGate>
  )
}

/**
 * Componente que renderiza apenas se o usuário puder deletar em um recurso
 */
export function CanDelete({ 
  resource, 
  children, 
  fallback = null 
}: { 
  resource: string
  children: ReactNode
  fallback?: ReactNode 
}) {
  return (
    <PermissionGate resource={resource} action="delete" fallback={fallback}>
      {children}
    </PermissionGate>
  )
}
