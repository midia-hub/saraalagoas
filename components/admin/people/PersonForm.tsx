'use client'

import { useEffect, useState } from 'react'
import { Lock as LockIcon, ShieldCheck, UsersRound } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { CustomSelect } from '@/components/ui/CustomSelect'
import { DatePickerInput } from '@/components/ui/DatePickerInput'
import { CreatableCombobox } from '@/components/admin/CreatableCombobox'
import { adminFetchJson } from '@/lib/admin-client'
import type { Person } from '@/lib/types/person'
import { fetchPerson } from '@/lib/people'
import {
  CHURCH_PROFILE_VALUES,
  CHURCH_ROLE_VALUES,
  SEX_VALUES,
  MARITAL_STATUS_VALUES,
  ENTRY_BY_VALUES,
  STATUS_IN_CHURCH_VALUES,
  EDUCATION_LEVEL_VALUES,
  BLOOD_TYPE_VALUES,
} from '@/lib/types/person'

export type PersonFormData = Partial<Record<keyof Person, string | boolean | null>>

interface PersonFormProps {
  initial?: Person | null
  onSubmit: (data: PersonFormData) => Promise<void>
  loading?: boolean
  readOnlyMetadata?: boolean
  readOnlyEmail?: boolean
}

function toFormValue(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  return String(v)
}

function isValidCPF(cpf: string) {
  if (typeof cpf !== 'string') return false
  cpf = cpf.replace(/[^\d]+/g, '')
  if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false
  const cpfArr = cpf.split('').map(el => +el)
  const rest = (count: number) => (cpfArr.slice(0, count - 12).reduce((soma, el, index) => soma + el * (count - index), 0) * 10) % 11 % 10
  return rest(10) === cpfArr[9] && rest(11) === cpfArr[10]
}

