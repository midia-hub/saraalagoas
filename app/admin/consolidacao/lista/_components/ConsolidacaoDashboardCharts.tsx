'use client'

import {
  ClipboardList, Church, Grid3X3, Users,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LabelList,
} from 'recharts'

const CHART_COLORS = {
  primaryLight: '#fef2f2',
  accepted: '#16a34a',
  reconciled: '#2563eb',
  culto: '#b91c1c',
  church: '#c62737',
  team: '#7c3aed',
  cell: '#0d9488',
  grid: '#f1f5f9',
  axis: '#64748b',
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color?: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
      {label && <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</p>}
      <p className="text-sm font-bold text-slate-800">
        <span className="inline-block w-2 h-2 rounded-full mr-2 align-middle" style={{ backgroundColor: item.color }} />
        {item.value} {item.value === 1 ? 'conversão' : 'conversões'}
      </p>
    </div>
  )
}

interface ConversaoItem {
  church_id?: string | null
  cell_id?: string | null
  team_id?: string | null
}

interface Church {
  id: string
  name: string
}

interface Team {
  id: string
  name: string
}

interface Cell {
  id: string
  name: string
}

export type ChartBar = { name: string; count: number; fill: string }
export type ChartPie = { name: string; value: number; fill: string }

type Props = {
  conversoes: ConversaoItem[]
  chartByTipo: ChartPie[]
  chartByCulto: ChartBar[]
  chartByChurch: ChartBar[]
  chartByTeam: ChartBar[]
  chartByCell: ChartBar[]
}

const axisStyle = { fontSize: 12, fill: CHART_COLORS.axis, fontFamily: 'inherit' as const }
const barMargin = { top: 8, right: 24, left: 8, bottom: 8 }

