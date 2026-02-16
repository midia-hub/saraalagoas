'use client'

import { useState, useEffect } from 'react'
import { Loader2, Send } from 'lucide-react'
import { siteConfig as defaultConfig } from '@/config/site'
import type { SiteConfig } from '@/lib/types'
import { adminFetchJson } from '@/lib/admin-client'
import { Toast } from '@/components/Toast'

export interface DisparosLogEntry {
  id: string
  phone: string
  nome: string
  conversion_type: string
  status_code: number | null
  source: string
  created_at: string
}

export function AdminSiteConfig() {
  const [config, setConfig] = useState<SiteConfig>(defaultConfig as SiteConfig)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [disparosLog, setDisparosLog] = useState<DisparosLogEntry[]>([])
  const [disparosLogLoading, setDisparosLogLoading] = useState(true)

  useEffect(() => {
    adminFetchJson<{ value?: unknown }>('/api/admin/site-config')
      .then((data) => {
        if (data?.value && typeof data.value === 'object') {
          setConfig((c) => ({ ...c, ...defaultConfig, ...(data.value as Record<string, unknown>) } as SiteConfig))
        }
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    adminFetchJson<{ items: DisparosLogEntry[] }>('/api/admin/disparos-log')
      .then((data) => setDisparosLog(data.items ?? []))
      .catch(() => setDisparosLog([]))
      .finally(() => setDisparosLogLoading(false))
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    setSaving(true)
    try {
      await adminFetchJson('/api/admin/site-config', {
        method: 'PUT',
        body: JSON.stringify({ value: config }),
      })
      setMessage({ type: 'ok', text: 'Configurações salvas. A página inicial será atualizada ao recarregar.' })
    } catch {
      setMessage({ type: 'err', text: 'Não foi possível salvar. Tente novamente.' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-gray-600">Carregando configurações...</p>

  return (
    <div className="max-w-3xl">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Ajustes do Site</h2>
      <p className="text-gray-600 mb-6">
        Altere as informações exibidas na página inicial e no menu. Salve ao final.
      </p>
      <form onSubmit={handleSave} className="space-y-8">
        {/* Geral */}
        <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">Geral</h3>
          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome do site</label>
              <input
                value={config.name}
                onChange={(e) => setConfig((c) => ({ ...c, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
              <textarea
                value={config.description}
                onChange={(e) => setConfig((c) => ({ ...c, description: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL do site</label>
              <input
                value={config.url}
                onChange={(e) => setConfig((c) => ({ ...c, url: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        </section>

        {/* WhatsApp e redes */}
        <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">WhatsApp e redes sociais</h3>
          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Número WhatsApp (com DDI, sem +)</label>
              <input
                value={config.whatsappNumber}
                onChange={(e) => setConfig((c) => ({ ...c, whatsappNumber: e.target.value }))}
                placeholder="5582999999999"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem geral WhatsApp</label>
              <input
                value={config.whatsappMessages.general}
                onChange={(e) => setConfig((c) => ({
                  ...c,
                  whatsappMessages: { ...c.whatsappMessages, general: e.target.value },
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Instagram (URL)</label>
                <input
                  value={config.social.instagram}
                  onChange={(e) => setConfig((c) => ({ ...c, social: { ...c.social, instagram: e.target.value } }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">YouTube (URL)</label>
                <input
                  value={config.social.youtube}
                  onChange={(e) => setConfig((c) => ({ ...c, social: { ...c.social, youtube: e.target.value } }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Menu */}
        <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">Menu do site</h3>
          <p className="text-sm text-gray-600 mb-4">
            Cada item tem um <strong>id</strong> (âncora na página, ex: cultos, celula) e um <strong>label</strong> (texto no menu).
          </p>
          <div className="space-y-3">
            {config.menuItems.map((item, i) => (
              <div key={item.id} className="flex gap-3 items-center">
                <input
                  value={item.id}
                  onChange={(e) => {
                    const next = [...config.menuItems]
                    next[i] = { ...next[i], id: e.target.value }
                    setConfig((c) => ({ ...c, menuItems: next }))
                  }}
                  placeholder="id"
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <input
                  value={item.label}
                  onChange={(e) => {
                    const next = [...config.menuItems]
                    next[i] = { ...next[i], label: e.target.value }
                    setConfig((c) => ({ ...c, menuItems: next }))
                  }}
                  placeholder="Label"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setConfig((c) => ({ ...c, menuItems: [...c.menuItems, { id: '', label: '' }] }))}
              className="text-sm text-[#c62737] hover:underline"
            >
              + Adicionar item
            </button>
            {config.menuItems.length > 1 && (
              <button
                type="button"
                onClick={() => setConfig((c) => ({ ...c, menuItems: c.menuItems.slice(0, -1) }))}
                className="text-sm text-gray-500 hover:underline"
              >
                Remover último
              </button>
            )}
          </div>
        </section>

        {/* Endereço */}
        <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">Endereço</h3>
          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Endereço completo</label>
              <input
                value={config.address.full}
                onChange={(e) => setConfig((c) => ({ ...c, address: { ...c.address, full: e.target.value } }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Link do mapa (Google Maps)</label>
              <input
                value={config.address.mapUrl}
                onChange={(e) => setConfig((c) => ({ ...c, address: { ...c.address, mapUrl: e.target.value } }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL do iframe do mapa (embed)</label>
              <input
                value={config.address.embedUrl}
                onChange={(e) => setConfig((c) => ({ ...c, address: { ...c.address, embedUrl: e.target.value } }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        </section>

        {/* Cultos */}
        <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">Cultos</h3>
          <div className="space-y-4">
            {config.services.map((svc, i) => (
              <div key={svc.id} className="p-4 border border-gray-200 rounded-lg space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={svc.name}
                    onChange={(e) => {
                      const next = [...config.services]
                      next[i] = { ...next[i], name: e.target.value }
                      setConfig((c) => ({ ...c, services: next }))
                    }}
                    placeholder="Nome do culto"
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    value={svc.day}
                    onChange={(e) => {
                      const next = [...config.services]
                      next[i] = { ...next[i], day: e.target.value }
                      setConfig((c) => ({ ...c, services: next }))
                    }}
                    placeholder="Dia"
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={svc.time}
                    onChange={(e) => {
                      const next = [...config.services]
                      next[i] = { ...next[i], time: e.target.value }
                      setConfig((c) => ({ ...c, services: next }))
                    }}
                    placeholder="Horário"
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    value={svc.type}
                    onChange={(e) => {
                      const next = [...config.services]
                      next[i] = { ...next[i], type: e.target.value }
                      setConfig((c) => ({ ...c, services: next }))
                    }}
                    placeholder="Tipo (ex: Presencial)"
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <input
                  value={svc.description}
                  onChange={(e) => {
                    const next = [...config.services]
                    next[i] = { ...next[i], description: e.target.value }
                    setConfig((c) => ({ ...c, services: next }))
                  }}
                  placeholder="Descrição"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            ))}
          </div>
        </section>

        {/* Mensagens WhatsApp extras */}
        <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">Mensagens WhatsApp (oração, célula, imersão)</h3>
          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pedido de oração</label>
              <input
                value={config.whatsappMessages.prayer}
                onChange={(e) => setConfig((c) => ({
                  ...c,
                  whatsappMessages: { ...c.whatsappMessages, prayer: e.target.value },
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Célula</label>
              <input
                value={config.whatsappMessages.cell}
                onChange={(e) => setConfig((c) => ({
                  ...c,
                  whatsappMessages: { ...c.whatsappMessages, cell: e.target.value },
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Revisão/Imersão</label>
              <input
                value={config.whatsappMessages.immersion}
                onChange={(e) => setConfig((c) => ({
                  ...c,
                  whatsappMessages: { ...c.whatsappMessages, immersion: e.target.value },
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        </section>

        {/* Missão, Célula, Kids, Ofertas, Imersão - resumidos */}
        <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">Textos das seções</h3>
          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Missão (resumo)</label>
              <textarea
                value={config.mission.short}
                onChange={(e) => setConfig((c) => ({ ...c, mission: { ...c.mission, short: e.target.value } }))}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Célula - título</label>
              <input
                value={config.cell.title}
                onChange={(e) => setConfig((c) => ({ ...c, cell: { ...c.cell, title: e.target.value } }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Célula - descrição</label>
              <textarea
                value={config.cell.description}
                onChange={(e) => setConfig((c) => ({ ...c, cell: { ...c.cell, description: e.target.value } }))}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kids - título</label>
              <input
                value={config.kids.title}
                onChange={(e) => setConfig((c) => ({ ...c, kids: { ...c.kids, title: e.target.value } }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kids - descrição</label>
              <textarea
                value={config.kids.description}
                onChange={(e) => setConfig((c) => ({ ...c, kids: { ...c.kids, description: e.target.value } }))}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dízimos e Ofertas - título</label>
              <input
                value={config.offerings.title}
                onChange={(e) => setConfig((c) => ({ ...c, offerings: { ...c.offerings, title: e.target.value } }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dízimos - URL do link (pix/doação)</label>
              <input
                value={config.offerings.url}
                onChange={(e) => setConfig((c) => ({ ...c, offerings: { ...c.offerings, url: e.target.value } }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Imersão - título</label>
              <input
                value={config.immersion.title}
                onChange={(e) => setConfig((c) => ({ ...c, immersion: { ...c.immersion, title: e.target.value } }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Imersão - descrição</label>
              <textarea
                value={config.immersion.description}
                onChange={(e) => setConfig((c) => ({ ...c, immersion: { ...c.immersion, description: e.target.value } }))}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        </section>

        <Toast
          visible={!!message}
          message={message?.text ?? ''}
          type={message?.type ?? 'err'}
          onClose={() => setMessage(null)}
        />
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 bg-[#c62737] text-white font-medium rounded-lg hover:bg-[#a01f2d] disabled:opacity-50 flex items-center gap-2"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {saving ? 'Salvando...' : 'Salvar configurações'}
        </button>
      </form>

      {/* Log de disparos */}
      <section className="mt-12 bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Send className="text-[#c62737]" size={20} />
          Log de disparos
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Últimas chamadas ao webhook de disparos ao finalizar o formulário de consolidação (público ou admin).
        </p>
        {disparosLogLoading ? (
          <p className="text-gray-500 text-sm">Carregando...</p>
        ) : disparosLog.length === 0 ? (
          <p className="text-gray-500 text-sm">Nenhum registro ainda.</p>
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-2 font-medium text-gray-700">Data/Hora</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-700">Telefone</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-700">Nome</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-700">Tipo</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-700">Origem</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {disparosLog.map((row) => (
                  <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-2 text-gray-600">
                      {new Date(row.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="py-2 px-2 font-mono text-gray-800">{row.phone}</td>
                    <td className="py-2 px-2 text-gray-800">{row.nome}</td>
                    <td className="py-2 px-2 text-gray-600">{row.conversion_type === 'accepted' ? 'Aceitou' : 'Reconciliou'}</td>
                    <td className="py-2 px-2 text-gray-600">{row.source === 'admin' ? 'Admin' : 'Público'}</td>
                    <td className="py-2 px-2">
                      {row.status_code != null ? (
                        <span className={row.status_code >= 200 && row.status_code < 300 ? 'text-green-600' : 'text-red-600'}>
                          {row.status_code}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
