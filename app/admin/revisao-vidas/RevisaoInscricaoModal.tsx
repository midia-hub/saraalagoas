'use client'

import { useState, useEffect, useCallback } from 'react'
import { adminFetchJson } from '@/lib/admin-client'
import { Loader2, X, Check } from 'lucide-react'

interface InscricaoModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  eventId?: string
  events?: Array<{ id: string; name: string; start_date: string }>
}

export function RevisaoInscricaoModal({
  isOpen,
  onClose,
  onSuccess,
  eventId: defaultEventId,
  events = [],
}: InscricaoModalProps) {
  const [step, setStep] = useState<'evento' | 'pessoa' | 'pre-revisao' | 'resumo'>('evento')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Estado do formulário
  const [selectedEventId, setSelectedEventId] = useState(defaultEventId || '')
  const [selectedPersonId, setSelectedPersonId] = useState('')
  const [preRevisaoAplicado, setPreRevisaoAplicado] = useState(false)
  const [pessoas, setPessoas] = useState<Array<{ id: string; full_name: string; mobile_phone?: string }>>([])
  const [filteredPessoas, setFilteredPessoas] = useState<typeof pessoas>([])
  const [pessoaSearch, setPessoaSearch] = useState('')

  // Buscar pessoas ao abrir modal
  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    setError('')
    setStep('evento')
    setSelectedEventId(defaultEventId || '')
    setSelectedPersonId('')
    setPreRevisaoAplicado(false)
    setPessoaSearch('')

    adminFetchJson('/api/admin/consolidacao/pessoas?limit=500')
      .then((d: any) => {
        setPessoas(d.pessoas || [])
        setFilteredPessoas(d.pessoas || [])
      })
      .catch((e: any) => setError(e.message || 'Erro ao carregar pessoas'))
      .finally(() => setLoading(false))
  }, [isOpen, defaultEventId])

  // Filtrar pessoas durante busca
  useEffect(() => {
    if (!pessoaSearch.trim()) {
      setFilteredPessoas(pessoas)
      return
    }
    const q = pessoaSearch.toLowerCase()
    setFilteredPessoas(
      pessoas.filter((p) =>
        (p.full_name || '').toLowerCase().includes(q) || (p.mobile_phone || '').includes(q)
      )
    )
  }, [pessoaSearch, pessoas])

  const selectedPessoa = pessoas.find((p) => p.id === selectedPersonId)
  const selectedEvent = events.find((e) => e.id === selectedEventId)

  async function handleSubmit() {
    if (!selectedEventId || !selectedPersonId) {
      setError('Selecione evento e pessoa')
      return
    }

    setSaving(true)
    setError('')
    try {
      await adminFetchJson(`/api/admin/consolidacao/revisao/registrations`, {
        method: 'POST',
        body: JSON.stringify({
          event_id: selectedEventId,
          person_id: selectedPersonId,
          pre_revisao_aplicado: preRevisaoAplicado,
        }),
      })
      onSuccess()
      onClose()
    } catch (e: any) {
      setError(e.message || 'Erro ao inscrever pessoa')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/45"
        onClick={onClose}
      />

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h2 className="text-lg font-bold text-slate-900">Nova Inscrição</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-6">
          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          {/* Passo 1: Evento */}
          {step === 'evento' && (
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-700">
                Selecione o Evento
              </label>
              {loading ? (
                <div className="flex items-center justify-center py-8 text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  <span>Carregando…</span>
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {events.map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => {
                        setSelectedEventId(e.id)
                        setStep('pessoa')
                      }}
                      className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-colors ${
                        selectedEventId === e.id
                          ? 'border-purple-600 bg-purple-50 text-purple-900'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <p className="font-semibold">{e.name}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(e.start_date).toLocaleDateString('pt-BR')}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Passo 2: Pessoa */}
          {step === 'pessoa' && (
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-700">
                Selecione a Pessoa
              </label>
              {selectedEvent && (
                <p className="text-xs text-slate-500">Evento: {selectedEvent.name}</p>
              )}
              <input
                type="text"
                placeholder="Buscar por nome ou telefone…"
                value={pessoaSearch}
                onChange={(e) => setPessoaSearch(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-purple-500 outline-none text-sm"
              />
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {filteredPessoas.length === 0 ? (
                  <p className="text-center text-sm text-slate-400 py-4">Nenhuma pessoa encontrada</p>
                ) : (
                  filteredPessoas.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSelectedPersonId(p.id)
                        setStep('pre-revisao')
                      }}
                      className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-colors ${
                        selectedPersonId === p.id
                          ? 'border-purple-600 bg-purple-50 text-purple-900'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <p className="font-semibold">{p.full_name}</p>
                      {p.mobile_phone && (
                        <p className="text-xs text-slate-500">{p.mobile_phone}</p>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Passo 3: Pré-Revisão */}
          {step === 'pre-revisao' && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-2">
                  Pré-Revisão foi aplicado?
                </p>
                {selectedEvent && (
                  <p className="text-xs text-slate-500 mb-3">Evento: {selectedEvent.name}</p>
                )}
                {selectedPessoa && (
                  <p className="text-xs text-slate-500 mb-3">Pessoa: {selectedPessoa.full_name}</p>
                )}
              </div>

              <div className="space-y-2">
                {[
                  { value: true, label: 'Sim, foi aplicado', icon: '✓' },
                  { value: false, label: 'Não, ainda não foi aplicado', icon: '✗' },
                ].map((option) => (
                  <button
                    key={String(option.value)}
                    type="button"
                    onClick={() => setPreRevisaoAplicado(option.value)}
                    className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-colors ${
                      preRevisaoAplicado === option.value
                        ? 'border-purple-600 bg-purple-50 text-purple-900'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <p className="font-semibold">{option.label}</p>
                  </button>
                ))}
              </div>

              <p className="text-xs text-slate-500 mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                ⚠️ O Pré-Revisão é <strong>obrigatório</strong> para que a inscrição seja validada.
              </p>
            </div>
          )}

          {/* Passo 4: Resumo */}
          {step === 'resumo' && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <div>
                  <p className="text-xs text-slate-500">Evento</p>
                  <p className="font-semibold text-slate-900">{selectedEvent?.name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Pessoa</p>
                  <p className="font-semibold text-slate-900">{selectedPessoa?.full_name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Pré-Revisão</p>
                  <p className={`font-semibold ${preRevisaoAplicado ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {preRevisaoAplicado ? '✓ Aplicado' : '✗ Não aplicado'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex gap-3">
          {step === 'resumo' ? (
            <>
              <button
                type="button"
                onClick={() => setStep('pre-revisao')}
                className="flex-1 px-4 py-2 rounded-lg border-2 border-slate-200 text-slate-700 font-semibold hover:bg-slate-100"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                className="flex-1 px-4 py-2 rounded-lg bg-purple-600 text-white font-semibold hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? 'Inscrevendo…' : 'Confirmar Inscrição'}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 rounded-lg border-2 border-slate-200 text-slate-700 font-semibold hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (step === 'evento' && selectedEventId) {
                    setStep('pessoa')
                  } else if (step === 'pessoa' && selectedPersonId) {
                    setStep('pre-revisao')
                  } else if (step === 'pre-revisao') {
                    setStep('resumo')
                  }
                }}
                disabled={
                  (step === 'evento' && !selectedEventId) ||
                  (step === 'pessoa' && !selectedPersonId) ||
                  loading
                }
                className="flex-1 px-4 py-2 rounded-lg bg-purple-600 text-white font-semibold hover:bg-purple-700 disabled:opacity-50"
              >
                Próximo
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
