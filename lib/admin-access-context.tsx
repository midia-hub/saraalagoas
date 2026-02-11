'use client'

import { createContext, useContext } from 'react'
import type { PermissionMap } from '@/lib/rbac-types'

export type AdminAccessContextValue = {
  loading: boolean
  canAccessAdmin: boolean
  isAdmin: boolean
  profileName: string
  permissions: PermissionMap
}

const AdminAccessContext = createContext<AdminAccessContextValue>({
  loading: true,
  canAccessAdmin: false,
  isAdmin: false,
  profileName: '',
  permissions: {},
})

export function AdminAccessProvider({
  value,
  children,
}: {
  value: AdminAccessContextValue
  children: React.ReactNode
}) {
  return <AdminAccessContext.Provider value={value}>{children}</AdminAccessContext.Provider>
}

export function useAdminAccess(): AdminAccessContextValue {
  return useContext(AdminAccessContext)
}
