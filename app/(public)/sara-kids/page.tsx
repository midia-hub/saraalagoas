'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Baby,
  User,
  Heart,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronsUpDown,
  X,
  Phone,
  Mail,
  Users,
  Smile,
  ShieldCheck,
  Star,
  Calendar as CalendarIcon,
  ChevronUp,
  ChevronDown,
} from 'lucide-react'

// ── Tipos ─────────────────────────────────────────────────────────────────

type Step = 'responsavel' | 'crianca' | 'saude' | 'sucesso'

interface AdultData {
  full_name: string
  mobile_phone: string
  email: string
  sex: string
  church_name: string
  relationship_type: string
}

interface ChildData {
  child_name: string
  birth_date: string
  sex: string
  kids_father_name: string
  kids_mother_name: string
  kids_guardian_kinship: string
  kids_contact_1: string
  kids_contact_2: string
  // saúde
  kids_disability: string
  kids_disability_detail: string
  kids_food_restriction: string
  kids_food_restriction_detail: string
  kids_language_difficulty: string
  kids_language_difficulty_detail: string
  kids_noise_sensitivity: string
  kids_noise_sensitivity_detail: string
  kids_material_allergy: string
  kids_material_allergy_detail: string
  kids_ministry_network: string
  kids_ministry_network_detail: string
  kids_medication: string
  kids_medication_detail: string
  kids_health_issues: string
  kids_health_issues_detail: string
  kids_bathroom_use: string
  kids_favorite_toy: string
  kids_calming_mechanism: string
  kids_privacy_consent: boolean
}

const emptyAdult: AdultData = {
  full_name: '', mobile_phone: '', email: '', sex: '',
  church_name: '', relationship_type: '',
}

const emptyChild: ChildData = {
  child_name: '', birth_date: '', sex: '',
  kids_father_name: '', kids_mother_name: '',
  kids_guardian_kinship: '', kids_contact_1: '', kids_contact_2: '',
  kids_disability: '', kids_disability_detail: '',
  kids_food_restriction: '', kids_food_restriction_detail: '',
  kids_language_difficulty: '', kids_language_difficulty_detail: '',
  kids_noise_sensitivity: '', kids_noise_sensitivity_detail: '',
  kids_material_allergy: '', kids_material_allergy_detail: '',
  kids_ministry_network: '', kids_ministry_network_detail: '',
  kids_medication: '', kids_medication_detail: '',
  kids_health_issues: '', kids_health_issues_detail: '',
  kids_bathroom_use: '',
  kids_favorite_toy: '', kids_calming_mechanism: '',
  kids_privacy_consent: false,
}

// ── Helpers ───────────────────────────────────────────────────────────────

const SEX_OPTIONS = ['Masculino', 'Feminino']
const RELATIONSHIP_OPTIONS = ['Pai', 'Mãe', 'Responsável', 'Outro']
const BATHROOM_OPTIONS = ['Independente', 'Parcialmente c/ ajuda', 'Não']

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
      {children}{required && <span className="text-rose-500 ml-0.5">*</span>}
    </label>
  )
}

// Keep backward-compat alias used in JSX below
const Label = FieldLabel

function Input({
  value, onChange, placeholder, type = 'text', required, icon,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string
  type?: string; required?: boolean; icon?: React.ReactNode
}) {
  return (
    <div className="relative">
      {icon && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          {icon}
        </span>
      )}
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className={`w-full rounded-xl border border-slate-200 bg-white py-2.5 text-sm text-slate-800 placeholder-slate-400 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent ${icon ? 'pl-9 pr-3' : 'px-3'}`}
      />
    </div>
  )
}

