'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { PersonForm } from '@/components/admin/people/PersonForm'
import { Toast } from '@/components/Toast'
import { fetchPerson, updatePerson } from '@/lib/people'
import type { Person } from '@/lib/types/person'
import type { PersonFormData } from '@/components/admin/people/PersonForm'

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

export default function PessoaDetalhePage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string
  const [person, setPerson] = useState<Person | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; message: string } | null>(null)

  useEffect(() => {
    if (!id) return
    fetchPerson(id)
      .then(setPerson)
      .catch(() => setPerson(null))
      .finally(() => setLoading(false))
  }, [id])

  async function handleSubmit(data: PersonFormData) {
    if (!id) return
    setSaving(true)
    setToast(null)
    try {
      const payload = buildPayload(data)
      await updatePerson(id, payload as Parameters<typeof updatePerson>[1])
      setToast({ type: 'ok', message: 'Dados salvos com sucesso.' })
    } catch (e) {
      setToast({ type: 'err', message: e instanceof Error ? e.message : 'Erro ao salvar.' })
    } finally {
      setSaving(false)
    }
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

  return (
    <PageAccessGuard pageKey="pessoas">
      <div className="p-6 md:p-8">
        <div className="mb-6 flex items-center gap-4">
          <Link
            href="/admin/pessoas"
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
            title="Voltar"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{person.full_name}</h1>
            <p className="text-slate-500">Editar cadastro</p>
          </div>
        </div>

        <PersonForm initial={person} onSubmit={handleSubmit} loading={saving} />

        {toast && (
          <Toast
            visible
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    </PageAccessGuard>
  )
}
