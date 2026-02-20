'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, Clock, Calendar } from 'lucide-react'
import { adminFetchJson } from '@/lib/admin-client'
import type { WorshipService } from '@/lib/consolidacao-types'
import { DAY_OF_WEEK_LABELS } from '@/lib/consolidacao-types'
import { DayOfWeekSelect, TimeSelect } from '@/components/admin/ImprovedSelects'
import { FormCheckbox } from '@/components/admin/ImprovedCheckbox'

type Church = { id: string; name: string }
type Arena = { id: string; name: string; church_id: string; day_of_week: string; time_of_day: string }

interface ServiceFormData {
  name: string
  day_of_week: number
  time_of_day: string
  active: boolean
}

const emptyForm: ServiceFormData = { name: '', day_of_week: 0, time_of_day: '19:00', active: true }

function ServiceForm({ initial, onSave, onCancel, saving }: {
  initial: ServiceFormData
  onSave: (data: ServiceFormData) => void
  onCancel: () => void
  saving: boolean
}) {
  const [data, setData] = useState(initial)
  const set = (k: keyof ServiceFormData, v: any) => setData(p => ({ ...p, [k]: v }))

  return (
    <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Nome do Culto *</label>
          <input
            value={data.name}
            onChange={e => set('name', e.target.value)}
            placeholder="Ex: Culto de Domingo"
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c62737]/30"
          />
        </div>
        <DayOfWeekSelect
          value={data.day_of_week}
          onChange={v => set('day_of_week', v)}
          label="Dia da Semana"
        />
        <TimeSelect
          value={data.time_of_day}
          onChange={v => set('time_of_day', v)}
          label="Horário *"
        />
      </div>

      <div className="border-t border-slate-200 pt-3">
        <FormCheckbox
          id="active"
          label="Ativo"
          emoji="✓"
          checked={data.active}
          onChange={v => set('active', v)}
          description="Desmarque para desativar este culto"
        />
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 transition font-medium"
        >
          Cancelar
        </button>
        <button
          onClick={() => {
            if (!data.name.trim()) return
            onSave(data)
          }}
          disabled={saving || !data.name.trim()}
          className="px-4 py-2 text-sm rounded-lg bg-[#c62737] text-white hover:bg-[#a81f2c] disabled:opacity-50 transition flex items-center gap-2 font-medium"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          Salvar
        </button>
      </div>
    </div>
  )
}