function Select({
  value, onChange, options, placeholder, required,
}: {
  value: string; onChange: (v: string) => void; options: string[]
  placeholder?: string; required?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <div ref={ref} className="relative">
      <div
        className="flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent transition"
        onClick={() => setOpen(!open)}
      >
        <span className={`flex-1 truncate ${!value ? 'text-slate-400' : 'text-slate-800'}`}>
          {value || (placeholder ?? 'Selecione…')}
        </span>
        <ChevronsUpDown size={14} className="text-slate-400 shrink-0 ml-2" />
      </div>
      {open && (
        <ul className="absolute z-[60] mt-1 w-full max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl animate-in fade-in zoom-in-95 duration-200">
          {options.map(o => (
            <li
              key={o}
              onClick={() => { onChange(o); setOpen(false) }}
              className={`px-3 py-2.5 text-sm cursor-pointer transition-colors hover:bg-violet-50 hover:text-violet-700 ${
                value === o ? 'bg-violet-50 font-semibold text-violet-700' : 'text-slate-700'
              }`}
            >
              {o}
            </li>
          ))}
        </ul>
      )}
      {required && !value && <input type="text" className="sr-only" required tabIndex={-1} value="" onChange={() => {}} />}
    </div>
  )
}

function Textarea({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={2}
      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent resize-none"
    />
  )
}

