'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { UserPlus, Mail } from 'lucide-react'

interface Profile {
  id: string
  email: string | null
  role: string
  created_at: string
}

export function AdminUsers() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteMessage, setInviteMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    supabase
      .from('profiles')
      .select('id, email, role, created_at')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) setProfiles(data as Profile[])
        setLoading(false)
      })
  }, [])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviteMessage(null)
    const email = inviteEmail.trim()
    if (!email) {
      setInviteMessage({ type: 'err', text: 'Informe o e-mail.' })
      return
    }
    if (!supabase) {
      setInviteMessage({ type: 'err', text: 'Supabase não configurado.' })
      return
    }
    setInviteLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setInviteMessage({ type: 'err', text: 'Sessão expirada. Faça login novamente.' })
        setInviteLoading(false)
        return
      }
      const base = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
      const url = `${base}/functions/v1/admin-invite-user`
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ email }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setInviteMessage({ type: 'err', text: json.message || json.error || 'Erro ao enviar convite.' })
        setInviteLoading(false)
        return
      }
      setInviteMessage({ type: 'ok', text: 'Convite enviado! O usuário receberá um e-mail para definir a senha.' })
      setInviteEmail('')
      setProfiles((prev) => [{ id: json.user_id || '', email, role: 'viewer', created_at: new Date().toISOString() }, ...prev])
    } catch (err) {
      setInviteMessage({ type: 'err', text: 'Erro de rede. Verifique se a Edge Function admin-invite-user está publicada.' })
    } finally {
      setInviteLoading(false)
    }
  }

  if (loading) return <p className="text-gray-600">Carregando usuários...</p>

  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Usuários de acesso</h2>
      <p className="text-gray-600 mb-6">
        Crie usuários para acessar o painel Admin. Eles receberão um e-mail para definir a senha (convite Supabase Auth).
      </p>

      <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <UserPlus size={20} />
          Convidar usuário
        </h3>
        <form onSubmit={handleInvite} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="novo@email.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <button
            type="submit"
            disabled={inviteLoading}
            className="px-4 py-2 bg-[#c62737] text-white font-medium rounded-lg hover:bg-[#a01f2d] disabled:opacity-50 flex items-center gap-2"
          >
            <Mail size={18} />
            {inviteLoading ? 'Enviando...' : 'Enviar convite'}
          </button>
        </form>
        {inviteMessage && (
          <p className={`mt-3 text-sm ${inviteMessage.type === 'ok' ? 'text-green-700' : 'text-red-600'}`}>
            {inviteMessage.text}
          </p>
        )}
        <p className="mt-3 text-xs text-gray-500">
          Para que o convite funcione, é necessário publicar a Edge Function &quot;admin-invite-user&quot; no Supabase (veja README-ADMIN.md).
        </p>
      </section>

      <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-4">Usuários com acesso</h3>
        {profiles.length === 0 ? (
          <p className="text-gray-500">Nenhum perfil encontrado. Convide um usuário acima ou adicione o primeiro admin pelo SQL no Supabase.</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {profiles.map((p) => (
              <li key={p.id} className="py-3 flex justify-between items-center">
                <span className="text-gray-900">{p.email || p.id}</span>
                <span className="text-sm text-gray-500 capitalize">{p.role}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}