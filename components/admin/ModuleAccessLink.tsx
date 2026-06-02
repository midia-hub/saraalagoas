'use client'

import Link from 'next/link'
import { KeyRound } from 'lucide-react'
import { useAdminAccess } from '@/lib/admin-access-context'

export function ModuleAccessLink({ href }: { href: string }) {
  const access = useAdminAccess()
  if (!access.isAdmin && !access.permissions['usuarios']?.view) return null
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-700 transition-colors whitespace-nowrap"
    >
      <KeyRound size={14} />
      Acesso
    </Link>
  )
}
