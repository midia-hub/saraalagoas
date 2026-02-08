'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Settings, Users, LogOut, Home } from 'lucide-react'
import { AdminSiteConfig } from '@/app/admin/AdminSiteConfig'
import { AdminUsers } from '@/app/admin/AdminUsers'

type Tab = 'site' | 'users'

export default function AdminPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('site')

  async function handleSignOut() {
    await supabase?.auth.signOut()
    router.replace('/admin/login')
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h1 className="font-bold text-gray-900">Admin</h1>
          <p className="text-xs text-gray-500">Sara Sede Alagoas</p>
        </div>
        <nav className="flex-1 p-2">
          <button
            onClick={() => setTab('site')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
              tab === 'site' ? 'bg-[#c62737] text-white' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Settings size={20} />
            Configurações do site
          </button>
          <button
            onClick={() => setTab('users')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
              tab === 'users' ? 'bg-[#c62737] text-white' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Users size={20} />
            Usuários
          </button>
        </nav>
        <div className="p-2 border-t border-gray-200 space-y-1">
          <Link
            href="/"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100"
          >
            <Home size={20} />
            Ver site
          </Link>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100"
          >
            <LogOut size={20} />
            Sair
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6">
        {tab === 'site' && <AdminSiteConfig />}
        {tab === 'users' && <AdminUsers />}
      </main>
    </div>
  )
}