export function ConsolidacaoDashboardCharts({
  conversoes,
  chartByTipo,
  chartByCulto,
  chartByChurch,
  chartByTeam,
  chartByCell,
}: Props) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
            <ClipboardList className="text-red-600" size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500">Total de conversões</p>
            <p className="text-2xl font-bold text-slate-800">{conversoes.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
            <Church className="text-green-600" size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500">Igrejas com registros</p>
            <p className="text-2xl font-bold text-slate-800">{new Set(conversoes.map(c => c.church_id).filter(Boolean)).size}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
            <Grid3X3 className="text-purple-600" size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500">Células com registros</p>
            <p className="text-2xl font-bold text-slate-800">{new Set(conversoes.map(c => c.cell_id).filter(Boolean)).size}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
            <Users className="text-blue-600" size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500">Equipes com registros</p>
            <p className="text-2xl font-bold text-slate-800">{new Set(conversoes.map(c => c.team_id).filter(Boolean)).size}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200/80 overflow-hidden">
          <div className="px-6 pt-6 pb-2 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-800">Aceitou x Reconciliou</h3>
            <p className="text-sm text-slate-500 mt-0.5">Distribuição por tipo de decisão</p>
          </div>
          <div className="p-6">
            {chartByTipo.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                  <Pie
                    data={chartByTipo}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    paddingAngle={3}
                    stroke="white"
                    strokeWidth={2}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, value }: { name?: string; value?: number }) => `${name ?? ''} (${value ?? 0})`}
                    labelLine={{ stroke: CHART_COLORS.axis, strokeWidth: 1 }}
                  >
                    {chartByTipo.map((_, i) => (
                      <Cell key={i} fill={chartByTipo[i].fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} cursor={false} wrapperStyle={{ outline: 'none' }} />
                  <Legend layout="horizontal" align="center" verticalAlign="bottom" wrapperStyle={{ paddingTop: 16 }} formatter={(value, entry) => (
                    <span className="text-sm font-medium text-slate-700">
                      <span className="inline-block w-3 h-3 rounded-full mr-2 align-middle" style={{ backgroundColor: (entry as { color?: string }).color }} />
                      {value}
                    </span>
                  )} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-500 text-center py-12">Nenhum dado ainda</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-200/80 overflow-hidden">
          <div className="px-6 pt-6 pb-2 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-800">Conversões por culto</h3>
            <p className="text-sm text-slate-500 mt-0.5">Quantidade por culto ou evento</p>
          </div>
          <div className="p-6">
            {chartByCulto.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartByCulto} margin={{ top: 16, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} horizontal={true} vertical={false} />
                  <XAxis dataKey="name" tick={{ ...axisStyle, fontSize: 11 }} axisLine={{ stroke: CHART_COLORS.grid }} tickLine={false} />
                  <YAxis type="number" tick={axisStyle} axisLine={false} tickLine={false} width={32} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: CHART_COLORS.primaryLight, opacity: 0.4 }} />
                  <Bar dataKey="count" name="Conversões" fill={CHART_COLORS.culto} radius={[8, 8, 0, 0]} maxBarSize={48}>
                    <LabelList dataKey="count" position="top" style={axisStyle} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-500 text-center py-12">Nenhum dado ainda</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-200/80 overflow-hidden">
          <div className="px-6 pt-6 pb-2 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-800">Conversões por igreja</h3>
            <p className="text-sm text-slate-500 mt-0.5">Quantidade por igreja</p>
          </div>
          <div className="p-6">
            {chartByChurch.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartByChurch} margin={barMargin}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} horizontal={true} vertical={false} />
                  <XAxis dataKey="name" tick={{ ...axisStyle, fontSize: 11 }} axisLine={{ stroke: CHART_COLORS.grid }} tickLine={false} />
                  <YAxis type="number" tick={axisStyle} axisLine={false} tickLine={false} width={32} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: CHART_COLORS.primaryLight, opacity: 0.4 }} />
                  <Bar dataKey="count" name="Conversões" fill={CHART_COLORS.church} radius={[8, 8, 0, 0]} maxBarSize={48}>
                    <LabelList dataKey="count" position="top" style={axisStyle} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-500 text-center py-12">Nenhum dado ainda</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-200/80 overflow-hidden">
          <div className="px-6 pt-6 pb-2 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-800">Conversões por equipe</h3>
            <p className="text-sm text-slate-500 mt-0.5">Quantidade por equipe</p>
          </div>
          <div className="p-6">
            {chartByTeam.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartByTeam} margin={barMargin}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} horizontal={true} vertical={false} />
                  <XAxis dataKey="name" tick={{ ...axisStyle, fontSize: 11 }} axisLine={{ stroke: CHART_COLORS.grid }} tickLine={false} />
                  <YAxis type="number" tick={axisStyle} axisLine={false} tickLine={false} width={32} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f5f3ff', opacity: 0.5 }} />
                  <Bar dataKey="count" name="Conversões" fill={CHART_COLORS.team} radius={[8, 8, 0, 0]} maxBarSize={48}>
                    <LabelList dataKey="count" position="top" style={axisStyle} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-500 text-center py-12">Nenhum dado ainda</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-200/80 overflow-hidden lg:col-span-2">
          <div className="px-6 pt-6 pb-2 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-800">Conversões por célula</h3>
            <p className="text-sm text-slate-500 mt-0.5">Quantidade por célula</p>
          </div>
          <div className="p-6">
            {chartByCell.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartByCell} margin={{ top: 16, right: 16, left: 0, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} horizontal={true} vertical={false} />
                  <XAxis dataKey="name" tick={{ ...axisStyle, fontSize: 10 }} axisLine={{ stroke: CHART_COLORS.grid }} tickLine={false} />
                  <YAxis type="number" tick={axisStyle} axisLine={false} tickLine={false} width={32} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: '#ccfbf1', opacity: 0.4 }} />
                  <Bar dataKey="count" name="Conversões" fill={CHART_COLORS.cell} radius={[8, 8, 0, 0]} maxBarSize={48}>
                    <LabelList dataKey="count" position="top" style={axisStyle} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-500 text-center py-12">Nenhum dado ainda</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
