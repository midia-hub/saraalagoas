'use client'

import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useParams } from 'next/navigation'
import {
  Loader2, Sparkles, ArrowLeftRight, CheckCircle2, Send, Music,
  Calendar, Clock, Users, AlertCircle, ChevronDown, Search, Check, Download, FileImage,
} from 'lucide-react'

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

type AssignmentRow = {
  funcao: string
  person_id: string
  person_name: string
  trocado?: boolean
}

type SlotResult = {
  slot_id: string
  type: string
  label: string
  date: string
  time_of_day: string
  sort_order: number
  assignments: AssignmentRow[]
  faltando: string[]
}

type EscalaPublicData = {
  link: {
    ministry: string
    month: number
    year: number
    label: string | null
    church: { name: string } | null
  }
  dados: { slots: SlotResult[] }
  publicada_em: string
}


// ── Custom SearchableSelect ───────────────────────────────────────────────
function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Selecione…',
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  options: { id: string; label: string }[]
  placeholder?: string
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [pos, setPos] = useState<React.CSSProperties>({})
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  const DROP_MAX_H = 280
  const DROP_GAP = 6

  const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase()
  const searchMask = normalize(query)
  const filtered = options.filter(o =>
    normalize(o.label).includes(searchMask)
  )

  const selected = options.find(o => o.id === value)

  // fecha ao clicar fora
  useEffect(() => {
    function handle(e: MouseEvent) {
      const t = e.target as Node
      if (
        wrapRef.current && !wrapRef.current.contains(t) &&
        dropRef.current && !dropRef.current.contains(t)
      ) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  // recalcula posição ao rolar/redimensionar
  useEffect(() => {
    if (!open) return
    function recalc() {
      if (!buttonRef.current) return
      const rect = buttonRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom - DROP_GAP
      const spaceAbove = rect.top - DROP_GAP
      const openAbove = spaceBelow < 160 && spaceAbove > spaceBelow
      const maxH = Math.min(DROP_MAX_H, openAbove ? spaceAbove : spaceBelow)
      setPos({
        position: 'fixed',
        left: rect.left,
        width: rect.width,
        maxHeight: Math.max(maxH, 120),
        zIndex: 9999,
        ...(openAbove
          ? { bottom: window.innerHeight - rect.top + DROP_GAP }
          : { top: rect.bottom + DROP_GAP }),
      })
    }
    recalc()
    window.addEventListener('scroll', recalc, true)
    window.addEventListener('resize', recalc)
    return () => {
      window.removeEventListener('scroll', recalc, true)
      window.removeEventListener('resize', recalc)
    }
  }, [open])

  function toggle() {
    if (disabled) return
    setOpen(o => !o)
    setQuery('')
  }

  function pick(id: string) {
    onChange(id)
    setOpen(false)
    setQuery('')
  }

  const dropdown = open && (
    <div
      ref={dropRef}
      style={pos}
      className="bg-slate-800 border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
    >
      {/* Campo de busca */}
      <div className="p-2 border-b border-white/10 shrink-0">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar…"
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-blue-400/40"
          />
        </div>
      </div>
      {/* Lista */}
      <div className="overflow-y-auto dropdown-scrollbar min-h-0">
        {filtered.length === 0 ? (
          <p className="px-4 py-3 text-xs text-white/30 italic">Nenhum resultado.</p>
        ) : (
          filtered.map(o => (
            <button
              key={o.id}
              type="button"
              onClick={() => pick(o.id)}
              className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left text-sm transition-colors ${
                o.id === value
                  ? 'bg-blue-500/20 text-blue-300 font-semibold'
                  : 'text-white/80 hover:bg-white/5'
              }`}
            >
              {o.label}
              {o.id === value && <Check size={13} className="text-blue-400 shrink-0" />}
            </button>
          ))
        )}
      </div>
    </div>
  )

  return (
    <div ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={toggle}
        className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-sm transition-all ${
          open
            ? 'bg-white/10 border-blue-400/50 ring-2 ring-blue-400/10'
            : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
        } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className={selected ? 'text-white font-semibold' : 'text-white/30'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          size={14}
          className={`text-white/40 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {typeof document !== 'undefined' && createPortal(dropdown, document.body)}
    </div>
  )
}

// ── Página principal ────────────────────────────────────────────────────────
export default function EscalaPublicaPage() {
  const params = useParams<{ token: string }>()
  const token = params?.token

  const [data, setData] = useState<EscalaPublicData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [exporting, setExporting] = useState<'pdf' | 'jpg' | null>(null)
  const [exportError, setExportError] = useState('')
  const escalaExportRef = useRef<HTMLDivElement>(null)

  // ── Formulário de troca (inline no final da página) ──────────────────────
  const [trocaPersonId, setTrocaPersonId] = useState('')
  const [trocaSlotId, setTrocaSlotId] = useState('')
  const [trocaFuncao, setTrocaFuncao] = useState('')
  const [trocaSubstituto, setTrocaSubstituto] = useState('')
  const [trocaMensagem, setTrocaMensagem] = useState('')
  const [trocaLoading, setTrocaLoading] = useState(false)
  const [trocaErro, setTrocaErro] = useState('')

  useEffect(() => {
    if (!token) return
    fetch(`/api/public/escalas/${token}/escala`)
      .then(r => r.json())
      .then(res => {
        if (res.error) { setError(res.error); return }
        setData(res)
      })
      .catch(() => setError('Erro ao carregar escala.'))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-[#1a0508] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-white/60">
        <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center animate-pulse">
          <Sparkles size={24} className="text-white/80" />
        </div>
        <Loader2 className="animate-spin text-[#c62737]" size={24} />
        <p className="text-sm">Carregando escala…</p>
      </div>
    </div>
  )

  if (error || !data) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-[#1a0508] flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 rounded-3xl bg-white/10 flex items-center justify-center mx-auto mb-5">
          <Music className="text-white/40" size={36} />
        </div>
        <h1 className="font-bold text-white text-xl mb-2">Escala não encontrada</h1>
        <p className="text-white/50 text-sm">{error || 'Esta escala ainda não foi publicada.'}</p>
      </div>
    </div>
  )

  const { link, dados, publicada_em } = data
  const slots = (dados?.slots ?? []).slice().sort((a: any, b: any) => 
    a.date.localeCompare(b.date) || a.time_of_day.localeCompare(b.time_of_day)
  )
  const pubDate = new Date(publicada_em).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

  // Coleta todas as funções únicas na ordem de aparição
  const allFuncoes = Array.from(new Set(
    slots.flatMap(s => [
      ...(s.assignments || []).map(a => a.funcao),
      ...(s.faltando || []),
    ])
  ))

  // Estatísticas
  const totalEscalados = new Set(slots.flatMap(s => s.assignments.map(a => a.person_id))).size
  const totalVagasAbertas = slots.reduce((acc, s) => acc + s.faltando.length, 0)

  // Monta lista de todas as alocações para o select de voluntários
  type TrocaOption = { person_id: string; person_name: string; slot_id: string; slot_label: string; slot_date: string; funcao: string }
  const trocaOptions: TrocaOption[] = slots.flatMap(s =>
    s.assignments.map(a => ({ person_id: a.person_id, person_name: a.person_name, slot_id: s.slot_id, slot_label: s.label, slot_date: s.date, funcao: a.funcao }))
  )
  // Voluntários únicos
  const voluntariosUnicos = Array.from(new Map(trocaOptions.map(o => [o.person_id, o.person_name])).entries())
  // Escalas do voluntário selecionado
  const minhasEscalas = trocaPersonId ? trocaOptions.filter(o => o.person_id === trocaPersonId) : []

  async function submitTroca() {
    if (!trocaPersonId) { setTrocaErro('Selecione seu nome.'); return }
    if (!trocaSlotId || !trocaFuncao) { setTrocaErro('Selecione o culto/função que deseja trocar.'); return }
    if (!trocaSubstituto) { setTrocaErro('Selecione o substituto sugerido.'); return }
    setTrocaLoading(true); setTrocaErro('')
    try {
      const res = await fetch(`/api/public/escalas/${token}/troca`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slot_id: trocaSlotId, funcao: trocaFuncao, solicitante_id: trocaPersonId, substituto_id: trocaSubstituto.trim() || undefined, mensagem: trocaMensagem.trim() || undefined }),
      })
      const json = await res.json()
      if (!res.ok) { setTrocaErro(json.error ?? 'Erro ao solicitar.'); return }
      setTrocaPersonId(''); setTrocaSlotId(''); setTrocaFuncao(''); setTrocaSubstituto(''); setTrocaMensagem('')
      setSuccessMsg('Solicitação enviada! Aguarde a aprovação da liderança.')
      setTimeout(() => setSuccessMsg(''), 6000)
    } catch {
      setTrocaErro('Erro de conexão. Tente novamente.')
    } finally {
      setTrocaLoading(false)
    }
  }

  function getExportFileBase() {
    const raw = `escala-${link.ministry}-${MONTHS[(link.month ?? 1) - 1]}-${link.year}`
    return raw
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9-_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase()
  }

  async function captureEscalaCanvas() {
    if (!escalaExportRef.current) throw new Error('Área da escala não encontrada.')
    const html2canvas = (await import('html2canvas')).default

    const el = escalaExportRef.current
    // Mede a largura e altura completas (incluindo overflow horizontal da tabela)
    const fullW = el.scrollWidth
    const fullH = el.scrollHeight

    return html2canvas(el, {
      backgroundColor: '#0f172a',
      scale: 2,
      useCORS: true,
      logging: false,
      width: fullW,
      height: fullH,
      // Simula uma janela larga para que elementos min-width não sejam comprimidos
      windowWidth: Math.max(fullW + 200, 1600),
      onclone: (_doc: Document, clonedEl: HTMLElement) => {
        // Fundo sólido no elemento raiz
        clonedEl.style.background = '#0f172a'
        clonedEl.style.width = fullW + 'px'

        clonedEl.querySelectorAll<HTMLElement>('*').forEach(node => {
          const cls = node.getAttribute('class') ?? ''

          // 1. Remove backdrop-blur — não renderiza no html2canvas
          if (cls.includes('backdrop-blur')) {
            node.style.backdropFilter = 'none'
            ;(node.style as unknown as Record<string, string>)['webkitBackdropFilter'] = 'none'
            // Substitui por fundo sólido levemente translúcido
            if (!node.style.backgroundColor) {
              node.style.backgroundColor = 'rgba(15,23,42,0.85)'
            }
          }

          // 2. Esconde blobs decorativos com blur pesado (apenas efeito visual, renderiza errado)
          if (cls.includes('blur-3xl') || cls.includes('blur-2xl')) {
            node.style.display = 'none'
          }

          // 3. Destrava posição sticky (renderiza no offset de scroll, pode desalinhar)
          if (cls.includes('sticky')) {
            node.style.position = 'relative'
            node.style.left = 'auto'
            node.style.zIndex = 'auto'
          }

          // 4. Expande containers com overflow para capturar tabela completa
          if (cls.includes('overflow-x-auto') || cls.includes('overflow-hidden')) {
            node.style.overflow = 'visible'
          }
        })
      },
    })
  }

  async function downloadEscalaJpg() {
    setExportError('')
    setExporting('jpg')
    try {
      const canvas = await captureEscalaCanvas()
      const maxWidth = 1440
      const scale = canvas.width > maxWidth ? maxWidth / canvas.width : 1
      const outWidth = Math.max(1, Math.round(canvas.width * scale))
      const outHeight = Math.max(1, Math.round(canvas.height * scale))

      const outCanvas = document.createElement('canvas')
      outCanvas.width = outWidth
      outCanvas.height = outHeight
      const outCtx = outCanvas.getContext('2d')
      if (!outCtx) throw new Error('Falha ao preparar imagem otimizada.')

      outCtx.fillStyle = '#0f172a'
      outCtx.fillRect(0, 0, outWidth, outHeight)
      outCtx.drawImage(canvas, 0, 0, outWidth, outHeight)

      const MAX_BYTES = 1_600_000
      let quality = 0.9
      let dataUrl = outCanvas.toDataURL('image/jpeg', quality)
      while (dataUrl.length > MAX_BYTES && quality > 0.62) {
        quality -= 0.08
        dataUrl = outCanvas.toDataURL('image/jpeg', quality)
      }

      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `${getExportFileBase()}.jpg`
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch {
      setExportError('Não foi possível gerar JPG agora. Tente novamente.')
    } finally {
      setExporting(null)
    }
  }

  async function downloadEscalaPdf() {
    setExportError('')
    setExporting('pdf')
    try {
      const canvas = await captureEscalaCanvas()
      const { jsPDF } = await import('jspdf')
      const img = canvas.toDataURL('image/jpeg', 0.94)
      const generatedAt = new Date().toLocaleString('pt-BR')
      const footerText = `${link.ministry}${link.church?.name ? ` · ${link.church.name}` : ''} · Gerado em ${generatedAt}`
      const footerHeight = 34

      const orientation = canvas.width > canvas.height ? 'landscape' : 'portrait'
      const pdf = new jsPDF({
        orientation,
        unit: 'px',
        format: [canvas.width, canvas.height + footerHeight],
      })

      pdf.addImage(img, 'JPEG', 0, 0, canvas.width, canvas.height, undefined, 'FAST')
      pdf.setFillColor(15, 23, 42)
      pdf.rect(0, canvas.height, canvas.width, footerHeight, 'F')
      pdf.setTextColor(203, 213, 225)
      pdf.setFontSize(11)
      pdf.text(footerText, 14, canvas.height + 22, { maxWidth: canvas.width - 28 })
      pdf.save(`${getExportFileBase()}.pdf`)
    } catch {
      setExportError('Não foi possível gerar PDF agora. Tente novamente.')
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-[#1a0508]">

      <div ref={escalaExportRef}>

      {/* ── Hero header ─────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden pt-10 pb-8 px-5">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[200px] bg-[#c62737]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-[#c62737]/30 flex items-center justify-center">
              <Sparkles size={14} className="text-[#c62737]" />
            </div>
            <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Escala Oficial</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight mb-2">{link.ministry}</h1>
          <p className="text-white/50 text-sm font-medium">
            {MONTHS[(link.month ?? 1) - 1]} {link.year}
            {link.church?.name ? ` · ${link.church.name}` : ''}
            {link.label ? ` · ${link.label}` : ''}
          </p>
          <div className="flex flex-wrap gap-2 mt-5">
            <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm border border-white/10 rounded-full px-3 py-1.5">
              <Calendar size={11} className="text-white/60" />
              <span className="text-xs text-white/70 font-semibold">{slots.length} culto{slots.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm border border-white/10 rounded-full px-3 py-1.5">
              <Users size={11} className="text-white/60" />
              <span className="text-xs text-white/70 font-semibold">{totalEscalados} voluntário{totalEscalados !== 1 ? 's' : ''}</span>
            </div>
            {totalVagasAbertas > 0 && (
              <div className="flex items-center gap-1.5 bg-amber-500/20 border border-amber-500/30 rounded-full px-3 py-1.5">
                <AlertCircle size={11} className="text-amber-400" />
                <span className="text-xs text-amber-300 font-semibold">{totalVagasAbertas} vaga{totalVagasAbertas !== 1 ? 's' : ''} em aberto</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
              <Clock size={11} className="text-white/40" />
              <span className="text-xs text-white/40 font-medium">Publicado em {pubDate}</span>
            </div>
          </div>
          <div data-html2canvas-ignore className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={downloadEscalaPdf}
              disabled={exporting !== null}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/15 bg-white/10 text-white text-xs font-semibold hover:bg-white/15 transition-colors disabled:opacity-40"
            >
              {exporting === 'pdf' ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
              Baixar PDF
            </button>
            <button
              type="button"
              onClick={downloadEscalaJpg}
              disabled={exporting !== null}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/15 bg-white/10 text-white text-xs font-semibold hover:bg-white/15 transition-colors disabled:opacity-40"
            >
              {exporting === 'jpg' ? <Loader2 size={13} className="animate-spin" /> : <FileImage size={13} />}
              Baixar JPG
            </button>
          </div>
          {exportError && (
            <p data-html2canvas-ignore className="mt-2 text-xs text-red-300 font-medium">{exportError}</p>
          )}
        </div>
      </div>

      {/* ── Tabela ──────────────────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 pb-12">
        {slots.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-3xl py-16 text-center text-white/40">Nenhum culto na escala.</div>
        ) : (
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-20 bg-white/10 backdrop-blur-sm border-b border-r border-white/10 px-5 py-4 text-left font-bold text-white/70 text-xs uppercase tracking-wider whitespace-nowrap min-w-[180px]">
                      <div className="flex items-center gap-2"><Calendar size={12} /> Culto / Dia</div>
                    </th>
                    {allFuncoes.map(f => (
                      <th key={f} className="border-b border-r border-white/10 px-5 py-4 text-center font-bold text-violet-300 text-xs uppercase tracking-wider whitespace-nowrap min-w-[160px] bg-violet-500/10">
                        {f}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {slots.map((slot, si) => {
                    const dateObj = new Date(slot.date + 'T00:00:00')
                    const dayName = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' })
                    const dayNum = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                    const hasProblema = slot.faltando.length > 0
                    const rowBg = hasProblema ? 'bg-amber-500/5' : si % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.02]'
                    const stickyBg = hasProblema ? 'bg-amber-900/30' : si % 2 === 0 ? 'bg-slate-900/80' : 'bg-slate-900/70'

                    const funcMap: Record<string, AssignmentRow | null | undefined> = {}
                    for (const f of allFuncoes) {
                      const a = slot.assignments.find(x => x.funcao === f)
                      if (a) funcMap[f] = a
                      else if (slot.faltando.includes(f)) funcMap[f] = null
                      else funcMap[f] = undefined
                    }

                    return (
                      <tr key={slot.slot_id} className={rowBg}>
                        <td className={`sticky left-0 z-10 backdrop-blur-sm border-b border-r border-white/10 px-5 py-4 ${stickyBg}`}>
                          <div className="flex items-center gap-2.5">
                            <div className={`w-0.5 h-10 rounded-full shrink-0 ${
                              slot.type === 'arena' ? 'bg-violet-500' : slot.type === 'evento' ? 'bg-amber-500' : 'bg-[#c62737]'
                            }`} />
                            <div>
                              <p className="font-bold text-white text-xs leading-tight">{slot.label}</p>
                              <p className="text-white/40 text-[11px] capitalize mt-0.5">
                                {slot.type === 'evento' && <span className="text-amber-400 font-bold mr-1">EVENTO</span>}
                                {dayName} {dayNum} · {slot.time_of_day}
                              </p>
                              {hasProblema && (
                                <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold mt-1">
                                  <AlertCircle size={8} /> {slot.faltando.length} em aberto
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        {allFuncoes.map(f => {
                          const val = funcMap[f]
                          if (val === undefined) return (
                            <td key={f} className={`border-b border-r border-white/10 px-5 py-4 text-center ${rowBg}`}>
                              <span className="text-white/15 select-none">—</span>
                            </td>
                          )
                          if (val === null) return (
                            <td key={f} className={`border-b border-r border-white/10 px-5 py-4 text-center ${rowBg}`}>
                              <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 font-semibold bg-amber-500/15 border border-amber-500/30 border-dashed px-2.5 py-1 rounded-full">
                                <AlertCircle size={9} /> Vaga aberta
                              </span>
                            </td>
                          )
                          const initials = val.person_name.trim().split(' ').filter(Boolean).slice(0, 2).map(n => n[0].toUpperCase()).join('')
                          return (
                            <td key={f} className={`border-b border-r border-white/10 px-4 py-3 text-center ${rowBg}`}>
                              <div className="flex flex-col items-center gap-2">
                                <div className="flex items-center gap-2">
                                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
                                    val.trocado ? 'bg-blue-500/30 text-blue-300' : 'bg-[#c62737]/30 text-[#f87171]'
                                  }`}>{initials}</div>
                                  <span className={`font-semibold text-xs ${
                                    val.trocado ? 'text-blue-300' : 'text-white/90'
                                  }`}>
                                    {val.person_name.trim().split(' ').filter(Boolean).slice(0, 2).join(' ')}
                                    {val.trocado && <span className="ml-1 text-[8px] text-blue-400">↔</span>}
                                  </span>
                                </div>
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-4 border-t border-white/10 flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5"><div className="w-1 h-4 rounded-full bg-[#c62737]" /><span className="text-xs text-white/40">Culto</span></div>
              <div className="flex items-center gap-1.5"><div className="w-1 h-4 rounded-full bg-violet-500" /><span className="text-xs text-white/40">Arena</span></div>
              <div className="flex items-center gap-1.5"><div className="w-1 h-4 rounded-full bg-blue-500" /><span className="text-xs text-white/40">Evento</span></div>
            </div>
          </div>
        )}
      </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pb-12">
        {/* ── Seção de solicitação de troca ────────────────────────────── */}
        {slots.length > 0 && (
          <div className="mt-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl overflow-hidden">
            <div className="px-6 py-5 border-b border-white/10 flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-blue-500/20 flex items-center justify-center shrink-0">
                <ArrowLeftRight size={16} className="text-blue-400" />
              </div>
              <div>
                <h2 className="font-bold text-white text-base">Solicitar troca</h2>
                <p className="text-xs text-white/40">Selecione seu nome e o culto que deseja trocar</p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Passo 1: selecionar voluntário */}
              <div>
                <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Seu nome</label>
                <SearchableSelect
                  value={trocaPersonId}
                  onChange={v => { setTrocaPersonId(v); setTrocaSlotId(''); setTrocaFuncao('') }}
                  options={voluntariosUnicos.map(([id, name]) => ({ id, label: name }))}
                  placeholder="Selecione seu nome…"
                />
              </div>

              {/* Passo 2: selecionar qual culto/função trocar */}
              {minhasEscalas.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Qual culto / função deseja trocar?</label>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {minhasEscalas.map((o, i) => {
                      const d = new Date(o.slot_date + 'T00:00:00')
                      const label = d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
                      const isSelected = trocaSlotId === o.slot_id && trocaFuncao === o.funcao
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => { setTrocaSlotId(o.slot_id); setTrocaFuncao(o.funcao) }}
                          className={`flex items-center gap-3 px-4 py-3 rounded-2xl border text-left transition-all ${
                            isSelected
                              ? 'bg-blue-500/20 border-blue-400/50 ring-1 ring-blue-400/30'
                              : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-white text-xs truncate">{o.slot_label}</p>
                            <p className="text-white/40 text-[11px] capitalize mt-0.5">{label}</p>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 font-bold whitespace-nowrap">{o.funcao}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Passo 3: detalhes adicionais */}
              {trocaSlotId && trocaFuncao && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">
                      Substituto sugerido <span className="text-red-400">*</span>
                    </label>
                    <SearchableSelect
                      value={trocaSubstituto}
                      onChange={setTrocaSubstituto}
                      options={voluntariosUnicos.filter(([id]) => id !== trocaPersonId).map(([id, name]) => ({ id, label: name }))}
                      placeholder="Selecione o substituto…"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Mensagem (opcional)</label>
                    <textarea
                      value={trocaMensagem}
                      onChange={e => setTrocaMensagem(e.target.value)}
                      placeholder="Ex.: estarei viajando neste dia…"
                      rows={3}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 resize-none focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/10 transition-all"
                    />
                  </div>
                </>
              )}

              {trocaErro && (
                <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  <AlertCircle size={13} className="shrink-0" />
                  {trocaErro}
                </div>
              )}

              <button
                type="button"
                onClick={submitTroca}
                disabled={trocaLoading || !trocaPersonId || !trocaSlotId || !trocaSubstituto}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-500 transition-colors disabled:opacity-30 shadow-sm shadow-blue-600/30"
              >
                {trocaLoading ? <Loader2 size={15} className="animate-spin" /> : <Send size={14} />}
                Enviar solicitação de troca
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Banner de sucesso */}
      {successMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2">
          <CheckCircle2 size={16} />
          {successMsg}
        </div>
      )}
    </div>
  )
}
