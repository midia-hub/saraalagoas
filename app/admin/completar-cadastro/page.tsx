'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Loader2, User, Lock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getStorageUrl } from '@/lib/storage-url'
import styles from '../login/login.module.css'

function mensagemErroAmigavel(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('new password should be different') || m.includes('password should be different'))
    return 'A nova senha deve ser diferente da atual. Escolha outra senha (nunca usada antes neste acesso).'
  if (m.includes('password') && m.includes('least 6'))
    return 'A senha deve ter no mínimo 6 caracteres.'
  if (m.includes('password') && (m.includes('match') || m.includes('same')))
    return 'As senhas não coincidem. Digite a mesma senha nos dois campos.'
  if (m.includes('email not confirmed'))
    return 'E-mail ainda não confirmado. Use o link que enviamos por e-mail.'
  return message || 'Não foi possível salvar. Tente novamente.'
}

export default function CompletarCadastroPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const personId = searchParams.get('person_id')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSession, setHasSession] = useState(false)
  const [nome, setNome] = useState('')
  const [usuario, setUsuario] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')

  useEffect(() => {
    const client = supabase
    if (!client) {
      setLoading(false)
      setHasSession(false)
      return
    }
    const timer = setTimeout(() => {
      client.auth.getSession().then(({ data: { session } }) => {
        setHasSession(!!session?.user)
        if (session?.user?.user_metadata?.full_name) {
          setNome(session.user.user_metadata.full_name as string)
        }
        if (session?.user?.user_metadata?.username) {
          setUsuario(session.user.user_metadata.username as string)
        }
        setLoading(false)
      })
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const nomeTrim = nome.trim()
    const usuarioTrim = usuario.trim()
    if (!nomeTrim) {
      setError('Informe seu nome.')
      return
    }
    if (!senha) {
      setError('Informe a senha.')
      return
    }
    if (senha.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.')
      return
    }
    if (senha !== confirmarSenha) {
      setError('As senhas não correspondem. Verifique e tente novamente.')
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
        data: {
          full_name: nomeTrim,
          username: usuarioTrim || undefined,
        },
      })
      if (updateError) {
        setError(mensagemErroAmigavel(updateError.message || ''))
        setSubmitting(false)
        return
      }
      const basePath = typeof process.env.NEXT_PUBLIC_USE_BASEPATH === 'string' && process.env.NEXT_PUBLIC_USE_BASEPATH === 'true' ? '/saraalagoas' : ''
      const session = (await supabase.auth.getSession()).data.session
      const accessToken = session?.access_token
      if (!accessToken) {
        setError('Sessão inválida. Faça login novamente.')
        setSubmitting(false)
        return
      }
      const adminCheckRes = await fetch(`${basePath}/api/auth/admin-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken }),
      })
      const adminCheckJson = await adminCheckRes.json().catch(() => ({}))
      if (!adminCheckRes.ok || !adminCheckJson.canAccessAdmin) {
        setError('Seu perfil não possui acesso ao painel. Entre em contato com um administrador.')
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
        setError('Erro ao definir sessão. Tente novamente.')
        setSubmitting(false)
        return
      }
      // Se houver person_id na URL, redireciona para a página da pessoa para completar cadastro
      // Caso contrário, vai para o dashboard
      if (personId) {
        router.replace(`${basePath}/admin/pessoas/${personId}`)
      } else {
        router.replace(`${basePath}/admin`)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      setError(mensagemErroAmigavel(msg))
      setSubmitting(false)
    }
  }

  const layout = (
    <div
      className="fixed inset-0 overflow-auto text-[#252525]"
      style={{ fontFamily: "'Inter', sans-serif" }}
      role="main"
      aria-label="Completar cadastro"
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
          {loading ? (
            <>
              <p className={styles.cardTitle} aria-hidden>Carregando...</p>
              <p className={styles.cardSub} aria-hidden>Aguarde enquanto verificamos seu acesso.</p>
            </>
          ) : !hasSession ? (
            <>
              <h1 className={styles.srOnly}>Link inválido ou expirado</h1>
              <p className={styles.cardTitle} aria-hidden>Link inválido ou expirado</p>
              <p className={styles.cardSub} aria-hidden>
                Use o link mais recente que enviamos por e-mail ou peça um novo convite.
              </p>
              <div className={styles.sep} aria-hidden />
              <Link href="/admin/login" className={styles.btnLogin} style={{ display: 'inline-block', textAlign: 'center', textDecoration: 'none' }}>
                Ir para o login
              </Link>
              <p className={styles.cardFooter} style={{ marginTop: 20 }}>
                <Link href="/" className={styles.backLink}>
                  Voltar ao site
                </Link>
              </p>
            </>
          ) : (
            <>
              <h1 className={styles.srOnly}>Completar cadastro</h1>
              <p className={styles.cardTitle} aria-hidden>Completar cadastro</p>
              <p className={styles.cardSub} aria-hidden>Defina seu nome, usuário e senha para acessar o painel.</p>
              <div className={styles.sep} aria-hidden />

              <form onSubmit={handleSubmit} method="post" autoComplete="on">
                <div className={styles.field}>
                  <label htmlFor="completar-nome">Nome</label>
                  <div className={styles.inputContainer}>
                    <User size={18} strokeWidth={1.5} className={styles.inputIcon} />
                    <input
                      id="completar-nome"
                      name="nome"
                      type="text"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      autoComplete="name"
                      required
                      className={styles.innerInput}
                      placeholder="Seu nome completo"
                    />
                  </div>
                </div>
                <div className={styles.field}>
                  <label htmlFor="completar-usuario">Usuário</label>
                  <div className={styles.inputContainer}>
                    <User size={18} strokeWidth={1.5} className={styles.inputIcon} />
                    <input
                      id="completar-usuario"
                      name="usuario"
                      type="text"
                      value={usuario}
                      onChange={(e) => setUsuario(e.target.value)}
                      autoComplete="username"
                      className={styles.innerInput}
                      placeholder="Nome de usuário (opcional)"
                    />
                  </div>
                </div>
                <div className={styles.field}>
                  <label htmlFor="completar-senha">Senha</label>
                  <div className={styles.inputContainer}>
                    <Lock size={18} strokeWidth={1.5} className={styles.inputIcon} />
                    <input
                      id="completar-senha"
                      name="senha"
                      type="password"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      autoComplete="new-password"
                      required
                      minLength={6}
                      className={styles.innerInput}
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>
                </div>
                <div className={styles.field}>
                  <label htmlFor="completar-confirmarSenha">Confirmar senha</label>
                  <div className={styles.inputContainer}>
                    <Lock size={18} strokeWidth={1.5} className={styles.inputIcon} />
                    <input
                      id="completar-confirmarSenha"
                      name="confirmarSenha"
                      type="password"
                      value={confirmarSenha}
                      onChange={(e) => setConfirmarSenha(e.target.value)}
                      autoComplete="new-password"
                      required
                      minLength={6}
                      className={styles.innerInput}
                      placeholder="Repita a senha"
                    />
                  </div>
                </div>
                <p className={styles.cardSub} style={{ marginTop: 4, marginBottom: 8, textAlign: 'left', color: '#64748b', fontSize: '0.7rem' }}>
                  Use uma senha nova (diferente de qualquer uma já usada neste usuário).
                </p>
                {error && (
                  <div className={styles.cardSub} style={{ marginBottom: 12, color: '#c62737', textAlign: 'left', fontWeight: 600 }}>
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
                    'Concluir cadastro'
                  )}
                </button>
              </form>

              <p className={styles.cardFooter} style={{ marginTop: 20 }}>
                <Link href="/admin/login" className={styles.backLink}>
                  Já tem conta? Fazer login
                </Link>
              </p>
              <p className={styles.cardFooter} style={{ marginTop: 8 }}>
                Sara Nossa Terra — {new Date().getFullYear()}
              </p>
              <Link href="/" className={styles.backLink} style={{ marginTop: 8 }}>
                Voltar ao site
              </Link>
            </>
          )}
        </div>
      </main>
    </div>
  )

  return layout
}
