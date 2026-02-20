'use client'

import { FollowupEnriched, FOLLOWUP_STATUS_LABELS, FOLLOWUP_STATUS_COLORS } from '@/lib/consolidacao-types'
import { Phone, User, Calendar, CheckCircle2, Circle, ChevronRight } from 'lucide-react'

interface Props {
  items: FollowupEnriched[]
  onOpenDrawer: (item: FollowupEnriched) => void
}

function AttendanceBadge({ attended, expected }: { attended: number; expected: number }) {
  const percent = expected > 0 ? (attended / expected) * 100 : 0
  const color = expected === 0
    ? 'bg-slate-50 text-slate-400 ring-slate-200'
    : percent === 0
    ? 'bg-rose-50 text-rose-600 ring-rose-200'
    : percent < 50
    ? 'bg-amber-50 text-amber-600 ring-amber-200'
    : 'bg-emerald-50 text-emerald-600 ring-emerald-200'
    
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ring-1 ${color}`}>
      {attended}/{expected}
    </span>
  )
}

function StatusPill({ status }: { status: string }) {
  const label = FOLLOWUP_STATUS_LABELS[status as keyof typeof FOLLOWUP_STATUS_LABELS] ?? status
  const color = FOLLOWUP_STATUS_COLORS[status as keyof typeof FOLLOWUP_STATUS_COLORS] ?? 'bg-slate-100 text-slate-500'
  return <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${color}`}>{label}</span>
}

function StepDot({ done, date, title }: { done: boolean; date?: string | null; title: string }) {
  return (
    <span
      title={done && date ? `${title}: ${new Date(date).toLocaleDateString('pt-BR')}` : done ? title : `${title}: pendente`}
      className={`inline-flex items-center justify-center w-6 h-6 rounded-full transition-colors ${
        done
          ? 'bg-emerald-100 text-emerald-600'
          : 'bg-slate-100 text-slate-300'
      }`}
    >
      {done
        ? <CheckCircle2 className="w-4 h-4" />
        : <Circle className="w-4 h-4" />}
    </span>
  )
}

export function FollowupsTable({ items, onOpenDrawer }: Props) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <User className="w-7 h-7 opacity-50" />
        </div>
        <p className="text-sm font-medium text-slate-500">Nenhum acompanhamento encontrado</p>
        <p className="text-xs text-slate-400 mt-1">Tente ajustar os filtros acima</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-400 text-[11px] uppercase tracking-wider">
            <th className="px-5 py-3 text-left font-semibold">Pessoa</th>
            <th className="px-5 py-3 text-left font-semibold">Conversão</th>
            <th className="px-5 py-3 text-left font-semibold">Líder</th>
            <th className="px-5 py-3 text-center font-semibold">Etapas</th>
            <th className="px-5 py-3 text-center font-semibold">Freq.</th>
            <th className="px-5 py-3 text-left font-semibold">Status</th>
            <th className="px-5 py-3 text-right font-semibold"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((item) => (
            <tr
              key={item.id}
              onClick={() => onOpenDrawer(item)}
              className="hover:bg-slate-50/70 cursor-pointer transition-colors group"
            >
              <td className="px-5 py-3.5">
                <div className="font-semibold text-slate-800 group-hover:text-[#c62737] transition-colors">
                  {item.person?.full_name ?? '—'}
                </div>
                {item.person?.mobile_phone && (
                  <div className="flex items-center gap-1 text-slate-400 text-xs mt-0.5">
                    <Phone className="w-3 h-3" />
                    {item.person.mobile_phone}
                  </div>
                )}
              </td>
              <td className="px-5 py-3.5">
                {item.conversion ? (
                  <div>
                    <div className="text-xs font-medium text-slate-700 capitalize">
                      {item.conversion.conversion_type === 'accepted' ? 'Aceitou' : item.conversion.conversion_type === 'reconciled' ? 'Reconciliou' : item.conversion.conversion_type ?? '—'}
                    </div>
                    {item.conversion.data_conversao && (
                      <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        {new Date(item.conversion.data_conversao).toLocaleDateString('pt-BR')}
                      </div>
                    )}
                  </div>
                ) : <span className="text-slate-300 text-xs">—</span>}
              </td>
              <td className="px-5 py-3.5">
                <span className="text-slate-600 text-xs">
                  {item.leader?.full_name ?? <span className="text-slate-300">Não definido</span>}
                </span>
              </td>
              <td className="px-5 py-3.5">
                <div className="flex items-center justify-center gap-1.5">
                  <StepDot done={item.contacted} date={item.contacted_at} title="Contato" />
                  <StepDot done={item.fono_visit_done} date={item.fono_visit_date} title="Fono Visita" />
                  <StepDot done={item.visit_done} date={item.visit_date} title="Visita" />
                </div>
              </td>
              <td className="px-5 py-3.5 text-center">
                <AttendanceBadge 
                  attended={item.attendance_summary?.total_attended ?? 0} 
                  expected={item.attendance_summary?.total_expected ?? 0} 
                />
              </td>
              <td className="px-5 py-3.5">
                <StatusPill status={item.status} />
              </td>
              <td className="px-5 py-3.5 text-right">
                <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 group-hover:text-[#c62737] transition-colors">
                  Editar
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
