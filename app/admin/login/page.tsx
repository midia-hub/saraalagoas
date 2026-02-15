'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Loader2, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { clearSupabaseLocalSession } from '@/lib/auth-recovery'
import { getStorageUrl } from '@/lib/storage-url'
import styles from './login.module.css'

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
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [modalPrimeiroLogin, setModalPrimeiroLogin] = useState(false)
  const [loadingMagicLink, setLoadingMagicLink] = useState(false)
  const emailPrimeiroLoginRef = useRef<HTMLInputElement>(null)
  const [modalResetSenha, setModalResetSenha] = useState(false)
  const [loadingResetSenha, setLoadingResetSenha] = useState(false)
  const emailResetSenhaRef = useRef<HTMLInputElement>(null)

  function showToastMessage(message: string, type: 'error' | 'success' = 'error') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setToast(null)
    const form = e.currentTarget
    const { emailValue, passwordValue } = getCredentialValues(form, emailRef.current, passwordRef.current)
    if (!emailValue) {
      showToastMessage('Por favor, insira seu e-mail.')
      return
    }
    if (!passwordValue) {
      showToastMessage('Informe a senha.')
      return
    }
    if (!supabase) {
      showToastMessage('Serviço temporariamente indisponível. Tente mais tarde ou contate o administrador.')
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
        showToastMessage(err.message === 'Invalid login credentials' ? 'Verifique seu e-mail ou senha e tente novamente.' : 'Não foi possível entrar. Tente novamente.')
        setLoading(false)
        return
      }
      if (data.user) {
        const accessToken = data.session?.access_token
        if (!accessToken) {
          await supabase.auth.signOut()
          showToastMessage('Sessão inválida. Faça login novamente.')
          setLoading(false)
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
          showToastMessage(adminCheckRes.status === 401 ? 'Sessão inválida. Faça login novamente.' : 'Não foi possível verificar seu acesso. Tente novamente.')
          setLoading(false)
          return
        }
        if (!adminCheckJson.canAccessAdmin) {
          await supabase.auth.signOut()
          document.cookie = 'admin_access=; path=/; max-age=0'
          showToastMessage('Seu perfil não possui acesso ao painel administrativo.')
          setLoading(false)
          return
        }

        const setCookieRes = await fetch(`${basePath}/api/auth/set-admin-cookie`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken }),
          credentials: 'same-origin',
        })
        if (!setCookieRes.ok) {
          await supabase.auth.signOut()
          document.cookie = 'admin_access=; path=/; max-age=0'
          showToastMessage('Erro ao definir sessão. Tente novamente.')
          setLoading(false)
          return
        }
        window.location.replace(`${basePath}/admin`)
        return
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      const isNetwork = msg.includes('fetch') || msg.includes('Failed to fetch')
      showToastMessage(isNetwork ? 'Não foi possível conectar. Verifique sua internet e tente novamente.' : 'Não foi possível entrar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  async function handlePrimeiroLoginSubmit(e: React.FormEvent) {
    e.preventDefault()
    const email = emailPrimeiroLoginRef.current?.value?.trim() ?? ''
    if (!email) {
      showToastMessage('Por favor, insira seu e-mail.')
      return
    }
    if (!supabase) {
      showToastMessage('Serviço temporariamente indisponível. Tente mais tarde ou contate o administrador.')
      return
    }
    setLoadingMagicLink(true)
    setToast(null)
    try {
      const basePath =
        typeof process.env.NEXT_PUBLIC_USE_BASEPATH === 'string' && process.env.NEXT_PUBLIC_USE_BASEPATH === 'true'
          ? '/saraalagoas'
          : ''
      const checkRes = await fetch(`${basePath}/api/auth/check-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const checkJson = await checkRes.json().catch(() => ({}))
      if (checkRes.ok && checkJson.exists === true) {
        showToastMessage('Este e-mail já possui conta. Use "Fazer login" ou "Redefinir senha".')
        setLoadingMagicLink(false)
        return
      }
      const appOrigin =
        typeof process.env.NEXT_PUBLIC_APP_URL === 'string' && process.env.NEXT_PUBLIC_APP_URL
          ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
          : typeof window !== 'undefined'
            ? window.location.origin
            : ''
      const emailRedirectTo = `${appOrigin}${basePath}/admin/completar-cadastro`
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo },
      })
      if (error) {
        showToastMessage('Não foi possível enviar o link. Tente novamente.')
        setLoadingMagicLink(false)
        return
      }
      showToastMessage('Enviamos um link de acesso para seu e-mail. Verifique a caixa de entrada.', 'success')
      setModalPrimeiroLogin(false)
      emailPrimeiroLoginRef.current && (emailPrimeiroLoginRef.current.value = '')
    } catch {
      showToastMessage('Erro ao enviar link.')
    } finally {
      setLoadingMagicLink(false)
    }
  }

  async function handleResetSenhaSubmit(e: React.FormEvent) {
    e.preventDefault()
    const email = emailResetSenhaRef.current?.value?.trim() ?? ''
    if (!email) {
      showToastMessage('Por favor, insira seu e-mail.')
      return
    }
    if (!supabase) {
      showToastMessage('Serviço temporariamente indisponível. Tente mais tarde ou contate o administrador.')
      return
    }
    setLoadingResetSenha(true)
    setToast(null)
    try {
      const basePath =
        typeof process.env.NEXT_PUBLIC_USE_BASEPATH === 'string' && process.env.NEXT_PUBLIC_USE_BASEPATH === 'true'
          ? '/saraalagoas'
          : ''
      const appOrigin =
        typeof process.env.NEXT_PUBLIC_APP_URL === 'string' && process.env.NEXT_PUBLIC_APP_URL
          ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
          : typeof window !== 'undefined'
            ? window.location.origin
            : ''
      const redirectTo = `${appOrigin}${basePath}/redefinir-senha`
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
      if (error) {
        showToastMessage(
          error.message === 'Email not confirmed'
            ? 'E-mail ainda não confirmado. Use o link de acesso ou crie acesso.'
            : 'Não foi possível enviar o e-mail. Tente novamente.'
        )
        setLoadingResetSenha(false)
        return
      }
      showToastMessage('Enviamos um link para redefinir sua senha. Verifique seu e-mail.', 'success')
      setModalResetSenha(false)
      emailResetSenhaRef.current && (emailResetSenhaRef.current.value = '')
    } catch {
      showToastMessage('Erro ao enviar. Tente novamente.')
    } finally {
      setLoadingResetSenha(false)
    }
  }

  return (
    <div className="fixed inset-0 overflow-auto text-[#252525]" style={{ fontFamily: "'Inter', sans-serif" }} role="dialog" aria-modal="true" aria-label="Login administrativo">
      <div className={styles.bg} />
      <div className={styles.bgGradient} />
      <div className={styles.waves}>
        <div className={`${styles.waveLayer} ${styles.waveLayer1}`} />
        <div className={`${styles.waveLayer} ${styles.waveLayer2}`} />
        <div className={`${styles.waveLayer} ${styles.waveLayer3}`} />
      </div>
      <div className={`${styles.bgBlob} ${styles.bgBlob1}`} />
      <div className={`${styles.bgBlob} ${styles.bgBlob2}`} />
      <div className={`${styles.bgBlob} ${styles.bgBlob3}`} />
      <div className={styles.bgShimmer} />
      <div className={`${styles.orb} ${styles.orb1}`} />
      <div className={`${styles.orb} ${styles.orb2}`} />

      <main className={styles.wrapper}>
        <div className={styles.logoAboveCard}>
          <Image
            src={getStorageUrl('LOGO SARA ALAGAOS1.png')}
            alt="Sara Nossa Terra Alagoas"
            width={220}
            height={88}
            sizes="(max-width: 480px) 160px, 220px"
            style={{ width: 'auto', height: '72px', maxWidth: '220px', objectFit: 'contain' }}
            unoptimized
            priority
            onError={(e) => {
              const t = e.target as HTMLImageElement
              t.src = '/logo-sara-oficial.png'
            }}
          />
        </div>
        <div className={styles.card}>
          <h1 className={styles.srOnly}>Bem-vindo — Acesse sua conta</h1>
          <p className={styles.cardTitle} aria-hidden>Bem-vindo</p>
          <p className={styles.cardSub} aria-hidden>Acesse sua conta</p>
          <div className={styles.sep} aria-hidden />

          <form ref={formRef} onSubmit={handleLogin} method="post" autoComplete="on">
            <div className={styles.field}>
              <label htmlFor="admin-login-email">E-mail</label>
              <div className={styles.inputContainer}>
                <Mail size={18} strokeWidth={1.5} className={styles.inputIcon} />
                <input
                  ref={emailRef}
                  id="admin-login-email"
                  type="email"
                  name="email"
                  placeholder="seu@email.com"
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  required
                  className={styles.innerInput}
                />
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="admin-login-password">Senha</label>
              <div className={styles.inputContainer}>
                <Lock size={18} strokeWidth={1.5} className={styles.inputIcon} />
                <input
                  ref={passwordRef}
                  id="admin-login-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className={styles.innerInput}
                />
                <button
                  type="button"
                  className={styles.eyeButton}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowPassword(!showPassword);
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff size={18} strokeWidth={1.5} /> : <Eye size={18} strokeWidth={1.5} />}
                </button>
              </div>
            </div>

            <div className={styles.options} style={{ justifyContent: 'space-between' }}>
              <button
                type="button"
                className={styles.magicLink}
                onClick={() => setModalPrimeiroLogin(true)}
              >
                Primeiro login
              </button>
              <button
                type="button"
                className={styles.magicLink}
                style={{ fontSize: '0.75rem' }}
                onClick={() => setModalResetSenha(true)}
              >
                Redefinir senha
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={styles.btnLogin}
            >
              {loading ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Loader2 size={18} className="animate-spin" />
                  Validando...
                </span>
              ) : (
                'Entrar'
              )}
            </button>
          </form>

          <p className={styles.cardFooter}>Sara Nossa Terra — {new Date().getFullYear()}</p>

          <Link href="/" className={styles.backLink}>
            Voltar ao site
          </Link>
        </div>
      </main>

      {/* Modal Primeiro login */}
      {modalPrimeiroLogin && (
        <div
          className={styles.modalOverlay}
          onClick={() => setModalPrimeiroLogin(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Primeiro login - informe seu e-mail"
        >
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <p className={styles.cardTitle} style={{ marginBottom: 4 }}>Primeiro login</p>
            <p className={styles.cardSub} style={{ marginBottom: 14 }}>Informe seu e-mail para receber o link de acesso</p>
            <form onSubmit={handlePrimeiroLoginSubmit}>
              <div className={styles.field}>
                <label htmlFor="modal-primeiro-login-email">E-mail</label>
                <div className={styles.inputContainer}>
                  <Mail size={18} strokeWidth={1.5} className={styles.inputIcon} />
                  <input
                    ref={emailPrimeiroLoginRef}
                    id="modal-primeiro-login-email"
                    type="email"
                    placeholder="seu@email.com"
                    autoComplete="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    required
                    className={styles.innerInput}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button
                  type="button"
                  className={styles.modalBtnSecondary}
                  onClick={() => setModalPrimeiroLogin(false)}
                >
                  Cancelar
                </button>
                <button type="submit" disabled={loadingMagicLink} className={styles.btnLogin} style={{ flex: 1 }}>
                  {loadingMagicLink ? (
                    <span className="inline-flex items-center justify-center gap-2">
                      <Loader2 size={18} className="animate-spin" />
                      Enviando...
                    </span>
                  ) : (
                    'Enviar link de acesso'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Redefinir senha */}
      {modalResetSenha && (
        <div
          className={styles.modalOverlay}
          onClick={() => setModalResetSenha(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Redefinir senha - informe seu e-mail"
        >
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <p className={styles.cardTitle} style={{ marginBottom: 4 }}>Redefinir senha</p>
            <p className={styles.cardSub} style={{ marginBottom: 14 }}>Informe seu e-mail para receber o link de redefinição</p>
            <form onSubmit={handleResetSenhaSubmit}>
              <div className={styles.field}>
                <label htmlFor="modal-reset-senha-email">E-mail</label>
                <div className={styles.inputContainer}>
                  <Mail size={18} strokeWidth={1.5} className={styles.inputIcon} />
                  <input
                    ref={emailResetSenhaRef}
                    id="modal-reset-senha-email"
                    type="email"
                    placeholder="seu@email.com"
                    autoComplete="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    required
                    className={styles.innerInput}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button
                  type="button"
                  className={styles.modalBtnSecondary}
                  onClick={() => setModalResetSenha(false)}
                >
                  Cancelar
                </button>
                <button type="submit" disabled={loadingResetSenha} className={styles.btnLogin} style={{ flex: 1 }}>
                  {loadingResetSenha ? (
                    <span className="inline-flex items-center justify-center gap-2">
                      <Loader2 size={18} className="animate-spin" />
                      Enviando...
                    </span>
                  ) : (
                    'Enviar link de redefinição'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className={`${styles.toast} ${styles.show} ${toast.type === 'success' ? styles.success : ''}`}>
          {toast.message}
        </div>
      )}
    </div>
  )
}
