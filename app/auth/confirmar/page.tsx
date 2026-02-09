'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Status = 'loading' | 'form' | 'ok' | 'error'

export default function AuthConfirmarPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<Status>('loading')
  const [message, setMessage] = useState<string>('')

  // Formulário: nome, telefone, senha
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [submitLoading, setSubmitLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Só definido após montagem no cliente para evitar hydration mismatch (servidor não tem window)
  const [envLabel, setEnvLabel] = useState<'local' | 'production' | null>(null)
  useEffect(() => {
    const isLocal =
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    setEnvLabel(isLocal ? 'local' : 'production')
  }, [])

  useEffect(() => {
    if (!supabase) {
      setStatus('error')
      setMessage('Supabase não configurado.')
      return
    }

    const run = async () => {
      const hash = typeof window !== 'undefined' ? window.location.hash : ''
      const code = searchParams.get('code')

      // PKCE: Supabase redireciona com ?code=...
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          setStatus('error')
          setMessage(error.message)
          return
        }
        // Remover code da URL para não reutilizar
        if (typeof window !== 'undefined') {
          window.history.replaceState({}, '', window.location.pathname)
        }
        await checkProfileAndShowForm()
        return
      }

      // Implicit: tokens no hash
      if (hash) {
        const params = new URLSearchParams(hash.replace(/^#/, ''))
        const access_token = params.get('access_token')
        const refresh_token = params.get('refresh_token')
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token })
          if (error) {
            setStatus('error')
            setMessage(error.message)
            return
          }
          if (typeof window !== 'undefined') {
            window.history.replaceState({}, '', window.location.pathname)
          }
          await checkProfileAndShowForm()
          return
        }
      }

      // Sem code/hash: pode ser refresh com sessão já ativa
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        await checkProfileAndShowForm()
        return
      }

      setStatus('error')
      setMessage('Link inválido ou já utilizado. Solicite um novo link na página de login.')
    }

    async function checkProfileAndShowForm() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setStatus('error')
        setMessage('Sessão não encontrada.')
        return
      }
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle()
      // 400 pode ser coluna full_name inexistente: execute supabase-admin-profiles-campos.sql
      if (profileError) {
        setStatus('form')
        return
      }
      if (profile?.full_name) {
        router.replace('/admin')
        return
      }
      setStatus('form')
    }

    run()
  }, [router, searchParams])

  async function handleCompletarCadastro(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    const nomeTrim = nome.trim()
    if (!nomeTrim) {
      setSubmitError('Informe seu nome.')
      return
    }
    if (senha.length < 6) {
      setSubmitError('A senha deve ter no mínimo 6 caracteres.')
      return
    }
    if (senha !== confirmarSenha) {
      setSubmitError('As senhas não coincidem.')
      return
    }
    if (!supabase) {
      setSubmitError('Supabase não configurado.')
      return
    }

    setSubmitLoading(true)
    try {
      const phoneVal = telefone.trim() || null
      // Atualiza senha e metadados (full_name = Display name; phone_number = telefone de perfil, pois "phone" no Auth é do login por OTP)
      const { data: { user }, error: errUser } = await supabase.auth.updateUser({
        password: senha,
        data: {
          full_name: nomeTrim,
          phone_number: phoneVal,
          phone: phoneVal,
        },
      })
      if (errUser) {
        setSubmitError(errUser.message)
        setSubmitLoading(false)
        return
      }
      if (!user) {
        setSubmitError('Usuário não encontrado.')
        setSubmitLoading(false)
        return
      }

      // Salva também na tabela profiles (usada no Admin do site)
      const { error: errProfile } = await supabase
        .from('profiles')
        .update({
          full_name: nomeTrim,
          phone: phoneVal,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (errProfile) {
        // 400 = colunas full_name/phone podem não existir; senha já foi salva, redireciona e avisa
        const hint =
          errProfile.message && String(errProfile.message).toLowerCase().includes('column')
            ? ' Execute supabase-admin-profiles-campos.sql no Supabase (SQL Editor) para salvar nome e telefone.'
            : ''
        setStatus('ok')
        setMessage('Senha salva! Redirecionando...' + hint)
        setTimeout(() => router.replace('/admin'), hint ? 3500 : 1500)
      } else {
        setStatus('ok')
        setMessage('Cadastro concluído! Redirecionando...')
        setTimeout(() => router.replace('/admin'), 1500)
      }
    } catch {
      setSubmitError('Erro ao salvar. Tente novamente.')
    } finally {
      setSubmitLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Completar cadastro</h1>
          {envLabel !== null && (
            <p className="text-gray-600 text-sm">
              {envLabel === 'local' ? (
                <span className="inline-block px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-xs font-medium">
                  Ambiente local (localhost)
                </span>
              ) : (
                <span className="inline-block px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-medium">
                  Produção
                </span>
              )}
            </p>
          )}
        </div>

        {status === 'loading' && (
          <p className="text-center text-gray-600">Confirmando seu acesso...</p>
        )}

        {status === 'form' && (
          <form onSubmit={handleCompletarCadastro} className="space-y-4">
            <div>
              <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-1">
                Nome completo <span className="text-red-500">*</span>
              </label>
              <input
                id="nome"
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                autoComplete="name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Seu nome"
              />
            </div>
            <div>
              <label htmlFor="telefone" className="block text-sm font-medium text-gray-700 mb-1">
                Telefone
              </label>
              <input
                id="telefone"
                type="tel"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                autoComplete="tel"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="(82) 99999-9999"
              />
            </div>
            <div>
              <label htmlFor="senha" className="block text-sm font-medium text-gray-700 mb-1">
                Senha de acesso <span className="text-red-500">*</span>
              </label>
              <input
                id="senha"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div>
              <label htmlFor="confirmarSenha" className="block text-sm font-medium text-gray-700 mb-1">
                Confirmar senha <span className="text-red-500">*</span>
              </label>
              <input
                id="confirmarSenha"
                type="password"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Repita a senha"
              />
            </div>
            {submitError && (
              <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{submitError}</p>
            )}
            <button
              type="submit"
              disabled={submitLoading}
              className="w-full py-2.5 bg-[#c62737] text-white font-medium rounded-lg hover:bg-[#a01f2d] disabled:opacity-50"
            >
              {submitLoading ? 'Salvando...' : 'Concluir cadastro'}
            </button>
          </form>
        )}

        {status === 'ok' && (
          <p className="text-center text-green-700 font-medium">{message}</p>
        )}

        {status === 'error' && (
          <div className="space-y-4 text-center">
            <p className="text-red-600">{message}</p>
            <Link
              href="/admin/login"
              className="inline-block py-2.5 px-4 bg-[#c62737] text-white font-medium rounded-lg hover:bg-[#a01f2d]"
            >
              Ir para o login
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
