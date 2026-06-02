'use client'

import { useState, useEffect } from 'react'
import { UserCheck, UserMinus, Send, Loader2, X, Mail } from 'lucide-react'
import { adminFetchJson } from '@/lib/admin-client'

interface UserLinkState {
  linked: boolean
  user: { id: string; email: string | null; full_name: string | null } | null
  emailUser: { id: string; email: string | null; person_id: string | null } | null
}

interface RoleOption {
  id: string
  name: string
  is_active: boolean
}

interface Props {
  personId: string
  personEmail?: string | null
  personName?: string | null
}

export function UserLinkWidget({ personId, personEmail, personName }: Props) {
  const [userLink, setUserLink] = useState<UserLinkState | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteProfile, setInviteProfile] = useState('')
  const [roles, setRoles] = useState<RoleOption[]>([])
  const [loadingRoles, setLoadingRoles] = useState(false)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    loadLink()
  }, [personId])

  useEffect(() => {
    if (!modalOpen) return
    setLoadingRoles(true)
    adminFetchJson<{ roles?: RoleOption[] }>('/api/admin/roles')
      .then((d) => setRoles((d.roles ?? []).filter((r) => r.is_active !== false)))
      .catch(() => setRoles([]))
      .finally(() => setLoadingRoles(false))
  }, [modalOpen])

  async function loadLink() {
    setLoading(true)
    try {
      const data = await adminFetchJson<UserLinkState>(`/api/admin/people/${personId}/user-link`)
      setUserLink(data)
    } catch {
      setUserLink({ linked: false, user: null, emailUser: null })
    } finally {
      setLoading(false)
    }
  }

  function openModal() {
    setInviteEmail(personEmail ?? '')
    setInviteProfile('')
    setMessage(null)
    setModalOpen(true)
  }

  async function handleSendInvite(e: React.FormEvent) {
    e.preventDefault()
    const email = inviteEmail.trim()
    if (!email) {
      setMessage({ type: 'err', text: 'Informe o e-mail.' })
      return
    }
    if (!inviteProfile) {
      setMessage({ type: 'err', text: 'Selecione o perfil de acesso.' })
      return
    }
    setSending(true)
    setMessage(null)
    try {
      const result = await adminFetchJson<{ message?: string }>(`/api/admin/pessoas/${personId}/send-invite`, {
        method: 'POST',
        body: JSON.stringify({ email, profile: inviteProfile }),
      })
      setMessage({ type: 'ok', text: result?.message || 'Convite enviado com sucesso.' })
      await loadLink()
      setTimeout(() => {
        setModalOpen(false)
        setMessage(null)
      }, 2000)
    } catch (err) {
      setMessage({ type: 'err', text: err instanceof Error ? err.message : 'Erro ao enviar convite.' })
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return <span className="text-xs text-slate-400">Verificando...</span>
  }

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        {userLink?.linked ? (
          <>
            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
              <UserCheck size={13} />
              Usuário vinculado
            </span>
            {userLink.user?.email && (
              <span className="text-xs text-slate-400">({userLink.user.email})</span>
            )}
          </>
        ) : (
          <>
            <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium">
              <UserMinus size={13} />
              Sem usuário
            </span>
            <button
              type="button"
              onClick={openModal}
              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <Send size={12} />
              Vincular/Convidar
            </button>
          </>
        )}
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => !sending && setModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-lg max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <Mail className="text-blue-600" size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-800">Vincular usuário</h3>
                {personName && <p className="text-sm text-slate-500 truncate">{personName}</p>}
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSendInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  E-mail
                </label>
                {personEmail ? (
                  <>
                    <div className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-700">
                      {personEmail}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      O convite será enviado para este e-mail do cadastro.
                    </p>
                  </>
                ) : (
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-[#c62737] outline-none"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Perfil de acesso
                </label>
                {loadingRoles ? (
                  <p className="text-xs text-slate-400">Carregando perfis...</p>
                ) : (
                  <select
                    value={inviteProfile}
                    onChange={(e) => setInviteProfile(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-[#c62737] outline-none"
                  >
                    <option value="">Selecione o perfil...</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.name}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {message && (
                <div
                  className={`p-3 rounded-lg text-sm font-medium ${
                    message.type === 'ok'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {message.text}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={sending}
                  className="flex-1 px-4 py-2 text-sm text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="flex-1 px-4 py-2 text-sm bg-[#c62737] text-white rounded-lg hover:bg-[#a01f2d] disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                >
                  {sending && <Loader2 size={14} className="animate-spin" />}
                  {sending ? 'Enviando...' : 'Enviar convite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
