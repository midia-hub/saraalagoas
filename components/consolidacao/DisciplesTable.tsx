'use client'

import { FollowupEnriched, FOLLOWUP_STATUS_LABELS, FOLLOWUP_STATUS_COLORS } from '@/lib/consolidacao-types'
import { Phone, Calendar } from 'lucide-react'

interface Props {
  disciples: FollowupEnriched[]
  onMarkAttendance: (item: FollowupEnriched) => void
  onEnrollReview: (item: FollowupEnriched) => void
}

export function DisciplesTable({ disciples, onMarkAttendance, onEnrollReview }: Props) {
  if (disciples.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <p className="text-sm">Nenhum discípulo encontrado no seu escopo de liderança</p>
        <p className="text-xs mt-1 text-gray-300">Vincule pessoas às células ou equipes que você lidera</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
            <th className="px-4 py-3 text-left">Pessoa</th>
            <th className="px-4 py-3 text-left">Conversão</th>
            <th className="px-4 py-3 text-center">Freq. 30d</th>
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3 text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {disciples.map((d) => {
            const total = d.attendance_summary?.total_last30 ?? 0
            const freqColor = total === 0 ? 'text-red-600' : total < 3 ? 'text-yellow-600' : 'text-green-600'
            const statusLabel = FOLLOWUP_STATUS_LABELS[d.status] ?? d.status
            const statusColor = FOLLOWUP_STATUS_COLORS[d.status] ?? 'bg-gray-100 text-gray-500'
            return (
              <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{d.person?.full_name ?? '—'}</div>
                  {d.person?.mobile_phone && (
                    <div className="flex items-center gap-1 text-gray-400 text-xs mt-0.5">
                      <Phone className="w-3 h-3" /> {d.person.mobile_phone}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  {d.conversion?.data_conversao ? (
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Calendar className="w-3 h-3" />
                      {new Date(d.conversion.data_conversao).toLocaleDateString('pt-BR')}
                    </div>
                  ) : <span className="text-gray-300 text-xs">—</span>}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-sm font-semibold ${freqColor}`}>{total}</span>
                  <span className="text-gray-400 text-xs"> cultos</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor}`}>
                    {statusLabel}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onMarkAttendance(d)}
                      className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition"
                    >
                      + Presença
                    </button>
                    {d.status !== 'inscrito_revisao' && d.status !== 'concluiu_revisao' && (
                      <button
                        onClick={() => onEnrollReview(d)}
                        className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded hover:bg-purple-100 transition"
                      >
                        Revisão
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
