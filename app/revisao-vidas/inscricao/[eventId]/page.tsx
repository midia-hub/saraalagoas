'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

// Título da aba do navegador definido no componente via useEffect
import Image from 'next/image'
import {
  Loader2, CheckCircle2, AlertCircle,
  User, Phone, Mail, BookOpen, ArrowRight,
  Copy, Check, ExternalLink, ClipboardList,
  Users, UserCheck,
} from 'lucide-react'
import { NativeDropdown } from '@/components/ui/NativeDropdown'
import { DateSelectInput } from '@/components/ui/DateSelectInput'

type EventInfo = {
  id: string
  name: string
  start_date: string
  end_date: string | null
  active: boolean
  church_id?: string | null
}

function formatDate(iso: string) {
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function maskPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2')
  }
  return digits
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
}

const inputCls =
  'w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3.5 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all'

export default function InscricaoRevisaoPage() {
  const params = useParams<{ eventId: string }>()
  const eventId = params?.eventId ?? ''

  const [event, setEvent] = useState<EventInfo | null>(null)
  const [loadingEvent, setLoadingEvent] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [ministries, setMinistries] = useState<{ id: string; name: string }[]>([])

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [sex, setSex] = useState('')                 // 'Masculino' | 'Feminino'
  const [decisionType, setDecisionType] = useState('') // 'aceitou' | 'reconciliou'
  const [leaderName, setLeaderName] = useState('')
  const [team, setTeam] = useState('')
  const [preRevisao, setPreRevisao] = useState(false)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ alreadyRegistered: boolean; eventName: string; anamneseToken?: string | null } | null>(null)
  const [copiedAnamnese, setCopiedAnamnese] = useState(false)

  useEffect(() => {
    document.title = event
      ? `Inscrição — ${event.name} | Sara Sede Alagoas`
      : 'Inscrição | Sara Sede Alagoas'
  }, [event])

  useEffect(() => {
    if (!eventId) return
    ;(async () => {
      try {
        const eventRes = await fetch(`/api/revisao-vidas/inscricao/${eventId}`)
        if (!eventRes.ok) {
          setNotFound(true)
          return
        }

        const eventData = await eventRes.json()
        const eventInfo = eventData.event as EventInfo | undefined
        if (!eventInfo) {
          setNotFound(true)
          return
        }

        setEvent(eventInfo)

        const teamsUrl = eventInfo.church_id
          ? `/api/revisao-vidas/teams?church_id=${encodeURIComponent(eventInfo.church_id)}`
          : '/api/revisao-vidas/teams'

        const teamsRes = await fetch(teamsUrl)
        if (!teamsRes.ok) {
          setMinistries([])
          return
        }
        const teamsData = await teamsRes.json()
        setMinistries(teamsData.teams ?? [])
      } catch {
        setNotFound(true)
      } finally {
        setLoadingEvent(false)
      }
    })()
  }, [eventId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const nameOk = fullName.trim().split(' ').filter(Boolean).length >= 2
    if (!nameOk) { setError('Informe seu nome completo (nome e sobrenome).'); return }
    const rawPhone = phone.replace(/\D/g, '')
    if (rawPhone.length < 10) { setError('Informe um telefone válido com DDD.'); return }
    if (!sex) { setError('Selecione o gênero.'); return }
    if (!decisionType) { setError('Selecione a decisão de fé (Aceitou ou Reconciliou).'); return }
    if (!leaderName.trim()) { setError('Informe o nome do líder ou consolidador.'); return }
    if (!team) { setError('Selecione a equipe.'); return }
    if (!preRevisao) { setError('Confirme que já realizou o Pré-Revisão.'); return }

    setSaving(true)
    try {
      const resp = await fetch(`/api/revisao-vidas/inscricao/${eventId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim(),
          mobile_phone: rawPhone,
          email: email.trim() || undefined,
          birth_date: birthDate || undefined,
          sex: sex || undefined,
          decision_type: decisionType || undefined,
          leader_name: leaderName.trim() || undefined,
          team: team.trim() || undefined,
          pre_revisao: preRevisao,
        }),
      })
      const data = await resp.json()
      if (!resp.ok) {
        setError(data.error ?? 'Erro ao realizar inscrição. Tente novamente.')
        return
      }
      setResult({ alreadyRegistered: data.alreadyRegistered, eventName: data.eventName, anamneseToken: data.anamneseToken ?? null })
    } catch {
      setError('Erro de conexão. Verifique sua internet e tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  function startNewRegistration() {
    setResult(null)
    setError('')
    setCopiedAnamnese(false)
    setFullName('')
    setPhone('')
    setEmail('')
    setBirthDate('')
    setSex('')
    setDecisionType('')
    setLeaderName('')
    setTeam('')
    setPreRevisao(false)
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  /* ── Loading / erros de carregamento ── */
  if (loadingEvent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    )
  }

  if (notFound || !event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-rose-500" />
        </div>
        <h1 className="text-xl font-bold text-slate-800">Evento não encontrado</h1>
        <p className="text-slate-500 text-sm max-w-xs">
          O link pode estar desatualizado ou o evento foi encerrado.
        </p>
      </div>
    )
  }

  if (!event.active) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
          <BookOpen className="w-8 h-8 text-amber-500" />
        </div>
        <h1 className="text-xl font-bold text-slate-800">Inscrições encerradas</h1>
        <p className="text-slate-500 text-sm max-w-xs">
          As inscrições para <strong>{event.name}</strong> estão encerradas.
        </p>
      </div>
    )
  }

  /* ── Sucesso ── */
  if (result) {
    const anamneseUrl = result.anamneseToken
      ? (typeof window !== 'undefined'
          ? `${window.location.origin}/revisao-vidas/anamnese/${result.anamneseToken}`
          : `/revisao-vidas/anamnese/${result.anamneseToken}`)
      : null

    function copyAnamneseLink() {
      if (!anamneseUrl) return
      navigator.clipboard.writeText(anamneseUrl).then(() => {
        setCopiedAnamnese(true)
        setTimeout(() => setCopiedAnamnese(false), 2500)
      })
    }

    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        {/* Header */}
        <div className="bg-gradient-to-b from-purple-700 to-purple-600 px-4 pt-10 pb-20 text-center">
          <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-white mb-2">
            {result.alreadyRegistered ? 'Você já está inscrito!' : 'Inscrição realizada!'}
          </h1>
          <p className="text-purple-200 text-sm max-w-xs mx-auto">
            {result.alreadyRegistered
              ? `Encontramos sua inscrição em "${result.eventName}".`
              : `Sua inscrição em "${result.eventName}" foi registrada com sucesso.`}
          </p>
        </div>

        {/* Card com link da anamnese */}
        <div className="px-4 -mt-10 pb-10 max-w-lg mx-auto w-full">
          {anamneseUrl ? (
            <div className="bg-white rounded-3xl shadow-xl p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
                  <ClipboardList className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-800">Próximo passo: Anamnese</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Envie o link abaixo para a pessoa preencher o formulário de anamnese antes do evento.{' '}
                    <strong className="text-slate-700">É obrigatório para a confirmação da inscrição.</strong>
                  </p>
                </div>
              </div>

              {/* URL visível */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-xs text-slate-600 break-all select-all font-mono">
                {anamneseUrl}
              </div>

              {/* Botões */}
              <div className="flex gap-2">
                <button
                  onClick={copyAnamneseLink}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                    copiedAnamnese
                      ? 'bg-emerald-50 border-2 border-emerald-300 text-emerald-700'
                      : 'bg-purple-600 text-white hover:bg-purple-700'
                  }`}
                >
                  {copiedAnamnese ? (
                    <><Check className="w-4 h-4" /> Copiado!</>
                  ) : (
                    <><Copy className="w-4 h-4" /> Copiar link</>
                  )}
                </button>
                <a
                  href={anamneseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Abrir
                </a>
              </div>

              <p className="text-xs text-slate-400 text-center">
                Compartilhe este link via WhatsApp ou como preferir.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl shadow-xl p-6 text-center">
              <p className="text-sm text-slate-600">
                Em breve você receberá mais orientações sobre o evento.
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={startNewRegistration}
            className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-slate-200 bg-white text-slate-700 text-sm font-bold hover:bg-slate-50 transition-colors"
          >
            Fazer nova inscrição
            <ArrowRight className="w-4 h-4" />
          </button>

          <p className="text-center text-xs text-slate-400 mt-6">
            Sara Nossa Terra — Sede Alagoas
          </p>
        </div>
      </div>
    )
  }

  /* ── Formulário ── */
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-b from-purple-700 to-purple-600 px-4 pt-10 pb-16 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
        </div>
        <p className="text-purple-200 text-xs font-semibold uppercase tracking-widest mb-1">
          Inscrições abertas
        </p>
        <h1 className="text-2xl font-extrabold text-white leading-tight">
          {event.name}
        </h1>
        {event.start_date && (
          <p className="mt-2 text-purple-200 text-sm">
            {formatDate(event.start_date)}
            {event.end_date && event.end_date !== event.start_date && (
              <> — {formatDate(event.end_date)}</>
            )}
          </p>
        )}
      </div>

      {/* Card form */}
      <div className="px-4 -mt-8 pb-10 max-w-lg mx-auto w-full">
        <div className="bg-white rounded-3xl shadow-xl p-6">
          <h2 className="text-base font-bold text-slate-800 mb-1">Preencha seus dados</h2>
          <p className="text-xs text-slate-500 mb-5">Todos os campos marcados com * são obrigatórios.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nome */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Nome completo *
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Seu nome e sobrenome"
                  autoComplete="name"
                  required
                  className={`${inputCls} pl-10`}
                />
              </div>
            </div>

            {/* Telefone */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                WhatsApp / Telefone *
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => setPhone(maskPhone(e.target.value))}
                  placeholder="(82) 99999-9999"
                  autoComplete="tel"
                  required
                  className={`${inputCls} pl-10`}
                />
              </div>
            </div>

            {/* E-mail */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                E-mail <span className="text-slate-400 normal-case font-normal">(opcional)</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  autoComplete="email"
                  className={`${inputCls} pl-10`}
                />
              </div>
            </div>

            {/* Data de nascimento */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Data de nascimento <span className="text-slate-400 normal-case font-normal">(opcional)</span>
              </label>
              <DateSelectInput value={birthDate} onChange={setBirthDate} />
            </div>

            {/* Divider */}
            <div className="border-t border-slate-100 pt-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Informações adicionais</p>
            </div>

            {/* Gênero */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Gênero <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['Masculino', 'Feminino'] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setSex(sex === opt ? '' : opt)}
                    className={`py-3 rounded-2xl border-2 text-sm font-bold transition-all ${
                      sex === opt
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    {opt === 'Masculino' ? '♂ Masculino' : '♀ Feminino'}
                  </button>
                ))}
              </div>
            </div>

            {/* Aceitou / Reconciliou */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Decisão de fé <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: 'aceitou', label: '🙌 Aceitou' },
                  { value: 'reconciliou', label: '🤝 Reconciliou' },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDecisionType(decisionType === opt.value ? '' : opt.value)}
                    className={`py-3 rounded-2xl border-2 text-sm font-bold transition-all ${
                      decisionType === opt.value
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Líder / Consolidador */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Líder / Consolidador <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <UserCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={leaderName}
                  onChange={(e) => setLeaderName(e.target.value)}
                  placeholder="Nome do líder ou consolidador"
                  className={`${inputCls} pl-10`}
                />
              </div>
            </div>

            {/* Equipe */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Equipe <span className="text-rose-500">*</span>
              </label>
              <NativeDropdown
                value={team}
                onChange={setTeam}
                searchable
                placeholder="Selecione a equipe..."
                icon={<Users className="w-4 h-4" />}
                options={ministries.map((m) => ({ value: m.name, label: m.name }))}
              />
            </div>

            {/* Pré-revisão */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Pré-Revisão
              </label>
              <button
                type="button"
                onClick={() => setPreRevisao(!preRevisao)}
                className={`w-full flex items-center gap-3 py-3.5 px-4 rounded-2xl border-2 text-sm font-bold transition-all ${
                  preRevisao
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                  preRevisao ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'
                }`}>
                  {preRevisao && <Check className="w-3 h-3 text-white" />}
                </span>
                Já realizou o Pré-Revisão
              </button>
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                <p className="text-sm text-rose-700">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white font-bold text-base py-4 rounded-2xl transition-colors shadow-lg shadow-purple-500/25 mt-2"
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Realizar inscrição
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Sara Nossa Terra — Sede Alagoas
        </p>
      </div>
    </div>
  )
}
