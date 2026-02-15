'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  ClipboardList, Search, Filter, Calendar, Phone, Mail, MapPin, Edit,
  LayoutDashboard, List, Church, Users, Grid3X3, Target, Heart
} from 'lucide-react'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { CustomSelect } from '@/components/ui/CustomSelect'
import { adminFetchJson } from '@/lib/admin-client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LabelList
} from 'recharts'

const CHART_COLORS = {
  primary: '#c62737',
  primaryLight: '#fef2f2',
  accepted: '#16a34a',
  acceptedLight: '#dcfce7',
  reconciled: '#2563eb',
  reconciledLight: '#dbeafe',
  culto: '#b91c1c',
  church: '#c62737',
  team: '#7c3aed',
  cell: '#0d9488',
  grid: '#f1f5f9',
  axis: '#64748b',
  text: '#334155',
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

type ConversionType = '' | 'accepted' | 'reconciled'

interface ConversaoItem {
  id: string
  person_id?: string
  nome: string
  email?: string | null
  telefone: string
  cidade?: string | null
  estado?: string | null
  data_conversao: string
  culto?: string | null
  conversion_type?: ConversionType | null
  quem_indicou?: string | null
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
  church_id: string | null
}

interface Cell {
  id: string
  name: string
  church_id: string | null
}

const TIPO_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'accepted', label: 'Aceitou' },
  { value: 'reconciled', label: 'Reconciliou' },
]

const TIPO_LABEL: Record<string, string> = {
  accepted: 'Aceitou',
  reconciled: 'Reconciliou',
}

