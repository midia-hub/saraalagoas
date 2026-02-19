'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, User, Mail, ShieldCheck, UserPlus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { Toast } from '@/components/Toast'
import { useAdminAccess } from '@/lib/admin-access-context'
import { fetchPerson, updatePerson, fetchPeople } from '@/lib/people'
import { PersonForm, type PersonFormData } from '@/components/admin/people/PersonForm'
import { AvatarUpload } from '@/components/admin/AvatarUpload'
import { adminFetchJson } from '@/lib/admin-client'
import type { Person } from '@/lib/types/person'

export default function AdminContaPage() {
  const router = useRouter()
  const access = useAdminAccess()
  const [email, setEmail] = useState<string>('')
  const [person, setPerson] = useState<Person | null>(null)
  const [newEmail, setNewEmail] = useState('')
  const [confirmEmail, setConfirmEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingEmail, setSavingEmail] = useState(false)
  const [savingPerson, setSavingPerson] = useState(false)
  const [peopleResults, setPeopleResults] = useState<Person[]>([])
  const [linkingPerson, setLinkingPerson] = useState<string | null>(null)
  const [creatingPerson, setCreatingPerson] = useState(false)
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  function buildPayload(form: PersonFormData): Record<string, unknown> {
    const payload: Record<string, unknown> = {}
    const set = (key: string, v: unknown) => {
      if (v === '' || v === undefined) payload[key] = null
      else payload[key] = v
    }
    const setBool = (key: string, v: unknown) => {
      if (v === '' || v === undefined) payload[key] = null
      else payload[key] = v === true || v === 'true'
    }

    set('full_name', form.full_name)
    set('church_profile', form.church_profile)
    set('church_situation', form.church_situation)
    set('church_role', form.church_role)
    set('leader_person_id', form.leader_person_id)
    set('sex', form.sex)
    set('birth_date', form.birth_date)
    set('marital_status', form.marital_status)
    set('marriage_date', form.marriage_date)
    set('rg', form.rg)
    set('cpf', form.cpf)
    set('special_needs', form.special_needs)
    set('cep', form.cep)
    set('city', form.city)
    set('state', form.state)
    set('neighborhood', form.neighborhood)
    set('address_line', form.address_line)
    set('address_number', form.address_number)
    set('address_complement', form.address_complement)
    set('email', form.email)
    set('mobile_phone', form.mobile_phone)
    set('phone', form.phone)
    set('entry_by', form.entry_by)
    set('entry_date', form.entry_date)
    set('status_in_church', form.status_in_church)
    set('conversion_date', form.conversion_date)
    setBool('is_baptized', form.is_baptized)
    set('baptism_date', form.baptism_date)
    setBool('is_leader', form.is_leader)
    setBool('is_pastor', form.is_pastor)
    set('education_level', form.education_level)
    set('profession', form.profession)
    set('nationality', form.nationality)
    set('birthplace', form.birthplace)
    set('interviewed_by', form.interviewed_by)
    set('registered_by', form.registered_by)
    set('blood_type', form.blood_type)
    return payload
  }

  async function handleCreateSelfPerson() {
    setCreatingPerson(true)
    setToast(null)
    try {
      await adminFetchJson('/api/auth/self/create-person', { method: 'POST' })
      setToast({ type: 'ok', text: 'Cadastro criado e vinculado com sucesso!' })
      setTimeout(() => window.location.reload(), 1500)
    } catch (err: any) {
      setToast({ type: 'err', text: err.message || 'Erro ao criar cadastro.' })
    } finally {
      setCreatingPerson(false)
    }
  }

  async function handleLinkPerson(personId: string) {
    setLinkingPerson(personId)
    setToast(null)
    try {
      await adminFetchJson('/api/auth/self/link-person', {
        method: 'POST',
        body: JSON.stringify({ personId }),
      })
      setToast({ type: 'ok', text: 'Cadastro vinculado com sucesso!' })
      // Pequeno delay para o toast ser legível antes de atualizar
      setTimeout(() => window.location.reload(), 1500)
    } catch (err: any) {
      setToast({ type: 'err', text: err.message || 'Erro ao vincular.' })
    } finally {
      setLinkingPerson(null)
    }
  }

  useEffect(() => {
    async function loadData() {
      if (!supabase) return

      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) setEmail(user.email)

      if (access.personId) {
        const p = await fetchPerson(access.personId)
        // Se a pessoa não tem e-mail mas o usuário autenticado tem, usar o do auth
        if (p && !p.email && user?.email) {
          setPerson({ ...p, email: user.email })
        } else {
          setPerson(p)
        }
      }
      setLoading(false)
    }

    if (!access.loading) {
      loadData()
    }
  }, [access.loading, access.personId])

  async function handleAvatarUpload(url: string) {
    try {
      let dbSuccess = true

      // 1. Tenta atualizar na tabela de pessoas
      if (access.personId) {
        try {
          await updatePerson(access.personId, { avatar_url: url })
        } catch (e) {
          console.warn('Erro ao salvar avatar na tabela people (coluna pode estar ausente)')
          dbSuccess = false
        }
      }

      // 2. Tenta atualizar na tabela de perfis
      const { data: { user } } = await supabase!.auth.getUser()
      if (user) {
        try {
          const { error } = await supabase!.from('profiles').update({ avatar_url: url }).eq('id', user.id)
          if (error) throw error
        } catch (e) {
          console.warn('Erro ao salvar avatar na tabela profiles (coluna pode estar ausente)')
          dbSuccess = false
        }

        // 3. Fallback/Garantia: Salva nos metadados do usuário (Auth)
        await supabase!.auth.updateUser({
          data: { avatar_url: url }
        })

        // Força atualização da sessão local para refletir no contexto
        await supabase!.auth.refreshSession()
      }

      if (dbSuccess) {
        setToast({ type: 'ok', text: 'Foto atualizada com sucesso!' })
      } else {
        setToast({ type: 'ok', text: 'Foto salva no perfil (algumas tabelas precisam de atualização de banco).' })
      }

      // Atualiza os dados no layout sem dar F5
      await access.refresh()
    } catch (err: any) {
      console.error('Erro ao salvar URL da foto:', err)
      setToast({ type: 'err', text: 'Erro ao salvar vínculo da foto.' })
    }
  }

  async function handlePersonSubmit(data: PersonFormData) {
    if (!access.personId) return
    setSavingPerson(true)
    setToast(null)
    try {
      const payload = buildPayload(data)
      await updatePerson(access.personId, payload as any)
      setToast({ type: 'ok', text: 'Dados pessoais atualizados com sucesso.' })
    } catch (e) {
      setToast({ type: 'err', text: 'Não foi possível salvar os dados.' })
    } finally {
      setSavingPerson(false)
    }
  }

  async function handleChangeEmail(e: React.FormEvent) {
    e.preventDefault()
    setToast(null)
    const n = newEmail.trim()
    const c = confirmEmail.trim()
    if (!n) {
      setToast({ type: 'err', text: 'Informe o novo e-mail.' })
      return
    }
    if (n !== c) {
      setToast({ type: 'err', text: 'Os e-mails não coincidem.' })
      return
    }
    if (n === email) {
      setToast({ type: 'err', text: 'O novo e-mail deve ser diferente do atual.' })
      return
    }
    if (!supabase) {
      setToast({ type: 'err', text: 'Serviço indisponível. Tente mais tarde.' })
      return
    }
    setSavingEmail(true)
    try {
      const basePath = typeof process.env.NEXT_PUBLIC_USE_BASEPATH === 'string' && process.env.NEXT_PUBLIC_USE_BASEPATH === 'true' ? '/saraalagoas' : ''
      const appOrigin = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '')
      const emailRedirectTo = `${appOrigin}${basePath}/admin/conta`
      const { error } = await supabase.auth.updateUser(
        { email: n },
        { emailRedirectTo }
      )
      if (error) {
        setToast({ type: 'err', text: error.message || 'Não foi possível alterar o e-mail.' })
        setSavingEmail(false)
        return
      }
      setToast({
        type: 'ok',
        text: 'Enviamos um e-mail de confirmação. Verifique sua caixa de entrada.',
      })
      setNewEmail('')
      setConfirmEmail('')
    } catch {
      setToast({ type: 'err', text: 'Erro ao alterar e-mail. Tente novamente.' })
    } finally {
      setSavingEmail(false)
    }
  }

  if (loading || access.loading) {
    return (
      <PageAccessGuard pageKey="dashboard">
        <div className="p-6 md:p-8 flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
        </div>
      </PageAccessGuard>
    )
  }

  return (
    <PageAccessGuard pageKey="dashboard">
      <div className="p-6 md:p-10 max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Meu Perfil</h1>
            <p className="text-slate-500 font-medium">Gerencie suas informações pessoais e de acesso.</p>
          </div>
          <div className="flex items-center gap-3 px-4 py-2 bg-green-50 text-green-700 rounded-2xl border border-green-100">
            <ShieldCheck size={20} />
            <span className="text-sm font-bold uppercase tracking-wider">{access.roleName}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Coluna Lateral: Foto e Acesso */}
          <div className="space-y-8">
            <section className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 text-center">
              <AvatarUpload
                currentUrl={access.avatarUrl}
                onUpload={handleAvatarUpload}
                userId={access.userId || 'me'}
              />
              <div className="mt-6">
                <h3 className="text-xl font-bold text-slate-900 leading-tight">{access.profileName}</h3>
                <p className="text-slate-500 text-sm mt-1">{email}</p>
              </div>
            </section>

            <section className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Mail size={18} className="text-red-600" />
                Alterar E-mail
              </h3>
              <form onSubmit={handleChangeEmail} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Novo E-mail</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="exemplo@email.com"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-red-600/20 focus:border-red-600 outline-none transition-all placeholder:text-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Confirmar Novo E-mail</label>
                  <input
                    type="email"
                    value={confirmEmail}
                    onChange={(e) => setConfirmEmail(e.target.value)}
                    placeholder="exemplo@email.com"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-red-600/20 focus:border-red-600 outline-none transition-all placeholder:text-slate-400"
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingEmail}
                  className="w-full py-3 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-900/10"
                >
                  {savingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Atualizar E-mail'}
                </button>
              </form>
            </section>
          </div>

          {/* Coluna Principal: Dados Pessoais */}
          <div className="lg:col-span-2">
            {access.personId ? (
              <div className="space-y-6">
                <div className="flex items-center gap-3 px-1 mb-2">
                  <div className="p-2 bg-red-600 rounded-xl shadow-sm shadow-red-600/20">
                    <User size={20} className="text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">Cadastro de Pessoa</h2>
                </div>
                <PersonForm
                  initial={person}
                  onSubmit={handlePersonSubmit}
                  loading={savingPerson}
                  readOnlyMetadata={true}
                  readOnlyEmail={true}
                />
              </div>
            ) : (
              <section className="bg-amber-50 rounded-3xl p-8 border border-amber-200">
                <div className="flex items-start gap-4 mb-6">
                  <div className="p-3 bg-amber-100 rounded-2xl text-amber-600">
                    <User size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-amber-900 mb-1">Vínculo não encontrado</h3>
                    <p className="text-amber-800 leading-relaxed">
                      Seu usuário ainda não está vinculado a um cadastro central de pessoas.
                      Busque seu nome abaixo para realizar o vínculo ou crie um novo cadastro.
                    </p>
                  </div>
                </div>

                <div className="space-y-4 max-w-md">
                  <div className="relative">
                    <label className="block text-xs font-bold text-amber-700 uppercase tracking-widest mb-2 ml-1">Buscar meu nome</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Digite seu nome..."
                        className="w-full pl-11 pr-4 py-3 bg-white border border-amber-200 rounded-2xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all placeholder:text-slate-400"
                        onChange={async (e) => {
                          const q = e.target.value.trim()
                          if (q.length < 3) {
                            setPeopleResults([])
                            return
                          }
                          try {
                            const results = await fetchPeople({ q })
                            setPeopleResults(results.slice(0, 5))
                          } catch (err) {
                            console.error(err)
                          }
                        }}
                      />
                      <User size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-400" />
                    </div>
                  </div>

                  {peopleResults.length > 0 && (
                    <div className="bg-white border border-amber-100 rounded-2xl shadow-xl overflow-hidden divide-y divide-slate-50">
                      {peopleResults.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => handleLinkPerson(p.id)}
                          disabled={linkingPerson === p.id}
                          className="w-full flex items-center justify-between gap-4 px-4 py-3 hover:bg-amber-50 transition-colors text-left"
                        >
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate">{p.full_name}</p>
                            <p className="text-xs text-slate-500 truncate">{p.email || 'Sem e-mail'}</p>
                          </div>
                          {linkingPerson === p.id ? (
                            <Loader2 size={18} className="animate-spin text-amber-600 shrink-0" />
                          ) : (
                            <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded-lg uppercase">Vincular</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="pt-4 border-t border-amber-200/50 flex flex-col gap-4">
                    <p className="text-xs text-amber-700 font-medium">Ou se preferir:</p>
                    <button
                      onClick={handleCreateSelfPerson}
                      disabled={creatingPerson}
                      className="w-full py-3 bg-amber-600 text-white font-bold rounded-2xl hover:bg-amber-700 transition-all shadow-lg shadow-amber-600/20 flex items-center justify-center gap-2"
                    >
                      {creatingPerson ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus size={18} />}
                      Criar meu cadastro agora
                    </button>

                    <Link
                      href="/admin/pessoas"
                      className="inline-flex items-center gap-2 text-sm font-bold text-amber-900 hover:gap-3 transition-all"
                    >
                      Ir para gestão de pessoas →
                    </Link>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-amber-200/50 text-[10px] text-amber-600/60 font-medium flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    User ID: {access.userId}
                  </div>
                  <div className="flex items-center gap-2 font-bold text-red-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    Person ID: {access.personId || 'NULL'}
                  </div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                    Source: {access.source || 'Unknown'}
                  </div>
                  <button
                    onClick={() => window.location.reload()}
                    className="ml-auto bg-amber-200/50 hover:bg-amber-200 px-2 py-1 rounded text-amber-800 transition-colors uppercase"
                  >
                    Recarregar Dados
                  </button>
                </div>
              </section>
            )}
          </div>
        </div>

        <Toast
          visible={!!toast}
          message={toast?.text ?? ''}
          type={toast?.type ?? 'err'}
          onClose={() => setToast(null)}
        />
      </div>
    </PageAccessGuard>
  )
}