function DatePicker({
  value, onChange, required
}: {
  value: string; onChange: (v: string) => void; required?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Local state para navegação do calendário (mês/ano)
  const [navDate, setNavDate] = useState(() => (value ? new Date(value + 'T12:00:00') : new Date()))
  
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
  const daysOfWeek = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

  const year = navDate.getFullYear()
  const month = navDate.getMonth()

  // Gerar dias do mês
  const firstDayOfMonth = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const padding = Array.from({ length: firstDayOfMonth }, (_, i) => null)

  function formatDisplayDate(dateStr: string) {
    if (!dateStr) return ''
    const [y, m, d] = dateStr.split('-')
    return `${d}/${m}/${y}`
  }

  function handleSelectDay(day: number) {
    const selected = new Date(year, month, day, 12, 0, 0)
    const yyyy = selected.getFullYear()
    const mm = String(selected.getMonth() + 1).padStart(2, '0')
    const dd = String(selected.getDate()).padStart(2, '0')
    onChange(`${yyyy}-${mm}-${dd}`)
    setOpen(false)
  }

  function changeMonth(offset: number) {
    setNavDate(new Date(year, month + offset, 1))
  }

  function changeYear(offset: number) {
    setNavDate(new Date(year + offset, month, 1))
  }

  const years = Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - i)

  return (
    <div ref={ref} className="relative">
      <div
        className="flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm cursor-pointer shadow-sm focus-within:ring-2 focus-within:ring-violet-400 focus-within:border-transparent transition"
        onClick={() => setOpen(!open)}
      >
        <CalendarIcon size={14} className="text-slate-400 mr-2 shrink-0" />
        <span className={`flex-1 ${!value ? 'text-slate-400' : 'text-slate-800'}`}>
          {value ? formatDisplayDate(value) : 'dd/mm/aaaa'}
        </span>
      </div>

      {open && (
        <div className="absolute z-[70] mt-1 w-[280px] rounded-2xl border border-slate-200 bg-white shadow-2xl p-4 animate-in fade-in zoom-in-95 duration-200 left-0 sm:left-auto sm:right-0 md:left-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-col">
               <span className="text-xs font-bold text-violet-600 uppercase tracking-wider">{months[month]}</span>
               <div className="flex items-center gap-1">
                 <span className="text-sm font-extrabold text-slate-800">{year}</span>
                 <div className="flex flex-col -gap-1">
                    <button type="button" onClick={() => changeYear(1)} className="hover:text-violet-600 transition-colors"><ChevronUp size={12}/></button>
                    <button type="button" onClick={() => changeYear(-1)} className="hover:text-violet-600 transition-colors"><ChevronDown size={12}/></button>
                 </div>
               </div>
            </div>
            <div className="flex gap-1">
              <button type="button" onClick={() => changeMonth(-1)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"><ChevronLeft size={16}/></button>
              <button type="button" onClick={() => changeMonth(1)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"><ChevronRight size={16}/></button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {daysOfWeek.map(d => (
              <span key={d} className="text-[10px] font-bold text-slate-400 text-center uppercase">{d}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {padding.map((_, i) => <div key={`p-${i}`} />)}
            {days.map(d => {
              const isToday = new Date().toDateString() === new Date(year, month, d).toDateString()
              const isSelected = value === `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleSelectDay(d)}
                  className={`h-8 w-8 rounded-lg text-xs font-medium transition-all ${
                    isSelected ? 'bg-violet-600 text-white shadow-md shadow-violet-200' :
                    isToday ? 'bg-violet-50 text-violet-700 border border-violet-200' :
                    'hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  {d}
                </button>
              )
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between">
             <button type="button" onClick={() => { onChange(''); setOpen(false) }} className="text-[10px] font-bold text-slate-400 hover:text-rose-500 uppercase tracking-tighter">Limpar</button>
             <button type="button" onClick={() => {
                const now = new Date();
                const y = now.getFullYear();
                const m = String(now.getMonth() + 1).padStart(2, '0');
                const d = String(now.getDate()).padStart(2, '0');
                onChange(`${y}-${m}-${d}`);
                setOpen(false);
             }} className="text-[10px] font-bold text-violet-600 hover:text-violet-800 uppercase tracking-tighter">Hoje</button>
          </div>
        </div>
      )}
      {required && !value && <input type="text" className="sr-only" required tabIndex={-1} value="" onChange={() => {}} />}
    </div>
  )
}

function SectionTitle({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-slate-400">{icon}</span>
      <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</span>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  )
}

function SimNaoField({
  label, simNaoValue, onSimNao, detail, onDetail, detailPlaceholder,
}: {
  label: string
  simNaoValue: string
  onSimNao: (v: string) => void
  detail: string
  onDetail: (v: string) => void
  detailPlaceholder?: string
}) {
  return (
    <div className={`rounded-xl border p-4 transition-colors ${
      simNaoValue === 'Sim' ? 'border-rose-200 bg-rose-50/60' :
      simNaoValue === 'Não' ? 'border-emerald-200 bg-emerald-50/40' :
      'border-slate-200 bg-slate-50/60'
    }`}>
      <p className="text-sm font-medium text-slate-700 mb-3 leading-snug">{label}</p>
      <div className="flex gap-3">
        {['Sim', 'Não'].map(opt => (
          <button
            key={opt}
            type="button"
            onClick={() => onSimNao(opt)}
            className={`flex-1 rounded-lg py-1.5 text-sm font-semibold border transition-all ${
              simNaoValue === opt
                ? opt === 'Sim'
                  ? 'bg-rose-500 text-white border-rose-500 shadow-sm'
                  : 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
      {simNaoValue === 'Sim' && (
        <div className="mt-3">
          <Textarea
            value={detail}
            onChange={onDetail}
            placeholder={detailPlaceholder ?? 'Descreva…'}
          />
        </div>
      )}
    </div>
  )
}

// ── Combobox de Pessoas ────────────────────────────────────────────────

function PersonCombobox({
  value, onChange, onSelectPerson
}: {
  value: string
  onChange: (v: string) => void
  onSelectPerson: (p: any) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  useEffect(() => {
    if (query.trim().length < 3) {
      setItems([])
      return
    }
    const timer = setTimeout(() => {
      setLoading(true)
      fetch(`/api/public/lookups/people?q=${encodeURIComponent(query)}`)
        .then(r => r.json())
        .then(data => setItems(data.items ?? []))
        .catch(() => setItems([]))
        .finally(() => setLoading(false))
    }, 400)
    return () => clearTimeout(timer)
  }, [query])

  function handleSelect(p: any) {
    onSelectPerson(p)
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={ref} className="relative">
      <div
        className="flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm cursor-pointer shadow-sm focus-within:ring-2 focus-within:ring-violet-400 focus-within:border-transparent transition"
        onClick={() => setOpen(true)}
      >
        <User size={14} className="text-slate-400 mr-2 shrink-0" />
        <input
          value={open ? query : value}
          onChange={e => {
            setQuery(e.target.value)
            if (!open) setOpen(true)
            onChange(e.target.value)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Nome completo do responsável"
          className="flex-1 bg-transparent outline-none text-slate-800 placeholder-slate-400 text-sm"
        />
        {loading && <Loader2 size={14} className="text-slate-400 animate-spin ml-2" />}
      </div>
      {open && query.trim().length >= 3 && (
        <ul className="absolute z-[60] mt-1 w-full max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl animate-in fade-in zoom-in-95 duration-200">
          {items.length === 0 ? (
            !loading && <li className="px-3 py-3 text-sm text-slate-400 italic font-medium">Nenhum cadastro encontrado</li>
          ) : (
            items.map(p => (
              <li
                key={p.id}
                onMouseDown={() => handleSelect(p)}
                className="px-3 py-3 text-sm cursor-pointer transition-colors hover:bg-violet-50 group border-b border-slate-50 last:border-0"
              >
                <div className="font-bold text-slate-700 group-hover:text-violet-700">{p.full_name}</div>
                {p.mobile_phone && <div className="text-[10px] text-slate-400 mt-0.5">{p.mobile_phone}</div>}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}

// ── Combobox de Igrejas ─────────────────────────────────────────────────

function ChurchCombobox({
  value, onChange, churches,
}: {
  value: string
  onChange: (v: string) => void
  churches: string[]
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const filtered = churches.filter(c =>
    c.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 50)

  function select(name: string) {
    onChange(name)
    setQuery('')
    setOpen(false)
  }

  function clear() {
    onChange('')
    setQuery('')
  }

  return (
    <div ref={ref} className="relative">
      <div
        className="flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm cursor-pointer shadow-sm focus-within:ring-2 focus-within:ring-violet-400 focus-within:border-transparent transition"
        onClick={() => setOpen(true)}
      >
        {value && !open ? (
          <>
            <span className="flex-1 text-slate-800 truncate">{value}</span>
            <button type="button" onClick={e => { e.stopPropagation(); clear() }} className="ml-1 text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          </>
        ) : (
          <>
            <input
              autoFocus={open}
              value={open ? query : ''}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => setOpen(true)}
              placeholder={value || 'Digite ou selecione a igreja…'}
              className="flex-1 bg-transparent outline-none text-slate-800 placeholder-slate-400 text-sm"
            />
            <ChevronsUpDown size={14} className="text-slate-400 shrink-0" />
          </>
        )}
      </div>
      {open && (
        <ul className="absolute z-50 mt-1 w-full max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-slate-400">Nenhuma encontrada</li>
          ) : (
            filtered.map(c => (
              <li
                key={c}
                onMouseDown={() => select(c)}
                className={`px-3 py-2.5 text-sm cursor-pointer transition-colors hover:bg-violet-50 hover:text-violet-700 ${
                  value === c ? 'bg-violet-50 font-semibold text-violet-700' : 'text-slate-700'
                }`}
              >
                {c}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}

const STEP_META = [
  { id: 'responsavel' as Step, label: 'Responsável', icon: <User size={13} /> },
  { id: 'crianca'     as Step, label: 'Criança',      icon: <Baby size={13} /> },
  { id: 'saude'       as Step, label: 'Saúde',        icon: <Heart size={13} /> },
]

function StepIndicator({ step }: { step: Step }) {
  const currentIdx = STEP_META.findIndex(s => s.id === step)
  return (
    <div className="flex items-center justify-center gap-1 mb-8">
      {STEP_META.map((s, i) => {
        const done = step === 'sucesso' || i < currentIdx
        const active = i === currentIdx
        return (
          <div key={s.id} className="flex items-center gap-1">
            <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
              done   ? 'bg-violet-600 text-white shadow-md shadow-violet-200' :
              active ? 'bg-white text-violet-700 ring-2 ring-violet-500 shadow-md' :
                       'bg-white/60 text-slate-400 ring-1 ring-slate-200'
            }`}>
              {done ? <CheckCircle2 size={12} /> : s.icon}
              <span className="hidden sm:block">{s.label}</span>
              <span className="sm:hidden">{i + 1}</span>
            </div>
            {i < STEP_META.length - 1 && (
              <div className={`w-5 h-0.5 rounded-full transition-colors ${i < currentIdx ? 'bg-violet-400' : 'bg-slate-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────────────────

export default function SaraKidsPage() {
  const [step, setStep] = useState<Step>('responsavel')
  const [adult, setAdult] = useState<AdultData>(emptyAdult)
  const [child, setChild] = useState<ChildData>(emptyChild)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [churches, setChurches] = useState<string[]>([])

  useEffect(() => {
    fetch('/api/public/consolidacao/churches')
      .then(r => r.json())
      .then(data => {
        const names = (data.items ?? []).map((c: { name: string }) => c.name) as string[]
        setChurches(names)
      })
      .catch(() => {})
  }, [])

  function setA<K extends keyof AdultData>(k: K, v: AdultData[K]) {
    setAdult(prev => ({ ...prev, [k]: v }))
  }
  function setC<K extends keyof ChildData>(k: K, v: ChildData[K]) {
    setChild(prev => ({ ...prev, [k]: v }))
  }

  function handleSelectPerson(p: any) {
    setAdult(prev => ({
      ...prev,
      full_name: p.full_name,
      mobile_phone: p.mobile_phone || prev.mobile_phone,
      email: p.email || prev.email,
      sex: p.sex || prev.sex,
      church_name: p.church_name || prev.church_name
    }))
  }

  // ── Validações por passo ────────────────────────────────────────────────

  function validateStep1(): string | null {
    if (!adult.full_name.trim())       return 'Informe o nome completo do responsável.'
    if (!adult.mobile_phone.trim())    return 'Informe o celular do responsável.'
    if (!adult.sex)                    return 'Selecione o sexo do responsável.'
    if (!adult.relationship_type)      return 'Selecione o parentesco com a criança.'
    return null
  }

  function validateStep2(): string | null {
    if (!child.child_name.trim())  return 'Informe o nome completo da criança.'
    if (!child.birth_date)         return 'Informe a data de nascimento da criança.'
    if (!child.sex)                return 'Selecione o sexo da criança.'
    return null
  }

  function validateStep3(): string | null {
    const healthFields = [
      { key: 'kids_disability',          label: 'Deficiência' },
      { key: 'kids_food_restriction',    label: 'Restrição alimentar' },
      { key: 'kids_language_difficulty', label: 'Dificuldade de linguagem' },
      { key: 'kids_noise_sensitivity',   label: 'Sensibilidade a sons' },
      { key: 'kids_material_allergy',    label: 'Alergia a materiais' },
      { key: 'kids_ministry_network',    label: 'Rede de ministradores' },
      { key: 'kids_medication',          label: 'Usa medicação' },
      { key: 'kids_health_issues',       label: 'Problemas de saúde' },
    ] as const
    for (const f of healthFields) {
      if (!child[f.key]) return `Responda o campo "${f.label}".`
    }
    if (!child.kids_bathroom_use) return 'Responda o uso do banheiro.'
    if (!child.kids_privacy_consent) return 'Você precisa concordar em compartilhar as informações.'
    return null
  }

  function goNext() {
    setError(null)
    if (step === 'responsavel') {
      const err = validateStep1()
      if (err) { setError(err); return }
      setStep('crianca')
    } else if (step === 'crianca') {
      const err = validateStep2()
      if (err) { setError(err); return }
      setStep('saude')
    }
  }

  function goBack() {
    setError(null)
    if (step === 'crianca') setStep('responsavel')
    else if (step === 'saude') setStep('crianca')
  }

  async function handleSubmit() {
    const err = validateStep3()
    if (err) { setError(err); return }
    setError(null)
    setSaving(true)
    try {
      const res = await fetch('/api/public/sara-kids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adult, child }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Erro ao enviar cadastro.')
        return
      }
      setStep('sucesso')
    } catch {
      setError('Falha de conexão. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  // ── Layout ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#f5f3ff]">
      {/* faixa decorativa topo */}
      <div className="h-1.5 w-full bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500" />

      {/* Header */}
      <div className="bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-5 py-5 flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md shadow-violet-200">
              <Baby className="text-white" size={24} />
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-yellow-400 border-2 border-white flex items-center justify-center">
              <Star size={9} className="text-white fill-white" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-800 tracking-tight leading-none">Sara Kids</h1>
            <p className="text-xs text-slate-500 mt-0.5">Ficha de cadastro da criança</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 pb-16">
        {step !== 'sucesso' && <StepIndicator step={step} />}

        {/* ── Mensagem de erro ────────────────────────────────── */}
        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-700 shadow-sm">
            <AlertCircle size={17} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            PASSO 1 — RESPONSÁVEL
        ══════════════════════════════════════════════════════ */}
        {step === 'responsavel' && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 relative">
            <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-5 rounded-t-3xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <User size={18} className="text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Dados do Responsável</h2>
                  <p className="text-xs text-violet-200">Quem está trazendo a criança</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <Label required>Nome completo</Label>
                <PersonCombobox
                  value={adult.full_name}
                  onChange={v => setA('full_name', v)}
                  onSelectPerson={handleSelectPerson}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label required>Celular / WhatsApp</Label>
                  <Input value={adult.mobile_phone} onChange={v => setA('mobile_phone', v)}
                    placeholder="(99) 99999-9999" type="tel"
                    icon={<Phone size={14} />} required />
                </div>
                <div>
                  <Label>E-mail</Label>
                  <Input value={adult.email} onChange={v => setA('email', v)}
                    placeholder="email@exemplo.com" type="email"
                    icon={<Mail size={14} />} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label required>Sexo</Label>
                  <Select value={adult.sex} onChange={v => setA('sex', v)} options={SEX_OPTIONS} required />
                </div>
                <div>
                  <Label required>Parentesco com a criança</Label>
                  <Select value={adult.relationship_type} onChange={v => setA('relationship_type', v)}
                    options={RELATIONSHIP_OPTIONS} required />
                </div>
              </div>

              <div>
                <Label>Congregação / Igreja</Label>
                <ChurchCombobox
                  value={adult.church_name}
                  onChange={v => setA('church_name', v)}
                  churches={churches}
                />
              </div>
            </div>

            <div className="px-6 pb-6 flex justify-end">
              <button
                onClick={goNext}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-200 hover:from-violet-700 hover:to-purple-700 transition-all"
              >
                Próximo <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            PASSO 2 — CRIANÇA
        ══════════════════════════════════════════════════════ */}
        {step === 'crianca' && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 relative">
            <div className="bg-gradient-to-r from-purple-600 to-pink-500 px-6 py-5 rounded-t-3xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <Baby size={18} className="text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Dados da Criança</h2>
                  <p className="text-xs text-purple-200">Informações básicas</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <Label required>Nome completo da criança</Label>
                <Input value={child.child_name} onChange={v => setC('child_name', v)}
                  placeholder="Nome completo" icon={<Smile size={14} />} required />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label required>Data de nascimento</Label>
                  <DatePicker value={child.birth_date} onChange={v => setC('birth_date', v)} required />
                </div>
                <div>
                  <Label required>Sexo</Label>
                  <Select value={child.sex} onChange={v => setC('sex', v)} options={SEX_OPTIONS} required />
                </div>
              </div>

              {adult.relationship_type === 'Outro' && (
                <div>
                  <Label>Grau de parentesco</Label>
                  <Input value={child.kids_guardian_kinship} onChange={v => setC('kids_guardian_kinship', v)} placeholder="Ex: Avó, Tio(a)…" />
                </div>
              )}

              <div>
                <SectionTitle icon={<Users size={13} />} label="Pais / Contatos" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {adult.relationship_type === 'Pai' ? (
                    <>
                      <div>
                        <Label>Nome da mãe</Label>
                        <Input value={child.kids_mother_name} onChange={v => setC('kids_mother_name', v)} placeholder="Nome da mãe" />
                      </div>
                      <div>
                        <Label>Celular da mãe</Label>
                        <Input value={child.kids_contact_1} onChange={v => setC('kids_contact_1', v)}
                          placeholder="(99) 99999-9999" type="tel" icon={<Phone size={14} />} />
                      </div>
                    </>
                  ) : adult.relationship_type === 'Mãe' ? (
                    <>
                      <div>
                        <Label>Nome do pai</Label>
                        <Input value={child.kids_father_name} onChange={v => setC('kids_father_name', v)} placeholder="Nome do pai" />
                      </div>
                      <div>
                        <Label>Celular do pai</Label>
                        <Input value={child.kids_contact_1} onChange={v => setC('kids_contact_1', v)}
                          placeholder="(99) 99999-9999" type="tel" icon={<Phone size={14} />} />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <Label>Nome do pai</Label>
                        <Input value={child.kids_father_name} onChange={v => setC('kids_father_name', v)} placeholder="Nome do pai" />
                      </div>
                      <div>
                        <Label>Nome da mãe</Label>
                        <Input value={child.kids_mother_name} onChange={v => setC('kids_mother_name', v)} placeholder="Nome da mãe" />
                      </div>
                      <div className="sm:col-span-2">
                        <Label>Outro contato de emergência</Label>
                        <Input value={child.kids_contact_1} onChange={v => setC('kids_contact_1', v)}
                          placeholder="(99) 99999-9999" type="tel" icon={<Phone size={14} />} />
                      </div>
                    </>
                  )}
                  {adult.relationship_type !== 'Outro' && (
                    <div className="sm:col-span-2">
                      <Label>Contato de emergência adicional (opcional)</Label>
                      <Input value={child.kids_contact_2} onChange={v => setC('kids_contact_2', v)}
                        placeholder="(99) 99999-9999" type="tel" icon={<Phone size={14} />} />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <SectionTitle icon={<Heart size={13} />} label="Preferências" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Brinquedo favorito</Label>
                    <Input value={child.kids_favorite_toy} onChange={v => setC('kids_favorite_toy', v)}
                      placeholder="Ex: carrinho, boneca…" />
                  </div>
                  <div>
                    <Label>O que acalma a criança</Label>
                    <Input value={child.kids_calming_mechanism} onChange={v => setC('kids_calming_mechanism', v)}
                      placeholder="Ex: música, colo…" />
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 pb-6 flex justify-between">
              <button onClick={goBack} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 transition-colors">
                <ChevronLeft size={16} /> Voltar
              </button>
              <button onClick={goNext} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-200 hover:from-violet-700 hover:to-purple-700 transition-all">
                Próximo <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            PASSO 3 — SAÚDE E CUIDADOS
        ══════════════════════════════════════════════════════ */}
        {step === 'saude' && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 relative">
            <div className="bg-gradient-to-r from-rose-500 to-pink-500 px-6 py-5 rounded-t-3xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <ShieldCheck size={18} className="text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Saúde e Cuidados</h2>
                  <p className="text-xs text-rose-200">Responda todos os campos com atenção</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-3">
              <SimNaoField
                label="A criança possui alguma deficiência?"
                simNaoValue={child.kids_disability} onSimNao={v => setC('kids_disability', v)}
                detail={child.kids_disability_detail} onDetail={v => setC('kids_disability_detail', v)}
                detailPlaceholder="Descreva a deficiência…"
              />
              <SimNaoField
                label="Possui alguma restrição alimentar ou alergia alimentar?"
                simNaoValue={child.kids_food_restriction} onSimNao={v => setC('kids_food_restriction', v)}
                detail={child.kids_food_restriction_detail} onDetail={v => setC('kids_food_restriction_detail', v)}
                detailPlaceholder="Descreva a restrição…"
              />
              <SimNaoField
                label="Possui dificuldade de linguagem ou comunicação?"
                simNaoValue={child.kids_language_difficulty} onSimNao={v => setC('kids_language_difficulty', v)}
                detail={child.kids_language_difficulty_detail} onDetail={v => setC('kids_language_difficulty_detail', v)}
                detailPlaceholder="Descreva a dificuldade…"
              />
              <SimNaoField
                label="É sensível a sons altos ou barulhos?"
                simNaoValue={child.kids_noise_sensitivity} onSimNao={v => setC('kids_noise_sensitivity', v)}
                detail={child.kids_noise_sensitivity_detail} onDetail={v => setC('kids_noise_sensitivity_detail', v)}
                detailPlaceholder="Descreva a sensibilidade…"
              />
              <SimNaoField
                label="Possui alergia a materiais (látex, tinta, etc.)?"
                simNaoValue={child.kids_material_allergy} onSimNao={v => setC('kids_material_allergy', v)}
                detail={child.kids_material_allergy_detail} onDetail={v => setC('kids_material_allergy_detail', v)}
                detailPlaceholder="Descreva a alergia…"
              />
              <SimNaoField
                label="Já participou da rede de ministradores?"
                simNaoValue={child.kids_ministry_network} onSimNao={v => setC('kids_ministry_network', v)}
                detail={child.kids_ministry_network_detail} onDetail={v => setC('kids_ministry_network_detail', v)}
                detailPlaceholder="Detalhes…"
              />
              <SimNaoField
                label="Usa alguma medicação controlada?"
                simNaoValue={child.kids_medication} onSimNao={v => setC('kids_medication', v)}
                detail={child.kids_medication_detail} onDetail={v => setC('kids_medication_detail', v)}
                detailPlaceholder="Nome do medicamento e dosagem…"
              />
              <SimNaoField
                label="Possui algum problema de saúde relevante?"
                simNaoValue={child.kids_health_issues} onSimNao={v => setC('kids_health_issues', v)}
                detail={child.kids_health_issues_detail} onDetail={v => setC('kids_health_issues_detail', v)}
                detailPlaceholder="Descreva o problema…"
              />

              {/* Uso do banheiro */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <p className="text-sm font-medium text-slate-700 mb-3">Sua criança faz uso do banheiro? <span className="text-rose-500">*</span></p>
                <div className="grid grid-cols-1 gap-2">
                  {BATHROOM_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setC('kids_bathroom_use', opt)}
                      className={`rounded-lg py-2 px-3 text-sm font-medium border text-left transition-all ${
                        child.kids_bathroom_use === opt
                          ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-violet-300'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Termo de Consentimento */}
              <div className="rounded-xl border border-slate-200 bg-violet-50/50 p-4">
                <p className="text-[13px] leading-relaxed text-slate-600 mb-4 bg-white/50 p-3 rounded-lg border border-violet-100 italic">
                  Todos os dados coletados tem como finalidade conhecer melhor a sua criança e obter informações de segurança para o ministério infantil, salientamos que nenhum dado será usado fora do espaço ministerial.
                </p>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative flex items-center mt-0.5">
                    <input
                      type="checkbox"
                      checked={child.kids_privacy_consent === true}
                      onChange={e => setC('kids_privacy_consent', e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${
                      child.kids_privacy_consent
                        ? 'bg-violet-600 border-violet-600'
                        : 'bg-white border-slate-300 group-hover:border-violet-400'
                    }`}>
                      {child.kids_privacy_consent && (
                        <CheckCircle2 className="text-white" size={14} />
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-medium text-slate-700 select-none">
                    Eu concordo em compartilhar essas informações com o ministério Sara Nossa Terra Alagoas e o Sara Kids
                  </span>
                </label>
              </div>
            </div>

            <div className="px-6 pb-6 flex justify-between">
              <button onClick={goBack} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 transition-colors">
                <ChevronLeft size={16} /> Voltar
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-200 hover:from-violet-700 hover:to-purple-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
              >
                {saving ? <><Loader2 size={16} className="animate-spin" /> Enviando…</> : <><CheckCircle2 size={16} /> Concluir cadastro</>}
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            SUCESSO
        ══════════════════════════════════════════════════════ */}
        {step === 'sucesso' && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 relative text-center">
            <div className="h-2 bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500 rounded-t-3xl" />
            <div className="p-8 sm:p-10">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 border-4 border-white shadow-lg flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 size={38} className="text-violet-600" />
              </div>
              <h2 className="text-2xl font-extrabold text-slate-800 mb-2">Cadastro realizado! 🎉</h2>
              <p className="text-slate-500 text-sm mb-6">
                <strong className="text-slate-700">{child.child_name}</strong> foi cadastrada(o) com sucesso no Sara Kids.
              </p>
              <div className="rounded-2xl bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-100 px-6 py-5 text-left mb-6">
                <p className="text-sm font-bold text-violet-700 mb-3 flex items-center gap-2">
                  <Star size={14} className="fill-violet-400 text-violet-400" /> Próximos passos
                </p>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-start gap-2">
                    <span className="text-violet-400 font-bold mt-0.5">1.</span>
                    Apresente-se ao líder do Sara Kids na chegada ao culto.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-violet-400 font-bold mt-0.5">2.</span>
                    Traga um documento de identificação da criança.
                  </li>
                </ul>
              </div>
              <button
                onClick={() => { setStep('responsavel'); setAdult(emptyAdult); setChild(emptyChild) }}
                className="rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50 transition-colors"
              >
                Cadastrar outra criança
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
