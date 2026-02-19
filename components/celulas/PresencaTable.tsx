'use client'

import { Check, X } from 'lucide-react'

interface PresencaTableProps {
  members: any[]
  attendances: Record<string, 'V' | 'X'>
  onChange: (personId: string, status: 'V' | 'X') => void
}

export function PresencaTable({ members, attendances, onChange }: PresencaTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-600 font-semibold">
          <tr>
            <th className="px-6 py-3">Nome</th>
            <th className="px-6 py-3 text-center w-32">Presença</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {members.map((m) => {
            const person = m.person || m
            const status = attendances[person.id]
            
            return (
              <tr key={person.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 font-medium text-slate-700">{person.full_name}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => onChange(person.id, 'V')}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                        status === 'V'
                          ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                          : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                      }`}
                      title="Presente"
                    >
                      <Check size={20} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onChange(person.id, 'X')}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                        status === 'X'
                          ? 'bg-red-500 text-white shadow-lg shadow-red-500/20'
                          : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                      }`}
                      title="Ausente"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
          {members.length === 0 && (
            <tr>
              <td colSpan={2} className="px-6 py-8 text-center text-slate-500">
                Nenhum membro vinculado a esta célula.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
