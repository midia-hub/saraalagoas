'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { CustomSelect } from '@/components/ui/CustomSelect'
import type { Person } from '@/lib/types/person'
import {
  CHURCH_PROFILE_VALUES,
  CHURCH_SITUATION_VALUES,
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
}

function toFormValue(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  return String(v)
}

export function PersonForm({ initial, onSubmit, loading = false }: PersonFormProps) {
  const [form, setForm] = useState<PersonFormData>(() => {
    if (!initial) return {}
    return {
      full_name: initial.full_name ?? '',
      church_profile: initial.church_profile ?? '',
      church_situation: initial.church_situation ?? '',
      church_role: initial.church_role ?? '',
      sex: initial.sex ?? '',
      birth_date: initial.birth_date ? String(initial.birth_date).slice(0, 10) : '',
      marital_status: initial.marital_status ?? '',
      marriage_date: initial.marriage_date ? String(initial.marriage_date).slice(0, 10) : '',
      rg: initial.rg ?? '',
      cpf: initial.cpf ?? '',
      special_needs: initial.special_needs ?? '',
      cep: initial.cep ?? '',
      city: initial.city ?? '',
      state: initial.state ?? '',
      neighborhood: initial.neighborhood ?? '',
      address_line: initial.address_line ?? '',
      email: initial.email ?? '',
      mobile_phone: initial.mobile_phone ?? '',
      phone: initial.phone ?? '',
      entry_by: initial.entry_by ?? '',
      entry_date: initial.entry_date ? String(initial.entry_date).slice(0, 10) : '',
      status_in_church: initial.status_in_church ?? '',
      conversion_date: initial.conversion_date ? String(initial.conversion_date).slice(0, 10) : '',
      is_baptized: initial.is_baptized ?? null,
      baptism_date: initial.baptism_date ? String(initial.baptism_date).slice(0, 10) : '',
      is_leader: initial.is_leader ?? null,
      is_pastor: initial.is_pastor ?? null,
      education_level: initial.education_level ?? '',
      profession: initial.profession ?? '',
      nationality: initial.nationality ?? '',
      birthplace: initial.birthplace ?? '',
      interviewed_by: initial.interviewed_by ?? '',
      registered_by: initial.registered_by ?? '',
      blood_type: initial.blood_type ?? '',
    }
  })

  const update = (key: keyof Person, value: string | boolean | null) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(form)
  }

  const inputClass = 'w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20 outline-none'
  const labelClass = 'block text-sm font-medium text-slate-700 mb-1'

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
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
            <label className={labelClass}>Situação *</label>
            <CustomSelect value={toFormValue(form.church_situation)} onChange={(v) => update('church_situation', v)} placeholder="Selecione" options={CHURCH_SITUATION_VALUES.map((v) => ({ value: v, label: v }))} />
          </div>
        </div>
      </section>

      {/* 2) Função */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Função</h2>
        <div>
          <label className={labelClass}>Função na igreja</label>
          <CustomSelect value={toFormValue(form.church_role)} onChange={(v) => update('church_role', v || null)} placeholder="Selecione" options={CHURCH_ROLE_VALUES.map((v) => ({ value: v, label: v }))} />
        </div>
      </section>

      {/* 3) Dados pessoais */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Dados pessoais</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Sexo</label>
            <CustomSelect value={toFormValue(form.sex)} onChange={(v) => update('sex', v || null)} placeholder="Selecione" options={SEX_VALUES.map((v) => ({ value: v, label: v }))} />
          </div>
          <div>
            <label className={labelClass}>Data de nascimento</label>
            <input
              type="date"
              value={toFormValue(form.birth_date)}
              onChange={(e) => update('birth_date', e.target.value || null)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Estado civil</label>
            <CustomSelect value={toFormValue(form.marital_status)} onChange={(v) => update('marital_status', v || null)} placeholder="Selecione" options={MARITAL_STATUS_VALUES.map((v) => ({ value: v, label: v }))} />
          </div>
          {(form.marital_status === 'Casado(a)' || initial?.marital_status === 'Casado(a)') && (
            <div>
              <label className={labelClass}>Data de casamento</label>
              <input
                type="date"
                value={toFormValue(form.marriage_date)}
                onChange={(e) => update('marriage_date', e.target.value || null)}
                className={inputClass}
              />
            </div>
          )}
          <div>
            <label className={labelClass}>RG</label>
            <input type="text" value={toFormValue(form.rg)} onChange={(e) => update('rg', e.target.value || null)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>CPF</label>
            <input type="text" value={toFormValue(form.cpf)} onChange={(e) => update('cpf', e.target.value || null)} className={inputClass} placeholder="Somente números" />
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
            <input type="text" value={toFormValue(form.cep)} onChange={(e) => update('cep', e.target.value || null)} className={inputClass} />
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
            <label className={labelClass}>Endereço</label>
            <input type="text" value={toFormValue(form.address_line)} onChange={(e) => update('address_line', e.target.value || null)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>E-mail</label>
            <input type="email" value={toFormValue(form.email)} onChange={(e) => update('email', e.target.value || null)} className={inputClass} />
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
            <input type="date" value={toFormValue(form.entry_date)} onChange={(e) => update('entry_date', e.target.value || null)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Status na igreja</label>
            <CustomSelect value={toFormValue(form.status_in_church)} onChange={(v) => update('status_in_church', v || null)} placeholder="Selecione" options={STATUS_IN_CHURCH_VALUES.map((v) => ({ value: v, label: v }))} />
          </div>
          <div>
            <label className={labelClass}>Data de conversão</label>
            <input type="date" value={toFormValue(form.conversion_date)} onChange={(e) => update('conversion_date', e.target.value || null)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Batizado?</label>
            <CustomSelect value={form.is_baptized === true ? 'true' : form.is_baptized === false ? 'false' : ''} onChange={(v) => update('is_baptized', v === '' ? null : v === 'true')} placeholder="Não informado" options={[{ value: 'true', label: 'Sim' }, { value: 'false', label: 'Não' }]} />
          </div>
          {(form.is_baptized === true || initial?.is_baptized) && (
            <div>
              <label className={labelClass}>Data do batismo</label>
              <input type="date" value={toFormValue(form.baptism_date)} onChange={(e) => update('baptism_date', e.target.value || null)} className={inputClass} />
            </div>
          )}
          <div>
            <label className={labelClass}>É líder?</label>
            <CustomSelect value={form.is_leader === true ? 'true' : form.is_leader === false ? 'false' : ''} onChange={(v) => update('is_leader', v === '' ? null : v === 'true')} placeholder="Não informado" options={[{ value: 'true', label: 'Sim' }, { value: 'false', label: 'Não' }]} />
          </div>
          <div>
            <label className={labelClass}>É pastor?</label>
            <CustomSelect value={form.is_pastor === true ? 'true' : form.is_pastor === false ? 'false' : ''} onChange={(v) => update('is_pastor', v === '' ? null : v === 'true')} placeholder="Não informado" options={[{ value: 'true', label: 'Sim' }, { value: 'false', label: 'Não' }]} />
          </div>
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
            <label className={labelClass}>Profissão</label>
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
            <label className={labelClass}>Tipo sanguíneo</label>
            <CustomSelect value={toFormValue(form.blood_type)} onChange={(v) => update('blood_type', v || null)} placeholder="Selecione" options={BLOOD_TYPE_VALUES.map((v) => ({ value: v, label: v }))} />
          </div>
          <div>
            <label className={labelClass}>Entrevistado por</label>
            <input type="text" value={toFormValue(form.interviewed_by)} onChange={(e) => update('interviewed_by', e.target.value || null)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Registrado por</label>
            <input type="text" value={toFormValue(form.registered_by)} onChange={(e) => update('registered_by', e.target.value || null)} className={inputClass} />
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
