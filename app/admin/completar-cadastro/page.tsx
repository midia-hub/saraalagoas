'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Loader2, User, Lock, Phone, Calendar } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getStorageUrl } from '@/lib/storage-url'
import styles from '../login/login.module.css'

type SelfPersonPayload = {
  full_name: string
  mobile_phone: string
  birth_date: string
}

function mensagemErroAmigavel(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('new password should be different') || m.includes('password should be different')) {
    return 'A nova senha deve ser diferente da atual. Escolha outra senha.'
  }
  if (m.includes('password') && m.includes('least 6')) return 'A senha deve ter no mínimo 6 caracteres.'
  if (m.includes('email not confirmed')) return 'E-mail ainda não confirmado. Use o link recebido por e-mail.'
  return message || 'Não foi possível concluir o cadastro. Tente novamente.'
}

function toSafeString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

async function getAccessToken(): Promise<string> {
  if (!supabase) throw new Error('Serviço temporariamente indisponível.')
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) throw new Error('Sessão inválida. Abra novamente o link do e-mail.')
  return token
}

async function authFetchJson<T = unknown>(input: string, init: RequestInit = {}): Promise<T> {
  const token = await getAccessToken()
  const headers = new Headers(init.headers || {})
  if (!headers.has('Content-Type') && init.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(input, { ...init, headers, credentials: 'same-origin' })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = typeof payload?.error === 'string' ? payload.error : `Erro ${response.status}`
    throw new Error(message)
  }
  return payload as T
}

