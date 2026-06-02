'use client'

import { Star, Users, UserPlus, DollarSign, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { computeEliteDetails, type CellEliteResult } from '@/lib/cells-elite'

interface Props {
  cellId: string
  realizations: any[]
  viewDate: Date
}

function CriterionRow({
  icon: Icon,
  label,
  detail,
  ok,
}: {
  icon: React.ElementType
  label: string
  detail: string
  ok: boolean | null   // null = sem dados
}) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
      ok === null
        ? 'bg-slate-50 border-slate-200'
        : ok
        ? 'bg-emerald-50 border-emerald-200'
        : 'bg-red-50 border-red-200'
    }`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
        ok === null ? 'bg-slate-100 text-slate-400' :
        ok ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500'
      }`}>
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-bold ${
          ok === null ? 'text-slate-500' : ok ? 'text-emerald-700' : 'text-red-600'
        }`}>{label}</p>
        <p className={`text-[11px] mt-0.5 ${
          ok === null ? 'text-slate-400' : ok ? 'text-emerald-600' : 'text-red-500'
        }`}>{detail}</p>
      </div>
      <div className="shrink-0">
        {ok === null
          ? <AlertCircle size={16} className="text-slate-300" />
          : ok
          ? <CheckCircle2 size={16} className="text-emerald-500" />
          : <XCircle size={16} className="text-red-400" />
        }
      </div>
    </div>
  )
}

export function CelulaEliteStatus({ cellId, realizations, viewDate }: Props) {
  const monthKey = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-01`

  const { detailsByCellId } = computeEliteDetails({ monthKey, realizations })
  const result: CellEliteResult | undefined = detailsByCellId.get(cellId)

  // Se não há realizações no mês, mostra estado vazio
  if (!result) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
            <Star size={20} className="text-amber-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Status Elite</h2>
            <p className="text-sm text-slate-400">
              {viewDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
        <p className="text-sm text-slate-400 italic text-center py-4">
          Nenhuma realização registrada neste mês.
        </p>
      </div>
    )
  }

  const { isElite, realizationCount, allMeetMinPresent, allHaveVisitor, allMeetPd, criteriaList } = result

  // Resumo por critério: média de totalPresent, soma visitantes, média pd
  const avgPresent   = Math.round(criteriaList.reduce((s, c) => s + c.totalPresent, 0) / criteriaList.length)
  const avgVisitors  = (criteriaList.reduce((s, c) => s + c.visitorsCount, 0) / criteriaList.length).toFixed(1)
  const avgPd        = (criteriaList.reduce((s, c) => s + c.pdValue, 0) / criteriaList.length).toFixed(2)

  return (
    <div className={`rounded-2xl border p-6 shadow-sm transition-colors ${
      isElite
        ? 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-300'
        : 'bg-white border-slate-200'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            isElite ? 'bg-amber-100' : 'bg-slate-100'
          }`}>
            <Star size={20} className={isElite ? 'fill-amber-500 text-amber-500' : 'text-slate-400'} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Status Elite</h2>
            <p className="text-sm text-slate-400 capitalize">
              {viewDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })} · {realizationCount} {realizationCount === 1 ? 'reunião' : 'reuniões'}
            </p>
          </div>
        </div>

        <div className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wide border ${
          isElite
            ? 'bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-200'
            : 'bg-slate-100 text-slate-500 border-slate-200'
        }`}>
          {isElite ? '★ Elite' : 'Não elite'}
        </div>
      </div>

      {/* Critérios */}
      <div className="space-y-2.5">
        <CriterionRow
          icon={Users}
          label="Mínimo 7 pessoas presentes"
          detail={
            allMeetMinPresent
              ? `Média de ${avgPresent} presentes por reunião ✓`
              : `Média de ${avgPresent} presentes — necessário ≥ 7 em todas as reuniões`
          }
          ok={allMeetMinPresent}
        />
        <CriterionRow
          icon={UserPlus}
          label="Pelo menos 1 visitante por reunião"
          detail={
            allHaveVisitor
              ? `Média de ${avgVisitors} visitante(s) por reunião ✓`
              : `Média de ${avgVisitors} visitante(s) — necessário ≥ 1 em cada reunião`
          }
          ok={allHaveVisitor}
        />
        <CriterionRow
          icon={DollarSign}
          label="R$ 10,00 de Parceiro de Deus por reunião"
          detail={
            allMeetPd
              ? `Média de R$ ${avgPd} por reunião ✓`
              : `Média de R$ ${avgPd} — necessário ≥ R$ 10,00 em cada reunião`
          }
          ok={allMeetPd}
        />
      </div>

      {/* Breakdown por realização (só mostra se > 1 reunião e célula NÃO é elite) */}
      {!isElite && realizationCount > 1 && (
        <div className="mt-4 pt-4 border-t border-slate-200">
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Por reunião</p>
          <div className="space-y-2">
            {criteriaList.map((c, i) => (
              <div key={i} className="flex items-center gap-3 text-xs">
                <span className="font-bold text-slate-500 w-16 shrink-0">Reunião {i + 1}</span>
                <span className={`flex items-center gap-1 ${c.minPresent ? 'text-emerald-600' : 'text-red-500'}`}>
                  {c.minPresent ? '✓' : '✗'} {c.totalPresent} pess.
                </span>
                <span className={`flex items-center gap-1 ${c.hasVisitor ? 'text-emerald-600' : 'text-red-500'}`}>
                  {c.hasVisitor ? '✓' : '✗'} {c.visitorsCount} visit.
                </span>
                <span className={`flex items-center gap-1 ${c.pdOk ? 'text-emerald-600' : 'text-red-500'}`}>
                  {c.pdOk ? '✓' : '✗'} R${c.pdValue.toFixed(0)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isElite && (
        <p className="mt-4 text-[11px] text-slate-400 text-center">
          Todos os critérios devem ser atendidos em <strong>cada reunião</strong> do mês.
        </p>
      )}
    </div>
  )
}
