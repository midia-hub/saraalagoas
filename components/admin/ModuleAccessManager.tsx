'use client'

import { useState, useEffect, useRef } from 'react'
import {
  UserCheck, UserPlus, Shield, Loader2, Search, X,
  Mail, ChevronLeft, PencilLine, Settings, Copy, Check, Link as LinkIcon,
} from 'lucide-react'
import { adminFetchJson } from '@/lib/admin-client'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { AdminPageHeader } from '@/app/admin/AdminPageHeader'
import { Toast } from '@/components/Toast'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type UserRow = {
  id: string
  email: string
  full_name: string
  person_id: string | null
  avatar_url: string | null
  role_is_admin: boolean
  has_access: boolean
}

type PersonResult = {
  id: string
  full_name: string
  email: string | null
  mobile_phone: string | null
}

type UserLinkState = {
  linked: boolean
  user: { id: string; email: string | null; full_name: string | null } | null
}

type AccessLevel = 'usuario' | 'admin'

interface Props {
  moduleKey: string
  moduleName: string
}

// ─── Seletor de nível ─────────────────────────────────────────────────────────

const LEVELS: { value: AccessLevel; label: string; description: string; Icon: React.ElementType; active: string; bg: string }[] = [
  {
    value: 'usuario',
    label: 'Usuário',
    description: 'Visualização e edição',
    Icon: PencilLine,
    active: 'border-blue-500 bg-blue-50',
    bg: 'bg-blue-100',
  },
  {
    value: 'admin',
    label: 'Admin',
    description: 'Visualização, edição e gerenciamento de acessos',
    Icon: Settings,
    active: 'border-[#c62737] bg-red-50',
    bg: 'bg-[#c62737]/10',
  },
]

