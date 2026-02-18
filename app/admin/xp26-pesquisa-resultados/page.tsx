'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Orbitron } from 'next/font/google'
import { ArrowLeft, BarChart3, Users, MessageSquare, Star, TrendingUp, Target } from 'lucide-react'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { adminFetchJson } from '@/lib/admin-client'

const orbitron = Orbitron({ weight: ['600', '700'], subsets: ['latin'], display: 'swap' })

const LOGO_VERDE =
  'https://lquqgtlgyhcpwcbklokf.supabase.co/storage/v1/object/public/imagens/LOGO%20-%20VERDE.PNG'
const LOGO_SARA_ALAGOAS =
  'https://lquqgtlgyhcpwcbklokf.supabase.co/storage/v1/object/public/imagens/Logo%20Sara%20Alagoas%202.png'

const NEON = '#B6FF3B'
const BG_DARK = '#0B0F2A'
const BG_GRADIENT = 'linear-gradient(180deg, #0B0F2A 0%, #1A1F4D 50%, #0f1435 100%)'
const TEXT_WHITE = '#FFFFFF'
const TEXT_GRAY = '#DADADA'

function Xp26Background() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" aria-hidden>
      <div className="absolute inset-0" style={{ background: BG_GRADIENT }} />
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
      <svg className="absolute inset-0 w-full h-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="xp26-grid-res" width="80" height="80" patternUnits="userSpaceOnUse">
            <path d="M0 40 L40 0 L80 40 L40 80 Z" fill="none" stroke={NEON} strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#xp26-grid-res)" />
      </svg>
    </div>
  )
}

type FeedbackRow = {
  id: string
  created_at: string
  perfil: string | null
  nota_evento: number | null
  impacto_principal: string[] | null
  impacto_outro: string | null
  fortalecer_fe: string | null
  decisao_importante: boolean | null
  decisao_qual: string | null
  ministeracoes_claras: string | null
  tempo_atividades: string | null
  sinalizacao: string | null
  filas: string | null
  som: string | null
  info_antes_evento: string | null
  acompanhou_instagram: boolean | null
  comunicacao_digital: string | null
  participara_xp27: string | null
  escala_organizada: string | null
  instrucoes_claras: string | null
  lider_acessivel: string | null
  carga_horaria: string | null
  tempo_descanso: string | null
  falhas_area: boolean | null
  falhas_descricao: string | null
  valorizado: string | null
  lider_avaliacao: string | null
  servir_novamente: string | null
  servir_melhorar: string | null
  melhor_ministracao: string | null
  motivo_ministracao: string | null
  avaliacao_geral_ministracoes: string | null
  melhor_banda: string | null
  avaliacao_louvor_geral: string | null
  avaliacao_som_louvor: string | null
  avaliacao_energia_banda: string | null
  avaliacao_conexao_louvor: string | null
  formato_preferido_xp27: string | null
  indicacao_preletor_xp27: string | null
  indicacao_banda_xp27: string | null
  tema_preferido_xp27: string[] | null
  tema_preferido_xp27_outro: string | null
  sugestao_xp27: string | null
  organizacao: string | null
  teve_problema: boolean | null
  descricao_problema: string | null
  superou_expectativa: string | null
  nps: number | null
  melhorias: string | null
  mensagem_final: string | null
  contato_whatsapp_autorizado: boolean | null
  nome_contato: string | null
  whatsapp_contato: string | null
}

function countBy<T>(items: T[], key: (x: T) => string | null | undefined): Record<string, number> {
  const out: Record<string, number> = {}
  items.forEach((x) => {
    const v = key(x)
    if (v != null && String(v).trim() !== '') {
      const k = String(v).trim()
      out[k] = (out[k] ?? 0) + 1
    }
  })
  return out
}

