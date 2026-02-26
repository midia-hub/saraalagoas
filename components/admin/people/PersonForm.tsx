'use client'

import { useEffect, useState } from 'react'
import {
  Lock as LockIcon,
  ShieldCheck,
  User,
  Crown,
  FileText,
  MapPin,
  Church,
  BookOpen,
  Baby,
  ChevronDown,
  ChevronUp,
  X,
  Phone,
  Stethoscope,
  Info,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { CustomSelect } from '@/components/ui/CustomSelect'
import { DatePickerInput } from '@/components/ui/DatePickerInput'
import { CreatableCombobox } from '@/components/admin/CreatableCombobox'
import { MinistrySelector } from '@/components/admin/MinistrySelector'
import { adminFetchJson } from '@/lib/admin-client'
import type { Person, KidsLink } from '@/lib/types/person'
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
  KIDS_BATHROOM_USE_VALUES,
  KIDS_RELATIONSHIP_TYPE_VALUES,
} from '@/lib/types/person'

export type PersonFormData = Omit<Partial<Record<keyof Person, string | boolean | null>>, 'ministries'> & {
  ministries?: string[] | null
  kids_links?: KidsLink[]
}

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
  const initialMinistries = Array.isArray(initial?.ministries) ? initial!.ministries : []
  const [churches, setChurches] = useState<{ value: string; label: string }[]>([])
  const [form, setForm] = useState<PersonFormData>(() => {
    if (!initial) return {}
    return {
      ministries: initialMinistries,
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
  const EMPTY_CHILD_FORM = { child_name: '', birth_date: '', sex: '', relationship_type: 'Responsável', kids_father_name: '', kids_mother_name: '', kids_father_contact: '', kids_mother_contact: '', kids_guardian_kinship: '', kids_disability: null as string | null, kids_favorite_toy: '', kids_calming_mechanism: '', kids_food_restriction: null as string | null, kids_language_difficulty: null as string | null, kids_noise_sensitivity: null as string | null, kids_material_allergy: null as string | null, kids_medication: null as string | null, kids_health_issues: null as string | null, kids_bathroom_use: '' }
  const [kidsLinks, setKidsLinks] = useState<KidsLink[]>([])
  const [newChildForm, setNewChildForm] = useState<typeof EMPTY_CHILD_FORM>({ ...EMPTY_CHILD_FORM })
  const [expandedLinkIdx, setExpandedLinkIdx] = useState<number | null>(null)
  const [sexError, setSexError] = useState<string | null>(null)
  const [churchNameError, setChurchNameError] = useState<string | null>(null)
  const [mobilePhoneError, setMobilePhoneError] = useState<string | null>(null)
  const [hasMinistries, setHasMinistries] = useState<boolean | null>(
    initialMinistries.length > 0 ? true : false
  )

  useEffect(() => {
    adminFetchJson<{ items: { id: string; name: string }[] }>('/api/admin/consolidacao/churches')
      .then((data) => {
        const list = (data.items || []).map((c) => ({ value: c.name, label: c.name }))
        setChurches(list)
      })
      .catch(() => setChurches([]))
  }, [])

  const update = (key: keyof Person, value: string | boolean | null | string[]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  // Normaliza números de telefone: mantém apenas dígitos e, no blur, garante prefixo '55' quando fizer
  // sentido (quando usuário informou DDD + número). Exemplos:
  // 82999988877 -> 5582999988877
  // 082999988877 -> 5582999988877 (remove zeros à esquerda)
  // +55 (82) 99998-8877 -> 5582999988877
  function onlyDigits(v: string | undefined | null) {
    if (!v) return ''
    return String(v).replace(/\D+/g, '')
  }

  function normalizeMobilePhone(v: string | undefined | null) {
    const d = onlyDigits(v)
    if (!d) return ''
    let digits = d.replace(/^0+/, '')
    if (digits.startsWith('55')) return digits
    // Se o usuário informou DDD + número (>=10 dígitos), adiciona 55
    if (digits.length >= 10) return `55${digits}`
    // Se for apenas número curto (sem DDD), mantém como está (não força DDD)
    return digits
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

  useEffect(() => {
    if (!initial?.id) return
    adminFetchJson<{ items: KidsLink[] }>(`/api/admin/pessoas/${initial.id}/kids-links`)
      .then((data) => { setKidsLinks(Array.isArray(data.items) ? data.items : []) })
      .catch(() => { /* silently ignore */ })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial?.id])

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
    setChurchNameError(null)
    setMobilePhoneError(null)
    let hasError = false

    if (!toFormValue(form.sex)) {
      setSexError('Sexo é obrigatório.')
      hasError = true
    }

    if (!toFormValue(form.church_name)) {
      setChurchNameError('Igreja é obrigatória.')
      hasError = true
    }

    const normalizedMobile = normalizeMobilePhone(toFormValue(form.mobile_phone))
    if (!normalizedMobile) {
      setMobilePhoneError('Celular é obrigatório.')
      hasError = true
    }

    if (hasError) return

    await onSubmit({ ...form, mobile_phone: normalizedMobile, kids_links: kidsLinks })
  }

  const inputClass = 'w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/15 outline-none transition-all text-slate-800 placeholder:text-slate-400 text-sm'
  const labelClass = 'block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5'

  const isActive = toFormValue(form.church_situation) === 'Ativo'

  const handleToggleActive = () => {
    const next = isActive ? 'Inativo' : 'Ativo'
    update('church_situation', next)
    update('status_in_church', next)
  }

  return (
    <form onSubmit={handleSubmit} autoComplete="off" className="space-y-6 max-w-4xl">
      {/* Hidden fake fields to prevent password managers from offering credentials for this form */}
      <div style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }} aria-hidden="true">
        <input type="text" name="fake_username" autoComplete="username" tabIndex={-1} />
        <input type="password" name="fake_password" autoComplete="current-password" tabIndex={-1} />
        <input type="password" name="new_person_pass" autoComplete="new-password" tabIndex={-1} />
      </div>
      {/* Toggle Ativo/Inativo */}
      <div className={`flex items-center justify-between rounded-2xl border px-6 py-4 shadow-sm transition-colors ${isActive ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${isActive ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]' : 'bg-slate-300'}`} />
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status do membro</p>
            <p className={`text-sm font-bold ${isActive ? 'text-green-700' : 'text-slate-500'}`}>{isActive ? 'Ativo' : 'Inativo'}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleToggleActive}
          className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 ${isActive ? 'bg-green-500 focus:ring-green-500/30' : 'bg-slate-300 focus:ring-slate-300/30'}`}
        >
          <span
            className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${isActive ? 'translate-x-5' : 'translate-x-0'}`}
          />
        </button>
      </div>

      {/* 1) Identificação */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-visible">
        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-red-50/60 to-transparent flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#c62737]/10 flex items-center justify-center text-[#c62737] shrink-0">
            <User size={17} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">Identificação</h2>
            <p className="text-xs text-slate-400">Nome, sexo, nascimento e documentos pessoais</p>
          </div>
        </div>
        <div className="px-6 py-5">
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
              <label className={labelClass}>CPF</label>
              <input
                type="text"
                value={toFormValue(form.cpf)}
                onChange={(e) => {
                  let v = e.target.value.replace(/\D/g, '')
                  if (v.length > 11) v = v.slice(0, 11)
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
            <div>
              <label className={labelClass}>Documento de Identificação (RG)</label>
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
              <label className={labelClass}>Tipo sanguíneo</label>
              <CustomSelect value={toFormValue(form.blood_type)} onChange={(v) => update('blood_type', v || null)} placeholder="Selecione" options={BLOOD_TYPE_VALUES.map((v) => ({ value: v, label: v }))} />
            </div>
            <div>
              <label className={labelClass}>Necessidades especiais</label>
              <input type="text" value={toFormValue(form.special_needs)} onChange={(e) => update('special_needs', e.target.value || null)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Nacionalidade</label>
              <input type="text" value={toFormValue(form.nationality)} onChange={(e) => update('nationality', e.target.value || null)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Naturalidade</label>
              <input type="text" value={toFormValue(form.birthplace)} onChange={(e) => update('birthplace', e.target.value || null)} className={inputClass} />
            </div>
          </div>
        </div>
      </section>

      {/* 2) Contato e Endereço */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-visible">
        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50/60 to-transparent flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0">
            <Phone size={17} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">Contato e Endereço</h2>
            <p className="text-xs text-slate-400">Telefone, e-mail e localização</p>
          </div>
        </div>
        <div className="px-6 py-5 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Celular *</label>
              <input
                type="tel"
                inputMode="tel"
                placeholder="5511999998888"
                value={toFormValue(form.mobile_phone)}
                onChange={(e) => {
                  update('mobile_phone', e.target.value ? onlyDigits(e.target.value) : null)
                  setMobilePhoneError(null)
                }}
                onBlur={(e) => update('mobile_phone', normalizeMobilePhone(e.target.value) || null)}
                className={inputClass}
                required
              />
              {mobilePhoneError && <p className="mt-1 text-sm text-red-600">{mobilePhoneError}</p>}
            </div>
            <div>
              <label className={labelClass}>Telefone</label>
              <input type="tel" value={toFormValue(form.phone)} onChange={(e) => update('phone', e.target.value || null)} className={inputClass} />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>E-mail</label>
              {readOnlyEmail ? (
                <div className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-slate-500 text-sm flex items-center gap-3">
                  <LockIcon size={14} className="text-slate-400" />
                  {toFormValue(form.email) || 'Sem e-mail'}
                </div>
              ) : (
                <input
                  type="email"
                  name="person_email"
                  autoComplete="off"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  value={toFormValue(form.email)}
                  onChange={(e) => update('email', e.target.value || null)}
                  className={inputClass}
                />
              )}
            </div>
          </div>
          <div className="border-t border-slate-100 pt-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4 flex items-center gap-2">
              <MapPin size={12} /> Endereço
            </p>
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
              <div className="md:col-span-2">
                <label className={labelClass}>Logradouro</label>
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
              <div>
                <label className={labelClass}>Bairro</label>
                <input type="text" value={toFormValue(form.neighborhood)} onChange={(e) => update('neighborhood', e.target.value || null)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Cidade</label>
                <input type="text" value={toFormValue(form.city)} onChange={(e) => update('city', e.target.value || null)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Estado (UF)</label>
                <input type="text" value={toFormValue(form.state)} onChange={(e) => update('state', e.target.value || null)} className={inputClass} maxLength={2} placeholder="UF" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3) Vida pessoal */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-visible">
        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-50/60 to-transparent flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
            <FileText size={17} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">Vida pessoal</h2>
            <p className="text-xs text-slate-400">Estado civil, família, formação e ocupação</p>
          </div>
        </div>
        <div className="px-6 py-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    Informe o sexo na seção Identificação para selecionar o cônjuge (homem → mulher, mulher → homem).
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
              <label className={labelClass}>Escolaridade</label>
              <CustomSelect value={toFormValue(form.education_level)} onChange={(v) => update('education_level', v || null)} placeholder="Selecione" options={EDUCATION_LEVEL_VALUES.map((v) => ({ value: v, label: v }))} />
            </div>
            <div>
              <label className={labelClass}>Ocupação</label>
              <input type="text" value={toFormValue(form.profession)} onChange={(e) => update('profession', e.target.value || null)} className={inputClass} />
            </div>
          </div>
        </div>
      </section>

      {/* 4) Vida na Igreja */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-visible">
        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-amber-50/60 to-transparent flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 shrink-0">
            <Church size={17} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">Vida na Igreja</h2>
            <p className="text-xs text-slate-400">Entrada, conversão, batismo e vínculo eclesiástico</p>
          </div>
        </div>
        <div className="px-6 py-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Perfil na igreja *</label>
              <CustomSelect value={toFormValue(form.church_profile)} onChange={(v) => update('church_profile', v)} placeholder="Selecione" options={CHURCH_PROFILE_VALUES.map((v) => ({ value: v, label: v }))} />
            </div>
            <div>
              <label className={labelClass}>Igreja *</label>
              <CustomSelect
                value={toFormValue(form.church_name)}
                onChange={(v) => {
                  update('church_name', v || null)
                  setChurchNameError(null)
                }}
                placeholder="Selecione a igreja"
                options={churches}
                required
              />
              {churchNameError && <p className="mt-1 text-sm text-red-600">{churchNameError}</p>}
            </div>
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
              <label className={labelClass}>Igreja de origem</label>
              <input type="text" value={toFormValue(form.origin_church)} onChange={(e) => update('origin_church', e.target.value || null)} className={inputClass} />
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
              <div>
                <label className={labelClass}>Data do batismo</label>
                <DatePickerInput
                  value={toFormValue(form.baptism_date)}
                  onChange={(v: string) => update('baptism_date', v || null)}
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 5) Liderança e Ministério */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-visible">
        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-purple-50/60 to-transparent flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center text-purple-500 shrink-0">
            <Crown size={17} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">Liderança e Ministério</h2>
            <p className="text-xs text-slate-400">Função, cargos e participação ministerial</p>
          </div>
        </div>
        <div className="px-6 py-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className={labelClass}>Função na igreja</label>
              {readOnlyMetadata ? (
                <div className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-slate-500 text-sm flex items-center gap-3">
                  <LockIcon size={14} className="text-slate-400" />
                  {toFormValue(form.church_role) || 'Nenhuma função atribuída'}
                </div>
              ) : (
                <CustomSelect value={toFormValue(form.church_role)} onChange={(v) => update('church_role', v || null)} placeholder="Selecione" options={CHURCH_ROLE_VALUES.map((v) => ({ value: v, label: v }))} />
              )}
            </div>
            <div>
              <label className={labelClass}>É líder?</label>
              {readOnlyMetadata ? (
                <div className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-slate-500 text-sm flex items-center gap-3">
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
                <div className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-slate-500 text-sm flex items-center gap-3">
                  <LockIcon size={14} className="text-slate-400" />
                  {form.is_pastor === true ? 'Sim' : 'Não'}
                </div>
              ) : (
                <CustomSelect value={form.is_pastor === true ? 'true' : form.is_pastor === false ? 'false' : ''} onChange={(v) => update('is_pastor', v === '' ? null : v === 'true')} placeholder="Não informado" options={[{ value: 'true', label: 'Sim' }, { value: 'false', label: 'Não' }]} />
              )}
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Líder direto</label>
              {readOnlyMetadata ? (
                <div className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-slate-500 text-sm flex items-center gap-3">
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
            <div className="md:col-span-2">
              <label className={labelClass}>Participa de algum ministério?</label>
              {readOnlyMetadata ? (
                <div className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-slate-500 text-sm flex items-center gap-3">
                  <LockIcon size={14} className="text-slate-400" />
                  {Array.isArray(form.ministries) && form.ministries.length > 0
                    ? form.ministries.join(', ')
                    : 'Não participa de ministérios'}
                </div>
              ) : (
                <div className="space-y-3">
                  <CustomSelect
                    value={hasMinistries === true ? 'true' : hasMinistries === false ? 'false' : ''}
                    onChange={(v) => {
                      if (v === 'true') {
                        setHasMinistries(true)
                      } else if (v === 'false') {
                        setHasMinistries(false)
                        update('ministries', [])
                      } else {
                        setHasMinistries(null)
                      }
                    }}
                    placeholder="Selecione"
                    options={[
                      { value: 'true', label: 'Sim' },
                      { value: 'false', label: 'Não' },
                    ]}
                  />
                  {hasMinistries === true && (
                    <MinistrySelector
                      selected={Array.isArray(form.ministries) ? form.ministries : []}
                      onChange={(values) => update('ministries', values)}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 6) Registros */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-visible">
        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-transparent flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
            <ShieldCheck size={17} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">Registros</h2>
            <p className="text-xs text-slate-400">Responsáveis pelo cadastro e entrevista</p>
          </div>
        </div>
        <div className="px-6 py-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <div className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-slate-500 text-sm flex items-center gap-3">
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
                <div className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-slate-500 text-sm flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  {toFormValue(form.registered_by) || 'Registro automático'}
                </div>
              ) : (
                <input type="text" value={toFormValue(form.registered_by)} onChange={(e) => update('registered_by', e.target.value || null)} className={inputClass} />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 7) Crianças vinculadas (Sara Kids) */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-visible">
        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-pink-50/60 to-transparent flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-pink-100 flex items-center justify-center text-pink-500 shrink-0">
            <Baby size={17} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">Crianças vinculadas</h2>
            <p className="text-xs text-slate-400">Sara Kids � vínculos familiares e dados de saúde</p>
          </div>
        </div>
        <div className="px-6 py-5">

        {/* Lista de vínculos atuais */}
        {kidsLinks.length > 0 ? (
          <ul className="space-y-3 mb-6">
            {kidsLinks.map((link, idx) => (
              <li key={link.child_id ?? `new-${idx}`} className="rounded-xl border border-pink-200 bg-pink-50/40 overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-xl bg-pink-100 flex items-center justify-center text-pink-400 shrink-0">
                    <Baby size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {link.child_name}
                      {!link.child_id && <span className="ml-2 text-[10px] font-bold uppercase tracking-widest bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md">novo</span>}
                    </p>
                    <p className="text-xs text-slate-400">{link.relationship_type}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {link.child_id && (
                      <a href={`/admin/pessoas/${link.child_id}`} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-[#c62737] hover:underline font-medium px-2 py-1 rounded-lg border border-[#c62737]/20 bg-white hover:bg-[#c62737]/5 transition-colors">
                        Ver cadastro
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => setExpandedLinkIdx(expandedLinkIdx === idx ? null : idx)}
                      className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-colors font-medium ${expandedLinkIdx === idx ? 'bg-pink-100 border-pink-300 text-pink-700' : 'bg-white border-slate-200 text-slate-500 hover:text-slate-700'}`}
                    >
                      <Stethoscope size={12} />
                      {expandedLinkIdx === idx ? 'Fechar' : 'Saúde'}
                      {expandedLinkIdx === idx ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setKidsLinks((prev) => prev.filter((_, i) => i !== idx)); if (expandedLinkIdx === idx) setExpandedLinkIdx(null) }}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 border border-slate-200 bg-white transition-colors"
                      title="Remover vínculo"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
                {/* Editar tipo de vínculo inline */}
                <div className="px-4 pb-3">
                  <div className="w-48">
                    <CustomSelect
                      value={link.relationship_type}
                      onChange={(v) => {
                        const next = [...kidsLinks]
                        next[idx] = { ...next[idx], relationship_type: v || 'Responsável' }
                        setKidsLinks(next)
                      }}
                      placeholder="Tipo de vínculo"
                      options={KIDS_RELATIONSHIP_TYPE_VALUES.map((v) => ({ value: v, label: v }))}
                    />
                  </div>
                </div>
                {expandedLinkIdx === idx && (
                  <div className="border-t border-pink-100 bg-white/80 px-5 py-5">
                    <div className="flex items-center gap-2 mb-4 bg-pink-50 rounded-xl px-3 py-2.5 border border-pink-100">
                      <Info size={13} className="text-pink-400 shrink-0" />
                      <p className="text-xs text-pink-600">Dados de uso interno do ministério infantil � tratados com sigilo.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {link.relationship_type === 'Pai' && (
                        <div className="md:col-span-2">
                          <label className={labelClass}>Nome da mãe</label>
                          <input type="text" value={link.kids_mother_name ?? ''} onChange={e => { const n=[...kidsLinks]; n[idx]={...n[idx],kids_mother_name:e.target.value||null}; setKidsLinks(n) }} className={inputClass} placeholder="Informe o nome da mãe" />
                        </div>
                      )}
                      {link.relationship_type === 'Pai' && (
                        <div className="md:col-span-2">
                          <label className={labelClass}>Contato da mãe</label>
                          <input type="tel" value={link.kids_mother_contact ?? ''} onChange={e => { const n=[...kidsLinks]; n[idx]={...n[idx],kids_mother_contact:e.target.value||null}; setKidsLinks(n) }} className={inputClass} placeholder="(00) 00000-0000" />
                        </div>
                      )}
                      {link.relationship_type === 'Mãe' && (
                        <div className="md:col-span-2">
                          <label className={labelClass}>Nome do pai</label>
                          <input type="text" value={link.kids_father_name ?? ''} onChange={e => { const n=[...kidsLinks]; n[idx]={...n[idx],kids_father_name:e.target.value||null}; setKidsLinks(n) }} className={inputClass} placeholder="Informe o nome do pai" />
                        </div>
                      )}
                      {link.relationship_type === 'Mãe' && (
                        <div className="md:col-span-2">
                          <label className={labelClass}>Contato do pai</label>
                          <input type="tel" value={link.kids_father_contact ?? ''} onChange={e => { const n=[...kidsLinks]; n[idx]={...n[idx],kids_father_contact:e.target.value||null}; setKidsLinks(n) }} className={inputClass} placeholder="(00) 00000-0000" />
                        </div>
                      )}
                      {link.relationship_type === 'Responsável' && (
                        <>
                          <div className="md:col-span-2">
                            <label className={labelClass}>Qual o parentesco com a criança?</label>
                            <input type="text" value={link.kids_guardian_kinship ?? ''} onChange={e => { const n=[...kidsLinks]; n[idx]={...n[idx],kids_guardian_kinship:e.target.value||null}; setKidsLinks(n) }} className={inputClass} placeholder="Ex.: avó, tia, padrasto" />
                          </div>
                          <div>
                            <label className={labelClass}>Nome do pai</label>
                            <input type="text" value={link.kids_father_name ?? ''} onChange={e => { const n=[...kidsLinks]; n[idx]={...n[idx],kids_father_name:e.target.value||null}; setKidsLinks(n) }} className={inputClass} placeholder="Informe o nome do pai" />
                          </div>
                          <div>
                            <label className={labelClass}>Nome da mãe</label>
                            <input type="text" value={link.kids_mother_name ?? ''} onChange={e => { const n=[...kidsLinks]; n[idx]={...n[idx],kids_mother_name:e.target.value||null}; setKidsLinks(n) }} className={inputClass} placeholder="Informe o nome da mãe" />
                          </div>
                          <div>
                            <label className={labelClass}>Contato do pai</label>
                            <input type="tel" value={link.kids_father_contact ?? ''} onChange={e => { const n=[...kidsLinks]; n[idx]={...n[idx],kids_father_contact:e.target.value||null}; setKidsLinks(n) }} className={inputClass} placeholder="(00) 00000-0000" />
                          </div>
                          <div>
                            <label className={labelClass}>Contato da mãe</label>
                            <input type="tel" value={link.kids_mother_contact ?? ''} onChange={e => { const n=[...kidsLinks]; n[idx]={...n[idx],kids_mother_contact:e.target.value||null}; setKidsLinks(n) }} className={inputClass} placeholder="(00) 00000-0000" />
                          </div>
                        </>
                      )}
                      {(link.relationship_type === 'Pai' || link.relationship_type === 'Mãe') && (
                        <div className="md:col-span-2 flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5">
                          <Phone size={12} className="text-blue-400 shrink-0" />
                          <p className="text-xs text-blue-600">O contato do {link.relationship_type === 'Pai' ? 'pai' : 'da mãe'} é o telefone já cadastrado no perfil deste adulto.</p>
                        </div>
                      )}
                      <div className="md:col-span-2">
                        <label className={labelClass}>Possui deficiência?</label>
                        <CustomSelect
                          value={link.kids_disability !== null && link.kids_disability !== undefined ? 'true' : 'false'}
                          onChange={v => { const n=[...kidsLinks]; n[idx]={...n[idx],kids_disability:v==='true'?(n[idx].kids_disability ?? ''):null}; setKidsLinks(n) }}
                          placeholder="Selecione"
                          options={[{ value: 'true', label: 'Sim' }, { value: 'false', label: 'Não' }]}
                        />
                        {link.kids_disability !== null && link.kids_disability !== undefined && (
                          <input type="text" value={link.kids_disability ?? ''} onChange={e => { const n=[...kidsLinks]; n[idx]={...n[idx],kids_disability:e.target.value}; setKidsLinks(n) }} className={`${inputClass} mt-2`} placeholder="Ex.: Autismo, TDAH, Down, PC" />
                        )}
                      </div>
                      <div>
                        <label className={labelClass}>Brincadeira ou brinquedo favorito</label>
                        <input type="text" value={link.kids_favorite_toy ?? ''} onChange={e => { const n=[...kidsLinks]; n[idx]={...n[idx],kids_favorite_toy:e.target.value||null}; setKidsLinks(n) }} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Mecanismo para acalmá-la</label>
                        <input type="text" value={link.kids_calming_mechanism ?? ''} onChange={e => { const n=[...kidsLinks]; n[idx]={...n[idx],kids_calming_mechanism:e.target.value||null}; setKidsLinks(n) }} className={inputClass} placeholder="Ex.: balançá-lo, ofertar água" />
                      </div>
                      <div>
                        <label className={labelClass}>Restrição ou alergia alimentar?</label>
                        <CustomSelect
                          value={link.kids_food_restriction !== null && link.kids_food_restriction !== undefined ? 'true' : 'false'}
                          onChange={v => { const n=[...kidsLinks]; n[idx]={...n[idx],kids_food_restriction:v==='true'?(n[idx].kids_food_restriction ?? ''):null}; setKidsLinks(n) }}
                          placeholder="Selecione"
                          options={[{ value: 'true', label: 'Sim' }, { value: 'false', label: 'Não' }]}
                        />
                        {link.kids_food_restriction !== null && link.kids_food_restriction !== undefined && (
                          <input type="text" value={link.kids_food_restriction ?? ''} onChange={e => { const n=[...kidsLinks]; n[idx]={...n[idx],kids_food_restriction:e.target.value}; setKidsLinks(n) }} className={`${inputClass} mt-2`} placeholder="Qual restrição/alergia?" />
                        )}
                      </div>
                      <div>
                        <label className={labelClass}>Dificuldade de linguagem?</label>
                        <CustomSelect
                          value={link.kids_language_difficulty !== null && link.kids_language_difficulty !== undefined ? 'true' : 'false'}
                          onChange={v => { const n=[...kidsLinks]; n[idx]={...n[idx],kids_language_difficulty:v==='true'?(n[idx].kids_language_difficulty ?? ''):null}; setKidsLinks(n) }}
                          placeholder="Selecione"
                          options={[{ value: 'true', label: 'Sim' }, { value: 'false', label: 'Não' }]}
                        />
                        {link.kids_language_difficulty !== null && link.kids_language_difficulty !== undefined && (
                          <input type="text" value={link.kids_language_difficulty ?? ''} onChange={e => { const n=[...kidsLinks]; n[idx]={...n[idx],kids_language_difficulty:e.target.value}; setKidsLinks(n) }} className={`${inputClass} mt-2`} placeholder="Qual dificuldade?" />
                        )}
                      </div>
                      <div>
                        <label className={labelClass}>Sensível a barulhos altos?</label>
                        <CustomSelect
                          value={link.kids_noise_sensitivity !== null && link.kids_noise_sensitivity !== undefined ? 'true' : 'false'}
                          onChange={v => { const n=[...kidsLinks]; n[idx]={...n[idx],kids_noise_sensitivity:v==='true'?(n[idx].kids_noise_sensitivity ?? ''):null}; setKidsLinks(n) }}
                          placeholder="Selecione"
                          options={[{ value: 'true', label: 'Sim' }, { value: 'false', label: 'Não' }]}
                        />
                        {link.kids_noise_sensitivity !== null && link.kids_noise_sensitivity !== undefined && (
                          <input type="text" value={link.kids_noise_sensitivity ?? ''} onChange={e => { const n=[...kidsLinks]; n[idx]={...n[idx],kids_noise_sensitivity:e.target.value}; setKidsLinks(n) }} className={`${inputClass} mt-2`} placeholder="Quais barulhos?" />
                        )}
                      </div>
                      <div>
                        <label className={labelClass}>Alergia a algum material?</label>
                        <CustomSelect
                          value={link.kids_material_allergy !== null && link.kids_material_allergy !== undefined ? 'true' : 'false'}
                          onChange={v => { const n=[...kidsLinks]; n[idx]={...n[idx],kids_material_allergy:v==='true'?(n[idx].kids_material_allergy ?? ''):null}; setKidsLinks(n) }}
                          placeholder="Selecione"
                          options={[{ value: 'true', label: 'Sim' }, { value: 'false', label: 'Não' }]}
                        />
                        {link.kids_material_allergy !== null && link.kids_material_allergy !== undefined && (
                          <input type="text" value={link.kids_material_allergy ?? ''} onChange={e => { const n=[...kidsLinks]; n[idx]={...n[idx],kids_material_allergy:e.target.value}; setKidsLinks(n) }} className={`${inputClass} mt-2`} placeholder="Qual material?" />
                        )}
                      </div>
                      <div>
                        <label className={labelClass}>Faz uso de medicamento?</label>
                        <CustomSelect
                          value={link.kids_medication !== null && link.kids_medication !== undefined ? 'true' : 'false'}
                          onChange={v => { const n=[...kidsLinks]; n[idx]={...n[idx],kids_medication:v==='true'?(n[idx].kids_medication ?? ''):null}; setKidsLinks(n) }}
                          placeholder="Selecione"
                          options={[{ value: 'true', label: 'Sim' }, { value: 'false', label: 'Não' }]}
                        />
                        {link.kids_medication !== null && link.kids_medication !== undefined && (
                          <input type="text" value={link.kids_medication ?? ''} onChange={e => { const n=[...kidsLinks]; n[idx]={...n[idx],kids_medication:e.target.value}; setKidsLinks(n) }} className={`${inputClass} mt-2`} placeholder="Qual medicamento?" />
                        )}
                      </div>
                      <div>
                        <label className={labelClass}>Tem questão de saúde?</label>
                        <CustomSelect
                          value={link.kids_health_issues !== null && link.kids_health_issues !== undefined ? 'true' : 'false'}
                          onChange={v => { const n=[...kidsLinks]; n[idx]={...n[idx],kids_health_issues:v==='true'?(n[idx].kids_health_issues ?? ''):null}; setKidsLinks(n) }}
                          placeholder="Selecione"
                          options={[{ value: 'true', label: 'Sim' }, { value: 'false', label: 'Não' }]}
                        />
                        {link.kids_health_issues !== null && link.kids_health_issues !== undefined && (
                          <input type="text" value={link.kids_health_issues ?? ''} onChange={e => { const n=[...kidsLinks]; n[idx]={...n[idx],kids_health_issues:e.target.value}; setKidsLinks(n) }} className={`${inputClass} mt-2`} placeholder="Qual questão de saúde?" />
                        )}
                      </div>
                      <div className="md:col-span-2">
                        <label className={labelClass}>Faz uso do banheiro?</label>
                        <CustomSelect
                          value={link.kids_bathroom_use ?? ''}
                          onChange={v => { const n=[...kidsLinks]; n[idx]={...n[idx],kids_bathroom_use:v||null}; setKidsLinks(n) }}
                          placeholder="Selecione"
                          options={KIDS_BATHROOM_USE_VALUES.map(v => ({ value: v, label: v }))}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-pink-50 flex items-center justify-center text-pink-300 mb-3">
              <Baby size={22} />
            </div>
            <p className="text-sm font-medium text-slate-500">Nenhuma criança vinculada</p>
            <p className="text-xs text-slate-400 mt-0.5">Cadastre abaixo para criar um vínculo familiar</p>
          </div>
        )}

        {/* Cadastrar nova criança */}
        <div className="rounded-2xl border-2 border-dashed border-pink-200 bg-pink-50/30 p-5 mt-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-xl bg-pink-100 flex items-center justify-center text-pink-500">
              <Baby size={14} />
            </div>
            <h3 className="text-sm font-bold text-slate-700">Cadastrar nova criança</h3>
          </div>

          {/* Dados básicos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div className="md:col-span-2">
              <label className={labelClass}>Nome completo <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={newChildForm.child_name}
                onChange={e => setNewChildForm(p => ({ ...p, child_name: e.target.value }))}
                className={inputClass}
                placeholder="Nome da criança"
              />
            </div>
            <div>
              <label className={labelClass}>Data de nascimento</label>
              <DatePickerInput
                value={newChildForm.birth_date}
                onChange={v => setNewChildForm(p => ({ ...p, birth_date: v || '' }))}
              />
            </div>
            <div>
              <label className={labelClass}>Sexo</label>
              <CustomSelect
                value={newChildForm.sex}
                onChange={v => setNewChildForm(p => ({ ...p, sex: v || '' }))}
                placeholder="Selecione"
                options={SEX_VALUES.map(v => ({ value: v, label: v }))}
              />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Tipo de vínculo</label>
              <CustomSelect
                value={newChildForm.relationship_type}
                onChange={v => setNewChildForm(p => ({ ...p, relationship_type: v || 'Responsável' }))}
                placeholder="Selecione"
                options={KIDS_RELATIONSHIP_TYPE_VALUES.map(v => ({ value: v, label: v }))}
              />
            </div>
            {newChildForm.relationship_type === 'Pai' && (
              <div className="md:col-span-2">
                <label className={labelClass}>Nome da mãe</label>
                <input
                  type="text"
                  value={newChildForm.kids_mother_name}
                  onChange={e => setNewChildForm(p => ({ ...p, kids_mother_name: e.target.value }))}
                  className={inputClass}
                  placeholder="Informe o nome da mãe"
                />
              </div>
            )}
            {newChildForm.relationship_type === 'Pai' && (
              <div className="md:col-span-2">
                <label className={labelClass}>Contato da mãe</label>
                <input
                  type="tel"
                  value={newChildForm.kids_mother_contact}
                  onChange={e => setNewChildForm(p => ({ ...p, kids_mother_contact: e.target.value }))}
                  className={inputClass}
                  placeholder="(00) 00000-0000"
                />
              </div>
            )}
            {newChildForm.relationship_type === 'Mãe' && (
              <div className="md:col-span-2">
                <label className={labelClass}>Nome do pai</label>
                <input
                  type="text"
                  value={newChildForm.kids_father_name}
                  onChange={e => setNewChildForm(p => ({ ...p, kids_father_name: e.target.value }))}
                  className={inputClass}
                  placeholder="Informe o nome do pai"
                />
              </div>
            )}
            {newChildForm.relationship_type === 'Mãe' && (
              <div className="md:col-span-2">
                <label className={labelClass}>Contato do pai</label>
                <input
                  type="tel"
                  value={newChildForm.kids_father_contact}
                  onChange={e => setNewChildForm(p => ({ ...p, kids_father_contact: e.target.value }))}
                  className={inputClass}
                  placeholder="(00) 00000-0000"
                />
              </div>
            )}
            {newChildForm.relationship_type === 'Responsável' && (
              <>
                <div className="md:col-span-2">
                  <label className={labelClass}>Qual o parentesco com a criança?</label>
                  <input
                    type="text"
                    value={newChildForm.kids_guardian_kinship}
                    onChange={e => setNewChildForm(p => ({ ...p, kids_guardian_kinship: e.target.value }))}
                    className={inputClass}
                    placeholder="Ex.: avó, tia, padrasto"
                  />
                </div>
                <div>
                  <label className={labelClass}>Nome do pai</label>
                  <input
                    type="text"
                    value={newChildForm.kids_father_name}
                    onChange={e => setNewChildForm(p => ({ ...p, kids_father_name: e.target.value }))}
                    className={inputClass}
                    placeholder="Informe o nome do pai"
                  />
                </div>
                <div>
                  <label className={labelClass}>Nome da mãe</label>
                  <input
                    type="text"
                    value={newChildForm.kids_mother_name}
                    onChange={e => setNewChildForm(p => ({ ...p, kids_mother_name: e.target.value }))}
                    className={inputClass}
                    placeholder="Informe o nome da mãe"
                  />
                </div>
                <div>
                  <label className={labelClass}>Contato do pai</label>
                  <input
                    type="tel"
                    value={newChildForm.kids_father_contact}
                    onChange={e => setNewChildForm(p => ({ ...p, kids_father_contact: e.target.value }))}
                    className={inputClass}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div>
                  <label className={labelClass}>Contato da mãe</label>
                  <input
                    type="tel"
                    value={newChildForm.kids_mother_contact}
                    onChange={e => setNewChildForm(p => ({ ...p, kids_mother_contact: e.target.value }))}
                    className={inputClass}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </>
            )}
            {(newChildForm.relationship_type === 'Pai' || newChildForm.relationship_type === 'Mãe') && (
              <div className="md:col-span-2 flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5">
                <Phone size={12} className="text-blue-400 shrink-0" />
                <p className="text-xs text-blue-600">O contato do {newChildForm.relationship_type === 'Pai' ? 'pai' : 'da mãe'} será o telefone já cadastrado no perfil deste adulto.</p>
              </div>
            )}
          </div>

          {/* Saúde, Comportamento e Cuidados */}
          <div className="border-t border-pink-200/60 pt-5 mt-5">
            <div className="flex items-center gap-2 mb-4">
              <Stethoscope size={13} className="text-pink-400" />
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Saúde, Comportamento e Cuidados</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className={labelClass}>Possui deficiência?</label>
                <CustomSelect
                  value={newChildForm.kids_disability !== null ? 'true' : 'false'}
                  onChange={v => setNewChildForm(p => ({ ...p, kids_disability: v === 'true' ? (p.kids_disability ?? '') : null }))}
                  placeholder="Selecione"
                  options={[{ value: 'true', label: 'Sim' }, { value: 'false', label: 'Não' }]}
                />
                {newChildForm.kids_disability !== null && (
                  <input type="text" value={newChildForm.kids_disability ?? ''} onChange={e => setNewChildForm(p => ({...p, kids_disability: e.target.value}))} className={`${inputClass} mt-2`} placeholder="Ex.: Autismo, TDAH, Down, PC" />
                )}
              </div>
              <div>
                <label className={labelClass}>Brincadeira ou brinquedo favorito</label>
                <input type="text" value={newChildForm.kids_favorite_toy} onChange={e => setNewChildForm(p => ({...p, kids_favorite_toy: e.target.value}))} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Mecanismo para acalmá-la</label>
                <input type="text" value={newChildForm.kids_calming_mechanism} onChange={e => setNewChildForm(p => ({...p, kids_calming_mechanism: e.target.value}))} className={inputClass} placeholder="Ex.: balançá-lo, ofertar água" />
              </div>
              <div>
                <label className={labelClass}>Restrição ou alergia alimentar?</label>
                <CustomSelect
                  value={newChildForm.kids_food_restriction !== null ? 'true' : 'false'}
                  onChange={v => setNewChildForm(p => ({ ...p, kids_food_restriction: v === 'true' ? (p.kids_food_restriction ?? '') : null }))}
                  placeholder="Selecione"
                  options={[{ value: 'true', label: 'Sim' }, { value: 'false', label: 'Não' }]}
                />
                {newChildForm.kids_food_restriction !== null && (
                  <input type="text" value={newChildForm.kids_food_restriction ?? ''} onChange={e => setNewChildForm(p => ({...p, kids_food_restriction: e.target.value}))} className={`${inputClass} mt-2`} placeholder="Qual restrição/alergia?" />
                )}
              </div>
              <div>
                <label className={labelClass}>Dificuldade de linguagem?</label>
                <CustomSelect
                  value={newChildForm.kids_language_difficulty !== null ? 'true' : 'false'}
                  onChange={v => setNewChildForm(p => ({ ...p, kids_language_difficulty: v === 'true' ? (p.kids_language_difficulty ?? '') : null }))}
                  placeholder="Selecione"
                  options={[{ value: 'true', label: 'Sim' }, { value: 'false', label: 'Não' }]}
                />
                {newChildForm.kids_language_difficulty !== null && (
                  <input type="text" value={newChildForm.kids_language_difficulty ?? ''} onChange={e => setNewChildForm(p => ({...p, kids_language_difficulty: e.target.value}))} className={`${inputClass} mt-2`} placeholder="Qual dificuldade?" />
                )}
              </div>
              <div>
                <label className={labelClass}>Sensível a barulhos altos?</label>
                <CustomSelect
                  value={newChildForm.kids_noise_sensitivity !== null ? 'true' : 'false'}
                  onChange={v => setNewChildForm(p => ({ ...p, kids_noise_sensitivity: v === 'true' ? (p.kids_noise_sensitivity ?? '') : null }))}
                  placeholder="Selecione"
                  options={[{ value: 'true', label: 'Sim' }, { value: 'false', label: 'Não' }]}
                />
                {newChildForm.kids_noise_sensitivity !== null && (
                  <input type="text" value={newChildForm.kids_noise_sensitivity ?? ''} onChange={e => setNewChildForm(p => ({...p, kids_noise_sensitivity: e.target.value}))} className={`${inputClass} mt-2`} placeholder="Quais barulhos?" />
                )}
              </div>
              <div>
                <label className={labelClass}>Alergia a algum material?</label>
                <CustomSelect
                  value={newChildForm.kids_material_allergy !== null ? 'true' : 'false'}
                  onChange={v => setNewChildForm(p => ({ ...p, kids_material_allergy: v === 'true' ? (p.kids_material_allergy ?? '') : null }))}
                  placeholder="Selecione"
                  options={[{ value: 'true', label: 'Sim' }, { value: 'false', label: 'Não' }]}
                />
                {newChildForm.kids_material_allergy !== null && (
                  <input type="text" value={newChildForm.kids_material_allergy ?? ''} onChange={e => setNewChildForm(p => ({...p, kids_material_allergy: e.target.value}))} className={`${inputClass} mt-2`} placeholder="Qual material?" />
                )}
              </div>
              <div>
                <label className={labelClass}>Faz uso de medicamento?</label>
                <CustomSelect
                  value={newChildForm.kids_medication !== null ? 'true' : 'false'}
                  onChange={v => setNewChildForm(p => ({ ...p, kids_medication: v === 'true' ? (p.kids_medication ?? '') : null }))}
                  placeholder="Selecione"
                  options={[{ value: 'true', label: 'Sim' }, { value: 'false', label: 'Não' }]}
                />
                {newChildForm.kids_medication !== null && (
                  <input type="text" value={newChildForm.kids_medication ?? ''} onChange={e => setNewChildForm(p => ({...p, kids_medication: e.target.value}))} className={`${inputClass} mt-2`} placeholder="Qual medicamento?" />
                )}
              </div>
              <div>
                <label className={labelClass}>Tem questão de saúde?</label>
                <CustomSelect
                  value={newChildForm.kids_health_issues !== null ? 'true' : 'false'}
                  onChange={v => setNewChildForm(p => ({ ...p, kids_health_issues: v === 'true' ? (p.kids_health_issues ?? '') : null }))}
                  placeholder="Selecione"
                  options={[{ value: 'true', label: 'Sim' }, { value: 'false', label: 'Não' }]}
                />
                {newChildForm.kids_health_issues !== null && (
                  <input type="text" value={newChildForm.kids_health_issues ?? ''} onChange={e => setNewChildForm(p => ({...p, kids_health_issues: e.target.value}))} className={`${inputClass} mt-2`} placeholder="Qual questão de saúde?" />
                )}
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Faz uso do banheiro?</label>
                <CustomSelect
                  value={newChildForm.kids_bathroom_use}
                  onChange={v => setNewChildForm(p => ({...p, kids_bathroom_use: v || ''}))}
                  placeholder="Selecione"
                  options={KIDS_BATHROOM_USE_VALUES.map(v => ({ value: v, label: v }))}
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={!newChildForm.child_name.trim()}
            onClick={() => {
              if (!newChildForm.child_name.trim()) return
              const f = newChildForm
              const adultContact = toFormValue(form.mobile_phone) || toFormValue(form.phone) || ''
              setKidsLinks(prev => [
                ...prev,
                {
                  child_id: null,
                  child_name: f.child_name.trim(),
                  birth_date: f.birth_date || null,
                  sex: f.sex || null,
                  relationship_type: f.relationship_type || 'Responsável',
                  kids_father_name: f.kids_father_name || null,
                  kids_mother_name: f.kids_mother_name || null,
                  kids_father_contact: (f.relationship_type === 'Pai' ? adultContact : f.kids_father_contact) || null,
                  kids_mother_contact: (f.relationship_type === 'Mãe' ? adultContact : f.kids_mother_contact) || null,
                  kids_guardian_kinship: f.kids_guardian_kinship || null,
                  kids_disability: f.kids_disability ?? null,
                  kids_favorite_toy: f.kids_favorite_toy || null,
                  kids_calming_mechanism: f.kids_calming_mechanism || null,
                  kids_food_restriction: f.kids_food_restriction ?? null,
                  kids_language_difficulty: f.kids_language_difficulty ?? null,
                  kids_noise_sensitivity: f.kids_noise_sensitivity ?? null,
                  kids_material_allergy: f.kids_material_allergy ?? null,
                  kids_medication: f.kids_medication ?? null,
                  kids_health_issues: f.kids_health_issues ?? null,
                  kids_bathroom_use: f.kids_bathroom_use || null,
                },
              ])
              setNewChildForm({ ...EMPTY_CHILD_FORM })
            }}
            className="mt-5 w-full py-2.5 rounded-xl bg-pink-600 text-white text-sm font-bold hover:bg-pink-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            <Baby size={15} />
            Adicionar criança ao cadastro
          </button>
        </div>
        </div>
      </section>


      <div className="flex justify-end pt-2 pb-4">
        <Button type="submit" loading={loading} className="px-8 py-2.5 text-sm font-bold">
          Salvar alterações
        </Button>
      </div>
    </form>
  )
}