export default function ListaConvertidosPage() {
  const [activeTab, setActiveTab] = useState<'lista' | 'dashboard'>('lista')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCulto, setFilterCulto] = useState('')
  const [filterTipo, setFilterTipo] = useState<ConversionType>('')
  const [conversoes, setConversoes] = useState<ConversaoItem[]>([])
  const [churches, setChurches] = useState<Church[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [cells, setCells] = useState<Cell[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      adminFetchJson<{ conversoes: ConversaoItem[] }>('/api/admin/consolidacao/conversoes'),
      adminFetchJson<{ items: Church[] }>('/api/admin/consolidacao/churches'),
      adminFetchJson<{ items: Team[] }>('/api/admin/consolidacao/teams'),
      adminFetchJson<{ items: Cell[] }>('/api/admin/consolidacao/cells'),
    ])
      .then(([convRes, churchRes, teamRes, cellRes]) => {
        setConversoes(convRes.conversoes ?? [])
        setChurches(churchRes.items ?? [])
        setTeams(teamRes.items ?? [])
        setCells(cellRes.items ?? [])
      })
      .catch(() => {
        setConversoes([])
        setChurches([])
        setTeams([])
        setCells([])
      })
      .finally(() => setLoading(false))
  }, [])

  const cultoOptions = useMemo(() => {
    const set = new Set<string>()
    conversoes.forEach(c => {
      const v = (c.culto || '').trim()
      if (v) set.add(v)
    })
    return [{ value: '', label: 'Todos os cultos' }, ...Array.from(set).sort().map(v => ({ value: v, label: v }))]
  }, [conversoes])

  const filteredConversoes = useMemo(() => {
    return conversoes.filter(conversao => {
      const nome = (conversao.nome || '').toLowerCase()
      const email = (conversao.email || '').toLowerCase()
      const telefone = conversao.telefone || ''
      const matchSearch = !searchTerm || nome.includes(searchTerm.toLowerCase()) ||
        email.includes(searchTerm.toLowerCase()) ||
        telefone.includes(searchTerm)
      const cultoVal = conversao.culto || ''
      const matchCulto = !filterCulto || cultoVal === filterCulto
      const tipoVal = conversao.conversion_type || ''
      const matchTipo = !filterTipo || tipoVal === filterTipo
      return matchSearch && matchCulto && matchTipo
    })
  }, [conversoes, searchTerm, filterCulto, filterTipo])

  const formatDate = (dateString: string) => {
    if (!dateString) return '—'
    const date = new Date(dateString + 'T00:00:00')
    return date.toLocaleDateString('pt-BR')
  }

  const getDataConversao = (c: ConversaoItem) => new Date((c.data_conversao || '') + 'T00:00:00')

  const aceitouCount = conversoes.filter(c => c.conversion_type === 'accepted').length
  const reconciliouCount = conversoes.filter(c => c.conversion_type === 'reconciled').length
  const semTipoCount = conversoes.filter(c => !c.conversion_type).length
  const thisMonth = conversoes.filter(c => {
    const date = getDataConversao(c)
    const now = new Date()
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
  }).length
  const thisWeek = conversoes.filter(c => {
    const date = getDataConversao(c)
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    return date >= weekAgo
  }).length

  const chartByCulto = useMemo(() => {
    const map: Record<string, number> = {}
    conversoes.forEach(c => {
      const key = (c.culto || 'Não informado').trim() || 'Não informado'
      map[key] = (map[key] || 0) + 1
    })
    return Object.entries(map)
      .map(([name, count]) => ({ name, count, fill: CHART_COLORS.culto }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }, [conversoes])

  const chartByTipo = useMemo(() => [
    { name: 'Aceitou', value: aceitouCount, fill: CHART_COLORS.accepted },
    { name: 'Reconciliou', value: reconciliouCount, fill: CHART_COLORS.reconciled },
    { name: 'Não informado', value: semTipoCount, fill: '#94a3b8' },
  ].filter(d => d.value > 0), [aceitouCount, reconciliouCount, semTipoCount])

  const chartByChurch = useMemo(() => {
    const map: Record<string, number> = {}
    conversoes.forEach(c => {
      const id = c.church_id || ''
      const name = id ? (churches.find(ch => ch.id === id)?.name || 'Igreja') : 'Não informado'
      map[name] = (map[name] || 0) + 1
    })
    return Object.entries(map)
      .map(([name, count]) => ({ name, count, fill: CHART_COLORS.church }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
  }, [conversoes, churches])

  const chartByTeam = useMemo(() => {
    const map: Record<string, number> = {}
    conversoes.forEach(c => {
      const id = c.team_id || ''
      const name = id ? (teams.find(t => t.id === id)?.name || 'Equipe') : 'Não informado'
      map[name] = (map[name] || 0) + 1
    })
    return Object.entries(map)
      .map(([name, count]) => ({ name, count, fill: CHART_COLORS.team }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
  }, [conversoes, teams])

  const chartByCell = useMemo(() => {
    const map: Record<string, number> = {}
    conversoes.forEach(c => {
      const id = c.cell_id || ''
      const name = id ? (cells.find(cell => cell.id === id)?.name || 'Célula') : 'Não informado'
      map[name] = (map[name] || 0) + 1
    })
    return Object.entries(map)
      .map(([name, count]) => ({ name, count, fill: CHART_COLORS.cell }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
  }, [conversoes, cells])

  const axisStyle = { fontSize: 12, fill: CHART_COLORS.axis, fontFamily: 'inherit' }
  const barMargin = { top: 8, right: 24, left: 8, bottom: 8 }

  return (
    <PageAccessGuard pageKey="consolidacao">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-600 to-red-600 flex items-center justify-center shadow-lg">
                <ClipboardList className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-800">Convertidos</h1>
                <p className="text-slate-500">Lista de convertidos e dashboard de consolidação</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mt-6 p-1 bg-slate-100 rounded-xl w-fit">
              <button
                type="button"
                onClick={() => setActiveTab('lista')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all ${activeTab === 'lista' ? 'bg-white text-slate-800 shadow' : 'text-slate-600 hover:text-slate-800'}`}
              >
                <List size={18} />
                Lista
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all ${activeTab === 'dashboard' ? 'bg-white text-slate-800 shadow' : 'text-slate-600 hover:text-slate-800'}`}
              >
                <LayoutDashboard size={18} />
                Dashboard
              </button>
            </div>
          </div>

          {activeTab === 'lista' && (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="bg-white rounded-xl shadow-md border border-slate-200 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500 font-semibold mb-1">Total</p>
                      <p className="text-2xl font-bold text-slate-800">{conversoes.length}</p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <ClipboardList className="text-blue-600" size={20} />
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-md border border-slate-200 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500 font-semibold mb-1">Aceitou</p>
                      <p className="text-2xl font-bold text-green-600">{aceitouCount}</p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                      <Heart className="text-green-600" size={20} />
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-md border border-slate-200 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500 font-semibold mb-1">Reconciliou</p>
                      <p className="text-2xl font-bold text-blue-600">{reconciliouCount}</p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Target className="text-blue-600" size={20} />
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-md border border-slate-200 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500 font-semibold mb-1">Este Mês</p>
                      <p className="text-2xl font-bold text-slate-800">{thisMonth}</p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                      <Calendar className="text-amber-600" size={20} />
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-md border border-slate-200 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500 font-semibold mb-1">Esta Semana</p>
                      <p className="text-2xl font-bold text-slate-800">{thisWeek}</p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                      <Calendar className="text-purple-600" size={20} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-800 mb-2">Buscar</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Nome, e-mail ou telefone..."
                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-2">Tipo</label>
                    <CustomSelect
                      value={filterTipo}
                      onChange={(v) => setFilterTipo(v as ConversionType)}
                      placeholder="Todos"
                      options={TIPO_OPTIONS}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-2">Culto</label>
                    <div className="relative flex items-center gap-2">
                      <Filter className="shrink-0 text-slate-400" size={18} />
                      <div className="flex-1 min-w-0">
                        <CustomSelect
                          value={filterCulto}
                          onChange={setFilterCulto}
                          placeholder="Todos os cultos"
                          options={cultoOptions}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-800 uppercase tracking-wider">Nome</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-800 uppercase tracking-wider">Contato</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-800 uppercase tracking-wider">Localização</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-800 uppercase tracking-wider">Data</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-800 uppercase tracking-wider">Tipo</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-800 uppercase tracking-wider">Culto</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-800 uppercase tracking-wider">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {loading ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center">
                            <div className="w-8 h-8 border-2 border-[#c62737] border-t-transparent rounded-full animate-spin mx-auto" />
                          </td>
                        </tr>
                      ) : filteredConversoes.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center">
                            <div className="flex flex-col items-center gap-3">
                              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                                <Search className="text-slate-400" size={28} />
                              </div>
                              <p className="text-slate-500">Nenhuma conversão encontrada</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredConversoes.map((conversao) => (
                          <tr key={conversao.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-600 to-red-600 flex items-center justify-center text-white font-bold">
                                  {(conversao.nome || '?').charAt(0)}
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-800">{conversao.nome || '—'}</p>
                                  {conversao.quem_indicou && (
                                    <p className="text-xs text-slate-500">Por: {conversao.quem_indicou}</p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-sm text-slate-800">
                                  <Phone size={14} className="text-slate-400" />
                                  {conversao.telefone || '—'}
                                </div>
                                {conversao.email && (
                                  <div className="flex items-center gap-2 text-sm text-slate-500">
                                    <Mail size={14} className="text-slate-400" />
                                    {conversao.email}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2 text-sm text-slate-800">
                                <MapPin size={14} className="text-slate-400" />
                                {[conversao.cidade, conversao.estado].filter(Boolean).join(', ') || '—'}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2 text-sm text-slate-800">
                                <Calendar size={14} className="text-slate-400" />
                                {formatDate(conversao.data_conversao)}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                                conversao.conversion_type === 'accepted' ? 'bg-green-100 text-green-800' :
                                conversao.conversion_type === 'reconciled' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {TIPO_LABEL[conversao.conversion_type || ''] || '—'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                                {conversao.culto || '—'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {conversao.person_id && (
                                <Link
                                  href={`/admin/pessoas/${conversao.person_id}`}
                                  className="p-2 rounded-lg text-green-600 hover:bg-green-50 transition-colors inline-flex"
                                  title="Ver pessoa"
                                >
                                  <Edit size={18} />
                                </Link>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {filteredConversoes.length > 0 && (
                <div className="mt-6 flex justify-center">
                  <p className="text-sm text-slate-500">
                    Mostrando {filteredConversoes.length} de {conversoes.length} conversões
                  </p>
                </div>
              )}
            </>
          )}

          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Resumo */}
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
                {/* Aceitou x Reconciliou */}
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
                          <Tooltip
                            content={<ChartTooltip />}
                            cursor={false}
                            wrapperStyle={{ outline: 'none' }}
                          />
                          <Legend
                            layout="horizontal"
                            align="center"
                            verticalAlign="bottom"
                            wrapperStyle={{ paddingTop: 16 }}
                            formatter={(value, entry) => (
                              <span className="text-sm font-medium text-slate-700">
                                <span className="inline-block w-3 h-3 rounded-full mr-2 align-middle" style={{ backgroundColor: (entry as { color?: string }).color }} />
                                {value}
                              </span>
                            )}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-slate-500 text-center py-12">Nenhum dado ainda</p>
                    )}
                  </div>
                </div>

                {/* Por culto */}
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

                {/* Por igreja */}
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

                {/* Por equipe */}
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

                {/* Por célula */}
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
          )}
        </div>
      </div>
    </PageAccessGuard>
  )
}