export default function CompletarCadastroPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const personId = searchParams?.get('person_id') ?? null

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSession, setHasSession] = useState(false)
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [form, setForm] = useState<SelfPersonPayload>({
    full_name: '',
    mobile_phone: '',
    birth_date: '',
  })

  const basePath = useMemo(
    () =>
      typeof process.env.NEXT_PUBLIC_USE_BASEPATH === 'string' && process.env.NEXT_PUBLIC_USE_BASEPATH === 'true'
        ? '/saraalagoas'
        : '',
    []
  )

  function updateField<K extends keyof SelfPersonPayload>(key: K, value: SelfPersonPayload[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function loadInitialData() {
    if (!supabase) {
      setHasSession(false)
      setLoading(false)
      return
    }

    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      setHasSession(false)
      setLoading(false)
      return
    }

    setHasSession(true)

    await authFetchJson(`${basePath}/api/auth/self/create-person`, {
      method: 'POST',
      body: JSON.stringify({
        personId,
        full_name: session.user.user_metadata?.full_name ?? session.user.user_metadata?.name ?? '',
        email: session.user.email ?? '',
      }),
    })

    const personResponse = await authFetchJson<{ person?: Record<string, unknown> }>(`${basePath}/api/auth/self/person`)
    const person = personResponse.person ?? {}

    setForm({
      full_name: toSafeString(person.full_name) || toSafeString(session.user.user_metadata?.full_name) || '',
      mobile_phone: toSafeString(person.mobile_phone),
      birth_date: toSafeString(person.birth_date).slice(0, 10),
    })

    setLoading(false)
  }

  useEffect(() => {
    loadInitialData().catch((err) => {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar o cadastro.')
      setLoading(false)
    })
  }, [basePath, personId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const nomeTrim = form.full_name.trim()
    if (!nomeTrim) {
      setError('Informe seu nome completo.')
      return
    }
    if (!senha || senha.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.')
      return
    }
    if (senha !== confirmarSenha) {
      setError('As senhas não correspondem.')
      return
    }
    if (!supabase) {
      setError('Serviço temporariamente indisponível. Tente mais tarde.')
      return
    }

    setSubmitting(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: senha,
        data: { full_name: nomeTrim },
      })

      if (updateError) {
        setError(mensagemErroAmigavel(updateError.message || ''))
        setSubmitting(false)
        return
      }

      await authFetchJson(`${basePath}/api/auth/self/person`, {
        method: 'PATCH',
        body: JSON.stringify({
          full_name: nomeTrim,
          mobile_phone: form.mobile_phone.trim() || null,
          birth_date: form.birth_date || null,
        }),
      })

      const accessToken = await getAccessToken()
      const adminCheckRes = await fetch(`${basePath}/api/auth/admin-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken }),
      })
      const adminCheckJson = await adminCheckRes.json().catch(() => ({}))
      if (!adminCheckRes.ok || !adminCheckJson.canAccessAdmin) {
        setError('Cadastro concluído, mas seu perfil ainda não possui acesso ao painel. Fale com o administrador.')
        setSubmitting(false)
        return
      }

      const setCookieRes = await fetch(`${basePath}/api/auth/set-admin-cookie`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken }),
        credentials: 'same-origin',
      })
      if (!setCookieRes.ok) {
        setError('Cadastro salvo, mas não foi possível iniciar sua sessão no painel.')
        setSubmitting(false)
        return
      }

      router.replace(`${basePath}/admin`)
    } catch (e) {
      setError(mensagemErroAmigavel(e instanceof Error ? e.message : ''))
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 overflow-auto text-[#252525]" style={{ fontFamily: "'Inter', sans-serif" }} role="main" aria-label="Completar cadastro">
      <div className={styles.bg} />
      <div className={styles.bgGradient} />
      <div className={styles.waves}>
        <div className={`${styles.waveLayer} ${styles.waveLayer1}`} />
        <div className={`${styles.waveLayer} ${styles.waveLayer2}`} />
        <div className={`${styles.waveLayer} ${styles.waveLayer3}`} />
      </div>

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
          />
        </div>

        <div className={styles.card} style={{ maxWidth: 620 }}>
          {loading ? (
            <>
              <p className={styles.cardTitle}>Carregando...</p>
              <p className={styles.cardSub}>Verificando link e carregando seu cadastro.</p>
            </>
          ) : !hasSession ? (
            <>
              <p className={styles.cardTitle}>Link inválido ou expirado</p>
              <p className={styles.cardSub}>Use o link mais recente do e-mail ou solicite novo convite.</p>
              <div className={styles.sep} />
              <Link href="/admin/login" className={styles.btnLogin} style={{ display: 'inline-block', textAlign: 'center', textDecoration: 'none' }}>
                Ir para o login
              </Link>
            </>
          ) : (
            <>
              <p className={styles.cardTitle}>Completar cadastro</p>
              <p className={styles.cardSub}>Confirme seus dados principais e defina sua senha para acessar o painel.</p>
              <div className={styles.sep} />

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className={styles.field}>
                  <label htmlFor="full_name">Nome completo *</label>
                  <div className={styles.inputContainer}>
                    <User size={18} className={styles.inputIcon} />
                    <input id="full_name" value={form.full_name} onChange={(e) => updateField('full_name', e.target.value)} className={styles.innerInput} required />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className={styles.field}>
                    <label htmlFor="birth_date">Nascimento</label>
                    <div className={styles.inputContainer}>
                      <Calendar size={18} className={styles.inputIcon} />
                      <input id="birth_date" type="date" value={form.birth_date} onChange={(e) => updateField('birth_date', e.target.value)} className={styles.innerInput} />
                    </div>
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="mobile_phone">Celular</label>
                    <div className={styles.inputContainer}>
                      <Phone size={18} className={styles.inputIcon} />
                      <input id="mobile_phone" value={form.mobile_phone} onChange={(e) => updateField('mobile_phone', e.target.value)} className={styles.innerInput} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className={styles.field}>
                    <label htmlFor="senha">Senha *</label>
                    <div className={styles.inputContainer}>
                      <Lock size={18} className={styles.inputIcon} />
                      <input id="senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} minLength={6} required className={styles.innerInput} />
                    </div>
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="confirmarSenha">Confirmar senha *</label>
                    <div className={styles.inputContainer}>
                      <Lock size={18} className={styles.inputIcon} />
                      <input id="confirmarSenha" type="password" value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} minLength={6} required className={styles.innerInput} />
                    </div>
                  </div>
                </div>

                {error && <div className={styles.cardSub} style={{ color: '#c62737', textAlign: 'left', fontWeight: 600 }}>{error}</div>}

                <button type="submit" disabled={submitting} className={styles.btnLogin}>
                  {submitting ? (
                    <span className="inline-flex items-center justify-center gap-2">
                      <Loader2 size={18} className="animate-spin" />
                      Salvando...
                    </span>
                  ) : (
                    'Concluir cadastro e entrar'
                  )}
                </button>
              </form>

              <p className={styles.cardFooter} style={{ marginTop: 16 }}>
                Sara Nossa Terra — {new Date().getFullYear()}
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
