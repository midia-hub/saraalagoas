'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'

function getHashParams() {
  if (typeof window === 'undefined') return {}
  const hash = window.location.hash.slice(1)
  const params: Record<string, string> = {}
  hash.split('&').forEach((part) => {
    const [key, value] = part.split('=')
    if (key && value) params[key] = decodeURIComponent(value)
  })
  return params
}

export default function RedefinirSenhaPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'form' | 'success' | 'invalid'>('loading')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!supabase) {
      setStatus('invalid')
      return
    }
    const params = getHashParams()
    const type = params.type
    const hasRecoveryToken = type === 'recovery' && (params.access_token || params.token_hash)

    if (!hasRecoveryToken) {
      setStatus('invalid')
      return
    }

    function trySetForm(session: Session | null) {
      if (session) setStatus('form')
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      trySetForm(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && getHashParams().type === 'recovery') trySetForm(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const p = password.trim()
    const c = confirm.trim()
    if (p.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.')
      return
    }
    if (p !== c) {
      setError('As senhas não coincidem.')
      return
    }
    if (!supabase) {
      setError('Serviço indisponível. Tente mais tarde.')
      return
    }
    setSubmitting(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: p })
      if (updateError) {
        setError(updateError.message || 'Não foi possível alterar a senha.')
        setSubmitting(false)
        return
      }
      setStatus('success')
      setTimeout(() => router.push('/admin'), 2000)
    } catch {
      setError('Erro ao atualizar a senha. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  const logoUrl = 'https://lquqgtlgyhcpwcbklokf.supabase.co/storage/v1/object/public/imagens/LOGO%20SARA%20ALAGAOS1.png'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="bg-[#c62737] rounded-t-2xl p-8 text-center">
          <Image
            src={logoUrl}
            alt="Sara Sede Alagoas"
            width={160}
            height={64}
            className="mx-auto mb-5 h-16 w-auto object-contain"
          />
          <div className="w-20 h-1 bg-white/40 rounded mx-auto mb-4" />
          <p className="text-xs tracking-widest uppercase text-white/90 font-semibold">Redefinir senha</p>
        </div>

        <div className="bg-white rounded-b-2xl shadow-lg p-8 border border-t-0 border-gray-200">
          {status === 'loading' && (
            <p className="text-gray-600 text-center">Verificando link...</p>
          )}

          {status === 'invalid' && (
            <>
              <p className="text-sm text-[#c62737] font-semibold mb-1">Link inválido ou expirado</p>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Não foi possível redefinir a senha</h2>
              <p className="text-gray-600 mb-6">
                Solicite um novo e-mail de redefinição no painel admin ou entre em contato com o administrador.
              </p>
              <Link
                href="/admin/login"
                className="inline-block w-full text-center py-3 bg-[#c62737] text-white font-semibold rounded-full hover:bg-[#a01f2d] transition-colors"
              >
                Ir para o login
              </Link>
            </>
          )}

          {status === 'form' && (
            <>
              <p className="text-sm text-[#c62737] font-semibold mb-1">Um passo só</p>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Defina sua nova senha</h2>
              <p className="text-gray-600 mb-6">
                Digite e confirme a nova senha abaixo. Use no mínimo 6 caracteres.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Nova senha
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#c62737] focus:border-[#c62737]"
                    autoComplete="new-password"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-1">
                    Confirmar senha
                  </label>
                  <input
                    id="confirm"
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#c62737] focus:border-[#c62737]"
                    autoComplete="new-password"
                    required
                  />
                </div>
                {error && (
                  <p className="text-sm text-red-600" role="alert">
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-[#c62737] text-white font-bold rounded-full hover:bg-[#a01f2d] disabled:opacity-50 transition-colors shadow-md"
                >
                  {submitting ? 'Salvando...' : 'Definir nova senha'}
                </button>
              </form>
            </>
          )}

          {status === 'success' && (
            <>
              <p className="text-sm text-[#c62737] font-semibold mb-1">Pronto</p>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Senha alterada</h2>
              <p className="text-gray-600 mb-6">
                Sua senha foi atualizada. Redirecionando para o painel...
              </p>
              <Link
                href="/admin"
                className="inline-block w-full text-center py-3 bg-[#c62737] text-white font-semibold rounded-full hover:bg-[#a01f2d] transition-colors"
              >
                Acessar o painel
              </Link>
            </>
          )}
        </div>

        <p className="text-center text-gray-500 text-sm mt-6">
          Sara Sede Alagoas · Igreja Sara Nossa Terra
        </p>
      </div>
    </div>
  )
}
