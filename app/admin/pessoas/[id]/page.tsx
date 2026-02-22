'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import {
  ArrowLeft,
  Pencil,
  User,
  Heart,
  Phone,
  Church,
  MoreHorizontal,
  Zap,
  Cross,
  Users,
  Smartphone,
  Hand,
  Star,
  UserPlus,
  Send,
  Loader2,
  Mail,
} from 'lucide-react'
import Link from 'next/link'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { PersonForm } from '@/components/admin/people/PersonForm'
import { Toast } from '@/components/Toast'
import { fetchPerson, updatePerson } from '@/lib/people'
import { adminFetchJson } from '@/lib/admin-client'
import type { Person } from '@/lib/types/person'
import type { PersonFormData } from '@/components/admin/people/PersonForm'
import { formatDateDisplay } from '@/lib/validators/person'

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
  set('spouse_person_id', form.spouse_person_id)
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

function dash(v: string | null | undefined): string {
  const t = typeof v === 'string' ? v.trim() : v
  return t || '—'
}

function simNao(v: boolean | null | undefined): string {
  if (v === true) return 'Sim'
  if (v === false) return 'Não'
  return 'Não informado'
}

function getIdade(birthDate: string | null | undefined): string {
  if (!birthDate) return '—'
  const [y, m, d] = birthDate.split('T')[0].split('-').map(Number)
  const today = new Date()
  let age = today.getFullYear() - y
  if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age--
  return age >= 0 ? `${age} anos` : '—'
}

const TABS = [
  { id: 'perfil', label: 'Perfil', icon: User },
  { id: 'pessoais', label: 'Pessoais', icon: Heart },
  { id: 'contatos', label: 'Contatos', icon: Phone },
  { id: 'igreja', label: 'Igreja', icon: Church },
  { id: 'mais', label: 'Mais', icon: MoreHorizontal },
] as const

type TabId = (typeof TABS)[number]['id']

type UserLinkState = {
  linked: boolean
  user: {
    id: string
    email: string | null
    full_name: string | null
    role_id: string | null
    access_profile_id: string | null
  } | null
  emailUser: {
    id: string
    email: string | null
    full_name: string | null
    person_id: string | null
    role_id: string | null
    access_profile_id: string | null
  } | null
}

function DataCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: React.ReactNode
  icon?: React.ElementType
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col">
      <span className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">{label}</span>
      <div className="flex items-center gap-2 mt-auto">
        {Icon && (
          <span className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
            <Icon className="text-emerald-600" size={16} />
          </span>
        )}
        <span className="text-sm font-medium text-slate-800">{value ?? '—'}</span>
      </div>
    </div>
  )
}

