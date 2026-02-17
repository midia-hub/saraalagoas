'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { Orbitron } from 'next/font/google'
import { Share2, ExternalLink } from 'lucide-react'

const orbitron = Orbitron({ weight: ['600', '700'], subsets: ['latin'], display: 'swap' })

/** Logos do evento XP26 (Supabase storage) */
const LOGO_BRANCO =
  'https://lquqgtlgyhcpwcbklokf.supabase.co/storage/v1/object/public/imagens/LOGO%20-%20BRANCO.PNG'
const LOGO_VERDE =
  'https://lquqgtlgyhcpwcbklokf.supabase.co/storage/v1/object/public/imagens/LOGO%20-%20VERDE.PNG'
const LOGO_VERMELHO =
  'https://lquqgtlgyhcpwcbklokf.supabase.co/storage/v1/object/public/imagens/LOGO%20-%20VERMELHO.PNG'
/** Logo rodapé (Sara Alagoas) */
const LOGO_SARA_ALAGOAS =
  'https://lquqgtlgyhcpwcbklokf.supabase.co/storage/v1/object/public/imagens/Logo%20Sara%20Alagoas%202.png'

const NEON = '#B6FF3B'
const BG_DARK = '#0B0F2A'
const BG_GRADIENT = 'linear-gradient(180deg, #0B0F2A 0%, #1A1F4D 50%, #0f1435 100%)'
const TEXT_WHITE = '#FFFFFF'
const TEXT_GRAY = '#DADADA'

