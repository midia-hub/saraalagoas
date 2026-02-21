'use client'

import { useEffect, useMemo, useState } from 'react'
import { X, Check } from 'lucide-react'
import type { Person } from '@/lib/types/person'
import { adminFetchJson } from '@/lib/admin-client'

const FIELD_LIST: Array<{ key: keyof Person; label: string; type?: 'date' | 'bool' | 'person_id' }> = [
  { key: 'full_name', label: 'Nome completo' },
  { key: 'email', label: 'Email' },
  { key: 'mobile_phone', label: 'Telefone celular' },
  { key: 'phone', label: 'Telefone' },
  { key: 'sex', label: 'Sexo' },
  { key: 'birth_date', label: 'Data de nascimento', type: 'date' },
  { key: 'marital_status', label: 'Estado civil' },
  { key: 'marriage_date', label: 'Data de casamento', type: 'date' },
  { key: 'rg', label: 'RG' },
  { key: 'cpf', label: 'CPF' },
  { key: 'special_needs', label: 'Necessidades especiais' },
  { key: 'cep', label: 'CEP' },
  { key: 'city', label: 'Cidade' },
  { key: 'state', label: 'Estado' },
  { key: 'neighborhood', label: 'Bairro' },
  { key: 'address_line', label: 'Endereco' },
  { key: 'address_number', label: 'Numero' },
  { key: 'address_complement', label: 'Complemento' },
  { key: 'church_profile', label: 'Perfil na igreja' },
  { key: 'church_situation', label: 'Situacao na igreja' },
  { key: 'church_role', label: 'Funcao na igreja' },
  { key: 'entry_by', label: 'Entrada por' },
  { key: 'entry_date', label: 'Data de entrada', type: 'date' },
  { key: 'status_in_church', label: 'Status na igreja' },
  { key: 'conversion_date', label: 'Data de conversao', type: 'date' },
  { key: 'is_baptized', label: 'Batizado', type: 'bool' },
  { key: 'baptism_date', label: 'Data do batismo', type: 'date' },
  { key: 'is_leader', label: 'E lider', type: 'bool' },
  { key: 'is_pastor', label: 'E pastor', type: 'bool' },
  { key: 'education_level', label: 'Escolaridade' },
  { key: 'profession', label: 'Profissao' },
  { key: 'nationality', label: 'Nacionalidade' },
  { key: 'birthplace', label: 'Naturalidade' },
  { key: 'interviewed_by', label: 'Entrevistado por' },
  { key: 'registered_by', label: 'Registrado por' },
  { key: 'blood_type', label: 'Tipo sanguineo' },
  { key: 'leader_person_id', label: 'Lider', type: 'person_id' },
  { key: 'spouse_person_id', label: 'Conjuge', type: 'person_id' },
  { key: 'avatar_url', label: 'Avatar (URL)' },
]

function isEmpty(value: unknown) {
  return value === null || value === undefined || value === ''
}

function formatValue(
  value: unknown,
  type?: 'date' | 'bool' | 'person_id',
  idNameMap?: Record<string, string>
) {
  if (value === null || value === undefined || value === '') return '—'
  if (type === 'person_id' && typeof value === 'string') {
    return idNameMap?.[value] ?? value
  }
  if (type === 'bool') return value ? 'Sim' : 'Nao'
  if (type === 'date' && typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const d = new Date(value)
    if (!Number.isNaN(d.getTime())) return d.toLocaleDateString('pt-BR')
  }
  if (typeof value === 'boolean') return value ? 'Sim' : 'Nao'
  return String(value)
}

function normalizeCompare(value: unknown) {
  if (value === null || value === undefined) return ''
  return String(value)
}

type FieldChoice = 'left' | 'right'

type MergePeopleModalProps = {
  left: Person
  right: Person
  onClose: () => void
  onConfirm: (choices: Record<string, FieldChoice>) => void
  submitting?: boolean
  error?: string
}

