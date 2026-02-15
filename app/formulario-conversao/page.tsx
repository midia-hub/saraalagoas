'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { UserPlus, MapPin, Phone, Mail, User, Save, X, ChevronDown, ChevronRight, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { CustomSelect } from '@/components/ui/CustomSelect'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { DatePickerInput } from '@/components/ui/DatePickerInput'
import { CreatableCombobox } from '@/components/admin/CreatableCombobox'
import { getTodayBrasilia } from '@/lib/date-utils'

const CULTO_OPTIONS = [
  { value: 'culto-familia', label: 'Culto da Família' },
  { value: 'culto-presenca-deus', label: 'Culto da Presença de Deus' },
  { value: 'culto-fe-milagres', label: 'Culto de Fé e Milagres (Campanha)' },
  { value: 'arena', label: 'Arena' },
  { value: 'arena-xp', label: 'Arena XP' },
  { value: 'celebracoes-profeticas', label: 'Celebrações Proféticas' },
  { value: 'sara-conference', label: 'Sara Conference' },
  { value: 'ddd', label: 'DDD' },
  { value: 'outro', label: 'Outro' },
]

export default function FormularioConversaoPublicoPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    dataNascimento: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    cep: '',
    dataConversao: getTodayBrasilia(),
    culto: '',
    observacoes: '',
    conversion_type: '' as '' | 'accepted' | 'reconciled',
    instagram: '',
    genero: '' as '' | 'M' | 'F',
  })
  const [cultoOutroTexto, setCultoOutroTexto] = useState('')
  const [consolidatorId, setConsolidatorId] = useState<string | undefined>(undefined)
  const [consolidatorText, setConsolidatorText] = useState('')
  const [consolidatorLabel, setConsolidatorLabel] = useState('')
  const [cellId, setCellId] = useState<string | undefined>(undefined)
  const [cellText, setCellText] = useState('')
  const [cellLabel, setCellLabel] = useState('')
  const [churchId, setChurchId] = useState('')
  const [teamId, setTeamId] = useState('')
  const [churches, setChurches] = useState<{ id: string; name: string }[]>([])
  const [teams, setTeams] = useState<{ id: string; name: string; church_id: string | null }[]>([])
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [openSections, setOpenSections] = useState({ pessoais: true, endereco: false, conversao: false })
  const [cepLoading, setCepLoading] = useState(false)
  const [cepError, setCepError] = useState<string | null>(null)

  const toggleSection = (key: keyof typeof openSections) => setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }))
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setErrorMessage(null)
    if (name === 'cep') setCepError(null)
  }

  const fetchAddressByCep = useCallback(async () => {
    const digits = formData.cep.replace(/\D/g, '')
    if (digits.length !== 8) {
      setCepError('CEP deve ter 8 dígitos.')
      return
    }
    setCepError(null)
    setCepLoading(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
      const data = await res.json()
      if (data.erro) {
        setCepError('CEP não encontrado.')
        return
      }
      setFormData((prev) => ({
        ...prev,
        endereco: data.logradouro || prev.endereco,
        bairro: data.bairro || prev.bairro,
        cidade: data.localidade || prev.cidade,
        estado: (data.uf || prev.estado).toUpperCase(),
      }))
    } catch {
      setCepError('Não foi possível buscar o CEP. Tente novamente.')
    } finally {
      setCepLoading(false)
    }
  }, [formData.cep])

  useEffect(() => {
    fetch('/api/public/consolidacao/churches')
      .then((r) => r.json())
      .then((data) => setChurches(data.items ?? []))
      .catch(() => setChurches([]))
    fetch('/api/public/consolidacao/teams')
      .then((r) => r.json())
      .then((data) => setTeams(data.items ?? []))
      .catch(() => setTeams([]))
  }, [])
  useEffect(() => {
    if (churches.length === 0 || churchId !== '') return
    const padrao = churches.find((c) => c.name === 'Sara Sede Alagoas')
    if (padrao) setChurchId(padrao.id)
  }, [churches, churchId])
  const teamsByChurch = churchId ? teams.filter((t) => t.church_id === churchId) : []

  const fetchCellsLookup = useCallback(async (q: string) => {
    const params = new URLSearchParams()
    params.set('q', q)
    if (churchId) params.set('church_id', churchId)
    const res = await fetch(`/api/public/consolidacao/cells?${params}`)
    const data = await res.json().catch(() => ({}))
    return { items: data.items ?? [] }
  }, [churchId])

  const fetchPeopleLookup = useCallback(async (q: string) => {
    const res = await fetch(`/api/public/consolidacao/people?q=${encodeURIComponent(q)}`)
    const data = await res.json().catch(() => ({}))
    return { items: data.items ?? [] }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    const cultoEnvio =
      formData.culto === 'outro' && cultoOutroTexto.trim()
        ? `Outro - ${cultoOutroTexto.trim()}`
        : formData.culto
    if (!formData.culto) {
      setErrorMessage('Culto/Evento é obrigatório.')
      return
    }
    if (formData.culto === 'outro' && !cultoOutroTexto.trim()) {
      setErrorMessage('Informe qual culto ou evento quando selecionar "Outro".')
      return
    }
    if (!churchId) {
      setErrorMessage('Igreja é obrigatória.')
      return
    }
    if (!formData.conversion_type) {
      setErrorMessage('Aceitou ou Reconciliou é obrigatório.')
      return
    }
    if (!formData.genero) {
      setErrorMessage('Gênero é obrigatório.')
      return
    }
    setLoading(true)
    try {
      const enderecoCompleto =
        [formData.endereco.trim(), formData.numero.trim(), formData.complemento.trim()].filter(Boolean).join(', ') +
        (formData.bairro.trim() ? ` - ${formData.bairro.trim()}` : '')
      const payload = {
        nome: formData.nome.trim(),
        email: formData.email.trim() || undefined,
        telefone: formData.telefone.trim(),
        dataNascimento: formData.dataNascimento || undefined,
        endereco: enderecoCompleto || undefined,
        bairro: formData.bairro.trim() || undefined,
        cidade: formData.cidade.trim() || undefined,
        estado: formData.estado.trim() || undefined,
        cep: formData.cep.trim() || undefined,
        dataConversao: formData.dataConversao,
        culto: cultoEnvio,
        observacoes: formData.observacoes.trim() || undefined,
        consolidator_person_id: consolidatorId || undefined,
        consolidator_name_text: consolidatorText.trim() || undefined,
        cell_id: cellId || undefined,
        cell_name_text: cellText.trim() || undefined,
        church_id: churchId,
        team_id: teamId || undefined,
        gender: formData.genero,
        conversion_type: formData.conversion_type,
        instagram: formData.instagram.trim() || undefined,
      }
      const res = await fetch('/api/public/consolidacao/conversao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const text = await res.text()
      let data: { error?: string } = {}
      try {
        if (text) data = JSON.parse(text) as { error?: string }
      } catch {
        if (text) data = { error: text }
      }
      if (!res.ok) {
        const msg = data?.error || (res.status === 500 ? 'Erro no servidor. Veja o terminal onde o Next.js está rodando para mais detalhes.' : 'Erro ao salvar.')
        setErrorMessage(msg)
        return
      }
      const nomeParam = encodeURIComponent(formData.nome.trim())
      router.push(`/formulario-conversao/sucesso?nome=${nomeParam}&genero=${formData.genero}&tipo=${formData.conversion_type}`)
    } catch {
      setErrorMessage('Erro ao enviar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex flex-col items-center">
          <div className="relative w-28 h-28 mb-4">
            <Image src="/logo-sara-oficial.png" alt="Logo" fill className="object-contain" priority />
          </div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-red-600 flex items-center justify-center shadow-lg">
              <UserPlus className="text-white" size={24} />
            </div>
            <div className="text-center">
              <h1 className="text-3xl font-bold text-slate-800">Formulário de Conversão</h1>
              <p className="text-slate-500">Registre sua decisão por Jesus</p>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
            <X className="text-red-600 shrink-0" size={20} />
            <div>
              <p className="font-semibold text-red-800">Erro ao salvar</p>
              <p className="text-sm text-red-600">{errorMessage}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Dados Pessoais */}
          <div className="border-b border-slate-200">
            <button
              type="button"
              onClick={() => toggleSection('pessoais')}
              className="w-full flex items-center justify-between gap-2 p-4 md:p-6 bg-red-50 hover:bg-red-100/80 border-l-4 border-red-500 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <User className="text-red-600 shrink-0" size={20} />
                <h2 className="text-xl font-bold text-red-700">Dados Pessoais</h2>
              </div>
              {openSections.pessoais ? <ChevronDown className="text-red-600 shrink-0" size={22} /> : <ChevronRight className="text-red-600 shrink-0" size={22} />}
            </button>
            {openSections.pessoais && (
              <div className="px-6 pb-6 pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label htmlFor="nome" className="block text-sm font-semibold text-slate-800 mb-2">Nome Completo *</label>
                  <input type="text" id="nome" name="nome" value={formData.nome} onChange={handleChange} required className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none" placeholder="Digite o nome completo" />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-slate-800 mb-2">E-mail</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none" placeholder="email@exemplo.com" />
                  </div>
                </div>
                <div>
                  <label htmlFor="telefone" className="block text-sm font-semibold text-slate-800 mb-2">Telefone *</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="tel" id="telefone" name="telefone" value={formData.telefone} onChange={handleChange} required className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none" placeholder="(00) 00000-0000" />
                  </div>
                </div>
                <div>
                  <label htmlFor="dataNascimento" className="block text-sm font-semibold text-slate-800 mb-2">Data de Nascimento</label>
                  <DatePickerInput
                    id="dataNascimento"
                    value={formData.dataNascimento}
                    onChange={(v) => setFormData((prev) => ({ ...prev, dataNascimento: v }))}
                    placeholder="dd/mm/aaaa"
                  />
                </div>
                <div>
                  <label htmlFor="instagram" className="block text-sm font-semibold text-slate-800 mb-2">Instagram</label>
                  <input type="text" id="instagram" name="instagram" value={formData.instagram} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none" placeholder="@usuario" />
                </div>
                <div>
                  <label htmlFor="genero" className="block text-sm font-semibold text-slate-800 mb-2">Gênero *</label>
                  <CustomSelect id="genero" value={formData.genero} onChange={(v) => setFormData((prev) => ({ ...prev, genero: v as '' | 'M' | 'F' }))} placeholder="Selecione" options={[{ value: 'M', label: 'Masculino' }, { value: 'F', label: 'Feminino' }]} allowEmpty={false} />
                </div>
              </div>
            )}
          </div>

          {/* Endereço */}
          <div className="border-b border-slate-200">
            <button type="button" onClick={() => toggleSection('endereco')} className="w-full flex items-center justify-between gap-2 p-4 md:p-6 bg-amber-50 hover:bg-amber-100/80 border-l-4 border-amber-500 transition-colors text-left">
              <div className="flex items-center gap-2">
                <MapPin className="text-amber-600 shrink-0" size={20} />
                <h2 className="text-xl font-bold text-amber-700">Endereço</h2>
              </div>
              {openSections.endereco ? <ChevronDown className="text-amber-600 shrink-0" size={22} /> : <ChevronRight className="text-amber-600 shrink-0" size={22} />}
            </button>
            {openSections.endereco && (
              <div className="px-6 pb-6 pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="cep" className="block text-sm font-semibold text-slate-800 mb-2">CEP</label>
                  <div className="flex gap-2">
                    <input type="text" id="cep" name="cep" value={formData.cep} onChange={handleChange} onBlur={() => formData.cep.replace(/\D/g, '').length === 8 && fetchAddressByCep()} className="flex-1 px-4 py-3 rounded-xl border border-slate-300 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none" placeholder="00000-000" maxLength={9} />
                    <Button type="button" variant="secondary" onClick={fetchAddressByCep} disabled={cepLoading} loading={cepLoading} className="shrink-0"><Search size={18} /> Buscar</Button>
                  </div>
                  {cepError && <p className="mt-1.5 text-sm text-amber-600">{cepError}</p>}
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="endereco" className="block text-sm font-semibold text-slate-800 mb-2">Endereço</label>
                  <input type="text" id="endereco" name="endereco" value={formData.endereco} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none" placeholder="Rua, número, complemento" />
                </div>
                <div>
                  <label htmlFor="numero" className="block text-sm font-semibold text-slate-800 mb-2">Número</label>
                  <input type="text" id="numero" name="numero" value={formData.numero} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none" placeholder="Nº" />
                </div>
                <div>
                  <label htmlFor="complemento" className="block text-sm font-semibold text-slate-800 mb-2">Complemento</label>
                  <input type="text" id="complemento" name="complemento" value={formData.complemento} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none" placeholder="Apto, bloco" />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="bairro" className="block text-sm font-semibold text-slate-800 mb-2">Bairro</label>
                  <input type="text" id="bairro" name="bairro" value={formData.bairro} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none" placeholder="Bairro" />
                </div>
                <div>
                  <label htmlFor="cidade" className="block text-sm font-semibold text-slate-800 mb-2">Cidade</label>
                  <input type="text" id="cidade" name="cidade" value={formData.cidade} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none" placeholder="Cidade" />
                </div>
                <div>
                  <label htmlFor="estado" className="block text-sm font-semibold text-slate-800 mb-2">Estado</label>
                  <input type="text" id="estado" name="estado" value={formData.estado} onChange={handleChange} maxLength={2} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none uppercase" placeholder="UF" />
                </div>
              </div>
            )}
          </div>

          {/* Dados da Conversão */}
          <div className="border-b border-slate-200">
            <button type="button" onClick={() => toggleSection('conversao')} className="w-full flex items-center justify-between gap-2 p-4 md:p-6 bg-emerald-50 hover:bg-emerald-100/80 border-l-4 border-emerald-500 transition-colors text-left">
              <div className="flex items-center gap-2">
                <UserPlus className="text-emerald-600 shrink-0" size={20} />
                <h2 className="text-xl font-bold text-emerald-700">Dados da Conversão</h2>
              </div>
              {openSections.conversao ? <ChevronDown className="text-emerald-600 shrink-0" size={22} /> : <ChevronRight className="text-emerald-600 shrink-0" size={22} />}
            </button>
            {openSections.conversao && (
              <div className="px-6 pb-6 pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="dataConversao" className="block text-sm font-semibold text-slate-800 mb-2">Data da Conversão *</label>
                  <DatePickerInput
                    id="dataConversao"
                    value={formData.dataConversao}
                    onChange={(v) => setFormData((prev) => ({ ...prev, dataConversao: v }))}
                    placeholder="dd/mm/aaaa"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="culto" className="block text-sm font-semibold text-slate-800 mb-2">Culto/Evento *</label>
                  <SearchableSelect id="culto" value={formData.culto} onChange={(v) => setFormData((prev) => ({ ...prev, culto: v }))} placeholder="Digite para filtrar ou selecione o culto/evento" options={CULTO_OPTIONS} />
                  {formData.culto === 'outro' && (
                    <div className="mt-3">
                      <label htmlFor="culto-outro" className="block text-sm font-semibold text-slate-800 mb-2">Informe qual</label>
                      <input type="text" id="culto-outro" value={cultoOutroTexto} onChange={(e) => setCultoOutroTexto(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none" placeholder="Digite o culto ou evento" />
                    </div>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="cell" className="block text-sm font-semibold text-slate-800 mb-2">Célula</label>
                  <CreatableCombobox
                    fetchItems={fetchCellsLookup}
                    selectedId={cellId}
                    selectedLabel={cellLabel}
                    freeText={cellText}
                    onChange={(id, text, label) => {
                      setCellId(id)
                      setCellText(text)
                      setCellLabel(label ?? '')
                    }}
                    placeholder="Busque ou digite a célula"
                    aria-label="Célula"
                  />
                </div>
                <div>
                  <label htmlFor="church" className="block text-sm font-semibold text-slate-800 mb-2">Igreja *</label>
                  <CustomSelect id="church" value={churchId} onChange={(v) => { setChurchId(v); setTeamId('') }} placeholder="Selecione a igreja" options={churches.map((c) => ({ value: c.id, label: c.name }))} />
                </div>
                <div>
                  <label htmlFor="team" className="block text-sm font-semibold text-slate-800 mb-2">Equipe</label>
                  <CustomSelect id="team" value={teamId} onChange={setTeamId} placeholder="Selecione a equipe" options={teamsByChurch.map((t) => ({ value: t.id, label: t.name }))} disabled={!churchId} />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="consolidator" className="block text-sm font-semibold text-slate-800 mb-2">Líder / Consolidador</label>
                  <CreatableCombobox
                    fetchItems={fetchPeopleLookup}
                    selectedId={consolidatorId}
                    selectedLabel={consolidatorLabel}
                    freeText={consolidatorText}
                    onChange={(id, text, label) => {
                      setConsolidatorId(id)
                      setConsolidatorText(text)
                      setConsolidatorLabel(label ?? '')
                    }}
                    placeholder="Busque ou digite o nome do líder/consolidador"
                    aria-label="Líder / Consolidador"
                  />
                </div>
                <div>
                  <label htmlFor="conversion_type" className="block text-sm font-semibold text-slate-800 mb-2">Aceitou ou Reconciliou *</label>
                  <CustomSelect id="conversion_type" value={formData.conversion_type} onChange={(v) => setFormData((prev) => ({ ...prev, conversion_type: v as '' | 'accepted' | 'reconciled' }))} placeholder="Selecione" options={[{ value: 'accepted', label: 'Aceitou' }, { value: 'reconciled', label: 'Reconciliou' }]} />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="observacoes" className="block text-sm font-semibold text-slate-800 mb-2">Observações</label>
                  <textarea id="observacoes" name="observacoes" value={formData.observacoes} onChange={handleChange} rows={4} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none resize-none" placeholder="Informações adicionais..." />
                </div>
              </div>
            )}
          </div>

          <div className="p-6 bg-slate-50 flex justify-end">
            <Button type="submit" loading={loading}><Save size={18} /> Salvar Conversão</Button>
          </div>
        </form>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-sm text-blue-800"><strong>Dica:</strong> Preencha todos os campos obrigatórios (*) para registrar sua conversão.</p>
        </div>
      </div>
    </div>
  )
}
