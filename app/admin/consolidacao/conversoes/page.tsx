'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, MapPin, Phone, Mail, User, Save, X, ChevronDown, ChevronRight, Search, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { upsertPersonAndConversion } from '@/lib/people'
import { CreatableCombobox } from '@/components/admin/CreatableCombobox'
import { CustomSelect } from '@/components/ui/CustomSelect'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { DatePickerInput } from '@/components/ui/DatePickerInput'
import { adminFetchJson } from '@/lib/admin-client'
import { getTodayBrasilia } from '@/lib/date-utils'

export default function FormularioConversaoPage() {
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
    const [consolidatorId, setConsolidatorId] = useState<string | undefined>(undefined)
    const [consolidatorText, setConsolidatorText] = useState('')
    const [consolidatorLabel, setConsolidatorLabel] = useState('')
    const [cellId, setCellId] = useState<string | undefined>(undefined)
    const [cellText, setCellText] = useState('')
    const [cellLabel, setCellLabel] = useState('')
    const [cultoOutroTexto, setCultoOutroTexto] = useState('')
    const [churchId, setChurchId] = useState('')
    const [teamId, setTeamId] = useState('')
    const [teamLabel, setTeamLabel] = useState('')
    const [churches, setChurches] = useState<{ id: string; name: string }[]>([])
    const [teams, setTeams] = useState<{ id: string; name: string; church_id: string | null }[]>([])

    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [openSections, setOpenSections] = useState({ pessoais: true, endereco: false, conversao: false })
    const toggleSection = (key: keyof typeof openSections) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }))
    const [cepLoading, setCepLoading] = useState(false)
    const [cepError, setCepError] = useState<string | null>(null)
    const router = useRouter()

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
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
            setFormData(prev => ({
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

    const fetchPeopleLookup = useCallback(async (q: string) => {
        const data = await adminFetchJson<{ items: { id: string; label: string }[] }>(
            `/api/admin/consolidacao/lookups/people?q=${encodeURIComponent(q)}`
        )
        return { items: data.items ?? [] }
    }, [])
    const fetchCellsLookup = useCallback(async (q: string) => {
        const data = await adminFetchJson<{ items: { id: string; label: string }[] }>(
            `/api/admin/consolidacao/lookups/cells?q=${encodeURIComponent(q)}`
        )
        return { items: data.items ?? [] }
    }, [])

    const loadChurchesAndTeams = useCallback(() => {
        adminFetchJson<{ items: { id: string; name: string }[] }>('/api/admin/consolidacao/churches')
            .then((data) => setChurches(data.items ?? []))
            .catch(() => setChurches([]))
        adminFetchJson<{ items: { id: string; name: string; church_id: string | null }[] }>('/api/admin/consolidacao/teams')
            .then((data) => setTeams(data.items ?? []))
            .catch(() => setTeams([]))
    }, [])

    useEffect(() => {
        loadChurchesAndTeams()
    }, [loadChurchesAndTeams])

    useEffect(() => {
        if (churches.length === 0 || churchId !== '' || cellId) return
        const padrao = churches.find((c) => c.name === 'Sara Sede Alagoas')
        if (padrao) setChurchId(padrao.id)
    }, [churches, churchId, cellId])

    useEffect(() => {
        if (!cellId) {
            setChurchId('')
            setTeamId('')
            setTeamLabel('')
            return
        }
        adminFetchJson<{ item: { church_id?: string | null; team_id?: string | null } }>(`/api/admin/consolidacao/cells/${cellId}`)
            .then((data) => {
                const c = data?.item
                if (c?.church_id) setChurchId(c.church_id)
                if (c?.team_id) setTeamId(c.team_id)
            })
            .catch(() => {})
    }, [cellId])

    useEffect(() => {
        if (teamId && teams.length > 0) {
            const name = teams.find((t) => t.id === teamId)?.name
            if (name) setTeamLabel(name)
        }
    }, [teamId, teams])

    const teamsByChurch = churchId ? teams.filter((t) => t.church_id === churchId) : []

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setErrorMessage(null)
        const cultoEnvio = formData.culto === 'outro' && cultoOutroTexto.trim()
            ? `Outro - ${cultoOutroTexto.trim()}`
            : (formData.culto || undefined)
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
            const enderecoCompleto = [formData.endereco.trim(), formData.numero.trim(), formData.complemento.trim()]
                    .filter(Boolean)
                    .join(', ') + (formData.bairro.trim() ? ` - ${formData.bairro.trim()}` : '')
                await upsertPersonAndConversion({
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
                culto: cultoEnvio!,
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
            })
            const nomeParam = encodeURIComponent(formData.nome.trim())
            const generoParam = formData.genero
            const tipoParam = formData.conversion_type
            router.push(`/admin/consolidacao/conversoes/sucesso?nome=${nomeParam}&genero=${generoParam}&tipo=${tipoParam}`)
        } catch (error) {
            console.error('Erro ao salvar conversão:', error)
            setErrorMessage(error instanceof Error ? error.message : 'Erro ao salvar conversão.')
        } finally {
            setLoading(false)
        }
    }

    const handleReset = () => {
        setFormData({
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
            conversion_type: '',
            instagram: '',
            genero: '',
        })
        setConsolidatorId(undefined)
        setConsolidatorText('')
        setConsolidatorLabel('')
        setCellId(undefined)
        setCellText('')
        setCellLabel('')
        setCultoOutroTexto('')
        setChurchId('')
        setTeamId('')
        setTeamLabel('')
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-600 to-red-600 flex items-center justify-center shadow-lg">
                                <UserPlus className="text-white" size={24} />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-slate-800">Formulário de Conversão</h1>
                                <p className="text-slate-500">Registre novos convertidos e acompanhe o crescimento da igreja</p>
                            </div>
                        </div>
                        <a
                            href="/formulario-conversao"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors"
                        >
                            <ExternalLink size={18} />
                            Abrir formulário fora do Admin
                        </a>
                    </div>
                </div>

                {/* Error Message */}
                {errorMessage && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                            <X className="text-red-600" size={20} />
                        </div>
                        <div>
                            <p className="font-semibold text-red-800">Erro ao salvar</p>
                            <p className="text-sm text-red-600">{errorMessage}</p>
                        </div>
                    </div>
                )}

                {/* Form */}
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
                                <label htmlFor="nome" className="block text-sm font-semibold text-slate-800 mb-2">
                                    Nome Completo *
                                </label>
                                <input
                                    type="text"
                                    id="nome"
                                    name="nome"
                                    value={formData.nome}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none transition-all duration-200"
                                    placeholder="Digite o nome completo"
                                />
                            </div>

                            <div>
                                <label htmlFor="email" className="block text-sm font-semibold text-slate-800 mb-2">
                                    E-mail
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none transition-all duration-200"
                                        placeholder="email@exemplo.com"
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="telefone" className="block text-sm font-semibold text-slate-800 mb-2">
                                    Telefone *
                                </label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="tel"
                                        id="telefone"
                                        name="telefone"
                                        value={formData.telefone}
                                        onChange={handleChange}
                                        required
                                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none transition-all duration-200"
                                        placeholder="(00) 00000-0000"
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="dataNascimento" className="block text-sm font-semibold text-slate-800 mb-2">
                                    Data de Nascimento
                                </label>
                                <DatePickerInput
                                    id="dataNascimento"
                                    value={formData.dataNascimento}
                                    onChange={(v) => setFormData((prev) => ({ ...prev, dataNascimento: v }))}
                                    placeholder="dd/mm/aaaa"
                                />
                            </div>

                            <div>
                                <label htmlFor="instagram" className="block text-sm font-semibold text-slate-800 mb-2">
                                    Instagram
                                </label>
                                <input
                                    type="text"
                                    id="instagram"
                                    name="instagram"
                                    value={formData.instagram}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none transition-all duration-200"
                                    placeholder="@usuario ou usuário"
                                />
                            </div>

                            <div>
                                <label htmlFor="genero" className="block text-sm font-semibold text-slate-800 mb-2">
                                    Gênero *
                                </label>
                                <CustomSelect
                                    id="genero"
                                    value={formData.genero}
                                    onChange={(v) => setFormData((prev) => ({ ...prev, genero: v as '' | 'M' | 'F' }))}
                                    placeholder="Selecione"
                                    options={[
                                        { value: 'M', label: 'Masculino' },
                                        { value: 'F', label: 'Feminino' },
                                    ]}
                                    allowEmpty={false}
                                />
                            </div>
                        </div>
                        )}
                    </div>

                    {/* Endereço */}
                    <div className="border-b border-slate-200">
                        <button
                            type="button"
                            onClick={() => toggleSection('endereco')}
                            className="w-full flex items-center justify-between gap-2 p-4 md:p-6 bg-amber-50 hover:bg-amber-100/80 border-l-4 border-amber-500 transition-colors text-left"
                        >
                            <div className="flex items-center gap-2">
                                <MapPin className="text-amber-600 shrink-0" size={20} />
                                <h2 className="text-xl font-bold text-amber-700">Endereço</h2>
                            </div>
                            {openSections.endereco ? <ChevronDown className="text-amber-600 shrink-0" size={22} /> : <ChevronRight className="text-amber-600 shrink-0" size={22} />}
                        </button>
                        {openSections.endereco && (
                        <div className="px-6 pb-6 pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="cep" className="block text-sm font-semibold text-slate-800 mb-2">
                                    CEP
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        id="cep"
                                        name="cep"
                                        value={formData.cep}
                                        onChange={handleChange}
                                        onBlur={() => formData.cep.replace(/\D/g, '').length === 8 && fetchAddressByCep()}
                                        className="flex-1 px-4 py-3 rounded-xl border border-slate-300 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none transition-all duration-200"
                                        placeholder="00000-000"
                                        maxLength={9}
                                    />
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={fetchAddressByCep}
                                        disabled={cepLoading}
                                        loading={cepLoading}
                                        className="shrink-0"
                                    >
                                        <Search size={18} />
                                        Buscar
                                    </Button>
                                </div>
                                {cepError && <p className="mt-1.5 text-sm text-amber-600">{cepError}</p>}
                            </div>

                            <div className="md:col-span-2">
                                <label htmlFor="endereco" className="block text-sm font-semibold text-slate-800 mb-2">
                                    Endereço
                                </label>
                                <input
                                    type="text"
                                    id="endereco"
                                    name="endereco"
                                    value={formData.endereco}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none transition-all duration-200"
                                    placeholder="Rua, avenida, etc. (ou use Buscar CEP)"
                                />
                            </div>

                            <div>
                                <label htmlFor="numero" className="block text-sm font-semibold text-slate-800 mb-2">
                                    Número
                                </label>
                                <input
                                    type="text"
                                    id="numero"
                                    name="numero"
                                    value={formData.numero}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none transition-all duration-200"
                                    placeholder="Nº"
                                />
                            </div>

                            <div>
                                <label htmlFor="complemento" className="block text-sm font-semibold text-slate-800 mb-2">
                                    Complemento
                                </label>
                                <input
                                    type="text"
                                    id="complemento"
                                    name="complemento"
                                    value={formData.complemento}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none transition-all duration-200"
                                    placeholder="Apto, bloco, etc."
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label htmlFor="bairro" className="block text-sm font-semibold text-slate-800 mb-2">
                                    Bairro
                                </label>
                                <input
                                    type="text"
                                    id="bairro"
                                    name="bairro"
                                    value={formData.bairro}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none transition-all duration-200"
                                    placeholder="Bairro"
                                />
                            </div>

                            <div>
                                <label htmlFor="cidade" className="block text-sm font-semibold text-slate-800 mb-2">
                                    Cidade
                                </label>
                                <input
                                    type="text"
                                    id="cidade"
                                    name="cidade"
                                    value={formData.cidade}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none transition-all duration-200"
                                    placeholder="Nome da cidade"
                                />
                            </div>

                            <div>
                                <label htmlFor="estado" className="block text-sm font-semibold text-slate-800 mb-2">
                                    Estado
                                </label>
                                <input
                                    type="text"
                                    id="estado"
                                    name="estado"
                                    value={formData.estado}
                                    onChange={handleChange}
                                    maxLength={2}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none transition-all duration-200 uppercase"
                                    placeholder="UF"
                                />
                            </div>
                        </div>
                        )}
                    </div>

                    {/* Dados da Conversão */}
                    <div className="border-b border-slate-200">
                        <button
                            type="button"
                            onClick={() => toggleSection('conversao')}
                            className="w-full flex items-center justify-between gap-2 p-4 md:p-6 bg-emerald-50 hover:bg-emerald-100/80 border-l-4 border-emerald-500 transition-colors text-left"
                        >
                            <div className="flex items-center gap-2">
                                <UserPlus className="text-emerald-600 shrink-0" size={20} />
                                <h2 className="text-xl font-bold text-emerald-700">Dados da Conversão</h2>
                            </div>
                            {openSections.conversao ? <ChevronDown className="text-emerald-600 shrink-0" size={22} /> : <ChevronRight className="text-emerald-600 shrink-0" size={22} />}
                        </button>
                        {openSections.conversao && (
                        <div className="px-6 pb-6 pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="dataConversao" className="block text-sm font-semibold text-slate-800 mb-2">
                                    Data da Conversão *
                                </label>
                                <DatePickerInput
                                    id="dataConversao"
                                    value={formData.dataConversao}
                                    onChange={(v) => setFormData((prev) => ({ ...prev, dataConversao: v }))}
                                    placeholder="dd/mm/aaaa"
                                    required
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label htmlFor="culto" className="block text-sm font-semibold text-slate-800 mb-2">
                                    Culto/Evento *
                                </label>
                                <SearchableSelect
                                    id="culto"
                                    value={formData.culto}
                                    onChange={(v) => setFormData((prev) => ({ ...prev, culto: v }))}
                                    placeholder="Digite para filtrar ou selecione o culto/evento"
                                    options={[
                                        { value: 'culto-familia', label: 'Culto da Família' },
                                        { value: 'culto-presenca-deus', label: 'Culto da Presença de Deus' },
                                        { value: 'culto-fe-milagres', label: 'Culto de Fé e Milagres (Campanha)' },
                                        { value: 'arena', label: 'Arena' },
                                        { value: 'arena-xp', label: 'Arena XP' },
                                        { value: 'celebracoes-profeticas', label: 'Celebrações Proféticas' },
                                        { value: 'sara-conference', label: 'Sara Conference' },
                                        { value: 'ddd', label: 'DDD' },
                                        { value: 'outro', label: 'Outro' },
                                    ]}
                                />
                                {formData.culto === 'outro' && (
                                    <div className="mt-3">
                                        <label htmlFor="culto-outro" className="block text-sm font-semibold text-slate-800 mb-2">
                                            Informe qual
                                        </label>
                                        <input
                                            type="text"
                                            id="culto-outro"
                                            value={cultoOutroTexto}
                                            onChange={(e) => setCultoOutroTexto(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none transition-all duration-200"
                                            placeholder="Digite o culto ou evento"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-slate-800 mb-2">
                                    Célula
                                </label>
                                <CreatableCombobox
                                    fetchItems={fetchCellsLookup}
                                    placeholder="Não pertence a uma célula"
                                    selectedId={cellId}
                                    selectedLabel={cellLabel}
                                    freeText={cellText}
                                    onChange={(id, text, selectedLabel) => {
                                        setCellId(id)
                                        setCellText(text)
                                        setCellLabel(selectedLabel ?? '')
                                    }}
                                    aria-label="Célula"
                                />
                            </div>

                            <div>
                                <label htmlFor="church" className="block text-sm font-semibold text-slate-800 mb-2">
                                    Igreja *
                                </label>
                                <CustomSelect
                                    id="church"
                                    value={churchId}
                                    onChange={(v) => {
                                        setChurchId(v)
                                        setTeamId('')
                                        setTeamLabel('')
                                    }}
                                    placeholder="Selecione a igreja"
                                    options={churches.map((c) => ({ value: c.id, label: c.name }))}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-800 mb-2">
                                    Equipe
                                </label>
                                <CreatableCombobox
                                    fetchItems={async (q) => {
                                        const data = await adminFetchJson<{ items: { id: string; label: string }[] }>(
                                            `/api/admin/consolidacao/lookups/teams?church_id=${encodeURIComponent(churchId)}&q=${encodeURIComponent(q)}`
                                        )
                                        return { items: data.items ?? [] }
                                    }}
                                    placeholder="Digite para buscar ou registrar uma equipe"
                                    selectedId={teamId}
                                    selectedLabel={teamLabel}
                                    freeText=""
                                    onChange={(id, _text, selectedLabel) => {
                                        setTeamId(id ?? '')
                                        setTeamLabel(selectedLabel ?? '')
                                    }}
                                    disabled={!churchId}
                                    onCreate={async (name) => {
                                        const res = await adminFetchJson<{ item: { id: string; name: string } }>('/api/admin/consolidacao/teams', {
                                            method: 'POST',
                                            body: JSON.stringify({ name, church_id: churchId }),
                                        })
                                        const item = res?.item
                                        if (!item) return null
                                        loadChurchesAndTeams()
                                        return { id: item.id, label: item.name }
                                    }}
                                    createOptionLabel="Registrar equipe"
                                    aria-label="Equipe"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-slate-800 mb-2">
                                    Líder / Consolidador
                                </label>
                                <CreatableCombobox
                                    fetchItems={fetchPeopleLookup}
                                    placeholder="Selecione ou digite o nome do líder/consolidador"
                                    selectedId={consolidatorId}
                                    selectedLabel={consolidatorLabel}
                                    freeText={consolidatorText}
                                    onChange={(id, text, selectedLabel) => {
                                        setConsolidatorId(id)
                                        setConsolidatorText(text)
                                        setConsolidatorLabel(selectedLabel ?? '')
                                    }}
                                    aria-label="Líder ou Consolidador"
                                />
                            </div>

                            <div>
                                <label htmlFor="conversion_type" className="block text-sm font-semibold text-slate-800 mb-2">
                                    Aceitou ou Reconciliou *
                                </label>
                                <CustomSelect
                                    id="conversion_type"
                                    value={formData.conversion_type}
                                    onChange={(v) => setFormData((prev) => ({ ...prev, conversion_type: v as '' | 'accepted' | 'reconciled' }))}
                                    placeholder="Selecione"
                                    options={[
                                        { value: 'accepted', label: 'Aceitou' },
                                        { value: 'reconciled', label: 'Reconciliou' },
                                    ]}
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label htmlFor="observacoes" className="block text-sm font-semibold text-slate-800 mb-2">
                                    Observações
                                </label>
                                <textarea
                                    id="observacoes"
                                    name="observacoes"
                                    value={formData.observacoes}
                                    onChange={handleChange}
                                    rows={4}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none transition-all duration-200 resize-none"
                                    placeholder="Informações adicionais sobre a conversão..."
                                />
                            </div>
                        </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="p-6 bg-slate-50 flex flex-col sm:flex-row gap-3 justify-end">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={handleReset}
                            disabled={loading}
                        >
                            <X size={18} />
                            Limpar
                        </Button>
                        <Button type="submit" loading={loading}>
                            <Save size={18} />
                            Salvar Conversão
                        </Button>
                    </div>
                </form>

                {/* Info Card */}
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <p className="text-sm text-blue-800">
                        <strong>Dica:</strong> Preencha todos os campos obrigatórios (*) para registrar a conversão.
                        Os dados serão utilizados para acompanhamento e consolidação dos novos membros.
                    </p>
                </div>
            </div>
        </div>
    )
}
