'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CalendarDays, ClipboardList } from 'lucide-react'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { AdminPageHeader } from '@/app/admin/AdminPageHeader'
import { adminFetchJson } from '@/lib/admin-client'

type MidiaDemand = {
  id: string
  sourceType: 'agenda' | 'manual'
  title: string
  description: string
  status: 'pendente' | 'em_andamento' | 'concluida' | 'cancelada'
  churchName: string
  createdAt: string
  dueDate: string | null
}

const STATUS_COLORS: Record<string, string> = {
  pendente: 'bg-slate-100 text-slate-600 border-slate-200',
  em_andamento: 'bg-sky-100 text-sky-700 border-sky-200',
  concluida: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  cancelada: 'bg-red-100 text-red-600 border-red-200',
}

const STATUS_LABELS: Record<string, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em andamento',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
}

function formatDate(iso: string | null) {
  if (!iso) return null
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export default function MidiaDemandasPage() {
  const [items, setItems] = useState<MidiaDemand[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      try {
        const res = await adminFetchJson<{ items?: MidiaDemand[] }>('/api/admin/midia/demandas')
        if (!active) return
        setItems(res.items ?? [])
      } catch {
        if (!active) return
        setItems([])
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [])

  return (
    <PageAccessGuard pageKey="instagram">
      <div className="p-4 md:p-8">
        <AdminPageHeader
          icon={ClipboardList}
          title="Demandas de Mídia"
          subtitle="Página inicial para as demandas recebidas da Agenda de Mídia e Social e demandas complementares manuais."
          backLink={{ href: '/admin/midia/agenda-social', label: 'Voltar para Agenda' }}
        />

        <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
          {loading ? (
            <p className="text-sm text-slate-500">Carregando demandas…</p>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-10 text-center gap-2">
              <ClipboardList className="h-8 w-8 text-slate-300" />
              <p className="text-sm font-medium text-slate-500">Nenhuma demanda cadastrada ainda</p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => {
                const isOverdue =
                  item.dueDate &&
                  item.status !== 'concluida' &&
                  item.status !== 'cancelada' &&
                  item.dueDate < new Date().toISOString().slice(0, 10)
                return (
                  <Link
                    key={item.id}
                    href={`/admin/midia/demandas/${item.id}`}
                    className={`group flex items-start justify-between rounded-xl border bg-white px-4 py-3 hover:shadow-sm transition-shadow ${isOverdue ? 'border-red-200 hover:border-red-300' : 'border-slate-200 hover:border-slate-300'}`}
                  >
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-sm font-semibold text-slate-800 group-hover:text-[#c62737] transition-colors truncate">
                        {item.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                        <span>{item.churchName}</span>
                        <span className="text-slate-300">·</span>
                        <span>{item.sourceType === 'agenda' ? 'Agenda' : 'Manual'}</span>
                        <span className="text-slate-300">·</span>
                        <span>
                          {new Date(item.createdAt).toLocaleString('pt-BR', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                          })}
                        </span>
                        {item.dueDate && (
                          <>
                            <span className="text-slate-300">·</span>
                            <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-semibold' : ''}`}>
                              <CalendarDays className="h-3 w-3" />
                              {formatDate(item.dueDate)}
                              {isOverdue && ' · Atrasada'}
                            </span>
                          </>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-xs text-slate-500 truncate">{item.description}</p>
                      )}
                    </div>
                    <div className="ml-4 shrink-0">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[item.status] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                        {STATUS_LABELS[item.status] ?? item.status}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}

          <div>
            <Link
              href="/admin/midia/agenda-social"
              className="inline-flex items-center gap-2 rounded-xl bg-[#c62737] px-4 py-2 text-sm font-semibold text-white hover:bg-[#9e1f2e] transition-colors"
            >
              Ir para Agenda
            </Link>
          </div>
        </section>
      </div>
    </PageAccessGuard>
  )
}