export default function PessoaDetalhePage() {
  const params = useParams()
  const id = params?.id as string
  const [person, setPerson] = useState<Person | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [activeTab, setActiveTab] = useState<TabId>('perfil')
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; message: string } | null>(null)
  const [leaderName, setLeaderName] = useState<string | null>(null)
  const [spouseName, setSpouseName] = useState<string | null>(null)
  const [cells, setCells] = useState<any[]>([])
  const [loadingCells, setLoadingCells] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [inviteSending, setInviteSending] = useState(false)
  const [inviteMessage, setInviteMessage] = useState<{ type: 'ok' | 'err'; message: string } | null>(null)
  const [conversao, setConversao] = useState<Record<string, any> | null>(null)
  const [userLink, setUserLink] = useState<UserLinkState | null>(null)

  async function loadUserLink(personId: string) {
    try {
      const data = await adminFetchJson<UserLinkState>(`/api/admin/people/${personId}/user-link`)
      setUserLink(data)
    } catch {
      setUserLink({ linked: false, user: null, emailUser: null })
    }
  }

  useEffect(() => {
    if (!id) return
    setLoading(true)
    fetchPerson(id)
      .then((p) => {
        setPerson(p)
        if (p?.leader_person_id) {
          fetchPerson(p.leader_person_id).then((l) => setLeaderName(l?.full_name ?? null)).catch(() => setLeaderName(null))
        } else setLeaderName(null)
        if (p?.spouse_person_id) {
          fetchPerson(p.spouse_person_id).then((s) => setSpouseName(s?.full_name ?? null)).catch(() => setSpouseName(null))
        } else setSpouseName(null)
      })
      .catch(() => setPerson(null))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!id) return
    setLoadingCells(true)
    adminFetchJson<{ items: any[] }>(`/api/admin/pessoas/${id}/cells`)
      .then((data) => setCells(data.items ?? []))
      .catch(() => setCells([]))
      .finally(() => setLoadingCells(false))
  }, [id])

  useEffect(() => {
    if (!id) return
    adminFetchJson<{ item: Record<string, any> | null }>(`/api/admin/pessoas/${id}/conversao`)
      .then((data) => setConversao(data.item ?? null))
      .catch(() => setConversao(null))
  }, [id])

  useEffect(() => {
    if (!id) return
    loadUserLink(id)
  }, [id])

  async function handleSubmit(data: PersonFormData) {
    if (!id) return
    setSaving(true)
    setToast(null)
    try {
      const payload = buildPayload(data)
      await updatePerson(id, payload as Parameters<typeof updatePerson>[1])
      setToast({ type: 'ok', message: 'Dados salvos com sucesso.' })
      setPerson((prev) => (prev ? { ...prev, ...payload } as Person : null))
      setEditing(false)
    } catch (e) {
      setToast({ type: 'err', message: e instanceof Error ? e.message : 'Erro ao salvar.' })
    } finally {
      setSaving(false)
    }
  }

  async function handleSendInvite(e: React.FormEvent) {
    e.preventDefault()
    const email = inviteEmail.trim()
    if (!email) {
      setInviteMessage({ type: 'err', message: 'Informe um e-mail válido.' })
      return
    }
    if (!id) return

    setInviteSending(true)
    setInviteMessage(null)
    try {
      const result = await adminFetchJson<{ message?: string }>(`/api/admin/pessoas/${id}/send-invite`, {
        method: 'POST',
        body: JSON.stringify({ email }),
      })
      setInviteMessage({
        type: 'ok',
        message: result?.message || `Convite enviado para ${email}. O usuário receberá um link para completar o cadastro.`,
      })
      setInviteEmail('')
      await loadUserLink(id)
      setTimeout(() => {
        setInviteModalOpen(false)
        setInviteMessage(null)
      }, 2000)
    } catch (e) {
      setInviteMessage({
        type: 'err',
        message: e instanceof Error ? e.message : 'Erro ao enviar convite.',
      })
    } finally {
      setInviteSending(false)
    }
  }

  /**
   * Mescla dados de person com conversao
   * Usa conversao como fallback para preencher campos vazios
   */
  function mergePersonWithConversao(p: Person | null): Person | null {
    if (!p || !conversao) return p

    const merged: Person = { ...p }

    // Pré-preencher campos vazios com dados de conversão
    if (!merged.email && conversao.email) merged.email = conversao.email
    if (!merged.mobile_phone && conversao.telefone) merged.mobile_phone = conversao.telefone
    if (!merged.birth_date && conversao.data_nascimento) merged.birth_date = conversao.data_nascimento
    if (!merged.address_line && conversao.endereco) merged.address_line = conversao.endereco
    if (!merged.neighborhood && conversao.bairro) merged.neighborhood = conversao.bairro
    if (!merged.city && conversao.cidade) merged.city = conversao.cidade
    if (!merged.state && conversao.estado) merged.state = conversao.estado
    if (!merged.cep && conversao.cep) merged.cep = conversao.cep
    if (!merged.conversion_date && conversao.data_conversao) merged.conversion_date = conversao.data_conversao

    // Mapeamento de genero (M/F) para sex (Masculino/Feminino)
    if (!merged.sex && conversao.genero) {
      merged.sex = conversao.genero === 'M' ? 'Masculino' : conversao.genero === 'F' ? 'Feminino' : null
    }

    return merged
  }

  if (loading) {
    return (
      <PageAccessGuard pageKey="pessoas">
        <div className="p-6 md:p-8 flex items-center justify-center min-h-[200px]">
          <div className="w-8 h-8 border-2 border-[#c62737] border-t-transparent rounded-full animate-spin" />
        </div>
      </PageAccessGuard>
    )
  }

  if (!person) {
    return (
      <PageAccessGuard pageKey="pessoas">
        <div className="p-6 md:p-8">
          <p className="text-slate-600">Pessoa não encontrada.</p>
          <Link href="/admin/pessoas" className="mt-4 inline-flex items-center gap-2 text-[#c62737] font-medium">
            <ArrowLeft size={18} /> Voltar para Pessoas
          </Link>
        </div>
      </PageAccessGuard>
    )
  }

  if (editing) {
    return (
      <PageAccessGuard pageKey="pessoas">
        <div className="p-6 md:p-8">
          <div className="mb-6 flex items-center gap-4">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
              title="Voltar para a ficha"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">{person.full_name}</h1>
              <p className="text-slate-500">Editar cadastro</p>
            </div>
          </div>

          <PersonForm initial={mergePersonWithConversao(person)} onSubmit={handleSubmit} loading={saving} />

          {toast && (
            <Toast visible message={toast.message} type={toast.type} onClose={() => setToast(null)} />
          )}
        </div>
      </PageAccessGuard>
    )
  }

  const isActive = person.church_situation === 'Ativo'
  const shortId = id ? id.slice(0, 8) : ''

  return (
    <PageAccessGuard pageKey="pessoas">
      <div className="min-h-screen bg-slate-50">
        {/* Top bar */}
        <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
          <Link
            href="/admin/pessoas"
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-800 font-medium"
          >
            <ArrowLeft size={20} /> Voltar
          </Link>
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <span>Data de criação: {formatDateDisplay(person.created_at) || '—'}</span>
            <span>Atualizado em: {formatDateDisplay(person.updated_at) || '—'}</span>
            <span className="text-emerald-500">
              <Star size={18} className="inline" />
            </span>
          </div>
        </div>

        <div className="p-6 md:p-8">
          {/* Header: foto, nome, status, tags, editar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
            <div className="flex flex-wrap gap-6 items-start">
              <div className="relative shrink-0">
                <div className="w-24 h-24 rounded-full border-4 border-emerald-500 overflow-hidden bg-slate-100">
                  {person.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={person.avatar_url}
                      alt={person.full_name}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <User size={40} />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-3 mb-1">
                  <h1 className="text-2xl font-bold text-slate-800">{person.full_name}</h1>
                  <span className={`inline-flex items-center gap-1.5 text-sm ${userLink?.linked ? 'text-emerald-600' : 'text-amber-600'}`}>
                    <span className={`w-2 h-2 rounded-full ${userLink?.linked ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    {userLink?.linked ? 'Usuário vinculado' : 'Sem usuário vinculado'}
                  </span>
                </div>
                <p className="text-sm text-slate-500 mb-3">ID: {shortId}</p>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm font-medium">
                    {person.church_profile}
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      className="p-0.5 rounded hover:bg-blue-200/50"
                      title="Editar"
                    >
                      <Pencil size={12} />
                    </button>
                  </span>
                  <span className="inline-flex items-center gap-2 text-slate-600">
                    {dash(person.city)}
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      className="p-0.5 rounded hover:bg-slate-100"
                      title="Editar"
                    >
                      <Pencil size={12} />
                    </button>
                  </span>
                </div>
                <p className="text-sm text-slate-500 mt-1">Funções: {dash(person.church_role)}</p>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {isActive ? 'ATIVO' : 'INATIVO'}
                </span>
                <div className="flex gap-2 flex-wrap justify-end">
                  {!userLink?.linked && (
                    <button
                      type="button"
                      onClick={() => setInviteModalOpen(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                      title="Enviar convite de cadastro"
                    >
                      <Send size={16} /> Enviar convite
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#c62737] text-white text-sm font-medium hover:bg-[#a62030]"
                  >
                    <Pencil size={16} /> Editar
                  </button>
                </div>
                {userLink?.linked && userLink.user?.email && (
                  <p className="text-xs text-slate-500">Usuário: {userLink.user.email}</p>
                )}
                {!userLink?.linked && userLink?.emailUser?.email && (
                  <p className="text-xs text-amber-600">Existe usuário com esse e-mail sem vínculo automático.</p>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 border-b border-slate-200 overflow-x-auto">
            {TABS.map((tab) => {
              const Icon = tab.icon
              const isActiveTab = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    isActiveTab
                      ? 'border-emerald-500 text-emerald-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'
                  }`}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Conteúdo da aba Perfil */}
          {activeTab === 'perfil' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <DataCard label="Idade" value={getIdade(person.birth_date)} icon={Zap} />
              <DataCard label="Como está se sentindo?" value="Não informou" icon={Heart} />
              <DataCard label="Estado Civil" value={dash(person.marital_status)} icon={Heart} />
              <DataCard label="É batizado?" value={simNao(person.is_baptized)} icon={Cross} />
              <DataCard label="É pastor?" value={simNao(person.is_pastor)} icon={Cross} />
              <DataCard label="Faz parte da liderança?" value={simNao(person.is_leader)} icon={Users} />
              <DataCard label="Celular" value={dash(person.mobile_phone)} icon={Smartphone} />
              <DataCard label="Necessidades especiais" value={dash(person.special_needs) || simNao(!!person.special_needs)} icon={Hand} />
            </div>
          )}

          {/* Conteúdo da aba Pessoais */}
          {activeTab === 'pessoais' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wide">Dados pessoais</h3>
                <dl className="space-y-3">
                  <div><dt className="text-xs text-slate-500">Sexo</dt><dd className="text-slate-800">{dash(person.sex)}</dd></div>
                  <div><dt className="text-xs text-slate-500">Data de nascimento</dt><dd className="text-slate-800">{dash(formatDateDisplay(person.birth_date))}</dd></div>
                  <div><dt className="text-xs text-slate-500">Estado civil</dt><dd className="text-slate-800">{dash(person.marital_status)}</dd></div>
                  <div><dt className="text-xs text-slate-500">Data de casamento</dt><dd className="text-slate-800">{dash(formatDateDisplay(person.marriage_date))}</dd></div>
                  <div><dt className="text-xs text-slate-500">Cônjuge</dt><dd className="text-slate-800">{spouseName ?? '—'}</dd></div>
                  <div><dt className="text-xs text-slate-500">RG / CPF</dt><dd className="text-slate-800">{dash(person.rg)} / {dash(person.cpf)}</dd></div>
                  <div><dt className="text-xs text-slate-500">Escolaridade</dt><dd className="text-slate-800">{dash(person.education_level)}</dd></div>
                  <div><dt className="text-xs text-slate-500">Profissão</dt><dd className="text-slate-800">{dash(person.profession)}</dd></div>
                  <div><dt className="text-xs text-slate-500">Tipo sanguíneo</dt><dd className="text-slate-800">{dash(person.blood_type)}</dd></div>
                </dl>
              </div>
            </div>
          )}

          {/* Conteúdo da aba Contatos */}
          {activeTab === 'contatos' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
              <h3 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wide">Contatos</h3>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><dt className="text-xs text-slate-500">E-mail</dt><dd className="text-slate-800">{dash(person.email)}</dd></div>
                <div><dt className="text-xs text-slate-500">Celular</dt><dd className="text-slate-800">{dash(person.mobile_phone)}</dd></div>
                <div><dt className="text-xs text-slate-500">Telefone</dt><dd className="text-slate-800">{dash(person.phone)}</dd></div>
                <div><dt className="text-xs text-slate-500">Cidade / Estado</dt><dd className="text-slate-800">{dash(person.city)} / {dash(person.state)}</dd></div>
                <div className="md:col-span-2"><dt className="text-xs text-slate-500">Endereço</dt><dd className="text-slate-800">{[person.address_line, person.address_number, person.neighborhood, person.cep].filter(Boolean).map(dash).join(', ') || '—'}</dd></div>
              </dl>
            </div>
          )}

          {/* Conteúdo da aba Igreja */}
          {activeTab === 'igreja' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
              <h3 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wide">Dados eclesiásticos</h3>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><dt className="text-xs text-slate-500">Perfil</dt><dd className="text-slate-800">{person.church_profile}</dd></div>
                <div><dt className="text-xs text-slate-500">Função</dt><dd className="text-slate-800">{dash(person.church_role)}</dd></div>
                <div><dt className="text-xs text-slate-500">Líder direto</dt><dd className="text-slate-800">{leaderName ?? '—'}</dd></div>
                <div><dt className="text-xs text-slate-500">Entrada por</dt><dd className="text-slate-800">{dash(person.entry_by)}</dd></div>
                <div><dt className="text-xs text-slate-500">Data de entrada</dt><dd className="text-slate-800">{dash(formatDateDisplay(person.entry_date))}</dd></div>
                <div><dt className="text-xs text-slate-500">Data de conversão</dt><dd className="text-slate-800">{dash(formatDateDisplay(person.conversion_date))}</dd></div>
                <div><dt className="text-xs text-slate-500">Batizado</dt><dd className="text-slate-800">{simNao(person.is_baptized)}</dd></div>
                <div><dt className="text-xs text-slate-500">Data do batismo</dt><dd className="text-slate-800">{dash(formatDateDisplay(person.baptism_date))}</dd></div>
              </dl>
            </div>
          )}

          {/* Conteúdo da aba Mais */}
          {activeTab === 'mais' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
              <h3 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wide">Outros dados</h3>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><dt className="text-xs text-slate-500">Nacionalidade</dt><dd className="text-slate-800">{dash(person.nationality)}</dd></div>
                <div><dt className="text-xs text-slate-500">Naturalidade</dt><dd className="text-slate-800">{dash(person.birthplace)}</dd></div>
                <div><dt className="text-xs text-slate-500">Entrevistado por</dt><dd className="text-slate-800">{dash(person.interviewed_by)}</dd></div>
                <div><dt className="text-xs text-slate-500">Registrado por</dt><dd className="text-slate-800">{dash(person.registered_by)}</dd></div>
              </dl>
            </div>
          )}

          {/* Células */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <span className="w-1 h-6 bg-emerald-500 rounded-full" />
                Células
              </h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="px-3 py-2 rounded-lg border border-slate-300 text-slate-600 text-sm font-medium hover:bg-slate-50"
                >
                  Indicar para um líder
                </button>
                <button
                  type="button"
                  className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
                >
                  Adicionar Célula
                </button>
              </div>
            </div>
            {loadingCells ? (
              <div className="py-8 text-center">
                <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : cells.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-sm border border-dashed border-slate-200 rounded-lg">
                Nenhuma célula vinculada.
              </div>
            ) : (
              <div className="space-y-3">
                {cells.map((cell, index) => (
                  <div key={cell.id || index} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="font-medium text-slate-800">{cell.name}</h4>
                        <p className="text-xs text-slate-600 mt-1">
                          {cell.day_label && cell.time_of_day ? (
                            <>
                              {cell.day_label} às {cell.time_of_day}
                              {cell.frequency && ` (${cell.frequency})`}
                            </>
                          ) : (
                            '—'
                          )}
                        </p>
                        {cell.church_name && (
                          <p className="text-xs text-slate-500 mt-1">
                            <Church size={12} className="inline mr-1" />
                            {cell.church_name}
                          </p>
                        )}
                      </div>
                      {cell.role && (
                        <span className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-700 rounded">
                          {cell.role}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {toast && (
          <Toast visible message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        )}

        {/* Modal de enviar convite */}
        {inviteModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Mail className="text-blue-600" size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Enviar convite de cadastro</h2>
                  <p className="text-sm text-slate-500">{person.full_name}</p>
                </div>
              </div>

              <form onSubmit={handleSendInvite} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">E-mail para enviar o convite</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20 outline-none transition-all"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Se for diferente do email da pessoa, certifique-se de usar um email válido que o usuário tenha acesso.
                  </p>
                </div>

                {inviteMessage && (
                  <div
                    className={`p-3 rounded-lg text-sm font-medium ${
                      inviteMessage.type === 'ok'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {inviteMessage.message}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setInviteModalOpen(false)
                      setInviteEmail('')
                      setInviteMessage(null)
                    }}
                    className="flex-1 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={inviteSending || !inviteEmail.trim()}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#c62737] text-white font-medium hover:bg-[#a62030] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {inviteSending ? (
                      <>
                        <Loader2 size={18} className="animate-spin" /> Enviando...
                      </>
                    ) : (
                      <>
                        <Send size={18} /> Enviar convite
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </PageAccessGuard>
  )
}