/** Padrões de fundo: formas fluidas, geométricas e glitch/scanline */
function Xp26Background() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" aria-hidden>
      {/* Base */}
      <div className="absolute inset-0" style={{ background: BG_GRADIENT }} />

      {/* Blobs / formas fluidas — verde neon e azul */}
      <div
        className="absolute rounded-full opacity-30"
        style={{
          width: 'min(90vw, 600px)',
          height: 'min(90vw, 600px)',
          top: '-20%',
          left: '-15%',
          background: `radial-gradient(circle, ${NEON}25 0%, transparent 70%)`,
          filter: 'blur(60px)',
        }}
      />
      <div
        className="absolute rounded-full opacity-25"
        style={{
          width: 'min(80vw, 500px)',
          height: 'min(80vw, 500px)',
          bottom: '-15%',
          right: '-10%',
          background: 'radial-gradient(circle, rgba(163,232,232,0.4) 0%, transparent 65%)',
          filter: 'blur(50px)',
        }}
      />
      <div
        className="absolute rounded-full opacity-20"
        style={{
          width: 'min(70vw, 400px)',
          height: 'min(70vw, 400px)',
          top: '40%',
          right: '5%',
          background: 'radial-gradient(circle, rgba(180,221,118,0.35) 0%, transparent 60%)',
          filter: 'blur(45px)',
        }}
      />

      {/* Formas em rosa/roxo (fluid ribbons) */}
      <div
        className="absolute opacity-[0.12]"
        style={{
          width: '120%',
          height: '40%',
          top: '10%',
          left: '-10%',
          background: 'linear-gradient(135deg, transparent 20%, rgba(255,100,180,0.3) 50%, rgba(150,80,255,0.2) 80%)',
          filter: 'blur(40px)',
          borderRadius: '50% 50% 40% 60% / 60% 40% 50% 50%',
        }}
      />
      <div
        className="absolute opacity-[0.1]"
        style={{
          width: '80%',
          height: '35%',
          bottom: '15%',
          left: '-20%',
          background: 'linear-gradient(45deg, rgba(200,120,255,0.25) 0%, transparent 50%)',
          filter: 'blur(50px)',
          borderRadius: '60% 40% 50% 50% / 50% 60% 40% 50%',
        }}
      />

      {/* Padrão geométrico — triângulos e linhas sutis */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="xp26-grid" width="80" height="80" patternUnits="userSpaceOnUse">
            <path d="M0 40 L40 0 L80 40 L40 80 Z" fill="none" stroke={NEON} strokeWidth="0.5" />
          </pattern>
          <pattern id="xp26-diamonds" width="60" height="60" patternUnits="userSpaceOnUse">
            <polygon points="30,0 60,30 30,60 0,30" fill="none" stroke="rgba(163,232,232,0.4)" strokeWidth="0.4" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#xp26-grid)" />
        <rect width="100%" height="100%" fill="url(#xp26-diamonds)" />
      </svg>

      {/* Linhas diagonais / zigue-zague */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(105deg, transparent 48%, ${NEON} 50%, transparent 52%),
            linear-gradient(75deg, transparent 48%, rgba(163,232,232,0.6) 50%, transparent 52%)
          `,
          backgroundSize: '120px 80px',
        }}
      />

      {/* Scanline */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.15) 2px, rgba(255,255,255,0.15) 4px)',
        }}
      />

      {/* Glitch sutil — faixas horizontais */}
      <div
        className="absolute inset-0 xp26-glitch-bg"
        style={{
          background: `
            linear-gradient(90deg, transparent 0%, ${NEON}40 20%, transparent 40%),
            linear-gradient(90deg, transparent 60%, rgba(255,100,180,0.3) 80%, transparent 100%)
          `,
          backgroundSize: '100% 8px',
        }}
      />
    </div>
  )
}

const PERFIS = ['Participante', 'Voluntário']
const ORGANIZACAO = ['Excelente', 'Muito boa', 'Boa', 'Regular', 'Precisa melhorar']
const IMPACTO_OPCOES = ['Estrutura', 'Programação', 'Organização', 'Comunicação', 'Experiência espiritual', 'Ambiente', 'Outro']
const SUPEROU = ['Sim', 'Não', 'Parcialmente']

// Bloco Participante
const FORTALECER_FE = ['Muito', 'Bastante', 'Um pouco', 'Não fez diferença']
const MINISTERACOES = ['Excelente', 'Muito boas', 'Boas', 'Regulares', 'Fracas']
const TEMPO_ATIVIDADES = ['Muito bem distribuído', 'Adequado', 'Cansativo', 'Confuso']
const SINALIZACAO = ['Muito clara', 'Clara', 'Pouco clara', 'Confusa']
const FILAS = ['Rápidas', 'Normais', 'Longas']
const SOM = ['Excelente', 'Bom', 'Regular', 'Ruim']
const INFO_ANTES = ['Sim', 'Parcialmente', 'Não']
const COMUNICACAO_DIGITAL = ['Excelente', 'Boa', 'Regular', 'Fraca']
const PARTICIPARA_XP27 = ['Com certeza', 'Provavelmente', 'Talvez', 'Não']

// Bloco Voluntário
const ESCALA_ORGANIZADA = ['Sim', 'Parcialmente', 'Não']
const INSTRUCOES_CLARAS = ['Muito claras', 'Claras', 'Pouco claras', 'Confusas']
const LIDER_ACESSIVEL = ['Sempre', 'Na maioria do tempo', 'Pouco', 'Não estava acessível']
const CARGA_HORARIA = ['Bem distribuída', 'Pesada', 'Muito pesada', 'Leve']
const TEMPO_DESCANSO = ['Sim', 'Parcialmente', 'Não']
const VALORIZADO = ['Muito valorizado', 'Valorizado', 'Pouco valorizado', 'Não valorizado']
const LIDER_AVALIACAO = ['Inspirou', 'Organizou bem', 'Poderia melhorar', 'Precisa de mais preparo']
const SERVIR_NOVAMENTE = ['Sim, com certeza', 'Sim', 'Talvez', 'Não']

// Bloco Ministrações, Bandas e XP27 (todos)
const PRELETORES = [
  'Pastor Felipe Valadão',
  'Bispa Lúcia Rodovalho',
  'Pastor Átila Robson',
  'Bispa Betânia Guimarães',
  'Bispo Robson Rodovalho',
  'Pastora Michelle',
  'Pastora Weslany',
  'Pastora Junia Hayashi',
  'Bispo Frank Guimarães',
  'Pastor Theo Hayashi',
  'Pastora Sarah Nobre',
  'Pastor Rhandolfo',
  'Pastor Nikolas Ferreira',
]
const AVALIACAO_MINISTRACOES_GERAL = ['Impactantes', 'Muito boas', 'Boas', 'Regulares', 'Fracas']
const BANDAS = ['Banda Wilsong', 'Ungidos 4', 'DD Júnior', 'Jadson Nascimento']
const AVALIACAO_LOUVOR = ['Transformador', 'Muito bom', 'Bom', 'Regular', 'Poderia melhorar']
const SOM_LOUVOR = ['Excelente', 'Bom', 'Regular', 'Ruim']
const ENERGIA_BANDA = ['Muito alta', 'Boa', 'Média', 'Baixa']
const CONEXAO_LOUVOR = ['Muito forte', 'Forte', 'Média', 'Fraca']
const FORMATO_XP27 = ['1 dia intenso', '2 dias equilibrados', '3 dias completos', 'Evento híbrido (presencial + online)']
const TEMAS_XP27 = [
  'Avivamento',
  'Liderança',
  'Juventude',
  'Família',
  'Missões',
  'Empreendedorismo cristão',
  'Cultura e sociedade',
  'Saúde emocional',
  'Apologética',
  'Outro',
]

const PROFILE_STEPS_PARTICIPANTE = 2
const PROFILE_STEPS_VOLUNTARIO = 2
const MINISTRACOES_XP27_STEPS = 4
const MAX_TEXT = 500
const MAX_MOTIVO_MINISTRACAO = 400
const MAX_INDICACAO_PRELETOR = 300

type FormState = {
  perfil: string
  nota_evento: number | null
  impacto: string[]
  impacto_outro: string
  // Participante
  fortalecer_fe: string
  decisao_importante: boolean | null
  decisao_qual: string
  ministeracoes_claras: string
  tempo_atividades: string
  sinalizacao: string
  filas: string
  som: string
  info_antes_evento: string
  acompanhou_instagram: boolean | null
  comunicacao_digital: string
  participara_xp27: string
  // Voluntário
  escala_organizada: string
  instrucoes_claras: string
  lider_acessivel: string
  carga_horaria: string
  tempo_descanso: string
  falhas_area: boolean | null
  falhas_descricao: string
  valorizado: string
  lider_avaliacao: string
  servir_novamente: string
  servir_melhorar: string
  // Bloco Ministrações, Bandas e XP27 (todos)
  melhor_ministracao: string
  melhor_ministracao_outro: string
  motivo_ministracao: string
  avaliacao_geral_ministracoes: string
  melhor_banda: string
  melhor_banda_outro: string
  avaliacao_louvor_geral: string
  avaliacao_som_louvor: string
  avaliacao_energia_banda: string
  avaliacao_conexao_louvor: string
  formato_preferido_xp27: string
  indicacao_preletor_xp27: string
  indicacao_banda_xp27: string
  tema_preferido_xp27: string[]
  tema_preferido_xp27_outro: string
  sugestao_xp27: string
  // Comum
  organizacao: string
  teve_problema: boolean | null
  descricao_problema: string
  superou_expectativa: string
  nps: number | null
  melhorias: string
  mensagem_final: string
  contato_whatsapp_autorizado: boolean | null
  nome_contato: string
  whatsapp_contato: string
}

const initialForm: FormState = {
  perfil: '',
  nota_evento: null,
  impacto: [],
  impacto_outro: '',
  fortalecer_fe: '',
  decisao_importante: null,
  decisao_qual: '',
  ministeracoes_claras: '',
  tempo_atividades: '',
  sinalizacao: '',
  filas: '',
  som: '',
  info_antes_evento: '',
  acompanhou_instagram: null,
  comunicacao_digital: '',
  participara_xp27: '',
  escala_organizada: '',
  instrucoes_claras: '',
  lider_acessivel: '',
  carga_horaria: '',
  tempo_descanso: '',
  falhas_area: null,
  falhas_descricao: '',
  valorizado: '',
  lider_avaliacao: '',
  servir_novamente: '',
  servir_melhorar: '',
  melhor_ministracao: '',
  melhor_ministracao_outro: '',
  motivo_ministracao: '',
  avaliacao_geral_ministracoes: '',
  melhor_banda: '',
  melhor_banda_outro: '',
  avaliacao_louvor_geral: '',
  avaliacao_som_louvor: '',
  avaliacao_energia_banda: '',
  avaliacao_conexao_louvor: '',
  formato_preferido_xp27: '',
  indicacao_preletor_xp27: '',
  indicacao_banda_xp27: '',
  tema_preferido_xp27: [],
  tema_preferido_xp27_outro: '',
  sugestao_xp27: '',
  organizacao: '',
  teve_problema: null,
  descricao_problema: '',
  superou_expectativa: '',
  nps: null,
  melhorias: '',
  mensagem_final: '',
  contato_whatsapp_autorizado: null,
  nome_contato: '',
  whatsapp_contato: '',
}

function ProgressBar({ step, total }: { step: number; total: number }) {
  const pct = total > 0 ? (step / total) * 100 : 0
  return (
    <div className="w-full">
      <div
        className="h-1 w-full rounded-full overflow-hidden"
        style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: NEON, boxShadow: `0 0 12px ${NEON}` }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>
      <p className="text-right text-sm mt-1" style={{ color: TEXT_GRAY }}>
        {Math.round(pct)}%
      </p>
    </div>
  )
}

function NeonButton({
  children,
  onClick,
  disabled,
  variant = 'primary',
  className = '',
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: 'primary' | 'secondary'
  className?: string
}) {
  const isPrimary = variant === 'primary'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full md:w-auto min-w-[200px] py-4 px-6 rounded-xl font-bold uppercase tracking-wider transition-all duration-300 ${className}`}
      style={
        isPrimary
          ? {
              background: NEON,
              color: BG_DARK,
              boxShadow: disabled ? 'none' : `0 0 20px ${NEON}40`,
            }
          : {
              background: 'transparent',
              color: NEON,
              border: `2px solid ${NEON}`,
              boxShadow: disabled ? 'none' : `0 0 12px ${NEON}30`,
            }
      }
      onMouseEnter={(e) => {
        if (disabled) return
        if (isPrimary) e.currentTarget.style.boxShadow = `0 0 28px ${NEON}60`
        else e.currentTarget.style.boxShadow = `0 0 16px ${NEON}50`
      }}
      onMouseLeave={(e) => {
        if (isPrimary) e.currentTarget.style.boxShadow = disabled ? 'none' : `0 0 20px ${NEON}40`
        else e.currentTarget.style.boxShadow = disabled ? 'none' : `0 0 12px ${NEON}30`
      }}
    >
      {children}
    </button>
  )
}

