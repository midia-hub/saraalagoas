'use client'

import { useState, useEffect } from 'react'
import {
  Loader2, ArrowUp, ArrowDown, Eye, EyeOff,
  Image, Clock, Users, User, Share2, Heart, MapPin, Target, Album,
  GripVertical, MonitorSmartphone
} from 'lucide-react'
import { adminFetchJson } from '@/lib/admin-client'
import { Toast } from '@/components/Toast'
import { siteConfig as defaultConfig } from '@/config/site'
import Button from '@/components/Button'

const ALL_SECTIONS = [
  { id: 'hero',       label: 'Destaque (Hero)',      desc: 'Banner principal com foto e chamada', icon: MonitorSmartphone, color: 'bg-violet-50 border-violet-200 text-violet-600' },
  { id: 'services',   label: 'Cultos e Horários',    desc: 'Grade de horários dos cultos',        icon: Clock,             color: 'bg-blue-50 border-blue-200 text-blue-600' },
  { id: 'cell',       label: 'Células',               desc: 'Convite para participar de célula',   icon: Users,             color: 'bg-green-50 border-green-200 text-green-600' },
  { id: 'leadership', label: 'Liderança',             desc: 'Fotos e nome dos líderes',            icon: User,              color: 'bg-amber-50 border-amber-200 text-amber-600' },
  { id: 'social',     label: 'Redes Sociais',         desc: 'Feed do Instagram e links',           icon: Share2,            color: 'bg-pink-50 border-pink-200 text-pink-600' },
  { id: 'prayer',     label: 'Pedidos de Oração',     desc: 'Formulário de pedido de oração',      icon: Heart,             color: 'bg-rose-50 border-rose-200 text-rose-600' },
  { id: 'location',   label: 'Localização / Mapa',   desc: 'Endereço e mapa interativo',          icon: MapPin,            color: 'bg-teal-50 border-teal-200 text-teal-600' },
  { id: 'mission',    label: 'Nossa Missão',          desc: 'Texto sobre a missão da igreja',      icon: Target,            color: 'bg-orange-50 border-orange-200 text-orange-600' },
  { id: 'gallery',    label: 'Galeria de Fotos',      desc: 'Álbuns e fotos recentes',             icon: Album,             color: 'bg-indigo-50 border-indigo-200 text-indigo-600' },
]

const DEFAULT_LAYOUT = ALL_SECTIONS.map(s => s.id)

