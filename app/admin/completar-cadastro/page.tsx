'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'

export default function CompletarCadastroPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSession, setHasSession] = useState(false)
  const [nome, setNome] = useState('')
  const [usuario, setUsuario] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      setHasSession(false)
      return
    }
    // Deixar o Supabase processar o hash da URL (access_token após redirect do e-mail)
    const timer = setTimeout(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
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
      setError('As senhas não coincidem.')
      return
    }
    if (!supabase) {
      setError('Supabase não configurado.')
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
        setError(updateError.message)
        setSubmitting(false)
        return
      }
      document.cookie = 'admin_access=1; path=/; max-age=86400; SameSite=Lax'
      router.replace('/admin')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar.')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4 py-8">
        <div className="text-center">
          <p className="text-slate-600">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!hasSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4 py-8">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-xl text-center">
          <Image
            src="/logo-sara-oficial.png"
            alt="Logo Sara Alagoas"
            width={180}
            height={80}
            className="mx-auto mb-4"
          />
          <h1 className="text-xl font-semibold text-slate-900">Link inválido ou expirado</h1>
          <p className="mt-2 text-sm text-slate-600">
            Use o link mais recente que enviamos por e-mail ou peça um novo convite.
          </p>
          <Link
            href="/admin/login"
            className="mt-6 inline-block rounded-lg bg-[#c62737] px-5 py-2.5 font-medium text-white hover:bg-[#a01f2d]"
          >
            Ir para o login
          </Link>
        </div>
      </div>
    )
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
          <h1 className="text-2xl font-semibold text-slate-900">Completar cadastro</h1>
          <p className="mt-1 text-sm text-slate-600">Defina seu nome, usuário e senha para acessar o painel.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="nome" className="mb-1 block text-sm font-medium text-slate-700">
              Nome
            </label>
            <input
              id="nome"
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              autoComplete="name"
              required
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20"
              placeholder="Seu nome completo"
            />
          </div>
          <div>
            <label htmlFor="usuario" className="mb-1 block text-sm font-medium text-slate-700">
              Usuário
            </label>
            <input
              id="usuario"
              type="text"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              autoComplete="username"
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20"
              placeholder="Nome de usuário (opcional)"
            />
          </div>
          <div>
            <label htmlFor="senha" className="mb-1 block text-sm font-medium text-slate-700">
              Senha
            </label>
            <input
              id="senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoComplete="new-password"
              required
              minLength={6}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20"
              placeholder="Mínimo 6 caracteres"
            />
          </div>
          <div>
            <label htmlFor="confirmarSenha" className="mb-1 block text-sm font-medium text-slate-700">
              Confirmar senha
            </label>
            <input
              id="confirmarSenha"
              type="password"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              autoComplete="new-password"
              required
              minLength={6}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20"
              placeholder="Repita a senha"
            />
          </div>
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-[#c62737] py-2.5 font-medium text-white transition hover:bg-[#a01f2d] disabled:opacity-60"
          >
            {submitting ? 'Salvando...' : 'Concluir cadastro'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">
          <Link href="/admin/login" className="text-[#c62737] hover:underline">
            Já tem conta? Fazer login
          </Link>
        </p>
      </div>
    </div>
  )
}
