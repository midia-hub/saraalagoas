'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { MessageSquare, ArrowLeft, Save } from 'lucide-react'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { Button } from '@/components/ui/Button'
import { adminFetchJson } from '@/lib/admin-client'

export default function MensagensConversaoPage() {
  const [accepted, setAccepted] = useState('')
  const [reconciled, setReconciled] = useState('')
  const [loading, setLoading] = useState(true)
  const [saveLoading, setSaveLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminFetchJson<{ accepted: string; reconciled: string }>('/api/admin/consolidacao/conversion-messages')
      setAccepted(data.accepted ?? '')
      setReconciled(data.reconciled ?? '')
    } catch {
      setError('Erro ao carregar mensagens.')
      setAccepted('')
      setReconciled('')
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
    setError(null)
    setSuccess(false)
    try {
      await adminFetchJson('/api/admin/consolidacao/conversion-messages', {
        method: 'PATCH',
        body: JSON.stringify({ accepted: accepted.trim(), reconciled: reconciled.trim() }),
      })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch {
      setError('Erro ao salvar. Tente novamente.')
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
                <MessageSquare className="text-[#c62737]" size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Mensagens de conversão</h1>
                <p className="text-slate-500">Texto exibido na página de sucesso após cadastrar uma conversão</p>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-800 text-sm">
            Mensagens salvas com sucesso.
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
            Carregando...
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-8">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                <h2 className="text-lg font-semibold text-slate-800">Quem aceitou a Jesus</h2>
                <p className="text-sm text-slate-500">Exibido quando o convertido escolheu &quot;Aceitou&quot;</p>
              </div>
              <div className="p-6">
                <textarea
                  value={accepted}
                  onChange={(e) => setAccepted(e.target.value)}
                  rows={14}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20 outline-none resize-y text-slate-800"
                  placeholder="Digite a mensagem para quem aceitou..."
                />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                <h2 className="text-lg font-semibold text-slate-800">Quem se reconciliou</h2>
                <p className="text-sm text-slate-500">Exibido quando o convertido escolheu &quot;Reconciliou&quot;</p>
              </div>
              <div className="p-6">
                <textarea
                  value={reconciled}
                  onChange={(e) => setReconciled(e.target.value)}
                  rows={14}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20 outline-none resize-y text-slate-800"
                  placeholder="Digite a mensagem para quem se reconciliou..."
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" loading={saveLoading}>
                <Save size={18} />
                Salvar mensagens
              </Button>
            </div>
          </form>
        )}

        <p className="mt-6 text-sm text-slate-500">
          A primeira linha da tela de sucesso é montada automaticamente com &quot;Querido(a) [nome] irmão(ã) em Cristo,&quot; de acordo com o gênero informado no formulário. O conteúdo acima é exibido em seguida.
        </p>
      </div>
    </PageAccessGuard>
  )
}
