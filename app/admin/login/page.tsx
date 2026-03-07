'use client'

import { useEffect, useRef, useState } from 'react'
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

function getCredentialValues(
  form: HTMLFormElement,
  emailRef: HTMLInputElement | null,
  passwordRef: HTMLInputElement | null,
) {
  const data = new FormData(form)
  const emailValue = (data.get('email')?.toString() ?? getInputValue(emailRef)).trim()
  const passwordValue = (data.get('password')?.toString() ?? getInputValue(passwordRef)).trim()
  return { emailValue, passwordValue }
}

function isInvalidRefreshTokenMessage(message: string): boolean {
  const normalized = message.toLowerCase()
  return normalized.includes('invalid refresh token') || normalized.includes('refresh token not found')
}

const MODULES = [
  { icon: '♪', label: 'Células' },
  { icon: '📋', label: 'Escalas' },
  { icon: '👶', label: 'Sara Kids' },
  { icon: '📱', label: 'Mídia' },
  { icon: '📖', label: 'Livraria' },
  { icon: '🙏', label: 'Consolidação' },
]

export default function AdminLoginPage() {
  const formRef = useRef<HTMLFormElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const bgCanvasRef = useRef<HTMLCanvasElement>(null)
  const ptCanvasRef = useRef<HTMLCanvasElement>(null)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [modalResetSenha, setModalResetSenha] = useState(false)
  const [loadingResetSenha, setLoadingResetSenha] = useState(false)
  const emailResetSenhaRef = useRef<HTMLInputElement>(null)

  /* Canvas principal: gradiente quente + bokeh + ondas */
  useEffect(() => {
    const canvas = bgCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let W = 0,
      H = 0,
      t = 0,
      animId = 0

    const resize = () => {
      W = canvas.width = window.innerWidth
      H = canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    type Bokeh = { x: number; y: number; r: number; vx: number; vy: number; c: string }
    const bk: Bokeh[] = Array.from({ length: 16 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 35 + Math.random() * 90,
      vx: (Math.random() - 0.5) * 0.00011,
      vy: (Math.random() - 0.5) * 0.000085,
      c:
        Math.random() > 0.55
          ? `rgba(196,35,42,${(0.018 + Math.random() * 0.025).toFixed(3)})`
          : `rgba(232,135,42,${(0.018 + Math.random() * 0.025).toFixed(3)})`,
    }))

    const waves = [
      { yB: 0.7, a: 52, f: 0.0042, s: 0.48, p: 0, c: 'rgba(196,35,42,0.046)' },
      { yB: 0.76, a: 40, f: 0.0052, s: 0.65, p: 1.1, c: 'rgba(196,35,42,0.052)' },
      { yB: 0.81, a: 56, f: 0.0032, s: 0.38, p: 2.2, c: 'rgba(232,135,42,0.038)' },
      { yB: 0.86, a: 34, f: 0.0058, s: 0.82, p: 3.3, c: 'rgba(196,35,42,0.058)' },
      { yB: 0.91, a: 30, f: 0.0068, s: 1.05, p: 0.7, c: 'rgba(232,135,42,0.048)' },
      { yB: 0.96, a: 22, f: 0.008, s: 1.3, p: 1.8, c: 'rgba(196,35,42,0.04)' },
    ]

    function draw() {
      ctx.clearRect(0, 0, W, H)

      const g = ctx.createLinearGradient(0, 0, W * 0.65, H)
      g.addColorStop(0, '#FEFAF8')
      g.addColorStop(0.4, '#FAF3EC')
      g.addColorStop(1, '#F5E9DF')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, W, H)

      bk.forEach((b) => {
        b.x += b.vx
        b.y += b.vy
        if (b.x < -0.15) b.x = 1.15
        if (b.x > 1.15) b.x = -0.15
        if (b.y < -0.15) b.y = 1.15
        if (b.y > 1.15) b.y = -0.15
        const gr = ctx.createRadialGradient(b.x * W, b.y * H, 0, b.x * W, b.y * H, b.r)
        gr.addColorStop(0, b.c)
        gr.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.beginPath()
        ctx.arc(b.x * W, b.y * H, b.r, 0, Math.PI * 2)
        ctx.fillStyle = gr
        ctx.fill()
      })

      waves.forEach((w) => {
        ctx.beginPath()
        ctx.moveTo(0, H)
        for (let x = 0; x <= W; x += 3) {
          const y =
            H * w.yB +
            Math.sin(x * w.f + t * w.s + w.p) * w.a +
            Math.sin(x * w.f * 0.55 + t * w.s * 0.75 + w.p + 0.9) * (w.a * 0.4)
          ctx.lineTo(x, y)
        }
        ctx.lineTo(W, H)
        ctx.closePath()
        ctx.fillStyle = w.c
        ctx.fill()
      })

      t += 0.009
      animId = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animId)
    }
  }, [])

  /* Canvas de partículas */
  useEffect(() => {
    const canvas = ptCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let animId = 0

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    type Particle = { x: number; y: number; r: number; vx: number; vy: number; o: number; rgb: string }
    const pts: Particle[] = Array.from({ length: 24 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: 0.5 + Math.random() * 1.8,
      vx: (Math.random() - 0.5) * 0.22,
      vy: (Math.random() - 0.5) * 0.18,
      o: 0.05 + Math.random() * 0.13,
      rgb: Math.random() > 0.5 ? '196,35,42' : '232,135,42',
    }))

    function animP() {
      const cw = canvas.width
      const ch = canvas.height
      ctx.clearRect(0, 0, cw, ch)
      pts.forEach((p) => {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0) p.x = cw
        if (p.x > cw) p.x = 0
        if (p.y < 0) p.y = ch
        if (p.y > ch) p.y = 0
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${p.rgb},${p.o})`
        ctx.fill()
      })
      animId = requestAnimationFrame(animP)
    }
    animP()

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animId)
    }
  }, [])

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
      let { data, error: err } = await supabase.auth.signInWithPassword({
        email: emailValue,
        password: passwordValue,
      })

      if (err && isInvalidRefreshTokenMessage(err.message)) {
        await clearSupabaseLocalSession(supabase)
        const retry = await supabase.auth.signInWithPassword({ email: emailValue, password: passwordValue })
        data = retry.data
        err = retry.error
      }

      if (err) {
        showToastMessage(
          err.message === 'Invalid login credentials'
            ? 'Verifique seu e-mail ou senha e tente novamente.'
            : 'Não foi possível entrar. Tente novamente.',
        )
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

        const basePath =
          typeof process.env.NEXT_PUBLIC_USE_BASEPATH === 'string' &&
          process.env.NEXT_PUBLIC_USE_BASEPATH === 'true'
            ? '/saraalagoas'
            : ''
        const adminCheckRes = await fetch(`${basePath}/api/auth/admin-check`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken }),
        })
        const adminCheckJson = await adminCheckRes.json().catch(() => ({}))

        if (!adminCheckRes.ok) {
          await supabase.auth.signOut()
          document.cookie = 'admin_access=; path=/; max-age=0'
          showToastMessage(
            adminCheckRes.status === 401
              ? 'Sessão inválida. Faça login novamente.'
              : 'Não foi possível verificar seu acesso. Tente novamente.',
          )
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
      showToastMessage(
        isNetwork
          ? 'Não foi possível conectar. Verifique sua internet e tente novamente.'
          : 'Não foi possível entrar. Tente novamente.',
      )
    } finally {
      setLoading(false)
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
        typeof process.env.NEXT_PUBLIC_USE_BASEPATH === 'string' &&
        process.env.NEXT_PUBLIC_USE_BASEPATH === 'true'
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
            : 'Não foi possível enviar o e-mail. Tente novamente.',
        )
        setLoadingResetSenha(false)
        return
      }
      showToastMessage('Enviamos um link para redefinir sua senha. Verifique seu e-mail.', 'success')
      setModalResetSenha(false)
      if (emailResetSenhaRef.current) emailResetSenhaRef.current.value = ''
    } catch {
      showToastMessage('Erro ao enviar. Tente novamente.')
    } finally {
      setLoadingResetSenha(false)
    }
  }

  return (
    <div className={styles.root} role="main" aria-label="Login administrativo">
      {/* Fundo animado */}
      <canvas ref={bgCanvasRef} className={styles.bgCanvas} aria-hidden="true" />
      <canvas ref={ptCanvasRef} className={styles.ptCanvas} aria-hidden="true" />

      {/* Orbs decorativos */}
      <div className={`${styles.orb} ${styles.orbA}`} aria-hidden="true" />
      <div className={`${styles.orb} ${styles.orbB}`} aria-hidden="true" />
      <div className={`${styles.orb} ${styles.orbC}`} aria-hidden="true" />
      <div className={`${styles.orb} ${styles.orbD}`} aria-hidden="true" />

      <div className={styles.page}>
        {/* Painel esquerdo */}
        <div className={styles.left} aria-hidden="true">
          <div className={styles.brand}>
            <Image
              src={getStorageUrl('brand/logo.png')}
              alt="Sara Alagoas"
              width={54}
              height={54}
              style={{ height: '54px', width: 'auto', objectFit: 'contain' }}
              onError={(e) => {
                ;(e.target as HTMLImageElement).src = '/logo-sara-oficial.png'
              }}
              unoptimized
              priority
            />
          </div>

          <h1 className={styles.headline}>
            <span className={styles.hlLine}>
              <span>Bem-vindo</span>
            </span>
            <span className={styles.hlLine}>
              <span>
                ao <em>painel</em>
              </span>
            </span>
            <span className={styles.hlLine}>
              <span>Sara Alagoas</span>
            </span>
          </h1>

          <div className={styles.rule}>
            <div className={styles.ruleLine} />
            <span className={styles.ruleTxt}>Plataforma de gestão</span>
          </div>

          <p className={styles.desc}>
            Gerencie células, escalas, consolidação, Sara Kids, mídia social e muito mais, tudo integrado
            em um único painel.
          </p>

          <div className={styles.modules}>
            {MODULES.map((m) => (
              <div key={m.label} className={styles.mod}>
                <span className={styles.modIco}>{m.icon}</span>
                <span>{m.label}</span>
              </div>
            ))}
          </div>

          <div className={styles.leaders}>
            <div className={styles.avatars}>
              <div className={styles.av}>
                <Image
                  src={getStorageUrl('leadership/frank.jpg')}
                  alt="Bispo Frank"
                  width={36}
                  height={36}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).style.display = 'none'
                  }}
                  unoptimized
                />
              </div>
              <div className={styles.av}>
                <Image
                  src={getStorageUrl('leadership/betania.jpg')}
                  alt="Bispa Betânia"
                  width={36}
                  height={36}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).style.display = 'none'
                  }}
                  unoptimized
                />
              </div>
            </div>
            <div className={styles.leaderInfo}>
              <strong>Bispo Frank & Bispa Betânia Guimarães</strong>
              Liderança Alagoas
            </div>
          </div>
        </div>

        {/* Painel direito */}
        <div className={styles.right}>
          <div className={styles.card}>
            {/* Faixa gradiente superior */}
            <div className={styles.cardBand} aria-hidden="true" />

            <div className={styles.cardBody}>
              {/* Logo + título */}
              <div className={styles.cardHeader}>
                <div className={styles.cardLogoWrap}>
                  <Image
                    src={getStorageUrl('CHAMA_SARA.png')}
                    alt="Sara"
                    width={58}
                    height={58}
                    style={{ height: '58px', width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 2px 6px rgba(196,35,42,0.18))' }}
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).src = '/logo-sara-oficial.png'
                    }}
                    unoptimized
                    priority
                  />
                </div>
                <p className={styles.cardTitle}>Entrar</p>
                <p className={styles.cardSub}>Acesse o painel administrativo</p>
              </div>

              {/* Formulário */}
              <form ref={formRef} onSubmit={handleLogin} method="post" autoComplete="on">
                <div className={styles.fields}>
                  {/* E-mail */}
                  <div className={styles.field}>
                    <label htmlFor="admin-login-email">
                      <span>E-mail</span>
                    </label>
                    <div className={styles.inputContainer}>
                      <div className={styles.inputIc}>
                        <Mail size={15} strokeWidth={1.7} />
                      </div>
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

                  {/* Senha */}
                  <div className={styles.field}>
                    <label htmlFor="admin-login-password">
                      <span>Senha</span>
                      <button
                        type="button"
                        className={styles.forgotLink}
                        onClick={() => setModalResetSenha(true)}
                      >
                        Esqueci minha senha
                      </button>
                    </label>
                    <div className={styles.inputContainer}>
                      <div className={styles.inputIc}>
                        <Lock size={15} strokeWidth={1.7} />
                      </div>
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
                        className={styles.eyeBtn}
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setShowPassword(!showPassword)
                        }}
                        onMouseDown={(e) => e.preventDefault()}
                        aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      >
                        {showPassword ? (
                          <EyeOff size={15} strokeWidth={1.7} />
                        ) : (
                          <Eye size={15} strokeWidth={1.7} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Botão */}
                <div className={styles.btnWrap}>
                  <button type="submit" disabled={loading} className={styles.btn}>
                    <div className={styles.btnShine} aria-hidden="true" />
                    <span className={styles.btnContent}>
                      {loading ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Validando...
                        </>
                      ) : (
                        <>
                          Acessar painel
                          <svg
                            className={styles.btnArrow}
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M5 12h14" />
                            <path d="M12 5l7 7-7 7" />
                          </svg>
                        </>
                      )}
                    </span>
                  </button>
                </div>
              </form>

              {/* Rodapé do card */}
              <div className={styles.cardFoot}>
                <Link href="/" className={styles.backLink}>
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M19 12H5" />
                    <polyline points="12 19 5 12 12 5" />
                  </svg>
                  Voltar ao site
                </Link>
                <div className={styles.authBadge}>
                  <div className={styles.authDot} aria-hidden="true" />
                  Auth
                </div>
              </div>
            </div>
          </div>

          <div className={styles.floatBadge} aria-hidden="true">
            <div className={styles.fbDot} />
            Conexão criptografada · Sara Nossa Terra © {new Date().getFullYear()}
          </div>
        </div>
      </div>

      {/* Modal: redefinir senha */}
      {modalResetSenha && (
        <div
          className={styles.modalOverlay}
          onClick={() => setModalResetSenha(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Redefinir senha - informe seu e-mail"
        >
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <p className={styles.cardTitle} style={{ marginBottom: 4 }}>
              Redefinir senha
            </p>
            <p className={styles.cardSub} style={{ marginBottom: 14 }}>
              Informe seu e-mail para receber o link de redefinição
            </p>
            <form onSubmit={handleResetSenhaSubmit}>
              <div className={styles.field}>
                <label htmlFor="modal-reset-senha-email">
                  <span>E-mail</span>
                </label>
                <div className={styles.inputContainer}>
                  <div className={styles.inputIc}>
                    <Mail size={15} strokeWidth={1.7} />
                  </div>
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
                <button
                  type="submit"
                  disabled={loadingResetSenha}
                  className={styles.btn}
                  style={{ flex: 1 }}
                >
                  <span className={styles.btnContent}>
                    {loadingResetSenha ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      'Enviar link de redefinição'
                    )}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`${styles.toast} ${styles.toastShow} ${toast.type === 'success' ? styles.toastSuccess : ''}`}
          role="alert"
          aria-live="polite"
        >
          {toast.message}
        </div>
      )}
    </div>
  )
}
