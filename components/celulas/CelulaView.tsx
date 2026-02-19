'use client'

import { 
  Users, 
  MapPin, 
  Clock, 
  History,
  ShieldCheck
} from 'lucide-react'
import { PDSection } from './PDSection'
import { formatDateDisplay } from '@/lib/validators/person'

interface CelulaViewProps {
  cell: any
  realizations: any[]
  user: any
  onConfirmPD: (id: string) => Promise<void>
}

export function CelulaView({ cell, realizations, user, onConfirmPD }: CelulaViewProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Coluna Info */}
      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 border-b border-slate-50 pb-4">
            <Users size={20} className="text-emerald-600" />
            Núcleo da Célula
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-emerald-600 font-bold">L</div>
              <div>
                <p className="text-xs text-slate-400 uppercase font-bold tracking-tighter">Líder</p>
                <p className="text-sm font-semibold text-slate-700">{cell.leader?.full_name || 'Não definido'}</p>
              </div>
            </div>
            {cell.co_leader && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-blue-600 font-bold">C</div>
                <div>
                  <p className="text-xs text-slate-400 uppercase font-bold tracking-tighter">Co-líder</p>
                  <p className="text-sm font-semibold text-slate-700">{cell.co_leader.full_name}</p>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-50">
            <p className="text-xs text-slate-400 uppercase font-bold tracking-tighter mb-3">Membros do LT ({cell.members?.length || 0})</p>
            <div className="flex flex-wrap gap-2">
              {cell.members?.map((m: any) => (
                <span key={m.person.id} className="px-2 py-1 bg-slate-50 text-slate-600 rounded text-xs border border-slate-100">
                  {m.person.full_name}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <MapPin size={20} className="text-emerald-600" />
            Localização
          </h2>
          <div className="text-sm text-slate-600 space-y-1">
            <p className="font-medium text-slate-800">{cell.street}, {cell.number}</p>
            <p>{cell.neighborhood} - {cell.city}/{cell.state}</p>
            <p className="text-xs text-slate-400">CEP: {cell.cep}</p>
          </div>
          <div className="flex items-center gap-4 pt-2">
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Clock size={14} />
              {cell.day_of_week === 'mon' && 'Segunda'}
              {cell.day_of_week === 'tue' && 'Terça'}
              {cell.day_of_week === 'wed' && 'Quarta'}
              {cell.day_of_week === 'thu' && 'Quinta'}
              {cell.day_of_week === 'fri' && 'Sexta'}
              {cell.day_of_week === 'sat' && 'Sábado'}
              {cell.day_of_week === 'sun' && 'Domingo'}
              {' às '}{cell.time_of_day?.slice(0, 5)}
            </div>
          </div>
        </div>
      </div>

      {/* Coluna Histórico */}
      <div className="lg:col-span-2 space-y-6">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <History size={22} className="text-emerald-600" />
          Histórico de Realizações
        </h2>

        <div className="space-y-4">
          {realizations.length > 0 ? (
            realizations.map((rel) => (
              <div key={rel.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="p-5 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex flex-col items-center justify-center text-[#c62737]">
                      <span className="text-[10px] font-bold uppercase">{new Date(rel.realization_date).toLocaleString('pt-BR', { month: 'short' })}</span>
                      <span className="text-lg font-black leading-none">{new Date(rel.realization_date).getDate() + 1}</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">Realização de {new Date(rel.realization_date).toLocaleDateString('pt-BR')}</p>
                      <p className="text-xs text-slate-500">Referência: {new Date(rel.reference_month).toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Presença</p>
                      <p className="text-sm font-bold text-emerald-600">{rel.attendances?.filter((a: any) => a.status === 'V').length || 0} / {rel.attendances?.length || 0}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Visitantes</p>
                      <p className="text-sm font-bold text-blue-600">{rel.visitors?.length || 0}</p>
                    </div>
                  </div>
                </div>

                <div className="p-5 border-t border-slate-100">
                  <PDSection
                    value={rel.pd_value}
                    approvalStatus={rel.pd_approval_status}
                    confirmed={rel.pd_confirmed}
                    confirmedBy={rel.confirmed_by?.person?.full_name}
                    canConfirm={user?.id !== rel.created_by}
                    onConfirm={() => onConfirmPD(rel.id)}
                    readOnly
                  />
                </div>
              </div>
            ))
          ) : (
            <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400">
              Nenhuma realização registrada ainda.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
