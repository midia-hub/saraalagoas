'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { UserCircle, Search, UserPlus, Upload, MessageCircle, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { CustomSelect } from '@/components/ui/CustomSelect'
import { PeopleTable } from '@/components/admin/people/PeopleTable'
import { PeopleImportModal } from '@/components/admin/people/PeopleImportModal'
import { adminFetchJson } from '@/lib/admin-client'
import { useAdminAccess } from '@/lib/admin-access-context'
import type { Person } from '@/lib/types/person'
import Link from 'next/link'
import { DatePickerInput } from '@/components/ui/DatePickerInput'
import { fetchPeople } from '@/lib/people'

export default function PessoasPage() {
  const access = useAdminAccess()
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [churchProfile, setChurchProfile] = useState('')
  const [churchSituation, setChurchSituation] = useState('')
  const [churchRole, setChurchRole] = useState('')
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [disparoModalOpen, setDisparoModalOpen] = useState(false)
  const [disparoMessageId, setDisparoMessageId] = useState<'culto'|'arena'|'momento'>('culto')
  const [disparoData, setDisparoData] = useState('')
  const [disparoHora, setDisparoHora] = useState('')
  const [disparoTexto, setDisparoTexto] = useState('')
  const [disparoLoading, setDisparoLoading] = useState(false)
  const [disparoResult, setDisparoResult] = useState<{ type: 'ok' | 'err'; message: string } | null>(null)
  const [disparoSuccessCount, setDisparoSuccessCount] = useState(0)
  const [disparoErrorCount, setDisparoErrorCount] = useState(0)
  const [disparoQueue, setDisparoQueue] = useState<string[]>([])
  const [disparoProgress, setDisparoProgress] = useState<{ total: number; done: number; success: number; error: number }>({ total: 0, done: 0, success: 0, error: 0 })
  const disparoActiveRef = useRef(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await fetchPeople({
        q: q || undefined,
        church_profile: churchProfile || undefined,
        church_situation: churchSituation || undefined,
        church_role: churchRole || undefined,
      })
      setPeople(list)
    } catch (e) {
      setPeople([])
      setError(e instanceof Error ? e.message : 'Erro ao carregar pessoas.')
    } finally {
      setLoading(false)
    }
  }, [q, churchProfile, churchSituation, churchRole])

  useEffect(() => {
    load()
  }, [load])

  function openDisparoModal() {
    setDisparoMessageId('culto')
    setDisparoData('')
    setDisparoHora('')
    setDisparoTexto('')
    setDisparoResult(null)
    setDisparoSuccessCount(0)
    setDisparoErrorCount(0)
    setDisparoModalOpen(true)
  }

  async function processDisparoQueue(queue: string[], msgId: string, variables: Record<string, string>) {
    disparoActiveRef.current = true
    setDisparoProgress({ total: queue.length, done: 0, success: 0, error: 0 })
    let success = 0, error = 0, done = 0
    for (const id of queue) {
      if (!disparoActiveRef.current) break
      try {
        await adminFetchJson(`/api/admin/pessoas/${id}/disparar`, {
          method: 'POST',
          body: JSON.stringify({ messageId: msgId, variables }),
        }).then(r => r?.ok !== false ? success++ : error++)
      } catch { error++ }
      done++
      setDisparoProgress({ total: queue.length, done, success, error })
    }
    disparoActiveRef.current = false
    setDisparoQueue([])
  }

  function cancelDisparoQueue() {
    disparoActiveRef.current = false
    setDisparoQueue([])
  }

  async function handleDisparo(e: React.FormEvent) {
    e.preventDefault()
    if (selectedIds.length === 0) return
    const variables: Record<string, string> = {}
    if (disparoMessageId === 'culto' || disparoMessageId === 'arena') {
      if (!disparoData) { setDisparoResult({ type: 'err', message: 'Informe a data do evento.' }); return }
      if (!disparoHora.trim()) { setDisparoResult({ type: 'err', message: 'Informe o horário do evento.' }); return }
      variables.data = formatDataBR(disparoData)
      variables.hora = disparoHora.trim()
    }
    if (disparoMessageId === 'momento') {
      if (!disparoTexto.trim()) { setDisparoResult({ type: 'err', message: 'Informe o texto da mensagem devocional.' }); return }
      variables.texto = disparoTexto.trim()
    }
    setDisparoQueue(selectedIds)
    setDisparoModalOpen(false)
    setDisparoResult(null)
    setTimeout(() => {
      processDisparoQueue(
        selectedIds,
        disparoMessageId === 'culto' ? '16155aa7-ce8f-4bba-a37a-b4d60c04782f' : disparoMessageId === 'arena' ? 'bfaa202b-e385-4c2f-9fe5-ce0b026b80c5' : 'fc1e2ddf-dea2-4422-abf8-f36df567e678',
        variables
      )
    }, 300)
    setSelectedIds([])
  }

  function formatDataBR(ymd: string): string {
    if (!ymd || ymd.length < 10) return ymd
    const MESES_PT = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']
    const [y, m, d] = ymd.slice(0, 10).split('-').map(Number)
    if (!y || !m || !d) return ymd
    return `${d} de ${MESES_PT[m - 1]} de ${y}`
  }

  return (
    <PageAccessGuard pageKey="pessoas">
      <div className="p-6 md:p-8">
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#c62737]/10 flex items-center justify-center">
              <UserCircle className="text-[#c62737]" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Pessoas</h1>
              <p className="text-slate-500">Cadastro central de pessoas</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {access.isAdmin && (
              <button
                type="button"
                onClick={() => setImportModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-50 transition-all"
              >
                <Upload size={18} />
                Importar XLSX
              </button>
            )}
            <Link
              href="/admin/pessoas/novo"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#c62737] text-white font-semibold hover:bg-[#a62030] transition-all shadow-lg shadow-[#c62737]/20 active:scale-[0.98]"
            >
              <UserPlus size={20} />
              Cadastrar Pessoa
            </Link>
          </div>
        </div>

        <div className="mb-4 flex items-center gap-3">
          <button
            type="button"
            disabled={selectedIds.length === 0}
            onClick={openDisparoModal}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-blue-200 text-blue-700 text-sm font-medium hover:bg-blue-50 transition-colors ${selectedIds.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <MessageCircle size={18} /> Disparar mensagem
          </button>
          {selectedIds.length > 0 && <span className="text-xs text-slate-500">{selectedIds.length} selecionada(s)</span>}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="search"
                  id="people-search"
                  name="people-search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Nome, telefone, e-mail ou CPF..."
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  data-lpignore="true"
                  data-1p-ignore="true"
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Perfil</label>
              <CustomSelect value={churchProfile} onChange={setChurchProfile} placeholder="Todos" options={[{ value: 'Membro', label: 'Membro' }, { value: 'Frequentador', label: 'Frequentador' }, { value: 'Visitante', label: 'Visitante' }]} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Situação</label>
              <CustomSelect value={churchSituation} onChange={setChurchSituation} placeholder="Todos" options={[{ value: 'Ativo', label: 'Ativo' }, { value: 'Inativo', label: 'Inativo' }]} />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">Função</label>
            <div className="max-w-xs">
              <CustomSelect
                value={churchRole}
                onChange={setChurchRole}
                placeholder="Todas"
                options={[
                  { value: 'Nenhum', label: 'Nenhum' }, { value: 'Obreiro', label: 'Obreiro' }, { value: 'Voluntário', label: 'Voluntário' },
                  { value: 'Diácono', label: 'Diácono' }, { value: 'Cooperador', label: 'Cooperador' }, { value: 'Missionário', label: 'Missionário' }, { value: 'Pastor', label: 'Pastor' }, { value: 'Bispo', label: 'Bispo' },
                ]}
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
            {error}
          </div>
        )}
        <PeopleTable
          people={people}
          loading={loading}
          selectedIds={selectedIds}
          onSelectIds={setSelectedIds}
        />

        {importModalOpen && (
          <PeopleImportModal
            onClose={() => setImportModalOpen(false)}
            onImported={() => {
              load()
            }}
          />
        )}
        {disparoModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-lg max-w-lg w-full p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <MessageCircle className="text-blue-600" size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Disparar mensagem para {selectedIds.length} pessoa(s)</h2>
                </div>
              </div>
              <form onSubmit={handleDisparo} className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-2">Escolha a mensagem</p>
                  <div className="grid grid-cols-1 gap-2">
                    {[{id:'culto',label:'Hoje é dia de culto!',emoji:'⛪',desc:'Convite para culto',vars:['data','hora']},{id:'arena',label:'Hoje é dia de ARENA!',emoji:'🔥',desc:'Convite para Arena',vars:['data','hora']},{id:'momento',label:'Momento com Deus',emoji:'🙏',desc:'Devocional',vars:['texto']}].map((msg) => (
                      <label
                        key={msg.id}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          disparoMessageId === msg.id
                            ? 'border-[#c62737] bg-[#c62737]/5 ring-1 ring-[#c62737]/30'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <input
                          type="radio"
                          name="disparoMsg"
                          value={msg.id}
                          checked={disparoMessageId === msg.id}
                          onChange={() => { setDisparoMessageId(msg.id as any); setDisparoResult(null) }}
                          className="accent-[#c62737]"
                        />
                        <span className="text-xl">{msg.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800">{msg.label}</p>
                          <p className="text-xs text-slate-500">{msg.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                {(disparoMessageId === 'culto' || disparoMessageId === 'arena') && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Data do evento</label>
                      <DatePickerInput
                        value={disparoData}
                        onChange={setDisparoData}
                        placeholder="dd/mm/aaaa"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Horário</label>
                      <input
                        type="text"
                        value={disparoHora}
                        onChange={(e) => setDisparoHora(e.target.value)}
                        placeholder="ex: 19h ou 19h30"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 hover:border-slate-300 focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20 outline-none transition-all text-sm"
                      />
                    </div>
                  </div>
                )}
                {disparoMessageId === 'momento' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Texto devocional</label>
                    <textarea
                      value={disparoTexto}
                      onChange={(e) => setDisparoTexto(e.target.value)}
                      placeholder="Digite ou cole aqui o texto do momento com Deus..."
                      rows={5}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 hover:border-slate-300 focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20 outline-none transition-all text-sm resize-none"
                    />
                  </div>
                )}
                {disparoResult && (
                  <div
                    className={`flex items-center gap-2 p-3 rounded-xl text-sm font-medium ${
                      disparoResult.type === 'ok'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                    }`}
                  >
                    {disparoResult.type === 'ok'
                      ? <CheckCircle2 size={16} className="shrink-0" />
                      : <XCircle size={16} className="shrink-0" />
                    }
                    {disparoResult.message}
                  </div>
                )}
                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setDisparoModalOpen(false)
                      setDisparoResult(null)
                    }}
                    className="flex-1 px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={disparoLoading}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#c62737] text-white font-medium hover:bg-[#a62030] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {disparoLoading ? (
                      <><Loader2 size={18} className="animate-spin" /> Enviando...</>
                    ) : (
                      <><MessageCircle size={18} /> Enviar mensagem</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Barra de progresso de disparo em lote */}
        {disparoQueue.length > 0 && (
          <div className="fixed bottom-0 left-0 w-full z-50">
            <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-t-2xl shadow-lg p-4 flex items-center gap-4">
              <MessageCircle size={24} className="text-blue-600" />
              <div className="flex-1">
                <div className="text-sm font-medium text-slate-800 mb-1">Enviando mensagens...</div>
                <div className="w-full bg-slate-100 rounded-xl h-3 mb-1 overflow-hidden">
                  <div
                    className="bg-[#c62737] h-3 rounded-xl transition-all"
                    style={{ width: `${(disparoProgress.done / disparoProgress.total) * 100}%` }}
                  />
                </div>
                <div className="text-xs text-slate-600">{disparoProgress.done} de {disparoProgress.total} enviados &nbsp;|&nbsp; Sucesso: {disparoProgress.success} &nbsp;|&nbsp; Erros: {disparoProgress.error}</div>
              </div>
              <button
                type="button"
                onClick={cancelDisparoQueue}
                className="px-3 py-2 rounded-xl border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50"
              >Cancelar</button>
            </div>
          </div>
        )}
      </div>
    </PageAccessGuard>
  )
}
