'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Send, ArrowLeft, Save, Loader2 } from 'lucide-react'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { Button } from '@/components/ui/Button'
import { adminFetchJson } from '@/lib/admin-client'

export interface DisparosLogEntry {
  id: string
  phone: string
  nome: string
  conversion_type: string
  status_code: number | null
  source: string
  created_at: string
}

export default function ApiDisparosPage() {
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saveLoading, setSaveLoading] = useState(false)
  const [disparosLog, setDisparosLog] = useState<DisparosLogEntry[]>([])
  const [disparosLogLoading, setDisparosLogLoading] = useState(true)

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

  const loadLog = useCallback(async () => {
    setDisparosLogLoading(true)
    try {
      const data = await adminFetchJson<{ items: DisparosLogEntry[] }>('/api/admin/disparos-log')
      setDisparosLog(data.items ?? [])
    } catch (err) {
      console.error('[API disparos] Erro ao carregar log:', err)
      setDisparosLog([])
    } finally {
      setDisparosLogLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    loadLog()
  }, [load, loadLog])

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
    <PageAccessGuard pageKey="consolidacao_config">
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

        {/* Log de disparos */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <Send className="text-[#c62737]" size={20} />
              Log de disparos
            </h3>
            <button
              onClick={loadLog}
              className="text-xs text-[#c62737] hover:underline font-medium"
            >
              Atualizar log
            </button>
          </div>
          
          <p className="text-sm text-slate-500 mb-4">
            Relatório de envios realizados independente da origem (site público, painel administrativo ou outros fluxos).
          </p>
          
          {disparosLogLoading ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 italic">
              Carregando registros...
            </div>
          ) : disparosLog.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 border-dashed">
              Nenhum disparo registrado ainda.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="text-left py-3 px-4 font-semibold text-slate-600">Data/Hora</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-600">Telefone</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-600">Nome</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-600">Tipo</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-600">Origem</th>
                      <th className="text-center py-3 px-4 font-semibold text-slate-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {disparosLog.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/30 transition-colors">
                        <td className="py-3 px-4 text-slate-500 text-xs">
                          {new Date(row.created_at).toLocaleString('pt-BR', { 
                            day: '2-digit', 
                            month: '2-digit', 
                            year: '2-digit', 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-700">{row.phone}</td>
                        <td className="py-3 px-4 font-medium text-slate-900">{row.nome}</td>
                        <td className="py-3 px-4">
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold uppercase whitespace-nowrap">
                            {row.conversion_type === 'accepted' ? 'Aceitou' : 
                             row.conversion_type === 'reconciled' ? 'Reconciliou' : 
                             row.conversion_type === 'reserva_solicitada' ? 'Sol. Reserva' :
                             row.conversion_type === 'reserva_aprovada' ? 'Res. Aprovada' :
                             row.conversion_type === 'reserva_rejeitada' ? 'Res. Rejeitada' :
                             row.conversion_type || 'Outro'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs font-medium text-slate-400 uppercase">
                          {row.source === 'admin' ? 'Painel' : row.source === 'reservas' ? 'Reserva' : 'Site'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {row.status_code != null ? (
                            <span className={`inline-flex items-center gap-1 font-bold text-xs ${row.status_code >= 200 && row.status_code < 300 ? 'text-green-600' : 'text-red-600'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${row.status_code >= 200 && row.status_code < 300 ? 'bg-green-500' : 'bg-red-500'}`} />
                              {row.status_code}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageAccessGuard>
  )
}
