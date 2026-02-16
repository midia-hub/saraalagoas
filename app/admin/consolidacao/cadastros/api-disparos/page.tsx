'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Send, ArrowLeft, Save } from 'lucide-react'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { Button } from '@/components/ui/Button'
import { adminFetchJson } from '@/lib/admin-client'

export default function ApiDisparosPage() {
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saveLoading, setSaveLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await adminFetchJson<{ disparos_api_enabled: boolean }>('/api/admin/consolidacao/disparos-settings')
      setEnabled(data.disparos_api_enabled ?? false)
    } catch (err) {
      console.error('[API disparos] Erro ao carregar configuração:', err)
      setEnabled(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaveLoading(true)
    try {
      await adminFetchJson('/api/admin/consolidacao/disparos-settings', {
        method: 'PATCH',
        body: JSON.stringify({ disparos_api_enabled: enabled }),
      })
      console.log('[API disparos] Configuração salva com sucesso.')
    } catch (err) {
      console.error('[API disparos] Erro ao salvar:', err)
    } finally {
      setSaveLoading(false)
    }
  }

  return (
    <PageAccessGuard pageKey="consolidacao">
      <div className="p-6 md:p-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/consolidacao/cadastros"
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
            >
              <ArrowLeft size={20} />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#c62737]/10 flex items-center justify-center">
                <Send className="text-[#c62737]" size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">API de disparos</h1>
                <p className="text-slate-500">Envio automático de mensagem ao finalizar o formulário de consolidação</p>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
            Carregando...
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                <h2 className="text-lg font-semibold text-slate-800">Ativar API de disparos</h2>
                <p className="text-sm text-slate-500">
                  Quando ativa, ao finalizar o formulário de consolidação (público ou admin) será chamado o webhook de disparos com o telefone e nome do convertido. A mensagem enviada depende do tipo: &quot;Aceitou&quot; ou &quot;Reconciliou&quot;.
                </p>
              </div>
              <div className="p-6 flex items-center gap-4">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                    className="w-5 h-5 rounded border-slate-300 text-[#c62737] focus:ring-[#c62737]"
                  />
                  <span className="font-medium text-slate-800">API de disparos ativa</span>
                </label>
              </div>
            </div>

            <p className="text-sm text-slate-500">
              Configure no servidor as variáveis <code className="bg-slate-100 px-1 rounded">DISPAROS_WEBHOOK_URL</code> e <code className="bg-slate-100 px-1 rounded">DISPAROS_WEBHOOK_BEARER</code> para que o envio funcione.
            </p>

            <div className="flex justify-end">
              <Button type="submit" loading={saveLoading}>
                <Save size={18} />
                Salvar
              </Button>
            </div>
          </form>
        )}
      </div>
    </PageAccessGuard>
  )
}