export function PersonForm({ initial, onSubmit, loading = false, readOnlyMetadata = false, readOnlyEmail = false }: PersonFormProps) {
  const [form, setForm] = useState<PersonFormData>(() => {
    if (!initial) return {}
    return {
      leader_person_id: initial.leader_person_id ?? null,
      spouse_person_id: initial.spouse_person_id ?? null,
      full_name: initial.full_name ?? '',
      church_name: initial.church_name ?? '',
      church_profile: initial.church_profile ?? '',
      church_situation: initial.church_situation ?? '',
      church_role: initial.church_role ?? '',
      sex: initial.sex ?? '',
      birth_date: initial.birth_date ? String(initial.birth_date).slice(0, 10) : '',
      marital_status: initial.marital_status ?? '',
      marriage_date: initial.marriage_date ? String(initial.marriage_date).slice(0, 10) : '',
      rg: initial.rg ?? '',
      rg_issuing_agency: initial.rg_issuing_agency ?? '',
      rg_uf: initial.rg_uf ?? '',
      cpf: initial.cpf ?? '',
      special_needs: initial.special_needs ?? '',
      cep: initial.cep ?? '',
      city: initial.city ?? '',
      state: initial.state ?? '',
      neighborhood: initial.neighborhood ?? '',
      address_line: initial.address_line ?? '',
      address_number: initial.address_number ?? '',
      address_complement: initial.address_complement ?? '',
      email: initial.email ?? '',
      mobile_phone: initial.mobile_phone ?? '',
      phone: initial.phone ?? '',
      entry_by: initial.entry_by ?? '',
      entry_date: initial.entry_date ? String(initial.entry_date).slice(0, 10) : '',
      status_in_church: initial.status_in_church ?? '',
      is_new_convert: initial.is_new_convert ?? null,
      accepted_jesus: initial.accepted_jesus ?? null,
      accepted_jesus_at: initial.accepted_jesus_at ?? '',
      conversion_date: initial.conversion_date ? String(initial.conversion_date).slice(0, 10) : '',
      is_baptized: initial.is_baptized ?? null,
      baptism_date: initial.baptism_date ? String(initial.baptism_date).slice(0, 10) : '',
      is_leader: initial.is_leader ?? null,
      is_pastor: initial.is_pastor ?? null,
      education_level: initial.education_level ?? '',
      profession: initial.profession ?? '',
      nationality: initial.nationality ?? '',
      birthplace: initial.birthplace ?? '',
      origin_church: initial.origin_church ?? '',
      interviewed_by: initial.interviewed_by ?? '',
      registered_by: initial.registered_by ?? '',
      blood_type: initial.blood_type ?? '',
    }
  })
  const [leaderLabel, setLeaderLabel] = useState('')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [leaderCurrentName, setLeaderCurrentName] = useState<string | null>(null)
  const [spouseLabel, setSpouseLabel] = useState('')
  const [sexError, setSexError] = useState<string | null>(null)

  const update = (key: keyof Person, value: string | boolean | null) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  useEffect(() => {
    let active = true
    const leaderId = typeof form.leader_person_id === 'string' ? form.leader_person_id : ''
    if (!leaderId) {
      setLeaderCurrentName(null)
      setLeaderLabel('')
      return
    }

    fetchPerson(leaderId)
      .then((person) => {
        if (!active) return
        const name = person?.full_name || null
        setLeaderCurrentName(name)
        if (name) setLeaderLabel(name)
      })
      .catch(() => {
        if (!active) return
        setLeaderCurrentName(null)
      })

    return () => {
      active = false
    }
  }, [form.leader_person_id])

  useEffect(() => {
    let active = true
    const spouseId = typeof form.spouse_person_id === 'string' ? form.spouse_person_id : ''
    if (!spouseId) {
      setSpouseLabel('')
      return
    }
    fetchPerson(spouseId)
      .then((person) => {
        if (!active) return
        if (person?.full_name) setSpouseLabel(person.full_name)
      })
      .catch(() => {
        if (!active) return
        setSpouseLabel('')
      })
    return () => { active = false }
  }, [form.spouse_person_id])

  const handleCepSearch = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '')
    if (cleanCep.length !== 8) return

    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
      const data = await res.json()
      if (data.erro) return

      setForm(prev => ({
        ...prev,
        address_line: data.logradouro || prev.address_line,
        neighborhood: data.bairro || prev.neighborhood,
        city: data.localidade || prev.city,
        state: data.uf || prev.state
      }))
    } catch (err) {
      console.error('Erro ao buscar CEP:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSexError(null)
    if (!toFormValue(form.sex)) {
      setSexError('Sexo é obrigatório.')
      return
    }
    await onSubmit(form)
  }

  const inputClass = 'w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20 outline-none'
  const labelClass = 'block text-sm font-medium text-slate-700 mb-1'

  const isActive = toFormValue(form.church_situation) === 'Ativo'

  const handleToggleActive = () => {
    const next = isActive ? 'Inativo' : 'Ativo'
    update('church_situation', next)
    update('status_in_church', next)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Toggle Ativo/Inativo */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-green-500' : 'bg-slate-300'}`} />
          <span className="text-sm font-semibold text-slate-700">
            Status: <span className={isActive ? 'text-green-600' : 'text-slate-500'}>{isActive ? 'Ativo' : 'Inativo'}</span>
          </span>
        </div>
        <button
          type="button"
          onClick={handleToggleActive}
          className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 ${isActive ? 'bg-green-500 focus:ring-green-500/30' : 'bg-slate-300 focus:ring-slate-300/30'
            }`}
        >
          <span
            className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${isActive ? 'translate-x-5' : 'translate-x-0'
              }`}
          />
        </button>
      </div>

      {/* 1) Dados principais */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Dados principais</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className={labelClass}>Nome completo *</label>
            <input
              type="text"
              value={toFormValue(form.full_name)}
              onChange={(e) => update('full_name', e.target.value)}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Perfil na igreja *</label>
            <CustomSelect value={toFormValue(form.church_profile)} onChange={(v) => update('church_profile', v)} placeholder="Selecione" options={CHURCH_PROFILE_VALUES.map((v) => ({ value: v, label: v }))} />
          </div>
          <div>
            <label className={labelClass}>Igreja</label>
            <input
              type="text"
              value={toFormValue(form.church_name)}
              onChange={(e) => update('church_name', e.target.value || null)}
              className={inputClass}
              placeholder="Nome da igreja"
            />
          </div>
        </div>
      </section>

      {/* 2) Função e Governança */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Função e Governança</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className={labelClass}>Função na igreja</label>
            {readOnlyMetadata ? (
              <div className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 text-slate-500 font-bold text-sm flex items-center gap-3">
                <LockIcon size={14} className="text-slate-400" />
                {toFormValue(form.church_role) || 'Nenhuma função atribuída'}
              </div>
            ) : (
              <CustomSelect value={toFormValue(form.church_role)} onChange={(v) => update('church_role', v || null)} placeholder="Selecione" options={CHURCH_ROLE_VALUES.map((v) => ({ value: v, label: v }))} />
            )}
          </div>

          <div className="md:col-span-2">
            <label className={labelClass}>Líder direto</label>
            {readOnlyMetadata ? (
              <div className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 text-slate-500 font-bold text-sm flex items-center gap-3">
                <LockIcon size={14} className="text-slate-400" />
                {leaderLabel || 'Sem líder definido'}
              </div>
            ) : (
              <div className="space-y-2">
                <CreatableCombobox
                  fetchItems={async (q) => {
                    try {
                      const params = new URLSearchParams()
                      if (q && q.trim()) params.set('q', q.trim())
                      const data = await adminFetchJson<{ items: Array<{ id: string; full_name: string; label: string }> }>(
                        `/api/admin/consolidacao/lookups/people${params.toString() ? `?${params.toString()}` : ''}`
                      )
                      const items = Array.isArray(data.items) ? data.items : []
                      return { items: items.map((p) => ({ id: p.id, label: p.full_name ?? p.label ?? '' })) }
                    } catch {
                      return { items: [] }
                    }
                  }}
                  selectedId={form.leader_person_id as string}
                  selectedLabel={leaderLabel}
                  onChange={(id, _, label) => {
                    update('leader_person_id', id || null)
                    if (label) setLeaderLabel(label)
                    else if (!id && !_) setLeaderLabel('')
                  }}
                  placeholder="Selecione o líder desta pessoa"
                />
                <div className="flex items-center gap-4 text-xs">
                  {form.leader_person_id && (
                    <span className="text-slate-500">
                      Líder atual: <strong className="text-slate-700">{leaderLabel}</strong>
                    </span>
                  )}
                  {initial?.id && (
                    <a
                      href={`/admin/lideranca/estrutura?rootPersonId=${initial.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#c62737] hover:underline font-medium flex items-center gap-1"
                    >
                      Ver estrutura de liderança
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className={labelClass}>É líder?</label>
            {readOnlyMetadata ? (
              <div className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 text-slate-500 font-bold text-sm flex items-center gap-3">
                <LockIcon size={14} className="text-slate-400" />
                {form.is_leader === true ? 'Sim' : 'Não'}
              </div>
            ) : (
              <CustomSelect value={form.is_leader === true ? 'true' : form.is_leader === false ? 'false' : ''} onChange={(v) => update('is_leader', v === '' ? null : v === 'true')} placeholder="Não informado" options={[{ value: 'true', label: 'Sim' }, { value: 'false', label: 'Não' }]} />
            )}
          </div>
          <div>
            <label className={labelClass}>É pastor?</label>
            {readOnlyMetadata ? (
              <div className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 text-slate-500 font-bold text-sm flex items-center gap-3">
                <LockIcon size={14} className="text-slate-400" />
                {form.is_pastor === true ? 'Sim' : 'Não'}
              </div>
            ) : (
              <CustomSelect value={form.is_pastor === true ? 'true' : form.is_pastor === false ? 'false' : ''} onChange={(v) => update('is_pastor', v === '' ? null : v === 'true')} placeholder="Não informado" options={[{ value: 'true', label: 'Sim' }, { value: 'false', label: 'Não' }]} />
            )}
          </div>
        </div>
      </section>

      {/* 3) Dados pessoais */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Dados pessoais</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Sexo *</label>
            <CustomSelect value={toFormValue(form.sex)} onChange={(v) => { update('sex', v || null); setSexError(null) }} placeholder="Selecione" options={SEX_VALUES.map((v) => ({ value: v, label: v }))} />
            {sexError && <p className="mt-1 text-sm text-red-600">{sexError}</p>}
          </div>
          <div>
            <label className={labelClass}>Data de nascimento</label>
            <DatePickerInput
              value={toFormValue(form.birth_date)}
              onChange={(v: string) => update('birth_date', v || null)}
            />
          </div>
          <div>
            <label className={labelClass}>Estado civil</label>
            <CustomSelect
              value={toFormValue(form.marital_status)}
              onChange={(v) => {
                update('marital_status', v || null)
                if (v !== 'Casado(a)') {
                  update('spouse_person_id', null)
                  setSpouseLabel('')
                }
              }}
              placeholder="Selecione"
              options={MARITAL_STATUS_VALUES.map((v) => ({ value: v, label: v }))}
            />
          </div>
          {(form.marital_status === 'Casado(a)' || initial?.marital_status === 'Casado(a)') && (
            <div>
              <label className={labelClass}>Data de casamento</label>
              <DatePickerInput
                value={toFormValue(form.marriage_date)}
                onChange={(v: string) => update('marriage_date', v || null)}
              />
            </div>
          )}
          {(form.marital_status === 'Casado(a)' || initial?.marital_status === 'Casado(a)') && (
            <div className="md:col-span-2">
              <label className={labelClass}>Cônjuge</label>
              {!toFormValue(form.sex) ? (
                <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Informe o sexo acima para poder selecionar o cônjuge (homem → mulher, mulher → homem).
                </p>
              ) : (
                <CreatableCombobox
                  fetchItems={async (q) => {
                    try {
                      const oppositeSex = toFormValue(form.sex) === 'Masculino' ? 'Feminino' : 'Masculino'
                      const params = new URLSearchParams({ sex: oppositeSex })
                      if (initial?.id) params.set('excludeId', initial.id)
                      if (q && q.trim()) params.set('q', q.trim())
                      const data = await adminFetchJson<{ items: Array<{ id: string; full_name?: string; label?: string }> }>(
                        `/api/admin/consolidacao/lookups/people?${params.toString()}`
                      )
                      const items = Array.isArray(data.items) ? data.items : []
                      return { items: items.map((p) => ({ id: p.id, label: p.full_name ?? p.label ?? '' })) }
                    } catch {
                      return { items: [] }
                    }
                  }}
                  selectedId={form.spouse_person_id as string}
                  selectedLabel={spouseLabel}
                  onChange={(id, _, label) => {
                    update('spouse_person_id', id || null)
                    if (label) setSpouseLabel(label)
                    else if (!id) setSpouseLabel('')
                  }}
                  placeholder="Selecione o cônjuge"
                />
              )}
            </div>
          )}
          <div>
            <label className={labelClass}>Documento de Identificação</label>
            <input type="text" value={toFormValue(form.rg)} onChange={(e) => update('rg', e.target.value || null)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Órgão Emissor</label>
            <input type="text" value={toFormValue(form.rg_issuing_agency)} onChange={(e) => update('rg_issuing_agency', e.target.value || null)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>UF do RG</label>
            <input type="text" value={toFormValue(form.rg_uf)} onChange={(e) => update('rg_uf', e.target.value || null)} className={inputClass} maxLength={2} placeholder="UF" />
          </div>
          <div>
            <label className={labelClass}>CPF</label>
            <input
              type="text"
              value={toFormValue(form.cpf)}
              onChange={(e) => {
                let v = e.target.value.replace(/\D/g, '')
                if (v.length > 11) v = v.slice(0, 11)

                // Máscara de CPF
                if (v.length > 9) v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
                else if (v.length > 6) v = v.replace(/(\d{3})(\d{3})(\d{3})/, '$1.$2.$3')
                else if (v.length > 3) v = v.replace(/(\d{3})(\d{3})/, '$1.$2')

                update('cpf', v || null)
              }}
              placeholder="000.000.000-00"
              className={`${inputClass} ${form.cpf && String(form.cpf).length === 14 && !isValidCPF(String(form.cpf)) ? 'border-red-500 ring-2 ring-red-500/10' : ''}`}
            />
            {form.cpf && String(form.cpf).length === 14 && !isValidCPF(String(form.cpf)) && (
              <p className="mt-1 text-[10px] font-bold text-red-500 uppercase tracking-widest">CPF inválido</p>
            )}
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>Necessidades especiais</label>
            <input type="text" value={toFormValue(form.special_needs)} onChange={(e) => update('special_needs', e.target.value || null)} className={inputClass} />
          </div>
        </div>
      </section>

      {/* 4) Contatos */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Contatos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>CEP</label>
            <input
              type="text"
              value={toFormValue(form.cep)}
              onChange={(e) => update('cep', e.target.value || null)}
              onBlur={(e) => handleCepSearch(e.target.value)}
              placeholder="00000-000"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Cidade</label>
            <input type="text" value={toFormValue(form.city)} onChange={(e) => update('city', e.target.value || null)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Estado (UF)</label>
            <input type="text" value={toFormValue(form.state)} onChange={(e) => update('state', e.target.value || null)} className={inputClass} maxLength={2} placeholder="UF" />
          </div>
          <div>
            <label className={labelClass}>Bairro</label>
            <input type="text" value={toFormValue(form.neighborhood)} onChange={(e) => update('neighborhood', e.target.value || null)} className={inputClass} />
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>Endereço (Logradouro)</label>
            <input type="text" value={toFormValue(form.address_line)} onChange={(e) => update('address_line', e.target.value || null)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Número</label>
            <input type="text" value={toFormValue(form.address_number)} onChange={(e) => update('address_number', e.target.value || null)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Complemento</label>
            <input type="text" value={toFormValue(form.address_complement)} onChange={(e) => update('address_complement', e.target.value || null)} className={inputClass} />
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>E-mail</label>
            {readOnlyEmail ? (
              <div className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 text-slate-500 font-bold text-sm flex items-center gap-3">
                <LockIcon size={14} className="text-slate-400" />
                {toFormValue(form.email) || 'Sem e-mail'}
              </div>
            ) : (
              <input type="email" value={toFormValue(form.email)} onChange={(e) => update('email', e.target.value || null)} className={inputClass} />
            )}
          </div>
          <div>
            <label className={labelClass}>Celular</label>
            <input type="tel" value={toFormValue(form.mobile_phone)} onChange={(e) => update('mobile_phone', e.target.value || null)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Telefone</label>
            <input type="tel" value={toFormValue(form.phone)} onChange={(e) => update('phone', e.target.value || null)} className={inputClass} />
          </div>
        </div>
      </section>

      {/* 5) Dados eclesiásticos */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Dados eclesiásticos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Entrada por</label>
            <CustomSelect value={toFormValue(form.entry_by)} onChange={(v) => update('entry_by', v || null)} placeholder="Selecione" options={ENTRY_BY_VALUES.map((v) => ({ value: v, label: v }))} />
          </div>
          <div>
            <label className={labelClass}>Data de entrada</label>
            <DatePickerInput
              value={toFormValue(form.entry_date)}
              onChange={(v: string) => update('entry_date', v || null)}
            />
          </div>

          <div>
            <label className={labelClass}>É recém-convertido?</label>
            <CustomSelect value={form.is_new_convert === true ? 'true' : form.is_new_convert === false ? 'false' : ''} onChange={(v) => update('is_new_convert', v === '' ? null : v === 'true')} placeholder="Não informado" options={[{ value: 'true', label: 'Sim' }, { value: 'false', label: 'Não' }]} />
          </div>
          <div>
            <label className={labelClass}>Aceitou Jesus?</label>
            <CustomSelect value={form.accepted_jesus === true ? 'true' : form.accepted_jesus === false ? 'false' : ''} onChange={(v) => update('accepted_jesus', v === '' ? null : v === 'true')} placeholder="Não informado" options={[{ value: 'true', label: 'Sim' }, { value: 'false', label: 'Não' }]} />
          </div>
          <div>
            <label className={labelClass}>Aceitou Jesus em</label>
            <input type="text" value={toFormValue(form.accepted_jesus_at)} onChange={(e) => update('accepted_jesus_at', e.target.value || null)} className={inputClass} placeholder="Ex.: culto, conferência, célula" />
          </div>
          <div>
            <label className={labelClass}>Data que aceitou Jesus</label>
            <DatePickerInput
              value={toFormValue(form.conversion_date)}
              onChange={(v: string) => update('conversion_date', v || null)}
            />
          </div>
          <div>
            <label className={labelClass}>Batizado?</label>
            <CustomSelect value={form.is_baptized === true ? 'true' : form.is_baptized === false ? 'false' : ''} onChange={(v) => update('is_baptized', v === '' ? null : v === 'true')} placeholder="Não informado" options={[{ value: 'true', label: 'Sim' }, { value: 'false', label: 'Não' }]} />
          </div>
          {(form.is_baptized === true || initial?.is_baptized) && (
            <div className="md:col-span-2">
              <label className={labelClass}>Data do batismo</label>
              <DatePickerInput
                value={toFormValue(form.baptism_date)}
                onChange={(v: string) => update('baptism_date', v || null)}
              />
            </div>
          )}
        </div>
      </section>

      {/* 6) Dados adicionais */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Dados adicionais</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Escolaridade</label>
            <CustomSelect value={toFormValue(form.education_level)} onChange={(v) => update('education_level', v || null)} placeholder="Selecione" options={EDUCATION_LEVEL_VALUES.map((v) => ({ value: v, label: v }))} />
          </div>
          <div>
            <label className={labelClass}>Ocupação</label>
            <input type="text" value={toFormValue(form.profession)} onChange={(e) => update('profession', e.target.value || null)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Nacionalidade</label>
            <input type="text" value={toFormValue(form.nationality)} onChange={(e) => update('nationality', e.target.value || null)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Naturalidade</label>
            <input type="text" value={toFormValue(form.birthplace)} onChange={(e) => update('birthplace', e.target.value || null)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Igreja de origem</label>
            <input type="text" value={toFormValue(form.origin_church)} onChange={(e) => update('origin_church', e.target.value || null)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Tipo sanguíneo</label>
            <CustomSelect value={toFormValue(form.blood_type)} onChange={(v) => update('blood_type', v || null)} placeholder="Selecione" options={BLOOD_TYPE_VALUES.map((v) => ({ value: v, label: v }))} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                Entrevistado por
                {readOnlyMetadata && <LockIcon size={12} className="text-slate-400" />}
              </label>
              {readOnlyMetadata && toFormValue(form.interviewed_by) && (
                <span className="flex items-center gap-1 text-[10px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg border border-blue-100 uppercase tracking-widest">
                  <ShieldCheck size={10} /> Validado
                </span>
              )}
            </div>
            {readOnlyMetadata ? (
              <div className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 text-slate-500 font-bold text-sm flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                {toFormValue(form.interviewed_by) || 'Pendente de entrevista'}
              </div>
            ) : (
              <input type="text" value={toFormValue(form.interviewed_by)} onChange={(e) => update('interviewed_by', e.target.value || null)} className={inputClass} />
            )}
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                Registrado por
                {readOnlyMetadata && <LockIcon size={12} className="text-slate-400" />}
              </label>
              {readOnlyMetadata && toFormValue(form.registered_by) && (
                <span className="flex items-center gap-1 text-[10px] font-black bg-amber-50 text-amber-700 px-2 py-0.5 rounded-lg border border-amber-100 uppercase tracking-widest">
                  <ShieldCheck size={10} /> Sistema
                </span>
              )}
            </div>
            {readOnlyMetadata ? (
              <div className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 text-slate-500 font-bold text-sm flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                {toFormValue(form.registered_by) || 'Registro automático'}
              </div>
            ) : (
              <input type="text" value={toFormValue(form.registered_by)} onChange={(e) => update('registered_by', e.target.value || null)} className={inputClass} />
            )}
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <Button type="submit" loading={loading}>
          Salvar
        </Button>
      </div>
    </form>
  )
}
