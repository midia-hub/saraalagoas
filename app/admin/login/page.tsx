'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

/** Lê valor do campo pelo nome no formulário (valor real do DOM, inclusive autocomplete) */
function getFormValue(form: HTMLFormElement | null, name: string): string {
  console.log('[Login] getFormValue', { form: !!form, name, formElements: form ? Array.from(form.elements).map((e) => ({ tag: e.tagName, name: (e as HTMLInputElement).name, type: (e as HTMLInputElement).type })) : [] })
  if (!form) {
    console.log('[Login] getFormValue: form é null')
    return ''
  }
  const el = form.elements.namedItem(name)
  // namedItem pode retornar HTMLInputElement ou RadioNodeList; acessar .value com cast via unknown
  const value = (el && 'value' in el ? (el as unknown as HTMLInputElement).value : '').trim()
  console.log('[Login] getFormValue resultado', { name, el: !!el, valueRaw: el && 'value' in el ? (el as unknown as HTMLInputElement).value : '(sem value)', value })
  return value
}

export default function AdminLoginPage() {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    console.log('[Login] handleLogin chamado')
    setError(null)
    setMessage(null)
    const form = e.currentTarget
    console.log('[Login] handleLogin form', { formId: form.id, formName: form.getAttribute('name'), numElements: form.elements.length })
    const emailValue = getFormValue(form, 'email')
    const passwordValue = getFormValue(form, 'password')
    console.log('[Login] handleLogin valores lidos', { emailValue, passwordLength: passwordValue.length })
    if (!emailValue) {
      console.log('[Login] handleLogin: email vazio, mostrando erro')
      setError('Informe o e-mail.')
      return
    }
    if (!passwordValue) {
      setError('Informe a senha.')
      return
    }
    if (!supabase) {
      setError('Supabase não configurado. Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no .env.local')
      return
    }
    setLoading(true)
    try {
      const { data, error: err } = await supabase.auth.signInWithPassword({ email: emailValue, password: passwordValue })
      if (err) {
        setError(err.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : err.message)
        setLoading(false)
        return
      }
      if (data.user) router.replace('/admin')
    } catch (e) {
      setError('Erro ao entrar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  async function handleMagicLink(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault()
    console.log('[Login] handleMagicLink chamado')
    setError(null)
    setMessage(null)
    const btn = e.target as HTMLButtonElement
    const formFromBtn = btn.form
    const form = formFromBtn ?? formRef.current
    console.log('[Login] handleMagicLink form', { formFromBtn: !!formFromBtn, formRef: !!formRef.current, form: !!form })
    const emailValue = getFormValue(form, 'email')
    console.log('[Login] handleMagicLink emailValue', { emailValue })
    if (!supabase) {
      setError('Supabase não configurado. Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no .env.local')
      return
    }
    if (!emailValue) {
      setError('Informe o e-mail.')
      return
    }
    setLoading(true)
    try {
      const { error: err } = await supabase.auth.signInWithOtp({ email: emailValue })
      if (err) {
        setError(err.message)
        setLoading(false)
        return
      }
      setMessage('Enviamos um link de acesso para seu e-mail. Verifique a caixa de entrada.')
    } catch {
      setError('Erro ao enviar link.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Admin</h1>
          <p className="text-gray-600 mt-1">Sara Sede Alagoas</p>
        </div>
        <form ref={formRef} onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              name="email"
              autoComplete="email"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="seu@email.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Senha
            </label>
            <input
              id="password"
              type="password"
              name="password"
              autoComplete="current-password"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>
          )}
          {message && (
            <div className="text-sm text-green-700 bg-green-50 p-3 rounded space-y-1">
              <p>{message}</p>
              <p className="text-gray-600 mt-2">Não recebeu? Verifique a pasta <strong>Spam</strong>. Configure as URLs em Supabase (Auth → URL Configuration) e, se precisar, use SMTP customizado (veja <code className="text-xs bg-gray-100 px-1">docs/EMAIL-NAO-RECEBIDO.md</code>).</p>
            </div>
          )}
          <div className="flex flex-col gap-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#c62737] text-white font-medium rounded-lg hover:bg-[#a01f2d] disabled:opacity-50"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
            <button
              type="button"
              onClick={handleMagicLink}
              disabled={loading}
              className="w-full py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Enviar link de acesso por e-mail
            </button>
          </div>
        </form>
        <p className="mt-6 text-center text-sm text-gray-500">
          <Link href="/" className="text-[#c62737] hover:underline">Voltar ao site</Link>
        </p>
        <p className="mt-3 text-center text-xs text-gray-400 max-w-xs mx-auto">
          Não recebeu o e-mail de criação de conta? Verifique o Spam ou crie o usuário em Supabase (Authentication → Users) e defina a senha lá. Veja <code className="bg-gray-100 px-1">docs/EMAIL-NAO-RECEBIDO.md</code>.
        </p>
      </div>
    </div>
  )
}