export default function IgrejaDetalhePage() {
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ''
  const router = useRouter()

  const [church, setChurch] = useState<Church | null>(null)
  const [services, setServices] = useState<WorshipService[]>([])
  const [arenas, setArenas] = useState<Arena[]>([])

  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const displayedServices = services.length + arenas.length

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [churchData, servicesData, arenasData] = await Promise.all([
        adminFetchJson<any>(`/api/admin/consolidacao/churches/${id}`),
        adminFetchJson<any>(`/api/admin/consolidacao/worship-services?church_id=${id}`),
        adminFetchJson<any>(`/api/admin/consolidacao/arenas`),
      ])
      setChurch((churchData as any).church || (churchData as any).item)
      setServices((servicesData as any).services || (servicesData as any).items || [])
      // Filtrar arenas da church atual
      const allArenas = (arenasData as any).items || []
      setArenas(allArenas.filter((a: Arena) => a.church_id === id))
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  async function createService(data: ServiceFormData) {
    if (!data.name.trim()) return
    setSaving(true)
    try {
      await adminFetchJson('/api/admin/consolidacao/worship-services', {
        method: 'POST',
        body: JSON.stringify({ ...data, church_id: id }),
      })
      setShowCreate(false)
      load()
    } catch (err) {
      console.error('Erro ao criar culto:', err)
    } finally {
      setSaving(false)
    }
  }

  async function updateService(serviceId: string, data: ServiceFormData) {
    setSaving(true)
    try {
      await adminFetchJson(`/api/admin/consolidacao/worship-services/${serviceId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      })
      setEditId(null)
      load()
    } catch (err) {
      console.error('Erro ao atualizar culto:', err)
    } finally {
      setSaving(false)
    }
  }

  async function deleteService(serviceId: string) {
    if (!confirm('Tem certeza que deseja remover este culto?')) return
    try {
      await adminFetchJson(`/api/admin/consolidacao/worship-services/${serviceId}`, {
        method: 'DELETE',
      })
      load()
    } catch (err) {
      console.error('Erro ao remover culto:', err)
    }
  }

  if (loading) {
    return (
      <div className="p-6 md:p-8">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#c62737]" />
        </div>
      </div>
    )
  }

  if (!church) {
    return (
      <div className="p-6 md:p-8">
        <div className="text-center py-20 text-slate-500">
          <p>Igreja não encontrada</p>
          <Link href="/admin/consolidacao/cadastros/igrejas" className="text-[#c62737] hover:underline mt-4 inline-block">
            Voltar para Igrejas
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8">
      <Link
        href="/admin/consolidacao/cadastros/igrejas"
        className="inline-flex items-center gap-2 text-slate-600 hover:text-[#c62737] mb-6 text-sm font-medium"
      >
        <ArrowLeft size={18} /> Voltar para Igrejas
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">{church.name}</h1>
        <p className="text-slate-500 mt-1">Gestão de cultos dessa congregação</p>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Cultos</h2>
            <p className="text-sm text-slate-500">Adicione os cultos recorrentes dessa igreja</p>
          </div>
          <button
            onClick={() => {
              setShowCreate(true)
              setEditId(null)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[#c62737] text-white rounded-lg hover:bg-[#a81f2c] transition text-sm font-medium"
          >
            <Plus size={18} /> Novo Culto
          </button>
        </div>

        {showCreate && (
          <ServiceForm
            initial={emptyForm}
            onSave={createService}
            onCancel={() => setShowCreate(false)}
            saving={saving}
          />
        )}

        {services.length === 0 && arenas.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-200">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Nenhum culto ou arena cadastrado nessa igreja</p>
            <button
              onClick={() => {
                setShowCreate(true)
                setEditId(null)
              }}
              className="text-[#c62737] hover:underline text-sm mt-3"
            >
              Adicionar o primeiro culto
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Combinar serviços regulares com arenas */}
            {[...services, ...arenas.map(a => ({
              id: `arena-${a.id}`,
              name: a.name,
              day_of_week: parseInt(a.day_of_week === 'sun' ? '0' : a.day_of_week === 'mon' ? '1' : a.day_of_week === 'tue' ? '2' : a.day_of_week === 'wed' ? '3' : a.day_of_week === 'thu' ? '4' : a.day_of_week === 'fri' ? '5' : '6'),
              time_of_day: a.time_of_day,
              active: true,
              _arena: true,
              _arenaId: a.id,
            } as any))].sort((a, b) => a.day_of_week - b.day_of_week).map(service => (
              editId === service.id ? (
                <ServiceForm
                  key={service.id}
                  initial={{
                    name: service.name,
                    day_of_week: service.day_of_week,
                    time_of_day: service.time_of_day,
                    active: service.active,
                  }}
                  onSave={(data) => updateService(service.id, data)}
                  onCancel={() => setEditId(null)}
                  saving={saving}
                />
              ) : (
                <div
                  key={service.id}
                  className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900">{service.name}</h3>
                      {service._arena && <span className="text-lg">🏟️</span>}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                      <span className="flex items-center gap-1">
                        <Calendar size={16} />
                        {DAY_OF_WEEK_LABELS[service.day_of_week] || 'Indefinido'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={16} />
                        {service.time_of_day?.slice(0, 5)}
                      </span>
                      {!service.active && (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                          Inativo
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {service._arena ? (
                      <Link
                        href={`/admin/consolidacao/cadastros/arenas`}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded transition"
                        title="Gerenciar no módulo de Arenas"
                      >
                        <Pencil size={18} />
                      </Link>
                    ) : (
                      <button
                        onClick={() => setEditId(service.id)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded transition"
                        title="Editar"
                      >
                        <Pencil size={18} />
                      </button>
                    )}
                    {!service._arena && (
                      <button
                        onClick={() => deleteService(service.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                        title="Remover"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
              )
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