function LevelPicker({ value, onChange, disabled }: { value: AccessLevel | ''; onChange: (v: AccessLevel) => void; disabled?: boolean }) {
  return (
    <div className="space-y-2">
      {LEVELS.map(({ value: v, label, description, Icon, active, bg }) => {
        const sel = value === v
        return (
          <button
            key={v}
            type="button"
            disabled={disabled}
            onClick={() => onChange(v)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all disabled:opacity-40 ${
              sel ? active : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${sel ? bg : 'bg-slate-100'}`}>
              <Icon size={18} className={sel ? (v === 'admin' ? 'text-[#c62737]' : 'text-blue-600') : 'text-slate-400'} />
            </div>
            <div className="flex-1">
              <p className={`text-sm font-bold ${sel ? (v === 'admin' ? 'text-[#c62737]' : 'text-blue-700') : 'text-slate-700'}`}>{label}</p>
              <p className="text-xs text-slate-400">{description}</p>
            </div>
            <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${sel ? (v === 'admin' ? 'border-[#c62737]' : 'border-blue-500') : 'border-slate-300'}`}>
              {sel && <div className={`w-2 h-2 rounded-full ${v === 'admin' ? 'bg-[#c62737]' : 'bg-blue-500'}`} />}
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function ModuleAccessManager({ moduleKey, moduleName }: Props) {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // Alterar nível
  const [assignTarget, setAssignTarget] = useState<UserRow | null>(null)
  const [assignLevel, setAssignLevel] = useState<AccessLevel | ''>('')
  const [assigning, setAssigning] = useState(false)

  // Revogar
  const [revokeTarget, setRevokeTarget] = useState<UserRow | null>(null)
  const [revoking, setRevoking] = useState(false)

  // Modal adicionar
  const [addOpen, setAddOpen] = useState(false)
  const [addStep, setAddStep] = useState<'search' | 'new-person' | 'configure'>('search')
  const [addQuery, setAddQuery] = useState('')
  const [addResults, setAddResults] = useState<PersonResult[]>([])
  const [addSearching, setAddSearching] = useState(false)
  const [addPerson, setAddPerson] = useState<PersonResult | null>(null)
  const [addUserLink, setAddUserLink] = useState<UserLinkState | null>(null)
  const [addUserLinkLoading, setAddUserLinkLoading] = useState(false)
  const [addLevel, setAddLevel] = useState<AccessLevel | ''>('')
  const [addEmail, setAddEmail] = useState('')
  const [addSubmitting, setAddSubmitting] = useState(false)
  const [addMessage, setAddMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [addGeneratedLink, setAddGeneratedLink] = useState<string | null>(null)
  const [addLinkCopied, setAddLinkCopied] = useState(false)
  // Nova pessoa
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [creatingPerson, setCreatingPerson] = useState(false)
  const [newPersonError, setNewPersonError] = useState('')

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Carregar ──────────────────────────────────────────────────────────────

  async function load() {
    setLoading(true)
    try {
      const data = await adminFetchJson<{ users: UserRow[] }>(`/api/admin/modules/${moduleKey}/access`)
      setUsers(data.users ?? [])
    } catch {
      setToast({ type: 'err', text: 'Erro ao carregar usuários.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [moduleKey])

  // ── Busca de pessoas ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!addOpen || addStep !== 'search') return
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!addQuery.trim()) { setAddResults([]); return }
    timerRef.current = setTimeout(async () => {
      setAddSearching(true)
      try {
        const data = await adminFetchJson<{ items?: PersonResult[]; people?: PersonResult[] }>(
          `/api/admin/people?q=${encodeURIComponent(addQuery.trim())}&limit=10`
        )
        setAddResults(data.items ?? data.people ?? [])
      } catch {
        setAddResults([])
      } finally {
        setAddSearching(false)
      }
    }, 350)
  }, [addQuery, addOpen, addStep])

  // ── Selecionar pessoa ─────────────────────────────────────────────────────

  async function selectPerson(person: PersonResult) {
    setAddPerson(person)
    setAddStep('configure')
    setAddEmail(person.email ?? '')
    setAddLevel('')
    setAddMessage(null)
    setAddGeneratedLink(null)
    setAddUserLink(null)
    setAddUserLinkLoading(true)
    try {
      const data = await adminFetchJson<UserLinkState>(`/api/admin/people/${person.id}/user-link`)
      setAddUserLink(data)
    } catch {
      setAddUserLink({ linked: false, user: null })
    } finally {
      setAddUserLinkLoading(false)
    }
  }

  // ── Criar nova pessoa ─────────────────────────────────────────────────────

  async function handleCreatePerson(e: React.FormEvent) {
    e.preventDefault()
    const name = newName.trim(); const email = newEmail.trim()
    if (!name)  { setNewPersonError('Nome é obrigatório.'); return }
    if (!email) { setNewPersonError('E-mail é obrigatório.'); return }
    setCreatingPerson(true); setNewPersonError('')
    try {
      const data = await adminFetchJson<{ person: PersonResult; existingFound?: boolean }>(
        '/api/admin/modules/access/create-person',
        { method: 'POST', body: JSON.stringify({ full_name: name, email }) }
      )
      if (data.existingFound) {
        setNewPersonError(`Já existe uma pessoa com o e-mail ${email}. Busque pelo nome acima.`)
        setAddQuery(email); setAddStep('search')
        return
      }
      await selectPerson(data.person)
    } catch (err) {
      setNewPersonError(err instanceof Error ? err.message : 'Erro ao criar pessoa.')
    } finally {
      setCreatingPerson(false)
    }
  }

  // ── Submeter acesso ───────────────────────────────────────────────────────

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!addPerson || !addLevel) return
    setAddSubmitting(true); setAddMessage(null); setAddGeneratedLink(null)
    try {
      if (addUserLink?.linked && addUserLink.user) {
        // Pessoa com conta → conceder acesso direto
        await adminFetchJson(`/api/admin/modules/${moduleKey}/access`, {
          method: 'POST',
          body: JSON.stringify({ user_id: addUserLink.user.id, level: addLevel }),
        })
        setAddMessage({ type: 'ok', text: 'Acesso concedido com sucesso.' })
        await load()
        setTimeout(closeAddModal, 1800)
      } else {
        // Sem conta → gerar link de cadastro
        const email = addEmail.trim()
        if (!email) { setAddMessage({ type: 'err', text: 'Informe o e-mail.' }); setAddSubmitting(false); return }

        const result = await adminFetchJson<{ link?: string; linkedExisting?: boolean; message?: string }>(
          `/api/admin/pessoas/${addPerson.id}/generate-invite-link`,
          { method: 'POST', body: JSON.stringify({ email, profile: addLevel }) }
        )

        if (result.linkedExisting) {
          // Conta já existia → buscar user_id e conceder acesso
          const ul = await adminFetchJson<UserLinkState>(`/api/admin/people/${addPerson.id}/user-link`)
          if (ul.linked && ul.user?.id) {
            await adminFetchJson(`/api/admin/modules/${moduleKey}/access`, {
              method: 'POST',
              body: JSON.stringify({ user_id: ul.user.id, level: addLevel }),
            })
          }
          setAddMessage({ type: 'ok', text: result.message ?? 'Acesso concedido.' })
          await load(); setTimeout(closeAddModal, 1800)
        } else if (result.link) {
          setAddGeneratedLink(result.link)
          await load()
        }
      }
    } catch (err) {
      setAddMessage({ type: 'err', text: err instanceof Error ? err.message : 'Erro ao processar.' })
    } finally {
      setAddSubmitting(false)
    }
  }

  // ── Alterar nível ─────────────────────────────────────────────────────────

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault()
    if (!assignTarget || !assignLevel) return
    setAssigning(true)
    try {
      await adminFetchJson(`/api/admin/modules/${moduleKey}/access`, {
        method: 'POST',
        body: JSON.stringify({ user_id: assignTarget.id, level: assignLevel }),
      })
      setToast({ type: 'ok', text: 'Nível atualizado.' })
      setAssignTarget(null)
      await load()
    } catch (err) {
      setToast({ type: 'err', text: err instanceof Error ? err.message : 'Erro.' })
    } finally {
      setAssigning(false)
    }
  }

  // ── Revogar ───────────────────────────────────────────────────────────────

  async function handleRevoke() {
    if (!revokeTarget) return
    setRevoking(true)
    try {
      await adminFetchJson(`/api/admin/modules/${moduleKey}/access`, {
        method: 'DELETE',
        body: JSON.stringify({ user_id: revokeTarget.id }),
      })
      setToast({ type: 'ok', text: 'Acesso revogado.' })
      setRevokeTarget(null); await load()
    } catch {
      setToast({ type: 'err', text: 'Erro ao revogar.' })
    } finally {
      setRevoking(false)
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  function openAddModal() {
    setAddOpen(true); setAddStep('search'); setAddQuery(''); setAddResults([])
    setAddPerson(null); setAddUserLink(null); setAddLevel(''); setAddEmail('')
    setAddMessage(null); setAddGeneratedLink(null); setAddLinkCopied(false)
    setNewName(''); setNewEmail(''); setNewPersonError('')
  }

  function closeAddModal() { setAddOpen(false) }

  function copyLink() {
    if (!addGeneratedLink) return
    navigator.clipboard.writeText(addGeneratedLink)
    setAddLinkCopied(true); setTimeout(() => setAddLinkCopied(false), 2500)
  }

  function levelOf(user: UserRow): AccessLevel {
    return user.role_is_admin ? 'admin' : 'usuario'
  }

  // ── Lista filtrada ────────────────────────────────────────────────────────

  const q = search.trim().toLowerCase()
  const displayed = users.filter(u =>
    u.has_access && (!q || u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
  )

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <PageAccessGuard pageKey="usuarios">
      <div className="p-6 md:p-8 max-w-4xl">

        <AdminPageHeader
          icon={Shield}
          title={`Acesso — ${moduleName}`}
          subtitle="Gerencie quem pode acessar este módulo."
          actions={
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#c62737] text-white text-sm font-semibold hover:bg-[#a01f2d] transition-colors shadow-sm"
            >
              <UserPlus size={16} /> Adicionar acesso
            </button>
          }
        />

        {/* Legenda */}
        <div className="flex flex-wrap gap-4 mb-5">
          {LEVELS.map(({ value, label, description, Icon }) => (
            <div key={value} className="flex items-center gap-1.5 text-xs text-slate-500">
              <Icon size={13} className={value === 'admin' ? 'text-[#c62737]' : 'text-blue-500'} />
              <span className="font-semibold">{label}:</span>
              <span>{description}</span>
            </div>
          ))}
        </div>

        {/* Busca + contador */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <p className="text-sm text-slate-500">
            <span className="font-semibold text-slate-700">{users.filter(u => u.has_access).length}</span> usuário(s) com acesso
          </p>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome ou e-mail..."
              className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:border-[#c62737] outline-none w-64"
            />
          </div>
        </div>

        {/* Lista */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-12 flex justify-center"><Loader2 size={24} className="animate-spin text-slate-400" /></div>
          ) : displayed.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <p className="text-slate-400">{search.trim() ? 'Nenhum resultado.' : 'Nenhum usuário com acesso ainda.'}</p>
              {!search.trim() && (
                <button type="button" onClick={openAddModal}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-[#c62737] text-white hover:bg-[#a01f2d] transition-colors">
                  <UserPlus size={15} /> Adicionar primeiro acesso
                </button>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {displayed.map(user => {
                const lvl = levelOf(user)
                return (
                  <li key={user.id} className="flex items-center gap-3 px-5 py-4">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center text-sm font-bold text-slate-500 shrink-0">
                      {user.avatar_url
                        ? <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                        : user.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{user.full_name}</p>
                      <p className="text-xs text-slate-400 truncate">{user.email}</p>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${
                        lvl === 'admin' ? 'bg-red-50 text-[#c62737]' : 'bg-blue-50 text-blue-700'
                      }`}>
                        {lvl === 'admin' ? <><Settings size={9} /> Admin</> : <><PencilLine size={9} /> Usuário</>}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button type="button"
                        onClick={() => { setAssignTarget(user); setAssignLevel(levelOf(user)) }}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                        Alterar nível
                      </button>
                      {!user.role_is_admin && (
                        <button type="button" onClick={() => setRevokeTarget(user)}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                          Revogar
                        </button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

      </div>

      {/* ── Modal: Adicionar acesso ─────────────────────────────────── */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => !addSubmitting && closeAddModal()}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                {(addStep === 'configure' || addStep === 'new-person') && (
                  <button type="button"
                    onClick={() => { setAddStep('search'); setAddPerson(null); setAddGeneratedLink(null) }}
                    className="p-1 text-slate-400 hover:text-slate-600 mr-1">
                    <ChevronLeft size={18} />
                  </button>
                )}
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    {addStep === 'new-person' ? 'Nova pessoa' : 'Adicionar acesso'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {addStep === 'search'     && 'Busque ou cadastre uma nova pessoa'}
                    {addStep === 'new-person' && 'Preencha os dados para criar o cadastro'}
                    {addStep === 'configure'  && addPerson?.full_name}
                  </p>
                </div>
              </div>
              <button type="button" onClick={closeAddModal} className="p-1 text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            {/* Passo: busca */}
            {addStep === 'search' && (
              <div className="px-6 py-4 space-y-3">
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input autoFocus type="text" value={addQuery} onChange={e => setAddQuery(e.target.value)}
                    placeholder="Buscar por nome ou e-mail..."
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-[#c62737] outline-none" />
                </div>
                <div className="min-h-[100px]">
                  {addSearching ? (
                    <div className="flex justify-center py-6"><Loader2 size={20} className="animate-spin text-slate-400" /></div>
                  ) : addResults.length > 0 ? (
                    <ul className="space-y-1 max-h-52 overflow-y-auto">
                      {addResults.map(p => (
                        <li key={p.id}>
                          <button type="button" onClick={() => selectPerson(p)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-500 shrink-0">
                              {p.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-800 truncate">{p.full_name}</p>
                              <p className="text-xs text-slate-400 truncate">{p.email ?? p.mobile_phone ?? '—'}</p>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-center text-sm text-slate-400 py-4">
                      {addQuery.trim() ? 'Nenhuma pessoa encontrada.' : 'Digite o nome para buscar.'}
                    </p>
                  )}
                </div>
                <div className="pt-1 border-t border-slate-100">
                  <p className="text-xs text-slate-400 text-center mb-2">Usuário não está no cadastro?</p>
                  <button type="button"
                    onClick={() => { setAddStep('new-person'); setNewName(addQuery.trim()); setNewEmail(''); setNewPersonError('') }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-slate-200 text-sm font-semibold text-slate-600 hover:border-[#c62737] hover:text-[#c62737] transition-colors">
                    <UserPlus size={15} /> Adicionar nova pessoa
                  </button>
                </div>
              </div>
            )}

            {/* Passo: nova pessoa */}
            {addStep === 'new-person' && (
              <div className="px-6 py-4">
                <p className="text-xs text-slate-500 mb-4">Preencha os dados. Um link de acesso será gerado no próximo passo.</p>
                <form onSubmit={handleCreatePerson} className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nome completo <span className="text-red-500">*</span></label>
                    <input autoFocus type="text" value={newName} onChange={e => setNewName(e.target.value)}
                      placeholder="Nome da pessoa"
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:border-[#c62737] outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">E-mail <span className="text-red-500">*</span></label>
                    <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                      placeholder="email@exemplo.com"
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:border-[#c62737] outline-none" />
                    <p className="text-xs text-slate-400 mt-1">O link de acesso será gerado para este e-mail.</p>
                  </div>
                  {newPersonError && (
                    <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{newPersonError}</p>
                  )}
                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={() => setAddStep('search')} disabled={creatingPerson}
                      className="flex-1 px-4 py-2 text-sm text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors">
                      Voltar
                    </button>
                    <button type="submit" disabled={creatingPerson}
                      className="flex-1 px-4 py-2 text-sm bg-[#c62737] text-white rounded-lg hover:bg-[#a01f2d] disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
                      {creatingPerson && <Loader2 size={14} className="animate-spin" />}
                      {creatingPerson ? 'Criando...' : 'Continuar'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Passo: configurar acesso */}
            {addStep === 'configure' && addPerson && (
              <div className="px-6 py-4">
                {addUserLinkLoading ? (
                  <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-slate-400" /></div>
                ) : addGeneratedLink ? (
                  /* Link gerado */
                  <div className="space-y-4">
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                      <Check size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-emerald-700">Link de cadastro gerado!</p>
                        <p className="text-xs text-emerald-600 mt-0.5">Envie para <strong>{addPerson.full_name}</strong> pelo canal que preferir.</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide">Link de acesso</label>
                      <div className="flex items-start gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <LinkIcon size={14} className="text-slate-400 shrink-0 mt-0.5" />
                        <p className="flex-1 text-xs text-slate-600 font-mono break-all leading-relaxed">{addGeneratedLink}</p>
                      </div>
                      <button type="button" onClick={copyLink}
                        className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                          addLinkCopied ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-white hover:bg-slate-700'
                        }`}>
                        {addLinkCopied ? <><Check size={15} /> Copiado!</> : <><Copy size={15} /> Copiar link</>}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400 text-center">Link expira em 24 horas.</p>
                    <button type="button" onClick={closeAddModal}
                      className="w-full px-4 py-2 text-sm text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                      Fechar
                    </button>
                  </div>
                ) : (
                  /* Formulário */
                  <form onSubmit={handleAddSubmit} className="space-y-4">
                    {addUserLink?.linked ? (
                      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                        <UserCheck size={15} className="text-emerald-600 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-emerald-700">Já possui conta na plataforma</p>
                          <p className="text-xs text-emerald-600 truncate">{addUserLink.user?.email}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200">
                        <Mail size={15} className="text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-amber-700">Sem conta na plataforma</p>
                          <p className="text-xs text-amber-600 mt-0.5">Um link de cadastro será gerado para envio manual.</p>
                        </div>
                      </div>
                    )}

                    {!addUserLink?.linked && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">E-mail para o link de cadastro</label>
                        <input type="email" value={addEmail} onChange={e => setAddEmail(e.target.value)}
                          placeholder="email@exemplo.com"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-[#c62737] outline-none" />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Nível de acesso</label>
                      <LevelPicker value={addLevel} onChange={setAddLevel} />
                    </div>

                    {addMessage && (
                      <div className={`p-3 rounded-xl text-sm font-medium ${
                        addMessage.type === 'ok' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
                      }`}>{addMessage.text}</div>
                    )}

                    <div className="flex gap-2 pt-1">
                      <button type="button" onClick={closeAddModal} disabled={addSubmitting}
                        className="flex-1 px-4 py-2 text-sm text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors">
                        Cancelar
                      </button>
                      <button type="submit" disabled={addSubmitting || !addLevel}
                        className="flex-1 px-4 py-2 text-sm bg-[#c62737] text-white rounded-lg hover:bg-[#a01f2d] disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
                        {addSubmitting && <Loader2 size={14} className="animate-spin" />}
                        {addSubmitting ? 'Processando...' : addUserLink?.linked ? 'Conceder acesso' : 'Gerar link de cadastro'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal: Alterar nível ────────────────────────────────────── */}
      {assignTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => !assigning && setAssignTarget(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-bold text-slate-800">Alterar nível de acesso</h3>
                <p className="text-sm text-slate-500 truncate">{assignTarget.full_name}</p>
              </div>
              <button type="button" onClick={() => setAssignTarget(null)} className="p-1 text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <form onSubmit={handleAssign} className="space-y-4">
              <LevelPicker value={assignLevel} onChange={setAssignLevel} />
              <div className="flex gap-2">
                <button type="button" onClick={() => setAssignTarget(null)} disabled={assigning}
                  className="flex-1 px-4 py-2 text-sm text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={assigning || !assignLevel}
                  className="flex-1 px-4 py-2 text-sm bg-[#c62737] text-white rounded-lg hover:bg-[#a01f2d] disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
                  {assigning && <Loader2 size={14} className="animate-spin" />}
                  {assigning ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Revogar ────────────────────────────────────────────────── */}
      <ConfirmDialog
        open={!!revokeTarget}
        title="Revogar acesso"
        message={revokeTarget ? `Remover o acesso de "${revokeTarget.full_name}" ao módulo ${moduleName}?` : ''}
        confirmLabel="Revogar" cancelLabel="Cancelar" variant="danger"
        loading={revoking} onConfirm={handleRevoke} onCancel={() => setRevokeTarget(null)}
      />

      {toast && <Toast visible message={toast.text} type={toast.type} onClose={() => setToast(null)} />}
    </PageAccessGuard>
  )
}