export function MergePeopleModal({ left, right, onClose, onConfirm, submitting = false, error }: MergePeopleModalProps) {
  const [choices, setChoices] = useState<Record<string, FieldChoice>>({})
  const [idNameMap, setIdNameMap] = useState<Record<string, string>>({})

  useEffect(() => {
    const initial: Record<string, FieldChoice> = {}
    for (const field of FIELD_LIST) {
      const leftVal = (left as any)[field.key]
      const rightVal = (right as any)[field.key]
      if (!isEmpty(leftVal)) {
        initial[field.key] = 'left'
      } else if (!isEmpty(rightVal)) {
        initial[field.key] = 'right'
      } else {
        initial[field.key] = 'left'
      }
    }
    setChoices(initial)
  }, [left, right])

  useEffect(() => {
    let cancelled = false
    async function loadNames() {
      const ids = [left.leader_person_id, right.leader_person_id, left.spouse_person_id, right.spouse_person_id]
        .filter((id): id is string => !!id)
      if (ids.length === 0) {
        setIdNameMap({})
        return
      }
      try {
        const uniqueIds = Array.from(new Set(ids))
        const results = await Promise.all(
          uniqueIds.map(async (id) => {
            const data = await adminFetchJson<{ person: { full_name: string } }>(`/api/admin/people/${id}`)
            return { id, name: data.person?.full_name ?? id }
          })
        )
        if (cancelled) return
        const nextMap: Record<string, string> = {}
        for (const r of results) nextMap[r.id] = r.name
        setIdNameMap(nextMap)
      } catch {
        if (!cancelled) setIdNameMap({})
      }
    }
    loadNames()
    return () => { cancelled = true }
  }, [left.leader_person_id, right.leader_person_id, left.spouse_person_id, right.spouse_person_id])

  const rows = useMemo(() => FIELD_LIST.map((field) => {
    const leftVal = (left as any)[field.key]
    const rightVal = (right as any)[field.key]
    const different = normalizeCompare(leftVal) !== normalizeCompare(rightVal)
    return {
      key: field.key as string,
      label: field.label,
      leftValue: formatValue(leftVal, field.type, idNameMap),
      rightValue: formatValue(rightVal, field.type, idNameMap),
      different,
    }
  }), [left, right, idNameMap])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Mesclar pessoas</h2>
            <p className="text-xs text-slate-500">Escolha, campo a campo, qual valor deseja manter</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr] gap-0 border-b border-slate-100">
          <div className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Campo</div>
          <div className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider border-l border-slate-100">
            Destino (mais recente)
          </div>
          <div className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider border-l border-slate-100">
            Outro cadastro
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {rows.map((row) => {
            const choice = choices[row.key] ?? 'left'
            return (
              <div key={row.key} className={`grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr] border-b border-slate-100 ${row.different ? 'bg-amber-50/30' : 'bg-white'}`}>
                <div className="px-6 py-4 text-sm text-slate-600">{row.label}</div>
                <label className="px-6 py-4 flex items-center gap-3 border-l border-slate-100">
                  <input
                    type="radio"
                    name={`field-${row.key}`}
                    value="left"
                    checked={choice === 'left'}
                    onChange={() => setChoices((prev) => ({ ...prev, [row.key]: 'left' }))}
                  />
                  <span className={`text-sm ${choice === 'left' ? 'text-slate-800 font-semibold' : 'text-slate-500'}`}>{row.leftValue}</span>
                </label>
                <label className="px-6 py-4 flex items-center gap-3 border-l border-slate-100">
                  <input
                    type="radio"
                    name={`field-${row.key}`}
                    value="right"
                    checked={choice === 'right'}
                    onChange={() => setChoices((prev) => ({ ...prev, [row.key]: 'right' }))}
                  />
                  <span className={`text-sm ${choice === 'right' ? 'text-slate-800 font-semibold' : 'text-slate-500'}`}>{row.rightValue}</span>
                </label>
              </div>
            )
          })}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60">
          {error && (
            <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {error}
            </div>
          )}
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              onClick={() => onConfirm(choices)}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#c62737] text-white text-sm font-semibold hover:bg-[#b42332] disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {submitting ? 'Mesclando...' : 'Confirmar mescla'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
