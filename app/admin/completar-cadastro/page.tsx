'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Loader2, User, Lock, Phone, Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getStorageUrl } from '@/lib/storage-url'
import { DatePickerInput } from '@/components/ui/DatePickerInput'
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
  if (m.includes('session_not_found') || m.includes('invalid session')) return 'Sessão expirada. Abra novamente o link do e-mail.'
  return message || 'Não foi possível concluir o cadastro. Tente novamente.'
}

function toSafeString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

/** Formata um número de telefone armazenado (E.164 ou digits) para exibição: (82) 99999-9999 */
function formatPhoneFromDb(value: string): string {
  if (!value) return ''
  let digits = value.replace(/\D/g, '')
  // Remove DDI 55
  if (digits.startsWith('55') && digits.length >= 12) {
    digits = digits.slice(2)
  }
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return value
}

/** Aplica máscara de telefone durante digitação: (DDD) NNNNN-NNNN */
function maskPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length === 0) return ''
  if (digits.length <= 2) return `(${digits}`
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
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
  const [showSenha, setShowSenha] = useState(false)
  const [showConfirmar, setShowConfirmar] = useState(false)
  const [linkedPersonId, setLinkedPersonId] = useState<string | null>(null)
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

    // Cria/vincula a pessoa e usa os dados retornados diretamente para evitar um GET extra
    let person: Record<string, unknown> = {}
    try {
      const createRes = await authFetchJson<{ person?: Record<string, unknown>; success?: boolean }>(
        `${basePath}/api/auth/self/create-person`,
        {
          method: 'POST',
          body: JSON.stringify({
            personId,
            full_name: session.user.user_metadata?.full_name ?? session.user.user_metadata?.name ?? '',
            email: session.user.email ?? '',
          }),
        }
      )
      if (createRes.person) {
        person = createRes.person
      }
    } catch {
      // Se create-person falhar, tenta carregar o cadastro existente via GET
      try {
        const personResponse = await authFetchJson<{ person?: Record<string, unknown> }>(`${basePath}/api/auth/self/person`)
        person = personResponse.person ?? {}
      } catch {
        // Nenhum dado disponível — prossegue com formulário em branco pré-preenchido com metadata do auth
      }
    }

    const pid = typeof person.id === 'string' && person.id ? person.id : null
    setLinkedPersonId(pid)

    setForm({
      full_name: toSafeString(person.full_name) || toSafeString(session.user.user_metadata?.full_name) || '',
      mobile_phone: formatPhoneFromDb(toSafeString(person.mobile_phone)),
      birth_date: toSafeString(person.birth_date).slice(0, 10),
    })

    setLoading(false)
  }

  useEffect(() => {
    loadInitialData().catch((err) => {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar o cadastro.')
      setLoading(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      // 1. Atualiza senha e metadata no auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: senha,
        data: { full_name: nomeTrim },
      })

      if (updateError) {
        setError(mensagemErroAmigavel(updateError.message || ''))
        setSubmitting(false)
        return
      }

      // 2. Persiste dados do perfil — apenas dígitos para mobile_phone
      const phoneDigits = form.mobile_phone.replace(/\D/g, '')
      await authFetchJson(`${basePath}/api/auth/self/person`, {
        method: 'PATCH',
        body: JSON.stringify({
          full_name: nomeTrim,
          mobile_phone: phoneDigits || null,
          birth_date: form.birth_date || null,
        }),
      })

      // 3. Verifica acesso ao painel e obtém token atualizado
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

      // 4. Grava o cookie de sessão admin
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

      // 5. Redireciona para a página inicial do admin
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
          {submitting ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 size={36} className="animate-spin text-[#c62737]" />
              <p className={styles.cardTitle}>Finalizando cadastro...</p>
              <p className={styles.cardSub}>Aguarde enquanto configuramos seu acesso ao painel.</p>
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <Loader2 size={28} className="animate-spin text-[#c62737]" />
              <p className={styles.cardTitle}>Carregando...</p>
              <p className={styles.cardSub}>Verificando link e carregando seu cadastro.</p>
            </div>
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
                {/* Nome completo */}
                <div className={styles.field}>
                  <label htmlFor="full_name">Nome completo *</label>
                  <div className={styles.inputContainer}>
                    <User size={18} className={styles.inputIcon} />
                    <input
                      id="full_name"
                      value={form.full_name}
                      onChange={(e) => updateField('full_name', e.target.value)}
                      className={styles.innerInput}
                      placeholder="Seu nome completo"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Data de nascimento */}
                  <div className={styles.field}>
                    <label htmlFor="birth_date">Nascimento</label>
                    <DatePickerInput
                      id="birth_date"
                      value={form.birth_date}
                      onChange={(v) => updateField('birth_date', v)}
                      placeholder="dd/mm/aaaa"
                    />
                  </div>

                  {/* Celular com máscara */}
                  <div className={styles.field}>
                    <label htmlFor="mobile_phone">Celular</label>
                    <div className={styles.inputContainer}>
                      <Phone size={18} className={styles.inputIcon} />
                      <input
                        id="mobile_phone"
                        type="tel"
                        inputMode="numeric"
                        value={form.mobile_phone}
                        onChange={(e) => updateField('mobile_phone', maskPhoneInput(e.target.value))}
                        placeholder="(82) 99999-9999"
                        className={styles.innerInput}
                      />
                    </div>
                  </div>
                </div>

                {/* Senhas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className={styles.field}>
                    <label htmlFor="senha">Senha *</label>
                    <div className={styles.inputContainer}>
                      <Lock size={18} className={styles.inputIcon} />
                      <input
                        id="senha"
                        type={showSenha ? 'text' : 'password'}
                        value={senha}
                        onChange={(e) => setSenha(e.target.value)}
                        minLength={6}
                        required
                        placeholder="Mín. 6 caracteres"
                        className={styles.innerInput}
                        style={{ paddingRight: '2.5rem' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowSenha((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        tabIndex={-1}
                        aria-label={showSenha ? 'Ocultar senha' : 'Mostrar senha'}
                      >
                        {showSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="confirmarSenha">Confirmar senha *</label>
                    <div className={styles.inputContainer}>
                      <Lock size={18} className={styles.inputIcon} />
                      <input
                        id="confirmarSenha"
                        type={showConfirmar ? 'text' : 'password'}
                        value={confirmarSenha}
                        onChange={(e) => setConfirmarSenha(e.target.value)}
                        minLength={6}
                        required
                        placeholder="Repita a senha"
                        className={styles.innerInput}
                        style={{ paddingRight: '2.5rem' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmar((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        tabIndex={-1}
                        aria-label={showConfirmar ? 'Ocultar confirmação' : 'Mostrar confirmação'}
                      >
                        {showConfirmar ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>

                {error && (
                  <div
                    role="alert"
                    className="rounded-xl border border-[#c62737]/30 bg-[#c62737]/5 px-4 py-3 text-sm font-semibold text-[#c62737]"
                  >
                    {error}
                  </div>
                )}

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
