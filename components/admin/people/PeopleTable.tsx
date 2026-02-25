'use client'

import Link from 'next/link'
import { Search, Pencil, UserCircle } from 'lucide-react'
import type { Person } from '@/lib/types/person'
import { TableSkeleton } from '@/components/ui/TableSkeleton'

interface PeopleTableProps {
  people: Person[]
  loading?: boolean
}

export function PeopleTable({ people, loading }: PeopleTableProps) {
  if (loading) {
    return null
  }

  if (people.length === 0) {
    return (
      <div className="py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
          <Search className="text-slate-400" size={28} />
        </div>
        <p className="text-slate-500">Nenhuma pessoa encontrada</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Nome
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Contato
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Perfil / Situação
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Ações
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {people.map((person) => (
            <tr
              key={person.id}
              className="hover:bg-slate-50 transition-colors"
            >
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#c62737]/10 flex items-center justify-center text-[#c62737] font-bold">
                    <UserCircle size={20} />
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{person.full_name}</p>
                    {person.city && (
                      <p className="text-xs text-slate-500">{person.city}{person.state ? `, ${person.state}` : ''}</p>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 text-sm text-slate-700">
                <div className="space-y-0.5">
                  {person.mobile_phone && <p>{person.mobile_phone}</p>}
                  {person.email && <p className="text-slate-500">{person.email}</p>}
                  {!person.mobile_phone && !person.email && <span className="text-slate-400">—</span>}
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex flex-wrap gap-1">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                    {person.church_profile}
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    person.church_situation === 'Ativo' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {person.church_situation}
                  </span>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/pessoas/${person.id}`}
                    className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                    title="Ver / Editar"
                  >
                    <Pencil size={18} />
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
