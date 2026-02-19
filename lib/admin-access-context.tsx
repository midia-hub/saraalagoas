'use client'

import { createContext, useContext } from 'react'
import type { PermissionMap } from '@/lib/rbac-types'

export type AdminAccessContextValue = {
  loading: boolean
  canAccessAdmin: boolean
  isAdmin: boolean
  userId: string | null
  profileName: string
  roleName: string
  personId: string | null
  avatarUrl: string | null
  source?: string
  permissions: PermissionMap
  refresh: () => Promise<void>
}

const AdminAccessContext = createContext<AdminAccessContextValue>({
  loading: true,
  canAccessAdmin: false,
  isAdmin: false,
  userId: null,
  profileName: '',
  roleName: '',
  personId: null,
  avatarUrl: null,
  source: '',
  permissions: {},
  refresh: async () => { },
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