function RatingCircles({ value, onChange }: { value: number | null; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-wrap justify-center gap-2 md:gap-3">
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-200"
          style={{
            border: `2px solid ${value === n ? NEON : 'rgba(255,255,255,0.3)'}`,
            background: value === n ? `${NEON}22` : 'transparent',
            color: value === n ? NEON : TEXT_GRAY,
            boxShadow: value === n ? `0 0 14px ${NEON}50` : 'none',
          }}
        >
          {n}
        </button>
      ))}
    </div>
  )
}

function NpsScale({ value, onChange }: { value: number | null; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-wrap justify-between gap-1 max-w-xl mx-auto">
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="flex-1 min-w-[28px] py-3 rounded-lg font-semibold text-sm transition-all duration-200"
          style={{
            border: `2px solid ${value === n ? NEON : 'rgba(255,255,255,0.25)'}`,
            background: value === n ? `${NEON}22` : 'transparent',
            color: value === n ? NEON : TEXT_GRAY,
            boxShadow: value === n ? `0 0 12px ${NEON}40` : 'none',
          }}
        >
          {n}
        </button>
      ))}
    </div>
  )
}

function TextareaNeon({
  value,
  onChange,
  placeholder,
  maxLength = MAX_TEXT,
}: {
  value: string
  onChange: (s: string) => void
  placeholder: string
  maxLength?: number
}) {
  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
        placeholder={placeholder}
        rows={4}
        className="w-full rounded-xl px-4 py-3 resize-none transition-all duration-200 focus:outline-none"
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: '2px solid rgba(255,255,255,0.2)',
          color: TEXT_WHITE,
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = NEON
          e.currentTarget.style.boxShadow = `0 0 12px ${NEON}30`
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
          e.currentTarget.style.boxShadow = 'none'
        }}
      />
      <span className="absolute bottom-2 right-3 text-xs" style={{ color: TEXT_GRAY }}>
        {value.length}/{maxLength}
      </span>
    </div>
  )
}

