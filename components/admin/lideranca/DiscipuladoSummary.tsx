import { Users, TrendingUp, Award } from 'lucide-react'

interface SummaryProps {
  totalDisciples: number
  avgAttendance: number
  activeDisciples: number
  loading?: boolean
}

const cards = [
  {
    key: 'total',
    label: 'Total de Discípulos',
    icon: Users,
    color: 'text-[#c62737]',
    bg: 'bg-[#c62737]/8',
    border: 'border-[#c62737]/20',
  },
  {
    key: 'avg',
    label: 'Frequência Média',
    icon: TrendingUp,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
  {
    key: 'active',
    label: 'Assíduos (≥ 75%)',
    icon: Award,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
]

export function DiscipuladoSummary({ totalDisciples, avgAttendance, activeDisciples, loading }: SummaryProps) {
  const values = [
    totalDisciples.toString(),
    `${avgAttendance.toFixed(1)}%`,
    activeDisciples.toString(),
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map((card, i) => {
        const Icon = card.icon
        return (
          <div
            key={card.key}
            className={`relative flex items-center gap-4 rounded-2xl border ${card.border} bg-white p-5 shadow-sm overflow-hidden`}
          >
            {/* Detalhe de fundo */}
            <div className={`absolute -right-3 -bottom-3 w-20 h-20 rounded-full opacity-[0.07] ${card.bg.replace('bg-', 'bg-')} scale-150 blur-md`} />

            <div className={`rounded-xl ${card.bg} ${card.color} p-3 shrink-0`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider truncate">{card.label}</p>
              {loading ? (
                <div className="h-7 w-16 bg-slate-100 animate-pulse rounded mt-1" />
              ) : (
                <p className="text-2xl font-bold text-slate-800 leading-tight">{values[i]}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
