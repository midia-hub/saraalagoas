'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { PersonForm } from '@/components/admin/people/PersonForm'
import { Toast } from '@/components/Toast'
import { createPerson } from '@/lib/people'
import type { PersonFormData } from '@/components/admin/people/PersonForm'
import type { PersonCreate } from '@/lib/types/person'

function buildPayload(form: PersonFormData): PersonCreate {
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
    set('church_name', form.church_name)
    set('church_profile', form.church_profile)
    set('church_situation', form.church_situation)
    set('church_role', form.church_role)
    set('ministries', form.ministries)
    set('leader_person_id', form.leader_person_id)
    set('sex', form.sex)
    set('birth_date', form.birth_date)
    set('marital_status', form.marital_status)
    set('marriage_date', form.marriage_date)
    set('rg', form.rg)
    set('rg_issuing_agency', form.rg_issuing_agency)
    set('rg_uf', form.rg_uf)
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
    setBool('is_new_convert', form.is_new_convert)
    setBool('accepted_jesus', form.accepted_jesus)
    set('accepted_jesus_at', form.accepted_jesus_at)
    set('conversion_date', form.conversion_date)
    setBool('is_baptized', form.is_baptized)
    set('baptism_date', form.baptism_date)
    setBool('is_leader', form.is_leader)
    setBool('is_pastor', form.is_pastor)
    set('education_level', form.education_level)
    set('profession', form.profession)
    set('nationality', form.nationality)
    set('birthplace', form.birthplace)
    set('origin_church', form.origin_church)
    set('interviewed_by', form.interviewed_by)
    set('registered_by', form.registered_by)
    set('blood_type', form.blood_type)

    return payload as unknown as PersonCreate
}

export default function PessoaNovoPage() {
    const router = useRouter()
    const [saving, setSaving] = useState(false)
    const [toast, setToast] = useState<{ type: 'ok' | 'err'; message: string } | null>(null)

    async function handleSubmit(data: PersonFormData) {
        setSaving(true)
        setToast(null)
        try {
            const payload = buildPayload(data)
            const created = await createPerson(payload)
            setToast({ type: 'ok', message: 'Pessoa cadastrada com sucesso!' })
            setTimeout(() => {
                router.push(`/admin/pessoas/${created.id}`)
            }, 1500)
        } catch (e) {
            setToast({ type: 'err', message: e instanceof Error ? e.message : 'Erro ao cadastrar.' })
            setSaving(false)
        }
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
                        <h1 className="text-2xl font-bold text-slate-800">Nova Pessoa</h1>
                        <p className="text-slate-500">Cadastrar nova pessoa no sistema</p>
                    </div>
                </div>

                <PersonForm onSubmit={handleSubmit} loading={saving} />

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