export function LayoutBuilder() {
  const [layout, setLayout] = useState<string[]>(DEFAULT_LAYOUT)
  const [hidden, setHidden] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    adminFetchJson<{ value?: Record<string, unknown> }>('/api/admin/site-config')
      .then((data) => {
        if (data?.value && typeof data.value === 'object') {
          const stored = data.value as Record<string, unknown>
          const storedLayout = stored.layout
          const storedHidden = stored.hiddenSections
          if (Array.isArray(storedLayout) && storedLayout.length > 0) {
            setLayout(storedLayout as string[])
          } else {
            setLayout(DEFAULT_LAYOUT)
          }
          if (Array.isArray(storedHidden)) {
            setHidden(storedHidden as string[])
          }
        }
      })
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    setMessage(null)
    try {
      // Busca a config atual antes de salvar para não sobrescrever outros campos
      const current = await adminFetchJson<{ value?: unknown }>('/api/admin/site-config')
      const base = (current?.value && typeof current.value === 'object') ? current.value as object : {}
      await adminFetchJson('/api/admin/site-config', {
        method: 'PUT',
        body: JSON.stringify({ value: { ...base, layout, hiddenSections: hidden } }),
      })
      setMessage({ type: 'ok', text: 'Layout salvo! A página inicial será atualizada.' })
    } catch {
      setMessage({ type: 'err', text: 'Não foi possível salvar. Tente novamente.' })
    } finally {
      setSaving(false)
    }
  }

  function toggleVisibility(id: string) {
    setHidden(h => h.includes(id) ? h.filter(x => x !== id) : [...h, id])
  }

  function moveUp(index: number) {
    const next = [...layout]
    ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
    setLayout(next)
  }

  function moveDown(index: number) {
    const next = [...layout]
    ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
    setLayout(next)
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3 py-12 text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin" />
        Carregando layout...
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">
        {/* ---- Coluna principal: lista de seções ---- */}
        <div>
          <p className="text-sm text-slate-500 mb-4 flex items-center gap-1.5">
            <GripVertical className="w-4 h-4" />
            Use as setas para reordenar. O olho controla a visibilidade na página inicial.
          </p>

          <div className="space-y-2">
            {layout.map((sectionId, index) => {
              const meta = ALL_SECTIONS.find(s => s.id === sectionId)
              if (!meta) return null
              const Icon = meta.icon
              const isHidden = hidden.includes(sectionId)
              const position = index + 1

              return (
                <div
                  key={sectionId}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    isHidden
                      ? 'bg-slate-50 border-slate-200 opacity-60'
                      : 'bg-white border-slate-200 shadow-sm hover:border-[#c62737]/30'
                  }`}
                >
                  {/* Número de posição */}
                  <span className={`flex-shrink-0 w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center ${
                    isHidden ? 'bg-slate-200 text-slate-400' : 'bg-[#c62737]/10 text-[#c62737]'
                  }`}>
                    {position}
                  </span>

                  {/* Ícone da seção */}
                  <div className={`flex-shrink-0 w-9 h-9 rounded-lg border flex items-center justify-center ${meta.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${isHidden ? 'text-slate-400' : 'text-slate-800'}`}>
                      {meta.label}
                    </p>
                    <p className="text-xs text-slate-400 truncate">{meta.desc}</p>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => toggleVisibility(sectionId)}
                      title={isHidden ? 'Mostrar seção' : 'Ocultar seção'}
                      className={`p-1.5 rounded-lg transition-colors ${
                        isHidden
                          ? 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                          : 'text-slate-400 hover:text-[#c62737] hover:bg-[#c62737]/5'
                      }`}
                    >
                      {isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <div className="w-px h-5 bg-slate-200 mx-0.5" />
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveUp(index)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-[#c62737] hover:bg-[#c62737]/5 disabled:opacity-30 disabled:hover:text-slate-400 disabled:hover:bg-transparent transition-colors"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={index === layout.length - 1}
                      onClick={() => moveDown(index)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-[#c62737] hover:bg-[#c62737]/5 disabled:opacity-30 disabled:hover:text-slate-400 disabled:hover:bg-transparent transition-colors"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ---- Coluna lateral: preview wireframe ---- */}
        <div className="lg:sticky lg:top-6">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Pré-visualização</p>
          <div className="rounded-2xl border-2 border-slate-200 bg-white overflow-hidden shadow-md">
            {/* Barra do "browser/app" */}
            <div className="bg-slate-800 px-3 py-2 flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
              <div className="flex-1 mx-3 h-4 rounded bg-slate-700 text-xs text-slate-400 flex items-center px-2 truncate">
                saraalagoas.com
              </div>
            </div>

            {/* Header fixo */}
            <div className="bg-slate-900 h-7 flex items-center px-3 gap-2">
              <div className="w-10 h-2.5 rounded bg-white/20" />
              <div className="flex-1" />
              <div className="flex gap-1.5">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="w-6 h-1.5 rounded bg-white/20" />
                ))}
              </div>
            </div>

            {/* Seções visuais */}
            <div className="flex flex-col divide-y divide-slate-100 max-h-[480px] overflow-auto">
              {layout.map((sectionId, index) => {
                const meta = ALL_SECTIONS.find(s => s.id === sectionId)
                if (!meta) return null
                const Icon = meta.icon
                const isHidden = hidden.includes(sectionId)
                if (isHidden) return null

                const heights: Record<string, string> = {
                  hero: 'h-12',
                  services: 'h-10',
                  cell: 'h-9',
                  leadership: 'h-8',
                  social: 'h-8',
                  prayer: 'h-7',
                  location: 'h-9',
                  mission: 'h-7',
                  gallery: 'h-8',
                }

                return (
                  <div key={sectionId} className={`flex items-center gap-2 px-3 ${heights[sectionId] || 'h-8'}`}>
                    <Icon className={`w-3 h-3 flex-shrink-0 ${meta.color.split(' ')[2]}`} />
                    <div className="flex-1 space-y-1">
                      <div className="h-1.5 bg-slate-200 rounded w-3/4" />
                      <div className="h-1 bg-slate-100 rounded w-1/2" />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Footer */}
            <div className="bg-slate-800 h-6" />
          </div>

          {/* Legenda */}
          <div className="mt-3 space-y-1">
            <p className="text-xs font-medium text-slate-500">
              Visíveis: <span className="text-[#c62737] font-semibold">{layout.filter(id => !hidden.includes(id)).length}</span>
              &nbsp;/&nbsp;
              Ocultas: <span className="text-slate-400 font-semibold">{hidden.length}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Botão salvar */}
      <div className="flex items-center gap-4 pt-2">
        <Button
          type="button"
          onClick={handleSave}
          loading={saving}
          className="px-6 py-2.5"
        >
          {saving ? 'Salvando...' : 'Salvar layout'}
        </Button>
      </div>

      <Toast
        visible={!!message}
        message={message?.text ?? ''}
        type={message?.type ?? 'err'}
        onClose={() => setMessage(null)}
      />
    </div>
  )
}
