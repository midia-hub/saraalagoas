'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Loader2, Mail } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getStorageUrl } from '@/lib/storage-url'
import styles from '../login/login.module.css'

function getInputValue(input: HTMLInputElement | null): string {
  return input?.value.trim() ?? ''
}

export default function AdminResetSenhaPage() {
  const emailRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null)

  function showToast(message: string, type: 'error' | 'success' = 'error') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setToast(null)
    const email = getInputValue(emailRef.current)
    if (!email) {
      showToast('Por favor, insira seu e-mail.')
      return
    }
    if (!supabase) {
      showToast('Serviço temporariamente indisponível. Tente mais tarde ou contate o administrador.')
      return
    }
    setLoading(true)
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
        showToast(error.message === 'Email not confirmed' ? 'E-mail ainda não confirmado. Use o link de acesso ou crie acesso.' : 'Não foi possível enviar o e-mail. Tente novamente.')
        setLoading(false)
        return
      }
      showToast('Enviamos um link para redefinir sua senha. Verifique seu e-mail.', 'success')
    } catch {
      showToast('Erro ao enviar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 overflow-auto text-[#252525]"
      style={{ fontFamily: "'Inter', sans-serif" }}
      role="main"
      aria-label="Redefinir senha"
    >
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
        <div className={styles.card}>
          <div className={styles.logoWrap}>
            <Image
              src={getStorageUrl('LOGO SARA ALAGAOS1.png')}
              alt="Sara Nossa Terra Alagoas"
              width={180}
              height={56}
              sizes="(max-width: 480px) 140px, 180px"
              style={{ width: 'auto', height: '56px', objectFit: 'contain' }}
              unoptimized
              priority
              onError={(e) => {
                const t = e.target as HTMLImageElement
                t.src = '/logo-sara-oficial.png'
              }}
            />
          </div>

          <h1 className={styles.srOnly}>Redefinir senha</h1>
          <p className={styles.cardTitle} aria-hidden>
            Redefinir senha
          </p>
          <p className={styles.cardSub} aria-hidden>
            Informe seu e-mail para receber o link de redefinição
          </p>
          <div className={styles.sep} aria-hidden />

          <form onSubmit={handleReset} method="post" autoComplete="on">
            <div className={styles.field}>
              <label htmlFor="reset-email">E-mail</label>
              <div className={styles.inputContainer}>
                <Mail size={18} strokeWidth={1.5} className={styles.inputIcon} />
                <input
                  ref={emailRef}
                  id="reset-email"
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

            <button type="submit" disabled={loading} className={styles.btnLogin}>
              {loading ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Loader2 size={18} className="animate-spin" />
                  Enviando...
                </span>
              ) : (
                'Enviar link de redefinição'
              )}
            </button>
          </form>

          <div className={styles.cardFooter} style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
            <Link href="/admin/login" className={styles.backLink}>
              Fazer login
            </Link>
            <Link href="/admin/criar-acesso" className={styles.backLink}>
              Primeiro login
            </Link>
          </div>

          <p className={styles.cardFooter} style={{ marginTop: 16 }}>
            Sara Nossa Terra — {new Date().getFullYear()}
          </p>

          <Link href="/" className={styles.backLink} style={{ marginTop: 12 }}>
            Voltar ao site
          </Link>
        </div>
      </main>

      {toast && (
        <div className={`${styles.toast} ${styles.show} ${toast.type === 'success' ? styles.success : ''}`}>
          {toast.message}
        </div>
      )}
    </div>
  )
}
