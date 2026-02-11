'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { clearSupabaseLocalSession } from '@/lib/auth-recovery'

function getInputValue(input: HTMLInputElement | null): string {
  return input?.value.trim() ?? ''
}

function getCredentialValues(form: HTMLFormElement, emailRef: HTMLInputElement | null, passwordRef: HTMLInputElement | null) {
  const data = new FormData(form)
  const emailValue = (data.get('email')?.toString() ?? getInputValue(emailRef)).trim()
  const passwordValue = (data.get('password')?.toString() ?? getInputValue(passwordRef)).trim()
  return { emailValue, passwordValue }
}

function isInvalidRefreshTokenMessage(message: string): boolean {
  const normalized = message.toLowerCase()
  return normalized.includes('invalid refresh token') || normalized.includes('refresh token not found')
}

export default function AdminLoginPage() {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    const form = e.currentTarget
    const { emailValue, passwordValue } = getCredentialValues(form, emailRef.current, passwordRef.current)
    if (!emailValue) {
      setError('Informe o e-mail.')
      return
    }
    if (!passwordValue) {
      setError('Informe a senha.')
      return
    }
    if (!supabase) {
      setError('Serviço temporariamente indisponível. Tente mais tarde ou contate o administrador.')
      return
    }
    setLoading(true)
    try {
      let { data, error: err } = await supabase.auth.signInWithPassword({ email: emailValue, password: passwordValue })

      if (err && isInvalidRefreshTokenMessage(err.message)) {
        await clearSupabaseLocalSession(supabase)
        const retry = await supabase.auth.signInWithPassword({ email: emailValue, password: passwordValue })
        data = retry.data
        err = retry.error
      }

      if (err) {
        setError(err.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : 'Não foi possível entrar. Tente novamente.')
        setLoading(false)
        return
      }
      if (data.user) {
        const accessToken = data.session?.access_token
        if (!accessToken) {
          await supabase.auth.signOut()
          setError('Sessão inválida. Faça login novamente.')
          return
        }

        const basePath = typeof process.env.NEXT_PUBLIC_USE_BASEPATH === 'string' && process.env.NEXT_PUBLIC_USE_BASEPATH === 'true' ? '/saraalagoas' : ''
        const adminCheckRes = await fetch(`${basePath}/api/auth/admin-check`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken }),
        })
        const adminCheckJson = await adminCheckRes.json().catch(() => ({}))

        if (!adminCheckRes.ok) {
          await supabase.auth.signOut()
          document.cookie = 'admin_access=; path=/; max-age=0'
          setError(adminCheckRes.status === 401 ? 'Sessão inválida. Faça login novamente.' : 'Não foi possível verificar seu acesso. Tente novamente.')
          return
        }
        if (!adminCheckJson.canAccessAdmin) {
          await supabase.auth.signOut()
          document.cookie = 'admin_access=; path=/; max-age=0'
          setError('Seu perfil não possui acesso ao painel administrativo.')
          return
        }

        // Cookie HttpOnly definido pelo servidor (reduz risco de XSS)
        const setCookieRes = await fetch(`${basePath}/api/auth/set-admin-cookie`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken }),
          credentials: 'same-origin',
        })
        if (!setCookieRes.ok) {
          await supabase.auth.signOut()
          document.cookie = 'admin_access=; path=/; max-age=0'
          setError('Erro ao definir sessão. Tente novamente.')
          return
        }
        window.location.replace(`${basePath}/admin`)
        return
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      const isNetwork = msg.includes('fetch') || msg.includes('Failed to fetch')
      setError(isNetwork ? 'Não foi possível conectar. Verifique sua internet e tente novamente.' : 'Não foi possível entrar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  async function handleMagicLink(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    const btn = e.target as HTMLButtonElement
    const formFromBtn = btn.form
    const form = formFromBtn ?? formRef.current
    const emailValue = form ? getCredentialValues(form, emailRef.current, passwordRef.current).emailValue : getInputValue(emailRef.current)
    if (!supabase) {
      setError('Serviço temporariamente indisponível. Tente mais tarde ou contate o administrador.')
      return
    }
    if (!emailValue) {
      setError('Informe o e-mail.')
      return
    }
    setLoading(true)
    try {
      // Usar URL do app para o link do e-mail não redirecionar para localhost (ex.: em produção)
      const basePath = typeof process.env.NEXT_PUBLIC_USE_BASEPATH === 'string' && process.env.NEXT_PUBLIC_USE_BASEPATH === 'true' ? '/saraalagoas' : ''
      const appOrigin = typeof process.env.NEXT_PUBLIC_APP_URL === 'string' && process.env.NEXT_PUBLIC_APP_URL
        ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
        : (typeof window !== 'undefined' ? window.location.origin : '')
      const emailRedirectTo = `${appOrigin}${basePath}/admin/completar-cadastro`
      const { error: err } = await supabase.auth.signInWithOtp({
        email: emailValue,
        options: { emailRedirectTo },
      })
      if (err) {
        setError('Não foi possível enviar o link. Tente novamente.')
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
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-xl">
        <div className="mb-7 text-center">
          <Image
            src="/logo-sara-oficial.png"
            alt="Logo oficial Sara Alagoas"
            width={220}
            height={97}
          loading="eager"
          fetchPriority="high"
            className="mx-auto mb-4 h-auto w-44 sm:w-52"
          />
          <h1 className="text-2xl font-semibold text-slate-900">Acesso administrativo</h1>
          <p className="mt-1 text-sm text-slate-600">Sara Sede Alagoas</p>
        </div>
        <form
          ref={formRef}
          onSubmit={handleLogin}
          method="post"
          action="#"
          autoComplete="on"
          className="space-y-4"
          data-form-type="login"
        >
          <div>
            <label htmlFor="admin-login-email" className="mb-1 block text-sm font-medium text-slate-700">
              E-mail
            </label>
            <input
              ref={emailRef}
              id="admin-login-email"
              type="email"
              name="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              required
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20"
              placeholder="seu@email.com"
              data-lpignore="false"
              data-1p-ignore="false"
            />
          </div>
          <div>
            <label htmlFor="admin-login-password" className="mb-1 block text-sm font-medium text-slate-700">
              Senha
            </label>
            <div className="relative">
              <input
                ref={passwordRef}
                id="admin-login-password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete="current-password"
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 pr-24 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20"
                placeholder="••••••••"
                data-lpignore="false"
                data-1p-ignore="false"
                aria-describedby="admin-login-password-toggle"
              />
              <button
                type="button"
                id="admin-login-password-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </div>
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              <p>{error}</p>
            </div>
          )}
          {message && (
            <div className="space-y-1 rounded-lg bg-green-50 p-3 text-sm text-green-700">
              <p>{message}</p>
              <p className="text-gray-600 mt-2">Não recebeu? Verifique a pasta <strong>Spam</strong>.</p>
            </div>
          )}
          <div className="flex flex-col gap-2 pt-1">
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#c62737] py-2.5 font-medium text-white transition hover:bg-[#a01f2d] disabled:opacity-60"
            >
              {loading ? 'Validando acesso...' : 'Entrar'}
            </button>
            <button
              type="button"
              onClick={handleMagicLink}
              disabled={loading}
              className="w-full rounded-lg border border-slate-300 py-2.5 font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              Enviar link de acesso por e-mail
            </button>
          </div>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">
          <Link href="/" className="text-[#c62737] hover:underline">Voltar ao site</Link>
        </p>
        <p className="mx-auto mt-3 max-w-xs text-center text-xs text-slate-400">
          Não recebeu o e-mail? Verifique o Spam ou entre em contato com um administrador.
        </p>
      </div>
    </div>
  )
}