function BarBlock({
  title,
  counts,
  maxCount,
}: {
  title: string
  counts: Record<string, number>
  maxCount: number
}) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1])
  if (entries.length === 0) return null
  return (
    <div className="mb-4">
      <p className="text-sm font-semibold mb-2" style={{ color: TEXT_WHITE }}>
        {title}
      </p>
      <div className="space-y-2">
        {entries.map(([label, n]) => (
          <div key={label} className="flex items-center gap-3">
            <span className="w-32 shrink-0 text-sm" style={{ color: TEXT_GRAY }}>
              {label}
            </span>
            <div
              className="flex-1 h-6 rounded overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.1)' }}
            >
              <div
                className="h-full rounded transition-all duration-500"
                style={{
                  width: maxCount > 0 ? `${(n / maxCount) * 100}%` : '0%',
                  background: NEON,
                  maxWidth: '100%',
                }}
              />
            </div>
            <span className="text-sm font-medium w-10" style={{ color: NEON }}>
              {n}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function SectionCard({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  children: React.ReactNode
}) {
  return (
    <div
      className="rounded-xl p-5 mb-6"
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.12)',
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Icon size={20} style={{ color: NEON }} />
        <h2 className={`${orbitron.className} text-lg font-semibold uppercase`} style={{ color: NEON }}>
          {title}
        </h2>
      </div>
      {children}
    </div>
  )
}

/** Card de métrica para o resumo consolidado */
function MetricCard({
  label,
  value,
  subtext,
  icon: Icon,
  highlight,
}: {
  label: string
  value: string | number
  subtext?: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  highlight?: boolean
}) {
  return (
    <div
      className="rounded-xl p-4 flex flex-col"
      style={{
        background: highlight ? `rgba(182,255,59,0.12)` : 'rgba(255,255,255,0.06)',
        border: `1px solid ${highlight ? `${NEON}60` : 'rgba(255,255,255,0.12)'}`,
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: TEXT_GRAY }}>
          {label}
        </span>
        <Icon size={18} style={{ color: highlight ? NEON : TEXT_GRAY }} />
      </div>
      <p className={`text-2xl md:text-3xl font-bold ${orbitron.className}`} style={{ color: highlight ? NEON : TEXT_WHITE }}>
        {value}
      </p>
      {subtext != null && subtext !== '' && (
        <p className="text-xs mt-1" style={{ color: TEXT_GRAY }}>{subtext}</p>
      )}
    </div>
  )
}

/** Barra de 0-10 para nota ou NPS */
function ScoreBar({ value, max = 10, label }: { value: number; max?: number; label?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  const color = pct >= 70 ? NEON : pct >= 40 ? '#facc15' : '#f87171'
  return (
    <div className="mb-2">
      {label != null && (
        <p className="text-xs mb-1" style={{ color: TEXT_GRAY }}>{label}</p>
      )}
      <div className="h-3 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <p className="text-right text-xs mt-0.5" style={{ color: TEXT_GRAY }}>{value.toFixed(1)} / {max}</p>
    </div>
  )
}

export default function Xp26PesquisaResultadosPage() {
  const [items, setItems] = useState<FeedbackRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    adminFetchJson<{ items: FeedbackRow[] }>('/api/admin/xp26-feedback')
      .then((data) => {
        if (!cancelled) setItems(data?.items ?? [])
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erro ao carregar.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const stats = useMemo(() => {
    const total = items.length
    const perfilCounts = countBy(items, (x) => x.perfil)
    const notaValues = items.map((x) => x.nota_evento).filter((n): n is number => n != null && !Number.isNaN(n))
    const notaMedia = notaValues.length ? notaValues.reduce((a, b) => a + b, 0) / notaValues.length : null
    const notaDist = countBy(items, (x) => x.nota_evento != null ? String(x.nota_evento) : null)
    const participante = items.filter((x) => x.perfil === 'Participante')
    const voluntario = items.filter((x) => x.perfil === 'Voluntário')
    const fortalecerCounts = countBy(participante, (x) => x.fortalecer_fe)
    const decisaoSim = participante.filter((x) => x.decisao_importante === true).length
    const decisaoNao = participante.filter((x) => x.decisao_importante === false).length
    const instagramSim = participante.filter((x) => x.acompanhou_instagram === true).length
    const comunicacaoCounts = countBy(participante, (x) => x.comunicacao_digital)
    const participaraCounts = countBy(items, (x) => x.participara_xp27)
    const escalaCounts = countBy(voluntario, (x) => x.escala_organizada)
    const instrucoesCounts = countBy(voluntario, (x) => x.instrucoes_claras)
    const liderCounts = countBy(voluntario, (x) => x.lider_acessivel)
    const descansoCounts = countBy(voluntario, (x) => x.tempo_descanso)
    const falhasSim = voluntario.filter((x) => x.falhas_area === true).length
    const valorizadoCounts = countBy(voluntario, (x) => x.valorizado)
    const servirCounts = countBy(voluntario, (x) => x.servir_novamente)
    const melhorMinistracaoCounts = countBy(items, (x) => x.melhor_ministracao)
    const melhorBandaCounts = countBy(items, (x) => x.melhor_banda)
    const avaliacaoLouvorCounts = countBy(items, (x) => x.avaliacao_louvor_geral)
    const superouCounts = countBy(items, (x) => x.superou_expectativa)
    const npsValues = items.map((x) => x.nps).filter((n): n is number => n != null && !Number.isNaN(n))
    const npsMedia = npsValues.length ? npsValues.reduce((a, b) => a + b, 0) / npsValues.length : null
    const teveProblemaSim = items.filter((x) => x.teve_problema === true).length
    const contatoWhatsSim = items.filter((x) => x.contato_whatsapp_autorizado === true).length
    // Consolidados para qualidade
    const superouSim = items.filter((x) => x.superou_expectativa === 'Sim').length
    const pctSuperouSim = total > 0 ? (superouSim / total) * 100 : 0
    const participariaAlta = items.filter((x) =>
      x.participara_xp27 === 'Com certeza' || x.participara_xp27 === 'Provavelmente'
    ).length
    const pctParticipariaAlta = total > 0 ? (participariaAlta / total) * 100 : 0
    const npsPromotores = npsValues.filter((n) => n >= 9).length
    const pctPromotores = npsValues.length > 0 ? (npsPromotores / npsValues.length) * 100 : 0
    const pctProblemas = total > 0 ? (teveProblemaSim / total) * 100 : 0
    const serviriaSim = voluntario.filter((x) =>
      x.servir_novamente === 'Sim, com certeza' || x.servir_novamente === 'Sim'
    ).length
    const pctVoluntariosServiria = voluntario.length > 0 ? (serviriaSim / voluntario.length) * 100 : 0
    const decisaoSimPct = participante.length > 0 ? (decisaoSim / participante.length) * 100 : 0
    // Índice de qualidade 0–100: média ponderada de nota (30%), NPS (30%), superou (20%), participaria (20%)
    const notaNorm = notaMedia != null ? (notaMedia / 10) * 100 : 50
    const npsNorm = npsMedia != null ? (npsMedia / 10) * 100 : 50
    const indiceQualidade = Math.round(
      notaNorm * 0.3 + npsNorm * 0.3 + pctSuperouSim * 0.2 + pctParticipariaAlta * 0.2
    )
    const maxBar = Math.max(
      ...Object.values(perfilCounts),
      ...Object.values(notaDist),
      ...Object.values(fortalecerCounts),
      ...Object.values(participaraCounts),
      ...Object.values(melhorMinistracaoCounts),
      ...Object.values(melhorBandaCounts),
      ...Object.values(avaliacaoLouvorCounts),
      ...Object.values(superouCounts),
      1
    )
    return {
      total,
      perfilCounts,
      notaMedia,
      notaDist,
      participante: participante.length,
      voluntario: voluntario.length,
      fortalecerCounts,
      decisaoSim,
      decisaoNao,
      instagramSim,
      comunicacaoCounts,
      participaraCounts,
      escalaCounts,
      instrucoesCounts,
      liderCounts,
      descansoCounts,
      falhasSim,
      valorizadoCounts,
      servirCounts,
      melhorMinistracaoCounts,
      melhorBandaCounts,
      avaliacaoLouvorCounts,
      superouCounts,
      npsMedia,
      teveProblemaSim,
      contatoWhatsSim,
      maxBar,
      pctSuperouSim,
      pctParticipariaAlta,
      pctPromotores,
      pctProblemas,
      pctVoluntariosServiria,
      decisaoSimPct,
      indiceQualidade,
      superouSim,
      participariaAlta,
      npsPromotores,
    }
  }, [items])

  return (
    <PageAccessGuard pageKey="dashboard">
    <div className="min-h-screen flex flex-col items-center py-8 px-4 md:py-12 relative">
      <Xp26Background />
      <div className="relative z-10 w-full max-w-3xl flex-1">
        <div className="flex justify-center mb-6">
          <Image
            src={LOGO_VERDE}
            alt="XP26 Alagoas"
            width={320}
            height={128}
            className="h-36 min-h-[7rem] md:h-40 w-auto object-contain"
            unoptimized
          />
        </div>

        <div className="text-center mb-8">
          <h1 className={`${orbitron.className} text-2xl md:text-3xl font-bold uppercase mb-2`} style={{ color: NEON, textShadow: `0 0 20px ${NEON}40` }}>
            Resultados da pesquisa XP26
          </h1>
          <p className="text-lg" style={{ color: TEXT_GRAY }}>
            Visão consolidada das respostas do formulário pós-evento
          </p>
        </div>

        {loading && (
          <p className="text-center py-12" style={{ color: TEXT_GRAY }}>
            Carregando respostas...
          </p>
        )}
        {error && (
          <p className="text-center py-6" style={{ color: '#ff6b6b' }}>
            {error}
          </p>
        )}

        {!loading && !error && items.length > 0 && (
          <>
            {/* Resultados consolidados — qualidade e notas */}
            <SectionCard title="Resumo da qualidade" icon={Target}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <MetricCard
                  label="Total de respostas"
                  value={stats.total}
                  icon={BarChart3}
                />
                <MetricCard
                  label="Nota média do evento"
                  value={stats.notaMedia != null ? stats.notaMedia.toFixed(1) : '—'}
                  subtext="escala 0–10"
                  icon={Star}
                  highlight
                />
                <MetricCard
                  label="NPS médio"
                  value={stats.npsMedia != null ? stats.npsMedia.toFixed(1) : '—'}
                  subtext="escala 0–10"
                  icon={TrendingUp}
                  highlight
                />
                <MetricCard
                  label="Índice de qualidade"
                  value={`${stats.indiceQualidade}%`}
                  subtext="nota + NPS + expectativa + intenção"
                  icon={Target}
                  highlight
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                <div>
                  <p className="text-sm font-semibold mb-2" style={{ color: TEXT_WHITE }}>Nota do evento</p>
                  <ScoreBar
                    value={stats.notaMedia ?? 0}
                    label={`Média ${stats.notaMedia != null ? stats.notaMedia.toFixed(1) : '—'}`}
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold mb-2" style={{ color: TEXT_WHITE }}>NPS (satisfação)</p>
                  <ScoreBar
                    value={stats.npsMedia ?? 0}
                    label={`Média ${stats.npsMedia != null ? stats.npsMedia.toFixed(1) : '—'}`}
                  />
                </div>
              </div>
              <div className="border-t border-white/10 pt-4 mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="text-center p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <p className="text-xl font-bold" style={{ color: NEON }}>{stats.pctSuperouSim.toFixed(0)}%</p>
                  <p className="text-xs" style={{ color: TEXT_GRAY }}>Superou expectativas</p>
                </div>
                <div className="text-center p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <p className="text-xl font-bold" style={{ color: NEON }}>{stats.pctParticipariaAlta.toFixed(0)}%</p>
                  <p className="text-xs" style={{ color: TEXT_GRAY }}>Participaria do XP27</p>
                </div>
                <div className="text-center p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <p className="text-xl font-bold" style={{ color: NEON }}>{stats.pctPromotores.toFixed(0)}%</p>
                  <p className="text-xs" style={{ color: TEXT_GRAY }}>Promotores NPS (9–10)</p>
                </div>
                <div className="text-center p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <p className="text-xl font-bold" style={{ color: stats.pctProblemas <= 20 ? NEON : '#facc15' }}>
                    {stats.pctProblemas.toFixed(0)}%
                  </p>
                  <p className="text-xs" style={{ color: TEXT_GRAY }}>Relatou problemas</p>
                </div>
              </div>
              {stats.participante > 0 && (
                <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap gap-4">
                  <span className="text-sm" style={{ color: TEXT_GRAY }}>
                    <strong style={{ color: TEXT_WHITE }}>Decisão importante (participantes):</strong>{' '}
                    {stats.decisaoSimPct.toFixed(0)}% disseram sim
                  </span>
                </div>
              )}
              {stats.voluntario > 0 && (
                <div className="mt-2 flex flex-wrap gap-4">
                  <span className="text-sm" style={{ color: TEXT_GRAY }}>
                    <strong style={{ color: TEXT_WHITE }}>Voluntários que serviriam novamente:</strong>{' '}
                    {stats.pctVoluntariosServiria.toFixed(0)}%
                  </span>
                </div>
              )}
            </SectionCard>

            <SectionCard title="Respostas e perfil" icon={BarChart3}>
              <p className="text-sm mb-4" style={{ color: TEXT_GRAY }}>
                Total de respostas: <strong style={{ color: NEON }}>{stats.total}</strong>
              </p>
              <BarBlock title="1. Você veio como:" counts={stats.perfilCounts} maxCount={stats.maxBar} />
              {stats.notaMedia != null && (
                <p className="text-sm mt-3" style={{ color: TEXT_GRAY }}>
                  2. Nota média do evento: <strong style={{ color: NEON }}>{stats.notaMedia.toFixed(1)}</strong> (0–10)
                </p>
              )}
              <BarBlock title="Distribuição da nota (0–10)" counts={stats.notaDist} maxCount={stats.maxBar} />
            </SectionCard>

            {stats.participante > 0 && (
              <SectionCard title="Participantes" icon={Users}>
                <BarBlock title="3. O XP26 fortaleceu sua fé?" counts={stats.fortalecerCounts} maxCount={stats.maxBar} />
                <p className="text-sm mb-2" style={{ color: TEXT_WHITE }}>4. Tomou alguma decisão importante?</p>
                <p className="text-sm mb-4" style={{ color: TEXT_GRAY }}>Sim: {stats.decisaoSim} — Não: {stats.decisaoNao}</p>
                <p className="text-sm mb-2" style={{ color: TEXT_WHITE }}>5. Acompanhou pelo Instagram?</p>
                <p className="text-sm mb-4" style={{ color: TEXT_GRAY }}>Sim: {stats.instagramSim}</p>
                <BarBlock title="Comunicação digital" counts={stats.comunicacaoCounts} maxCount={stats.maxBar} />
              </SectionCard>
            )}

            {stats.voluntario > 0 && (
              <SectionCard title="Voluntários" icon={Users}>
                <BarBlock title="3. Escala organizada?" counts={stats.escalaCounts} maxCount={stats.maxBar} />
                <BarBlock title="4. Instruções claras?" counts={stats.instrucoesCounts} maxCount={stats.maxBar} />
                <BarBlock title="5. Líder acessível?" counts={stats.liderCounts} maxCount={stats.maxBar} />
                <BarBlock title="6. Tempo para descanso?" counts={stats.descansoCounts} maxCount={stats.maxBar} />
                <p className="text-sm mb-2" style={{ color: TEXT_WHITE }}>7. Houve falhas na área?</p>
                <p className="text-sm mb-4" style={{ color: TEXT_GRAY }}>Sim: {stats.falhasSim}</p>
                <BarBlock title="Sentiu-se valorizado?" counts={stats.valorizadoCounts} maxCount={stats.maxBar} />
                <BarBlock title="Serviria novamente?" counts={stats.servirCounts} maxCount={stats.maxBar} />
              </SectionCard>
            )}

            <SectionCard title="Ministrações, bandas e XP27" icon={BarChart3}>
              <BarBlock title="Melhor ministração" counts={stats.melhorMinistracaoCounts} maxCount={stats.maxBar} />
              <BarBlock title="Melhor banda" counts={stats.melhorBandaCounts} maxCount={stats.maxBar} />
              <BarBlock title="Momento de louvor" counts={stats.avaliacaoLouvorCounts} maxCount={stats.maxBar} />
              <BarBlock title="Participaria do XP27?" counts={stats.participaraCounts} maxCount={stats.maxBar} />
            </SectionCard>

            <SectionCard title="Encerramento e NPS" icon={BarChart3}>
              <BarBlock title="Superou expectativas?" counts={stats.superouCounts} maxCount={stats.maxBar} />
              {stats.npsMedia != null && (
                <p className="text-sm mt-3 mb-2" style={{ color: TEXT_GRAY }}>
                  NPS médio: <strong style={{ color: NEON }}>{stats.npsMedia.toFixed(1)}</strong> (0–10)
                </p>
              )}
              <p className="text-sm mb-2" style={{ color: TEXT_WHITE }}>Enfrentou algum problema?</p>
              <p className="text-sm mb-4" style={{ color: TEXT_GRAY }}>Sim: {stats.teveProblemaSim}</p>
              <p className="text-sm mb-2" style={{ color: TEXT_WHITE }}>Autorizou contato WhatsApp?</p>
              <p className="text-sm mb-4" style={{ color: TEXT_GRAY }}>Sim: {stats.contatoWhatsSim}</p>
            </SectionCard>

            <SectionCard title="Mensagens para a equipe" icon={MessageSquare}>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {items
                  .filter((x) => x.mensagem_final && x.mensagem_final.trim() !== '')
                  .slice(0, 30)
                  .map((x) => (
                    <div
                      key={x.id}
                      className="rounded-lg p-3 text-sm"
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: TEXT_GRAY,
                      }}
                    >
                      <p className="whitespace-pre-wrap">{x.mensagem_final}</p>
                      <p className="text-xs mt-2 opacity-75">
                        {new Date(x.created_at).toLocaleString('pt-BR')}
                        {x.perfil ? ` · ${x.perfil}` : ''}
                      </p>
                    </div>
                  ))}
                {items.filter((x) => x.mensagem_final?.trim()).length === 0 && (
                  <p className="text-sm" style={{ color: TEXT_GRAY }}>Nenhuma mensagem deixada.</p>
                )}
              </div>
            </SectionCard>
          </>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="text-center py-12 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)' }}>
            <p className="text-lg" style={{ color: TEXT_GRAY }}>
              Nenhuma resposta da pesquisa até o momento.
            </p>
            <Link href="/xp26-pesquisa" target="_blank" rel="noopener noreferrer" className="inline-block mt-4 py-3 px-5 rounded-xl font-medium" style={{ background: NEON, color: BG_DARK }}>
              Abrir formulário da pesquisa
            </Link>
          </div>
        )}
      </div>
      <footer className="relative z-10 w-full py-4 flex justify-center mt-auto">
        <Image
          src={LOGO_SARA_ALAGOAS}
          alt="Sara Alagoas"
          width={100}
          height={40}
          className="h-7 w-auto object-contain opacity-90"
          unoptimized
        />
      </footer>
    </div>
    </PageAccessGuard>
  )
}
