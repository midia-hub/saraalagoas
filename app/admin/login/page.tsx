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
      const isProd = typeof window !== 'undefined' && !/localhost|127\.0\.0\.1/.test(window.location.origin)
      setError(
        isProd
          ? 'Supabase não configurado na Vercel. Em Vercel → Settings → Environment Variables, adicione NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY (Production) e faça um novo deploy (Redeploy). Veja docs/LOGIN-VERCEL.md.'
          : 'Supabase não configurado. Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no .env.local'
      )
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
        setError(err.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : err.message)
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
          const msg = adminCheckJson?.error || `Erro ao verificar permissão (${adminCheckRes.status}).`
          const isProd = typeof window !== 'undefined' && !/localhost|127\.0\.0\.1/.test(window.location.origin)
          const hint500 = isProd
            ? ' Na Vercel, confira SUPABASE_SERVICE_ROLE_KEY e NEXT_PUBLIC_SUPABASE_* e faça um Redeploy. Veja docs/LOGIN-VERCEL.md.'
            : ' Verifique as variáveis de ambiente (Supabase).'
          setError(
            adminCheckRes.status === 401
              ? `${msg} Faça login novamente.`
              : adminCheckRes.status === 500
                ? `${msg}${hint500}`
                : msg
          )
          return
        }
        if (!adminCheckJson.canAccessAdmin) {
          await supabase.auth.signOut()
          document.cookie = 'admin_access=; path=/; max-age=0'
          setError('Seu perfil não possui acesso ao painel administrativo.')
          return
        }

        // Cookie com Secure em HTTPS para produção; redirecionamento completo para o cookie ser enviado na próxima requisição
        const isHttps = typeof window !== 'undefined' && window.location?.protocol === 'https:'
        document.cookie = `admin_access=1; path=/; max-age=86400; SameSite=Lax${isHttps ? '; Secure' : ''}`
        window.location.replace(`${basePath}/admin`)
        return
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao entrar. Tente novamente.'
      const isProd = typeof window !== 'undefined' && !/localhost|127\.0\.0\.1/.test(window.location.origin)
      const isNetwork = msg.includes('fetch') || msg.includes('Failed to fetch')
      setError(
        isNetwork
          ? isProd
            ? 'Não foi possível conectar ao servidor. Na Vercel, confira as variáveis NEXT_PUBLIC_SUPABASE_* e SUPABASE_SERVICE_ROLE_KEY e faça um Redeploy. Veja docs/LOGIN-VERCEL.md.'
            : 'Não foi possível conectar ao servidor. Verifique sua internet e se o servidor está rodando.'
          : msg
      )
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
      const isProd = typeof window !== 'undefined' && !/localhost|127\.0\.0\.1/.test(window.location.origin)
      setError(
        isProd
          ? 'Supabase não configurado na Vercel. Adicione NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY nas variáveis de ambiente e faça Redeploy.'
          : 'Supabase não configurado. Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no .env.local'
      )
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
          autoComplete="on"
          className="space-y-4"
        >
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
              E-mail
            </label>
            <input
              ref={emailRef}
              id="email"
              type="email"
              name="email"
              inputMode="email"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              required
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20"
              placeholder="seu@email.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
              Senha
            </label>
            <div className="relative">
              <input
                ref={passwordRef}
                id="password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete="current-password"
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 pr-24 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-800"
              >
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </div>
          {error && (
            <div className="space-y-1 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              <p>{error}</p>
              {error.includes('500') || error.includes('Supabase') ? (
                <p className="text-xs text-red-700 mt-1">
                  Se o erro persistir, confira no Supabase (Dashboard → Settings → API) se a chave <strong>service_role</strong> está em <code className="bg-red-100 px-1">SUPABASE_SERVICE_ROLE_KEY</code> no .env.
                </p>
              ) : null}
            </div>
          )}
          {message && (
            <div className="space-y-1 rounded-lg bg-green-50 p-3 text-sm text-green-700">
              <p>{message}</p>
              <p className="text-gray-600 mt-2">Não recebeu? Verifique a pasta <strong>Spam</strong>. Configure as URLs em Supabase (Auth → URL Configuration) e, se precisar, use SMTP customizado (veja <code className="text-xs bg-gray-100 px-1">docs/EMAIL-NAO-RECEBIDO.md</code>).</p>
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
          Não recebeu o e-mail de criação de conta? Verifique o Spam ou crie o usuário em Supabase (Authentication → Users) e defina a senha lá. Veja <code className="bg-gray-100 px-1">docs/EMAIL-NAO-RECEBIDO.md</code>.
        </p>
      </div>
    </div>
  )
}
