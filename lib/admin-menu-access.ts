import type { PermissionMap } from '@/lib/rbac-types'
import type { MenuItem, MenuModule } from '@/app/admin/menu-config'

export function hasMenuPermission(
  permissions: PermissionMap,
  key: string
): boolean {
  const p = permissions[key]
  return !!(p?.view || p?.manage)
}

/** Item de menu visível para o usuário? */
export function canAccessMenuItem(
  permissions: PermissionMap,
  isAdmin: boolean,
  permission?: string | string[]
): boolean {
  if (isAdmin) return true
  if (!permission) return true
  const keys = Array.isArray(permission) ? permission : [permission]
  if (keys.includes('dashboard')) return true
  return keys.some((k) => hasMenuPermission(permissions, k))
}

/** Módulo visível se tiver permissão no módulo ou em qualquer item filho. */
export function canAccessModule(
  permissions: PermissionMap,
  isAdmin: boolean,
  module: MenuModule
): boolean {
  if (isAdmin) return true
  if (module.id === 'dashboard') return true

  if (module.permission && hasMenuPermission(permissions, module.permission)) {
    return true
  }

  return module.items.some((item) =>
    canAccessMenuItem(permissions, false, item.permission)
  )
}

export function filterVisibleModules(
  modules: MenuModule[],
  permissions: PermissionMap,
  isAdmin: boolean
): MenuModule[] {
  return modules
    .map((module) => {
      if (!canAccessModule(permissions, isAdmin, module)) return null

      const items = module.items.filter((item) =>
        canAccessMenuItem(permissions, isAdmin, item.permission)
      )

      if (items.length === 0) return null

      return { ...module, items }
    })
    .filter((m): m is MenuModule => m != null)
}

export function getModuleNavHref(module: MenuModule): string {
  return module.mainHref ?? module.items[0]?.href ?? '/admin'
}

export function isModuleNavActive(pathname: string | null, module: MenuModule): boolean {
  if (!pathname) return false
  for (const bp of module.basePaths ?? []) {
    if (pathname === bp || pathname.startsWith(`${bp}/`)) return true
  }
  return module.items.some(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  )
}

export function findActiveMenuItemHref(
  pathname: string | null,
  items: MenuItem[]
): string {
  if (!pathname) return ''

  let bestMatch = ''
  for (const item of items) {
    if (item.href === '/admin') {
      if (pathname === '/admin' && bestMatch.length < 6) bestMatch = '/admin'
    } else if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
      if (item.href.length > bestMatch.length) bestMatch = item.href
    }
  }
  return bestMatch
}