function OptionButtons<T extends string>({
  options,
  value,
  onChange,
  multi,
}: {
  options: T[]
  value: T | T[] | null
  onChange: (v: T | T[]) => void
  multi?: boolean
}) {
  const selected = multi ? (value as T[] | null) ?? [] : value === null ? [] : [value as T]
  const toggle = (opt: T) => {
    if (multi) {
      const arr = selected.includes(opt) ? selected.filter((x) => x !== opt) : [...selected, opt]
      onChange(arr as T & T[])
    } else {
      onChange(opt)
    }
  }
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {options.map((opt) => {
        const isSelected = selected.includes(opt)
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className="py-3 px-4 rounded-xl font-medium text-sm transition-all duration-200"
            style={{
              border: `2px solid ${isSelected ? NEON : 'rgba(255,255,255,0.25)'}`,
              background: isSelected ? `${NEON}22` : 'transparent',
              color: isSelected ? NEON : TEXT_GRAY,
              boxShadow: isSelected ? `0 0 12px ${NEON}30` : 'none',
            }}
          >
            {opt}
          </button>
        )
      })}
    </div>
  )
}

export default function Xp26PesquisaPage() {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormState>(initialForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const set = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setError(null)
  }, [])

  const profileStepsCount = form.perfil === 'Participante' ? PROFILE_STEPS_PARTICIPANTE : form.perfil === 'Voluntário' ? PROFILE_STEPS_VOLUNTARIO : 0
  const ministracoesStartStep = 2 + profileStepsCount
  const orgStep = ministracoesStartStep + MINISTRACOES_XP27_STEPS
  const melhoriasStep = orgStep + 1
  const totalSteps = melhoriasStep + 1

  const canProceed = (): boolean => true // Todos os campos opcionais — pode avançar e enviar a qualquer momento

  const handleNext = () => {
    if (step < totalSteps - 1) setStep((s) => s + 1)
    else handleSubmit()
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/public/xp26-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          perfil: form.perfil,
          nota_evento: form.nota_evento,
          impacto_principal: form.impacto.length ? form.impacto : null,
          impacto_outro: form.impacto.includes('Outro') ? form.impacto_outro : null,
          fortalecer_fe: form.fortalecer_fe || null,
          decisao_importante: form.decisao_importante,
          decisao_qual: form.decisao_qual.trim() || null,
          ministeracoes_claras: form.ministeracoes_claras || null,
          tempo_atividades: form.tempo_atividades || null,
          sinalizacao: form.sinalizacao || null,
          filas: form.filas || null,
          som: form.som || null,
          info_antes_evento: form.info_antes_evento || null,
          acompanhou_instagram: form.acompanhou_instagram,
          comunicacao_digital: form.comunicacao_digital || null,
          participara_xp27: form.participara_xp27 || null,
          escala_organizada: form.escala_organizada || null,
          instrucoes_claras: form.instrucoes_claras || null,
          lider_acessivel: form.lider_acessivel || null,
          carga_horaria: form.carga_horaria || null,
          tempo_descanso: form.tempo_descanso || null,
          falhas_area: form.falhas_area,
          falhas_descricao: form.falhas_descricao.trim() || null,
          valorizado: form.valorizado || null,
          lider_avaliacao: form.lider_avaliacao || null,
          servir_novamente: form.servir_novamente || null,
          servir_melhorar: form.servir_melhorar.trim() || null,
          melhor_ministracao: form.melhor_ministracao || null,
          motivo_ministracao: form.motivo_ministracao.trim() || null,
          avaliacao_geral_ministracoes: form.avaliacao_geral_ministracoes || null,
          melhor_banda: form.melhor_banda || null,
          avaliacao_louvor_geral: form.avaliacao_louvor_geral || null,
          avaliacao_som_louvor: form.avaliacao_som_louvor || null,
          avaliacao_energia_banda: form.avaliacao_energia_banda || null,
          avaliacao_conexao_louvor: form.avaliacao_conexao_louvor || null,
          formato_preferido_xp27: form.formato_preferido_xp27 || null,
          indicacao_preletor_xp27: form.indicacao_preletor_xp27.trim() || null,
          indicacao_banda_xp27: form.indicacao_banda_xp27.trim() || null,
          tema_preferido_xp27: form.tema_preferido_xp27?.length ? form.tema_preferido_xp27 : null,
          tema_preferido_xp27_outro: form.tema_preferido_xp27_outro.trim() || null,
          sugestao_xp27: form.sugestao_xp27.trim() || null,
          organizacao: form.organizacao,
          teve_problema: form.teve_problema ?? false,
          descricao_problema: form.teve_problema ? form.descricao_problema : null,
          superou_expectativa: form.superou_expectativa || null,
          nps: form.nps,
          melhorias: form.melhorias.trim() || null,
          mensagem_final: form.mensagem_final.trim() || null,
          contato_whatsapp_autorizado: form.contato_whatsapp_autorizado,
          nome_contato: form.nome_contato.trim() || null,
          whatsapp_contato: form.whatsapp_contato.trim() || null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || 'Erro ao enviar. Tente novamente.')
        return
      }
      setSubmitted(true)
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center relative">
        <Xp26Background />
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center">
          <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="max-w-md"
        >
          <div className="flex justify-center mb-6">
            <Image
              src={LOGO_BRANCO}
              alt="XP26 Alagoas"
              width={240}
              height={96}
              className="h-48 w-auto md:h-56 object-contain object-center"
              unoptimized
            />
          </div>
          <h1
            className={`${orbitron.className} text-2xl md:text-3xl font-bold uppercase mb-4`}
            style={{ color: NEON, textShadow: `0 0 20px ${NEON}60` }}
          >
            Obrigado por fazer parte da XP26 Alagoas!
          </h1>
          <p className="text-lg mb-8" style={{ color: TEXT_GRAY }}>
            Sua opinião é muito importante para nós.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/"
              className="inline-flex items-center justify-center gap-2 w-full sm:w-auto py-4 px-6 rounded-xl font-bold uppercase"
              style={{ background: NEON, color: BG_DARK }}
            >
              <ExternalLink size={20} />
              Voltar para o site
            </a>
            <button
              type="button"
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: 'XP26 Alagoas',
                    text: 'Participe da pesquisa pós-evento XP26 Alagoas!',
                    url: typeof window !== 'undefined' ? window.location.origin + '/xp26-pesquisa' : '',
                  })
                }
              }}
              className="inline-flex items-center justify-center gap-2 w-full sm:w-auto py-4 px-6 rounded-xl font-bold uppercase border-2"
              style={{ borderColor: NEON, color: NEON }}
            >
              <Share2 size={20} />
              Compartilhar
            </button>
          </div>
          </motion.div>
        </div>
        <footer className="relative z-10 w-full py-4 flex justify-center">
          <Image
            src={LOGO_SARA_ALAGOAS}
            alt="Sara Alagoas"
            width={100}
            height={40}
            className="h-7 w-auto md:h-8 object-contain opacity-90"
            unoptimized
          />
        </footer>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col py-8 px-4 md:py-12 relative">
      <Xp26Background />
      <div className="relative z-10 max-w-xl mx-auto flex-1 w-full">
        {/* Logo / Título */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <Image
              src={LOGO_VERDE}
              alt="XP26 Alagoas"
              width={200}
              height={80}
              className="h-40 w-auto md:h-48 object-contain object-center"
              unoptimized
            />
          </div>
          <p className="text-lg" style={{ color: TEXT_GRAY }}>
            Como foi sua experiência?
          </p>
        </div>

        <ProgressBar step={step + 1} total={totalSteps} />

        <div className="mt-8 min-h-[320px]">
          <AnimatePresence mode="wait">
            {/* Etapa 1 — Identificação */}
            {step === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                <div>
                  <label className="block text-sm font-semibold mb-3" style={{ color: TEXT_WHITE }}>
                    1. Você veio como:
                  </label>
                  <OptionButtons
                    options={PERFIS}
                    value={form.perfil}
                    onChange={(v) => set('perfil', v as string)}
                  />
                </div>
              </motion.div>
            )}

            {/* Etapa 2 — Experiência geral */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                <div>
                  <label className="block text-sm font-semibold mb-4 text-center" style={{ color: TEXT_WHITE }}>
                    2. De 0 a 10, qual nota você dá ao evento?
                  </label>
                  <RatingCircles value={form.nota_evento} onChange={(n) => set('nota_evento', n)} />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-3" style={{ color: TEXT_WHITE }}>
                    3. O que mais te impactou?
                  </label>
                  <OptionButtons
                    options={IMPACTO_OPCOES}
                    value={form.impacto}
                    onChange={(v) => set('impacto', v as string[])}
                    multi
                  />
                  {form.impacto.includes('Outro') && (
                    <div className="mt-3">
                      <input
                        type="text"
                        value={form.impacto_outro}
                        onChange={(e) => set('impacto_outro', e.target.value.slice(0, MAX_TEXT))}
                        placeholder="Descreva o que mais te impactou..."
                        className="w-full rounded-xl px-4 py-3 mt-2 focus:outline-none"
                        style={{
                          background: 'rgba(255,255,255,0.06)',
                          border: '2px solid rgba(255,255,255,0.2)',
                          color: TEXT_WHITE,
                        }}
                      />
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Bloco PARTICIPANTE */}
            {form.perfil === 'Participante' && step === 2 && (
              <motion.div key="part2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="space-y-8">
                <div>
                  <label className="block text-sm font-semibold mb-3" style={{ color: TEXT_WHITE }}>1. O XP26 fortaleceu sua fé?</label>
                  <OptionButtons options={FORTALECER_FE} value={form.fortalecer_fe} onChange={(v) => set('fortalecer_fe', v as string)} />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-3" style={{ color: TEXT_WHITE }}>2. Você tomou alguma decisão importante durante o evento?</label>
                  <OptionButtons options={['Sim', 'Não']} value={form.decisao_importante === null ? '' : form.decisao_importante ? 'Sim' : 'Não'} onChange={(v) => set('decisao_importante', v === 'Sim')} />
                  {form.decisao_importante === true && (
                    <div className="mt-3">
                      <input type="text" value={form.decisao_qual} onChange={(e) => set('decisao_qual', e.target.value.slice(0, MAX_TEXT))} placeholder="Você gostaria de compartilhar qual decisão tomou? (opcional)" className="w-full rounded-xl px-4 py-3 mt-2 focus:outline-none" style={{ background: 'rgba(255,255,255,0.06)', border: '2px solid rgba(255,255,255,0.2)', color: TEXT_WHITE }} />
                    </div>
                  )}
                </div>
              </motion.div>
            )}
            {form.perfil === 'Participante' && step === 3 && (
              <motion.div key="part5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="space-y-8">
                <div>
                  <label className="block text-sm font-semibold mb-3" style={{ color: TEXT_WHITE }}>3. Você recebeu informações suficientes antes do evento?</label>
                  <OptionButtons options={INFO_ANTES} value={form.info_antes_evento} onChange={(v) => set('info_antes_evento', v as string)} />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-3" style={{ color: TEXT_WHITE }}>4. Você acompanhou pelo Instagram oficial?</label>
                  <OptionButtons options={['Sim', 'Não']} value={form.acompanhou_instagram === null ? '' : form.acompanhou_instagram ? 'Sim' : 'Não'} onChange={(v) => set('acompanhou_instagram', v === 'Sim')} />
                  {form.acompanhou_instagram === true && (
                    <div className="mt-3">
                      <label className="block text-sm font-medium mb-2" style={{ color: TEXT_GRAY }}>Como avalia a comunicação digital?</label>
                      <OptionButtons options={COMUNICACAO_DIGITAL} value={form.comunicacao_digital} onChange={(v) => set('comunicacao_digital', v as string)} />
                    </div>
                  )}
                </div>
              </motion.div>
            )}
            {/* Bloco VOLUNTÁRIO (2 páginas) */}
            {form.perfil === 'Voluntário' && step === 2 && (
              <motion.div key="vol2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: TEXT_WHITE }}>1. Sua escala foi organizada com antecedência?</label>
                  <OptionButtons options={ESCALA_ORGANIZADA} value={form.escala_organizada} onChange={(v) => set('escala_organizada', v as string)} />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: TEXT_WHITE }}>2. Você recebeu instruções claras sobre sua função?</label>
                  <OptionButtons options={INSTRUCOES_CLARAS} value={form.instrucoes_claras} onChange={(v) => set('instrucoes_claras', v as string)} />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: TEXT_WHITE }}>3. Seu líder estava acessível durante o evento?</label>
                  <OptionButtons options={LIDER_ACESSIVEL} value={form.lider_acessivel} onChange={(v) => set('lider_acessivel', v as string)} />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: TEXT_WHITE }}>4. A carga horária foi:</label>
                  <OptionButtons options={CARGA_HORARIA} value={form.carga_horaria} onChange={(v) => set('carga_horaria', v as string)} />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: TEXT_WHITE }}>5. Você teve tempo adequado para descanso?</label>
                  <OptionButtons options={TEMPO_DESCANSO} value={form.tempo_descanso} onChange={(v) => set('tempo_descanso', v as string)} />
                </div>
              </motion.div>
            )}
            {form.perfil === 'Voluntário' && step === 3 && (
              <motion.div key="vol4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: TEXT_WHITE }}>6. Houve falhas na sua área?</label>
                  <OptionButtons options={['Não', 'Sim']} value={form.falhas_area === null ? '' : form.falhas_area ? 'Sim' : 'Não'} onChange={(v) => set('falhas_area', v === 'Sim')} />
                  {form.falhas_area === true && (
                    <div className="mt-3">
                      <TextareaNeon value={form.falhas_descricao} onChange={(s) => set('falhas_descricao', s)} placeholder="Descreva o que aconteceu e como poderia melhorar" />
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: TEXT_WHITE }}>7. Você se sentiu valorizado(a)?</label>
                  <OptionButtons options={VALORIZADO} value={form.valorizado} onChange={(v) => set('valorizado', v as string)} />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: TEXT_WHITE }}>8. Você gostaria de servir novamente?</label>
                  <OptionButtons options={SERVIR_NOVAMENTE} value={form.servir_novamente} onChange={(v) => set('servir_novamente', v as string)} />
                  {['Não', 'Talvez'].includes(form.servir_novamente) && (
                    <div className="mt-3">
                      <TextareaNeon value={form.servir_melhorar} onChange={(s) => set('servir_melhorar', s)} placeholder="O que precisa melhorar para você servir novamente?" />
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Bloco Ministrações, Bandas e XP27 — para todos */}
            {step === ministracoesStartStep && (
              <motion.div key="min1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="space-y-8">
                <div>
                  <label className="block text-sm font-semibold mb-3" style={{ color: TEXT_WHITE }}>1. Qual foi a melhor ministração para você?</label>
                  <OptionButtons options={PRELETORES} value={form.melhor_ministracao} onChange={(v) => set('melhor_ministracao', v as string)} />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: TEXT_WHITE }}>2. Por que essa ministração foi marcante?</label>
                  <TextareaNeon value={form.motivo_ministracao} onChange={(s) => set('motivo_ministracao', s)} placeholder="O que mais falou ao seu coração?" maxLength={MAX_MOTIVO_MINISTRACAO} />
                </div>
              </motion.div>
            )}
            {step === ministracoesStartStep + 1 && (
              <motion.div key="min2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="space-y-8">
                <div>
                  <label className="block text-sm font-semibold mb-3" style={{ color: TEXT_WHITE }}>4. Qual foi a melhor banda para você?</label>
                  <OptionButtons options={BANDAS} value={form.melhor_banda} onChange={(v) => set('melhor_banda', v as string)} />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-3" style={{ color: TEXT_WHITE }}>5. O momento de louvor foi:</label>
                  <OptionButtons options={AVALIACAO_LOUVOR} value={form.avaliacao_louvor_geral} onChange={(v) => set('avaliacao_louvor_geral', v as string)} />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: TEXT_WHITE }}>6. Avaliação técnica do louvor</label>
                  <p className="text-xs mb-2" style={{ color: TEXT_GRAY }}>Som:</p>
                  <OptionButtons options={SOM_LOUVOR} value={form.avaliacao_som_louvor} onChange={(v) => set('avaliacao_som_louvor', v as string)} />
                  <p className="text-xs mt-3 mb-2" style={{ color: TEXT_GRAY }}>Energia da banda:</p>
                  <OptionButtons options={ENERGIA_BANDA} value={form.avaliacao_energia_banda} onChange={(v) => set('avaliacao_energia_banda', v as string)} />
                  <p className="text-xs mt-3 mb-2" style={{ color: TEXT_GRAY }}>Conexão espiritual:</p>
                  <OptionButtons options={CONEXAO_LOUVOR} value={form.avaliacao_conexao_louvor} onChange={(v) => set('avaliacao_conexao_louvor', v as string)} />
                </div>
              </motion.div>
            )}
            {step === ministracoesStartStep + 2 && (
              <motion.div key="min3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="space-y-8">
                <div>
                  <label className="block text-sm font-semibold mb-3" style={{ color: TEXT_WHITE }}>7. Você participaria do XP27?</label>
                  <OptionButtons options={PARTICIPARA_XP27} value={form.participara_xp27} onChange={(v) => set('participara_xp27', v as string)} />
                </div>
              </motion.div>
            )}
            {step === ministracoesStartStep + 3 && (
              <motion.div key="min4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: TEXT_WHITE }}>9. Você indicaria algum preletor para o XP27?</label>
                  <div className="relative">
                    <textarea value={form.indicacao_preletor_xp27} onChange={(e) => set('indicacao_preletor_xp27', e.target.value.slice(0, MAX_INDICACAO_PRELETOR))} placeholder="Nome do preletor e por que você indicaria" rows={2} className="w-full rounded-xl px-4 py-3 resize-none focus:outline-none" style={{ background: 'rgba(255,255,255,0.06)', border: '2px solid rgba(255,255,255,0.2)', color: TEXT_WHITE }} />
                    <span className="absolute bottom-2 right-3 text-xs" style={{ color: TEXT_GRAY }}>{form.indicacao_preletor_xp27.length}/{MAX_INDICACAO_PRELETOR}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: TEXT_WHITE }}>10. Você indicaria alguma banda para o XP27?</label>
                  <input type="text" value={form.indicacao_banda_xp27} onChange={(e) => set('indicacao_banda_xp27', e.target.value.slice(0, MAX_TEXT))} placeholder="Nome da banda e estilo musical" className="w-full rounded-xl px-4 py-3 focus:outline-none" style={{ background: 'rgba(255,255,255,0.06)', border: '2px solid rgba(255,255,255,0.2)', color: TEXT_WHITE }} />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: TEXT_WHITE }}>11. Que tipo de ministração você gostaria de ver no XP27?</label>
                  <OptionButtons options={TEMAS_XP27} value={form.tema_preferido_xp27} onChange={(v) => set('tema_preferido_xp27', v as string[])} multi />
                  {form.tema_preferido_xp27.includes('Outro') && (
                    <input type="text" value={form.tema_preferido_xp27_outro} onChange={(e) => set('tema_preferido_xp27_outro', e.target.value.slice(0, MAX_TEXT))} placeholder="Qual outro tema?" className="w-full rounded-xl px-4 py-3 mt-3 focus:outline-none" style={{ background: 'rgba(255,255,255,0.06)', border: '2px solid rgba(255,255,255,0.2)', color: TEXT_WHITE }} />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: TEXT_WHITE }}>12. O que não pode faltar no XP27?</label>
                  <TextareaNeon value={form.sugestao_xp27} onChange={(s) => set('sugestao_xp27', s)} placeholder="Sua sugestão..." />
                </div>
              </motion.div>
            )}

            {/* Etapa — Problema + Impacto (comum, uma página) */}
            {step === orgStep && (
              <motion.div
                key="org"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                <div>
                  <label className="block text-sm font-semibold mb-3" style={{ color: TEXT_WHITE }}>
                    Você enfrentou algum problema?
                  </label>
                  <OptionButtons
                    options={['Não', 'Sim']}
                    value={form.teve_problema === null ? '' : form.teve_problema ? 'Sim' : 'Não'}
                    onChange={(v) => set('teve_problema', v === 'Sim')}
                  />
                  {form.teve_problema === true && (
                    <div className="mt-4">
                      <TextareaNeon
                        value={form.descricao_problema}
                        onChange={(s) => set('descricao_problema', s)}
                        placeholder="Descreva o que aconteceu..."
                      />
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-3" style={{ color: TEXT_WHITE }}>
                    O evento superou suas expectativas?
                  </label>
                  <OptionButtons
                    options={SUPEROU}
                    value={form.superou_expectativa}
                    onChange={(v) => set('superou_expectativa', v as string)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-4 text-center" style={{ color: TEXT_WHITE }}>
                    Você indicaria para outras pessoas? (NPS 0 a 10)
                  </label>
                  <NpsScale value={form.nps} onChange={(n) => set('nps', n)} />
                </div>
              </motion.div>
            )}

            {/* Etapa — Feedback aberto (comum) */}
            {step === melhoriasStep && (
              <motion.div
                key="melhorias"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: TEXT_WHITE }}>
                    8. O que podemos melhorar para a próxima edição?
                  </label>
                  <TextareaNeon
                    value={form.melhorias}
                    onChange={(s) => set('melhorias', s)}
                    placeholder="Sua sugestão..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: TEXT_WHITE }}>
                    9. Deixe uma mensagem para a equipe XP26:
                  </label>
                  <TextareaNeon
                    value={form.mensagem_final}
                    onChange={(s) => set('mensagem_final', s)}
                    placeholder="Sua mensagem..."
                  />
                </div>
                <div className="pt-6 border-t border-white/10 space-y-4">
                  <label className="block text-sm font-semibold mb-2" style={{ color: TEXT_WHITE }}>
                    Podemos entrar em contato pelo WhatsApp para divulgação ou pesquisas para outros eventos?
                  </label>
                  <OptionButtons
                    options={['Sim', 'Não']}
                    value={form.contato_whatsapp_autorizado === null ? '' : form.contato_whatsapp_autorizado ? 'Sim' : 'Não'}
                    onChange={(v) => set('contato_whatsapp_autorizado', v === 'Sim')}
                  />
                  {form.contato_whatsapp_autorizado === true && (
                    <div className="space-y-3 mt-4">
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: TEXT_GRAY }}>Nome</label>
                        <input
                          type="text"
                          value={form.nome_contato}
                          onChange={(e) => set('nome_contato', e.target.value.slice(0, 120))}
                          placeholder="Seu nome"
                          className="w-full rounded-xl px-4 py-3 focus:outline-none"
                          style={{ background: 'rgba(255,255,255,0.06)', border: '2px solid rgba(255,255,255,0.2)', color: TEXT_WHITE }}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: TEXT_GRAY }}>WhatsApp</label>
                        <input
                          type="tel"
                          value={form.whatsapp_contato}
                          onChange={(e) => set('whatsapp_contato', e.target.value.replace(/\D/g, '').slice(0, 15))}
                          placeholder="(00) 00000-0000"
                          className="w-full rounded-xl px-4 py-3 focus:outline-none"
                          style={{ background: 'rgba(255,255,255,0.06)', border: '2px solid rgba(255,255,255,0.2)', color: TEXT_WHITE }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {error && (
          <p className="mt-4 text-center text-sm" style={{ color: '#ff6b6b' }}>
            {error}
          </p>
        )}

        <div className="mt-8 flex justify-end">
          <NeonButton
            onClick={handleNext}
            disabled={loading}
          >
            {loading ? 'Enviando...' : step === totalSteps - 1 ? 'Enviar' : 'Próxima →'}
          </NeonButton>
        </div>
      </div>
      <footer className="relative z-10 w-full py-4 flex justify-center mt-auto">
        <Image
          src={LOGO_SARA_ALAGOAS}
          alt="Sara Alagoas"
          width={100}
          height={40}
          className="h-7 w-auto md:h-8 object-contain opacity-90"
          unoptimized
        />
      </footer>
    </div>
  )
}
