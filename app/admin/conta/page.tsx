'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { Toast } from '@/components/Toast'

export default function AdminContaPage() {
  const [email, setEmail] = useState<string>('')
  const [fullName, setFullName] = useState<string>('')
  const [newEmail, setNewEmail] = useState('')
  const [confirmEmail, setConfirmEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingEmail, setSavingEmail] = useState(false)
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setEmail(user.email)
      const name = user?.user_metadata?.full_name
      if (typeof name === 'string') setFullName(name)
      setLoading(false)
    })
  }, [])

  async function handleChangeEmail(e: React.FormEvent) {
    e.preventDefault()
    setToast(null)
    const n = newEmail.trim()
    const c = confirmEmail.trim()
    if (!n) {
      setToast({ type: 'err', text: 'Informe o novo e-mail.' })
      return
    }
    if (n !== c) {
      setToast({ type: 'err', text: 'Os e-mails não coincidem.' })
      return
    }
    if (n === email) {
      setToast({ type: 'err', text: 'O novo e-mail deve ser diferente do atual.' })
      return
    }
    if (!supabase) {
      setToast({ type: 'err', text: 'Serviço indisponível. Tente mais tarde.' })
      return
    }
    setSavingEmail(true)
    try {
      const basePath = typeof process.env.NEXT_PUBLIC_USE_BASEPATH === 'string' && process.env.NEXT_PUBLIC_USE_BASEPATH === 'true' ? '/saraalagoas' : ''
      const appOrigin = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '')
      const emailRedirectTo = `${appOrigin}${basePath}/admin/conta`
      const { error } = await supabase.auth.updateUser(
        { email: n },
        { emailRedirectTo }
      )
      if (error) {
        setToast({ type: 'err', text: error.message || 'Não foi possível alterar o e-mail.' })
        setSavingEmail(false)
        return
      }
      setToast({
        type: 'ok',
        text: 'Enviamos um e-mail de confirmação para o novo endereço. Abra o link no e-mail para concluir a alteração.',
      })
      setNewEmail('')
      setConfirmEmail('')
    } catch {
      setToast({ type: 'err', text: 'Erro ao alterar e-mail. Tente novamente.' })
    } finally {
      setSavingEmail(false)
    }
  }

  if (loading) {
    return (
      <PageAccessGuard pageKey="dashboard">
        <div className="p-6 md:p-8">
          <p className="text-gray-600">Carregando...</p>
        </div>
      </PageAccessGuard>
    )
  }

  return (
    <PageAccessGuard pageKey="dashboard">
      <div className="p-6 md:p-8 max-w-2xl">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Minha conta</h2>
        <p className="text-gray-600 mb-6">
          Visualize seus dados e altere o e-mail de acesso ao painel.
        </p>

        <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Dados atuais</h3>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-gray-500">E-mail</dt>
              <dd className="font-medium text-gray-900">{email || '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Nome</dt>
              <dd className="font-medium text-gray-900">{fullName || '—'}</dd>
            </div>
          </dl>
        </section>

        <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-3">Alterar e-mail</h3>
          <p className="text-sm text-gray-600 mb-4">
            Ao alterar, um e-mail de confirmação será enviado para o novo endereço. O e-mail só será atualizado após clicar no link recebido.
          </p>
          <form onSubmit={handleChangeEmail} className="space-y-4">
            <div>
              <label htmlFor="new-email" className="block text-sm font-medium text-gray-700 mb-1">
                Novo e-mail
              </label>
              <input
                id="new-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="novo@email.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="confirm-email" className="block text-sm font-medium text-gray-700 mb-1">
                Confirmar novo e-mail
              </label>
              <input
                id="confirm-email"
                type="email"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                placeholder="novo@email.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                autoComplete="email"
              />
            </div>
            <button
              type="submit"
              disabled={savingEmail}
              className="px-4 py-2 bg-[#c62737] text-white font-medium rounded-lg hover:bg-[#a01f2d] disabled:opacity-50 flex items-center gap-2"
            >
              {savingEmail && <Loader2 className="w-4 h-4 animate-spin" />}
              {savingEmail ? 'Enviando...' : 'Enviar confirmação para o novo e-mail'}
            </button>
          </form>
        </section>

        <Toast
          visible={!!toast}
          message={toast?.text ?? ''}
          type={toast?.type ?? 'err'}
          onClose={() => setToast(null)}
        />
      </div>
    </PageAccessGuard>
  )
}
