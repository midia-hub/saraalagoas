'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Building2, CreditCard, DoorOpen, DoorClosed, Plus, Loader2, Search,
  User, Pencil, Trash2, Settings, Ticket,
} from 'lucide-react'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { Toast } from '@/components/Toast'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { adminFetchJson, getAccessTokenOrThrow } from '@/lib/admin-client'
import { supabase } from '@/lib/supabase'
import { useAdminAccess } from '@/lib/admin-access-context'

//  Types 

type Store = {
  id: string
  mp_store_id: number
  name: string
  external_id: string | null
  address_line: string | null
  location?: { latitude?: number; longitude?: number; reference?: string }
  created_at: string
}

type Pos = {
  id: string
  mp_pos_id: number
  name: string
  external_id: string
  qr_image_url: string | null
  status: string
  store?: { id: string; name: string; external_id: string | null }
}

type Sessao = {
  id: string
  pos_id: string
  opened_at: string
  closed_at: string | null
  opening_balance: number
  closing_balance: number | null
  status: string
  notes: string | null
  opened_by_name?: string | null
  pos?: { id: string; name: string; external_id: string }
}

type Coupon = {
  id: string
  code: string
  description: string | null
  discount_type: 'value' | 'percent'
  discount_value: number
  min_purchase: number
  valid_from: string | null
  valid_until: string | null
  usage_limit: number | null
  used_count: number
  active: boolean
  created_at: string
}

//  Inner page (needs useSearchParams) 

function LivrariaLojaCaixaInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const access = useAdminAccess()

  const hasPdv = access.isAdmin || !!access.permissions['livraria_pdv']?.view
  const hasCupons = access.isAdmin || !!access.permissions['livraria_cupons']?.view

  const defaultTab = searchParams.get('tab') === 'cupons' ? 'cupons' : (hasPdv ? 'loja-caixa' : 'cupons')
  const [activeTab, setActiveTab] = useState<'loja-caixa' | 'cupons'>(defaultTab)

  function switchTab(tab: 'loja-caixa' | 'cupons') {
    setActiveTab(tab)
    router.replace(`/admin/livraria/loja-caixa?tab=${tab}`, { scroll: false })
  }

  //  Loja & Caixa state 
  const [stores, setStores] = useState<Store[]>([])
  const [posList, setPosList] = useState<Pos[]>([])
  const [sessoes, setSessoes] = useState<Sessao[]>([])
  const [loadingPdv, setLoadingPdv] = useState(true)
  const [mpConfig, setMpConfig] = useState<{ collector_id_configured: boolean } | null>(null)
  const [currentUserName, setCurrentUserName] = useState<string>('')
  const [showStoreForm, setShowStoreForm] = useState(true)
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null)
  const [storeForm, setStoreForm] = useState({
    name: '', address_line: '', cep: '', street_number: '', street_name: '',
    city_name: '', state_name: '', latitude: '', longitude: '', reference: '',
  })
  const [storeSaving, setStoreSaving] = useState(false)
  const [storeDeletingId, setStoreDeletingId] = useState<string | null>(null)
  const [cepLoading, setCepLoading] = useState(false)
  const [posForm, setPosForm] = useState({ store_id: '', name: '' })
  const [showPosForm, setShowPosForm] = useState(false)
  const [posSaving, setPosSaving] = useState(false)
  const [abrirBalanceByPos, setAbrirBalanceByPos] = useState<Record<string, string>>({})
  const [abrirLoading, setAbrirLoading] = useState(false)
  const [fecharSessaoId, setFecharSessaoId] = useState('')
  const [fecharBalance, setFecharBalance] = useState('')
  const [fecharNotes, setFecharNotes] = useState('')
  const [fecharLoading, setFecharLoading] = useState(false)
  const ALL_PAYMENT_METHODS = [
    { value: 'Dinheiro', label: 'Dinheiro' },
    { value: 'Pix', label: 'Pix' },
    { value: 'Cartão', label: 'Cartão' },
    { value: 'Mercado Pago', label: 'Mercado Pago (Pix online)' },
    { value: 'QR no caixa', label: 'QR no caixa (Mercado Pago)' },
    { value: 'Outro', label: 'Outro' },
  ]
  const [enabledMethods, setEnabledMethods] = useState<string[]>(ALL_PAYMENT_METHODS.map((m) => m.value))
  const [pmSaving, setPmSaving] = useState(false)

  //  Cupons state 
  const [cupons, setCupons] = useState<Coupon[]>([])
  const [loadingCupons, setLoadingCupons] = useState(true)
  const [cuponsSearch, setCuponsSearch] = useState('')
  const [cupomModalOpen, setCupomModalOpen] = useState(false)
  const [editingCupom, setEditingCupom] = useState<Coupon | null>(null)
  const [cupomSaveLoading, setCupomSaveLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [cupomForm, setCupomForm] = useState({
    code: '', description: '', discount_type: 'value' as 'value' | 'percent',
    discount_value: '', min_purchase: '', valid_from: '', valid_until: '',
    usage_limit: '', active: true,
  })

  //  Toast compartilhado 
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; message: string } | null>(null)

  //  Load PDV 
  const loadPdv = useCallback(async () => {
    setLoadingPdv(true)
    try {
      const [config, s, p, sess] = await Promise.all([
        adminFetchJson<{ collector_id_configured: boolean }>('/api/admin/livraria/mercadopago/config/').catch(() => null),
        adminFetchJson<Store[]>('/api/admin/livraria/mercadopago/lojas/'),
        adminFetchJson<Pos[]>('/api/admin/livraria/mercadopago/caixas/'),
        adminFetchJson<Sessao[]>('/api/admin/livraria/mercadopago/sessoes/'),
      ])
      setMpConfig(config)
      const storeList = Array.isArray(s) ? s : []
      setStores(storeList)
      if (storeList.length > 0) setShowStoreForm(false)
      setPosList(Array.isArray(p) ? p : [])
      setSessoes(Array.isArray(sess) ? sess : [])
    } catch {
      setToast({ type: 'err', message: 'Erro ao carregar dados de loja/caixa.' })
    } finally {
      setLoadingPdv(false)
    }
  }, [])

  //  Load Cupons 
  const loadCupons = useCallback(async () => {
    setLoadingCupons(true)
    try {
      const params = new URLSearchParams()
      if (cuponsSearch) params.set('search', cuponsSearch)
      params.set('active', 'false')
      const data = await adminFetchJson<{ items: Coupon[] }>(`/api/admin/livraria/cupons?${params}`)
      setCupons(data.items ?? [])
    } catch {
      setCupons([])
      setToast({ type: 'err', message: 'Erro ao carregar cupons.' })
    } finally {
      setLoadingCupons(false)
    }
  }, [cuponsSearch])

  useEffect(() => { if (hasPdv) loadPdv() }, [loadPdv, hasPdv])
  useEffect(() => { if (hasCupons) loadCupons() }, [loadCupons, hasCupons])

  useEffect(() => {
    adminFetchJson<{ enabled: string[] }>('/api/admin/livraria/config/payment-methods/')
      .then((d) => { if (Array.isArray(d.enabled)) setEnabledMethods(d.enabled) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    supabase?.auth.getUser().then(({ data: { user } }) => {
      const name = user?.user_metadata?.full_name
      if (typeof name === 'string') setCurrentUserName(name)
    })
  }, [])

  useEffect(() => {
    if (showPosForm)
      setPosForm((f) => ({ ...f, name: currentUserName ? `Caixa - ${currentUserName}` : 'Caixa' }))
  }, [showPosForm, currentUserName])

  //  PDV handlers 

  async function buscarPorCep() {
    const cep = storeForm.cep.replace(/\D/g, '')
    if (cep.length !== 8) {
      setToast({ type: 'err', message: 'Informe um CEP válido (8 dígitos).' })
      return
    }
    setCepLoading(true)
    setToast(null)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
      const data = await res.json()
      if (data.erro) {
        setToast({ type: 'err', message: 'CEP não encontrado.' })
        setCepLoading(false)
        return
      }
      setStoreForm((f) => ({
        ...f,
        street_name: data.logradouro || f.street_name,
        city_name: data.localidade || f.city_name,
        state_name: data.uf || f.state_name,
        reference: data.bairro || f.reference,
      }))
      const query = [data.logradouro, data.bairro, data.localidade, data.uf, 'Brasil'].filter(Boolean).join(', ')
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
        { headers: { 'User-Agent': 'LivrariaSara/1.0 (integracao@livraria)' } }
      )
      const geo = await geoRes.json()
      if (Array.isArray(geo) && geo[0]?.lat && geo[0]?.lon) {
        setStoreForm((f) => ({ ...f, latitude: geo[0].lat, longitude: geo[0].lon }))
      }
      setToast({ type: 'ok', message: 'Endereço preenchido pelo CEP. Confira e informe o número se necessário.' })
    } catch {
      setToast({ type: 'err', message: 'Erro ao buscar CEP. Tente novamente.' })
    } finally {
      setCepLoading(false)
    }
  }

  function openEditarLoja(s: Store) {
    setEditingStoreId(s.id)
    setStoreForm({
      name: s.name, address_line: s.address_line ?? '', cep: '', street_number: '',
      street_name: '', city_name: '', state_name: '',
      latitude: String(s.location?.latitude ?? ''),
      longitude: String(s.location?.longitude ?? ''),
      reference: s.location?.reference ?? '',
    })
    setShowStoreForm(true)
  }

  async function handleExcluirLoja(id: string) {
    if (!window.confirm('Excluir esta loja? Os caixas vinculados também serão removidos da plataforma.')) return
    setStoreDeletingId(id)
    try {
      const token = await getAccessTokenOrThrow()
      const res = await fetch(`/api/admin/livraria/mercadopago/lojas/${id}/`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao excluir loja')
      setToast({ type: 'ok', message: 'Loja excluída.' })
      setShowStoreForm(false)
      setEditingStoreId(null)
      loadPdv()
    } catch (e) {
      setToast({ type: 'err', message: e instanceof Error ? e.message : 'Erro ao excluir loja.' })
    } finally {
      setStoreDeletingId(null)
    }
  }

  async function handleSubmitLoja(e: React.FormEvent) {
    e.preventDefault()
    if (editingStoreId) {
      if (!storeForm.name.trim()) {
        setToast({ type: 'err', message: 'Nome da loja é obrigatório.' })
        return
      }
      setStoreSaving(true)
      try {
        const token = await getAccessTokenOrThrow()
        const lat = parseFloat(storeForm.latitude)
        const lng = parseFloat(storeForm.longitude)
        const res = await fetch(`/api/admin/livraria/mercadopago/lojas/${editingStoreId}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            name: storeForm.name.trim(),
            address_line: storeForm.address_line.trim() || null,
            location: (Number.isNaN(lat) || Number.isNaN(lng)) ? undefined : { latitude: lat, longitude: lng, reference: storeForm.reference.trim() || undefined },
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Erro ao atualizar loja')
        setToast({ type: 'ok', message: 'Loja atualizada.' })
        setShowStoreForm(false)
        setEditingStoreId(null)
        setStoreForm({ name: '', address_line: '', cep: '', street_number: '', street_name: '', city_name: '', state_name: '', latitude: '', longitude: '', reference: '' })
        loadPdv()
      } catch (e) {
        setToast({ type: 'err', message: e instanceof Error ? e.message : 'Erro ao atualizar loja.' })
      } finally {
        setStoreSaving(false)
      }
      return
    }
    const lat = parseFloat(storeForm.latitude)
    const lng = parseFloat(storeForm.longitude)
    if (!storeForm.name.trim()) {
      setToast({ type: 'err', message: 'Nome da loja é obrigatório.' })
      return
    }
    if (!storeForm.street_name.trim() || !storeForm.city_name.trim() || !storeForm.state_name.trim()) {
      setToast({ type: 'err', message: 'Preencha Rua, Cidade e Estado. Use a busca por CEP para preencher automaticamente.' })
      return
    }
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      setToast({ type: 'err', message: 'Latitude e longitude devem ser números. Use a busca por CEP para preencher ou informe as coordenadas.' })
      return
    }
    if (lat === 0 && lng === 0) {
      setToast({ type: 'err', message: 'Informe uma localização válida (latitude e longitude). Use a busca por CEP.' })
      return
    }
    setStoreSaving(true)
    try {
      const token = await getAccessTokenOrThrow()
      const res = await fetch('/api/admin/livraria/mercadopago/lojas/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: storeForm.name.trim(),
          external_id: `LOJ${String(stores.length + 1).padStart(3, '0')}`,
          location: {
            street_number: storeForm.street_number.trim() || 'S/N',
            street_name: storeForm.street_name.trim(),
            city_name: storeForm.city_name.trim(),
            state_name: storeForm.state_name.trim(),
            latitude: lat,
            longitude: lng,
            reference: storeForm.reference.trim() || undefined,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao criar loja')
      setToast({ type: 'ok', message: 'Loja criada e vinculada ao Mercado Pago.' })
      setShowStoreForm(false)
      setStoreForm({ name: '', address_line: '', cep: '', street_number: '', street_name: '', city_name: '', state_name: '', latitude: '', longitude: '', reference: '' })
      loadPdv()
    } catch (e) {
      setToast({ type: 'err', message: e instanceof Error ? e.message : 'Erro ao criar loja.' })
    } finally {
      setStoreSaving(false)
    }
  }

  async function handleCriarCaixa(e: React.FormEvent) {
    e.preventDefault()
    if (!posForm.store_id) {
      setToast({ type: 'err', message: 'Selecione a loja.' })
      return
    }
    const selectedStore = stores.find((s) => s.id === posForm.store_id)
    const posCountForStore = posList.filter((p) => p.store?.id === posForm.store_id).length
    const storeCode = selectedStore?.external_id ?? 'LOJ001'
    const external_id = `${storeCode}POS${String(posCountForStore + 1).padStart(3, '0')}`
    const name = posForm.name.trim() || (currentUserName ? `Caixa - ${currentUserName}` : 'Caixa')
    setPosSaving(true)
    try {
      const token = await getAccessTokenOrThrow()
      const res = await fetch('/api/admin/livraria/mercadopago/caixas/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ store_id: posForm.store_id, name, external_id, fixed_amount: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao criar caixa')
      setToast({ type: 'ok', message: 'Caixa criado e vinculado ao Mercado Pago.' })
      setPosForm({ store_id: '', name: '' })
      setShowPosForm(false)
      loadPdv()
    } catch (e) {
      setToast({ type: 'err', message: e instanceof Error ? e.message : 'Erro ao criar caixa.' })
    } finally {
      setPosSaving(false)
    }
  }

  async function handleAbrirCaixa(posId: string) {
    const balance = abrirBalanceByPos[posId] ?? '0'
    setAbrirLoading(true)
    try {
      const token = await getAccessTokenOrThrow()
      const res = await fetch('/api/admin/livraria/mercadopago/sessoes/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pos_id: posId, opening_balance: parseFloat(balance) || 0, opened_by_name: currentUserName || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao abrir caixa')
      setToast({ type: 'ok', message: 'Caixa aberto.' })
      setAbrirBalanceByPos((prev) => ({ ...prev, [posId]: '0' }))
      loadPdv()
    } catch (e) {
      setToast({ type: 'err', message: e instanceof Error ? e.message : 'Erro ao abrir caixa.' })
    } finally {
      setAbrirLoading(false)
    }
  }

  async function handleFecharCaixa() {
    if (!fecharSessaoId) return
    setFecharLoading(true)
    try {
      const token = await getAccessTokenOrThrow()
      const res = await fetch(`/api/admin/livraria/mercadopago/sessoes/${fecharSessaoId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          closing_balance: fecharBalance === '' ? undefined : parseFloat(fecharBalance),
          notes: fecharNotes.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao fechar caixa')
      setToast({ type: 'ok', message: 'Caixa fechado.' })
      setFecharSessaoId(''); setFecharBalance(''); setFecharNotes('')
      loadPdv()
    } catch (e) {
      setToast({ type: 'err', message: e instanceof Error ? e.message : 'Erro ao fechar caixa.' })
    } finally {
      setFecharLoading(false)
    }
  }

  async function handleSavePaymentMethods(methods: string[]) {
    setPmSaving(true)
    try {
      const token = await getAccessTokenOrThrow()
      const res = await fetch('/api/admin/livraria/config/payment-methods/', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ enabled: methods }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar.')
      setEnabledMethods(data.enabled)
      setToast({ type: 'ok', message: 'Formas de pagamento salvas.' })
    } catch (e) {
      setToast({ type: 'err', message: e instanceof Error ? e.message : 'Erro ao salvar.' })
    } finally {
      setPmSaving(false)
    }
  }

  function handleToggleMethod(value: string) {
    setEnabledMethods((prev) =>
      prev.includes(value) ? prev.filter((m) => m !== value) : [...prev, value]
    )
  }

  //  Cupons handlers 

  function openCreateCupom() {
    setEditingCupom(null)
    setCupomForm({ code: '', description: '', discount_type: 'value', discount_value: '', min_purchase: '', valid_from: '', valid_until: '', usage_limit: '', active: true })
    setCupomModalOpen(true)
  }

  function openEditCupom(c: Coupon) {
    setEditingCupom(c)
    setCupomForm({
      code: c.code, description: c.description ?? '', discount_type: c.discount_type,
      discount_value: String(c.discount_value), min_purchase: String(c.min_purchase ?? 0),
      valid_from: c.valid_from ? c.valid_from.slice(0, 16) : '',
      valid_until: c.valid_until ? c.valid_until.slice(0, 16) : '',
      usage_limit: c.usage_limit != null ? String(c.usage_limit) : '',
      active: c.active,
    })
    setCupomModalOpen(true)
  }

  async function handleSaveCupom() {
    if (!cupomForm.code.trim()) {
      setToast({ type: 'err', message: 'Código é obrigatório.' })
      return
    }
    const discountValue = parseFloat(cupomForm.discount_value) || 0
    if (cupomForm.discount_type === 'percent' && discountValue > 100) {
      setToast({ type: 'err', message: 'Porcentagem não pode ser maior que 100.' })
      return
    }
    setCupomSaveLoading(true)
    try {
      const token = await getAccessTokenOrThrow()
      const body = {
        code: cupomForm.code.trim(),
        description: cupomForm.description.trim() || null,
        discount_type: cupomForm.discount_type,
        discount_value: discountValue,
        min_purchase: parseFloat(cupomForm.min_purchase) || 0,
        valid_from: cupomForm.valid_from ? new Date(cupomForm.valid_from).toISOString() : null,
        valid_until: cupomForm.valid_until ? new Date(cupomForm.valid_until).toISOString() : null,
        usage_limit: cupomForm.usage_limit ? Math.floor(parseFloat(cupomForm.usage_limit)) : null,
        active: cupomForm.active,
      }
      if (editingCupom) {
        const r = await fetch(`/api/admin/livraria/cupons/${editingCupom.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        })
        const res = await r.json()
        if (!r.ok) throw new Error(res.error || 'Erro ao salvar')
        setToast({ type: 'ok', message: 'Cupom atualizado.' })
      } else {
        const r = await fetch('/api/admin/livraria/cupons', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        })
        const res = await r.json()
        if (!r.ok) throw new Error(res.error || 'Erro ao criar')
        setToast({ type: 'ok', message: 'Cupom criado.' })
      }
      setCupomModalOpen(false)
      loadCupons()
    } catch (e) {
      setToast({ type: 'err', message: e instanceof Error ? e.message : 'Erro ao salvar.' })
    } finally {
      setCupomSaveLoading(false)
    }
  }

  async function handleDeleteCupom() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      const token = await getAccessTokenOrThrow()
      const r = await fetch(`/api/admin/livraria/cupons/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!r.ok) {
        const res = await r.json()
        throw new Error(res.error || 'Erro ao excluir')
      }
      setToast({ type: 'ok', message: 'Cupom excluído.' })
      setDeleteTarget(null)
      loadCupons()
    } catch (e) {
      setToast({ type: 'err', message: e instanceof Error ? e.message : 'Erro ao excluir.' })
    } finally {
      setDeleteLoading(false)
    }
  }

  //  Render 

  const tabs = [
    ...(hasPdv ? [{ key: 'loja-caixa' as const, label: 'Loja e Caixa', icon: <Building2 size={16} /> }] : []),
    ...(hasCupons ? [{ key: 'cupons' as const, label: 'Cupons', icon: <Ticket size={16} /> }] : []),
  ]

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/admin/livraria/dashboard"
          className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
          aria-label="Voltar"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Loja, Caixa e Cupons</h1>
          <p className="text-slate-500 text-sm">Configurações de loja, caixa, sessões e cupons de desconto</p>
        </div>
      </div>

      {/* Tabs  ocultar se só tiver uma aba */}
      {tabs.length > 1 && (
        <div className="mb-6 flex gap-1 border-b border-slate-200">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => switchTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-[#c62737] text-[#c62737] bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {toast && (
        <Toast visible message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/*  ABA: LOJA E CAIXA  */}
      {activeTab === 'loja-caixa' && hasPdv && (
        <>
          {mpConfig && !mpConfig.collector_id_configured && (
            <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 text-sm">
              <strong>Configure o Mercado Pago no servidor:</strong> adicione no arquivo{' '}
              <code className="bg-amber-100 px-1 rounded">.env</code> a variável{' '}
              <code className="bg-amber-100 px-1 rounded">MERCADOPAGO_COLLECTOR_ID</code> com o{' '}
              <strong>User ID</strong> do vendedor. Depois reinicie o servidor.
            </div>
          )}

          {loadingPdv ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : (
            <div className="space-y-8">
              {/* Loja */}
              <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800 mb-4">
                  <Building2 size={20} /> Minha loja
                </h2>
                {(stores.length === 0 || showStoreForm) && (
                  <form onSubmit={handleSubmitLoja} className="grid gap-3 sm:grid-cols-2">
                    <input
                      type="text"
                      placeholder="Nome da loja *"
                      value={storeForm.name}
                      onChange={(e) => setStoreForm((f) => ({ ...f, name: e.target.value }))}
                      className="rounded-lg border border-slate-200 px-3 py-2 sm:col-span-2"
                    />
                    {editingStoreId ? (
                      <>
                        <div className="sm:col-span-2">
                          <label className="block text-xs text-slate-500 mb-1">Endereço (linha completa)</label>
                          <input
                            type="text"
                            placeholder="Rua, número, bairro, cidade..."
                            value={storeForm.address_line}
                            onChange={(e) => setStoreForm((f) => ({ ...f, address_line: e.target.value }))}
                            className="rounded-lg border border-slate-200 px-3 py-2 w-full"
                          />
                        </div>
                        <input type="text" placeholder="Latitude" value={storeForm.latitude} onChange={(e) => setStoreForm((f) => ({ ...f, latitude: e.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2" />
                        <input type="text" placeholder="Longitude" value={storeForm.longitude} onChange={(e) => setStoreForm((f) => ({ ...f, longitude: e.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2" />
                        <input type="text" placeholder="Referência (opcional)" value={storeForm.reference} onChange={(e) => setStoreForm((f) => ({ ...f, reference: e.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2 sm:col-span-2" />
                      </>
                    ) : (
                      <>
                        <div className="sm:col-span-2 flex flex-wrap items-end gap-2">
                          <div className="min-w-[140px]">
                            <label className="block text-xs text-slate-500 mb-1">Localizar pelo CEP</label>
                            <input
                              type="text"
                              placeholder="00000-000"
                              value={storeForm.cep.length <= 5 ? storeForm.cep : `${storeForm.cep.slice(0, 5)}-${storeForm.cep.slice(5)}`}
                              onChange={(e) => {
                                const digits = e.target.value.replace(/\D/g, '').slice(0, 8)
                                setStoreForm((f) => ({ ...f, cep: digits }))
                              }}
                              onBlur={() => storeForm.cep.replace(/\D/g, '').length === 8 && buscarPorCep()}
                              className="rounded-lg border border-slate-200 px-3 py-2 w-full"
                              maxLength={9}
                            />
                          </div>
                          <Button type="button" variant="secondary" onClick={buscarPorCep} disabled={cepLoading || storeForm.cep.replace(/\D/g, '').length !== 8}>
                            {cepLoading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                            <span className="ml-1">{cepLoading ? 'Buscando' : 'Buscar'}</span>
                          </Button>
                        </div>
                        <input type="text" placeholder="Número (rua)" value={storeForm.street_number} onChange={(e) => setStoreForm((f) => ({ ...f, street_number: e.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2" />
                        <input type="text" placeholder="Rua *" value={storeForm.street_name} onChange={(e) => setStoreForm((f) => ({ ...f, street_name: e.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2" />
                        <input type="text" placeholder="Cidade *" value={storeForm.city_name} onChange={(e) => setStoreForm((f) => ({ ...f, city_name: e.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2" />
                        <input type="text" placeholder="Estado *" value={storeForm.state_name} onChange={(e) => setStoreForm((f) => ({ ...f, state_name: e.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2" />
                        <input type="text" placeholder="Latitude *" value={storeForm.latitude} onChange={(e) => setStoreForm((f) => ({ ...f, latitude: e.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2" />
                        <input type="text" placeholder="Longitude *" value={storeForm.longitude} onChange={(e) => setStoreForm((f) => ({ ...f, longitude: e.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2" />
                        <input type="text" placeholder="Referência (opcional)" value={storeForm.reference} onChange={(e) => setStoreForm((f) => ({ ...f, reference: e.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2 sm:col-span-2" />
                      </>
                    )}
                    <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
                      <Button type="submit" disabled={storeSaving}>
                        {storeSaving ? <Loader2 size={18} className="animate-spin" /> : editingStoreId ? <Pencil size={18} /> : <Plus size={18} />}
                        <span className="ml-1">{storeSaving ? (editingStoreId ? 'Salvando' : 'Criando') : (editingStoreId ? 'Salvar alterações' : 'Cadastrar loja no Mercado Pago')}</span>
                      </Button>
                      {(stores.length > 0 || editingStoreId) && (
                        <Button type="button" variant="secondary" onClick={() => { setShowStoreForm(false); setEditingStoreId(null); setStoreForm({ name: '', address_line: '', cep: '', street_number: '', street_name: '', city_name: '', state_name: '', latitude: '', longitude: '', reference: '' }) }}>
                          Cancelar
                        </Button>
                      )}
                    </div>
                  </form>
                )}
                {stores.length > 0 && !showStoreForm && (
                  <>
                    <ul className="mb-4 space-y-2">
                      {stores.map((s) => (
                        <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-medium">{s.name}</span>
                            <span className="text-sm text-slate-500">{s.external_id || `ID ${s.mp_store_id}`}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button type="button" size="sm" variant="secondary" onClick={() => openEditarLoja(s)} title="Editar loja"><Pencil size={16} /></Button>
                            <Button type="button" size="sm" variant="secondary" onClick={() => handleExcluirLoja(s.id)} disabled={storeDeletingId === s.id} title="Excluir loja" className="text-red-600 hover:bg-red-50 hover:text-red-700">
                              {storeDeletingId === s.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                    <Button type="button" variant="secondary" onClick={() => { setEditingStoreId(null); setShowStoreForm(true) }}>
                      <Plus size={18} /><span className="ml-1">Cadastrar outra loja</span>
                    </Button>
                  </>
                )}
              </section>

              {/* Caixa e sessões */}
              <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800 mb-2">
                  <CreditCard size={20} /> Caixa e sessões
                </h2>
                {currentUserName && (
                  <p className="flex items-center gap-1.5 text-sm text-slate-500 mb-4">
                    <User size={16} /> Logado como <strong>{currentUserName}</strong>
                  </p>
                )}
                {posList.length === 0 && !showPosForm && (
                  <p className="text-slate-500 text-sm mb-4">Nenhum caixa cadastrado. Cadastre uma loja antes e depois crie um caixa.</p>
                )}
                {posList.map((pos) => {
                  const sessaoAberta = sessoes.find((s) => s.pos_id === pos.id && s.status === 'OPENED')
                  const sessoesFechadasPos = sessoes.filter((s) => s.pos_id === pos.id && s.status === 'CLOSED').slice(0, 5)
                  return (
                    <div key={pos.id} className="mb-6 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <div>
                          <span className="font-medium text-slate-800">{pos.name}</span>
                          <span className="ml-2 text-sm text-slate-500">({pos.external_id})</span>
                        </div>
                      </div>
                      {!sessaoAberta ? (
                        <div className="flex flex-wrap items-end gap-2 mb-3">
                          <div className="min-w-[120px]">
                            <label className="block text-xs text-slate-500 mb-1">Valor de abertura (R$)</label>
                            <input type="number" step="0.01" min="0" value={abrirBalanceByPos[pos.id] ?? '0'} onChange={(e) => setAbrirBalanceByPos((prev) => ({ ...prev, [pos.id]: e.target.value }))} className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm" />
                          </div>
                          <Button size="sm" onClick={() => handleAbrirCaixa(pos.id)} disabled={abrirLoading}>
                            {abrirLoading ? <Loader2 size={14} className="animate-spin" /> : <DoorOpen size={14} />}
                            <span className="ml-1">Abrir caixa</span>
                          </Button>
                        </div>
                      ) : (
                        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 mb-3">
                          <span className="text-sm text-slate-600">
                            Sessão aberta em {new Date(sessaoAberta.opened_at).toLocaleString('pt-BR')}  Abertura: R$ {Number(sessaoAberta.opening_balance).toFixed(2)}
                            {sessaoAberta.opened_by_name && (
                              <span className="block mt-1 text-slate-500">Operador: {sessaoAberta.opened_by_name}</span>
                            )}
                          </span>
                          {fecharSessaoId === sessaoAberta.id ? (
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              <input type="number" step="0.01" placeholder="Valor fechamento (R$)" value={fecharBalance} onChange={(e) => setFecharBalance(e.target.value)} className="w-36 rounded border border-slate-200 px-2 py-1 text-sm" />
                              <input type="text" placeholder="Observações" value={fecharNotes} onChange={(e) => setFecharNotes(e.target.value)} className="w-40 rounded border border-slate-200 px-2 py-1 text-sm" />
                              <Button size="sm" onClick={handleFecharCaixa} disabled={fecharLoading}>
                                {fecharLoading ? <Loader2 size={14} className="animate-spin" /> : <DoorClosed size={14} />}
                                <span className="ml-1">Fechar</span>
                              </Button>
                              <button type="button" onClick={() => { setFecharSessaoId(''); setFecharBalance(''); setFecharNotes('') }} className="text-sm text-slate-500 hover:underline">Cancelar</button>
                            </div>
                          ) : (
                            <Button size="sm" variant="secondary" onClick={() => setFecharSessaoId(sessaoAberta.id)} className="mt-2">
                              <DoorClosed size={14} /> Fechar caixa
                            </Button>
                          )}
                        </div>
                      )}
                      {sessoesFechadasPos.length > 0 && (
                        <div className="text-sm text-slate-600">
                          <span className="font-medium">Últimas sessões fechadas:</span>
                          <ul className="mt-1 space-y-0.5">
                            {sessoesFechadasPos.map((s) => (
                              <li key={s.id} className="flex justify-between">
                                <span>{new Date(s.opened_at).toLocaleString('pt-BR')}  {s.closed_at ? new Date(s.closed_at).toLocaleString('pt-BR') : ''}</span>
                                <span>R$ {Number(s.closing_balance ?? s.opening_balance).toFixed(2)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )
                })}
                {stores.length > 0 && (
                  <>
                    {!showPosForm ? (
                      <Button type="button" variant="secondary" onClick={() => setShowPosForm(true)}>
                        <Plus size={18} /><span className="ml-1">Criar novo caixa</span>
                      </Button>
                    ) : (
                      <form onSubmit={handleCriarCaixa} className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
                        <div className="flex flex-wrap items-end gap-3">
                          <div className="min-w-[200px]">
                            <label className="block text-xs text-slate-500 mb-1">Loja</label>
                            <select value={posForm.store_id} onChange={(e) => setPosForm((f) => ({ ...f, store_id: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2">
                              <option value="">Selecione</option>
                              {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                          </div>
                          <div className="min-w-[200px]">
                            <label className="block text-xs text-slate-500 mb-1">Nome do caixa</label>
                            <input type="text" placeholder={currentUserName ? `Caixa - ${currentUserName}` : 'Caixa'} value={posForm.name} onChange={(e) => setPosForm((f) => ({ ...f, name: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2" />
                          </div>
                          <Button type="submit" disabled={posSaving}>
                            {posSaving ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                            <span className="ml-1">{posSaving ? 'Criando' : 'Criar caixa'}</span>
                          </Button>
                          <Button type="button" variant="secondary" onClick={() => setShowPosForm(false)}>Cancelar</Button>
                        </div>
                        <p className="text-xs text-slate-500">O código do caixa será gerado automaticamente (ex: LOJ001POS001).</p>
                      </form>
                    )}
                  </>
                )}
              </section>

              {/* Formas de Pagamento */}
              <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800 mb-1">
                  <Settings size={20} /> Formas de pagamento
                </h2>
                <p className="text-sm text-slate-500 mb-5">Ative ou desative as opções disponíveis no PDV ao finalizar uma venda.</p>
                <div className="space-y-3">
                  {ALL_PAYMENT_METHODS.map((method) => {
                    const isEnabled = enabledMethods.includes(method.value)
                    return (
                      <label key={method.value} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3 cursor-pointer hover:border-slate-300 transition-colors">
                        <span className="font-medium text-slate-800 text-sm">{method.label}</span>
                        <div
                          onClick={() => handleToggleMethod(method.value)}
                          className={`relative w-10 shrink-0 rounded-full transition-colors ${isEnabled ? 'bg-[#c62737]' : 'bg-slate-200'}`}
                          style={{ height: '1.375rem' }}
                          role="switch"
                          aria-checked={isEnabled}
                          tabIndex={0}
                          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleToggleMethod(method.value)}
                        >
                          <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${isEnabled ? 'translate-x-[1.125rem]' : 'translate-x-0'}`} />
                        </div>
                      </label>
                    )
                  })}
                </div>
                <div className="mt-5 flex items-center gap-3">
                  <Button type="button" onClick={() => handleSavePaymentMethods(enabledMethods)} disabled={pmSaving || enabledMethods.length === 0}>
                    {pmSaving ? <Loader2 size={16} className="animate-spin" /> : null}
                    <span className="ml-1">{pmSaving ? 'Salvando' : 'Salvar configuração'}</span>
                  </Button>
                  {enabledMethods.length === 0 && (
                    <p className="text-sm text-amber-600">Habilite ao menos uma forma de pagamento.</p>
                  )}
                </div>
              </section>
            </div>
          )}
        </>
      )}

      {/*  ABA: CUPONS  */}
      {activeTab === 'cupons' && hasCupons && (
        <>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="search"
                placeholder="Buscar por código ou descrição..."
                value={cuponsSearch}
                onChange={(e) => setCuponsSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#c62737]/30 focus:border-[#c62737]"
              />
            </div>
            <Button onClick={openCreateCupom}>
              <Plus size={18} className="mr-1" />
              Novo cupom
            </Button>
          </div>

          {loadingCupons ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" text="Carregando..." />
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="p-3 text-left font-medium text-slate-700">Código</th>
                      <th className="p-3 text-left font-medium text-slate-700">Desconto</th>
                      <th className="p-3 text-right font-medium text-slate-700">Compra mín.</th>
                      <th className="p-3 text-left font-medium text-slate-700">Validade</th>
                      <th className="p-3 text-center font-medium text-slate-700">Uso</th>
                      <th className="p-3 text-center font-medium text-slate-700">Ativo</th>
                      <th className="p-3 w-24 text-right font-medium text-slate-700">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cupons.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500">Nenhum cupom encontrado.</td>
                      </tr>
                    ) : (
                      cupons.map((c) => (
                        <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                          <td className="p-3 font-mono font-medium">{c.code}</td>
                          <td className="p-3">{c.discount_type === 'percent' ? `${c.discount_value}%` : `R$ ${Number(c.discount_value).toFixed(2)}`}</td>
                          <td className="p-3 text-right">{c.min_purchase > 0 ? `R$ ${Number(c.min_purchase).toFixed(2)}` : ''}</td>
                          <td className="p-3 text-slate-600">
                            {c.valid_from || c.valid_until
                              ? `${c.valid_from ? new Date(c.valid_from).toLocaleDateString('pt-BR') : ''} até ${c.valid_until ? new Date(c.valid_until).toLocaleDateString('pt-BR') : ''}`
                              : 'Sem restrição'}
                          </td>
                          <td className="p-3 text-center">{c.used_count}{c.usage_limit != null ? ` / ${c.usage_limit}` : ''}</td>
                          <td className="p-3 text-center">
                            {c.active
                              ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">Sim</span>
                              : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">Não</span>
                            }
                          </td>
                          <td className="p-3 text-right">
                            <button type="button" onClick={() => openEditCupom(c)} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 mr-1" aria-label="Editar"><Pencil size={16} /></button>
                            <button type="button" onClick={() => setDeleteTarget(c)} className="p-2 rounded-lg border border-slate-200 hover:bg-red-50 text-slate-600" aria-label="Excluir"><Trash2 size={16} /></button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Modal criar/editar cupom */}
          {cupomModalOpen && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" role="dialog" aria-modal="true">
              <div className="absolute inset-0 bg-black/50" onClick={() => !cupomSaveLoading && setCupomModalOpen(false)} aria-hidden />
              <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl max-h-[90vh] overflow-auto">
                <h2 className="text-lg font-semibold text-slate-800 mb-4">{editingCupom ? 'Editar cupom' : 'Novo cupom'}</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Código *</label>
                    <input type="text" value={cupomForm.code} onChange={(e) => setCupomForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="EXEMPLO10" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#c62737]/30 focus:border-[#c62737]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                    <input type="text" value={cupomForm.description} onChange={(e) => setCupomForm((f) => ({ ...f, description: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#c62737]/30 focus:border-[#c62737]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de desconto</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" checked={cupomForm.discount_type === 'value'} onChange={() => setCupomForm((f) => ({ ...f, discount_type: 'value' }))} />
                        <span>Valor (R$)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" checked={cupomForm.discount_type === 'percent'} onChange={() => setCupomForm((f) => ({ ...f, discount_type: 'percent' }))} />
                        <span>Porcentagem (%)</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{cupomForm.discount_type === 'percent' ? 'Porcentagem (%) *' : 'Valor (R$) *'}</label>
                    <input type="number" step={cupomForm.discount_type === 'percent' ? '1' : '0.01'} min="0" max={cupomForm.discount_type === 'percent' ? 100 : undefined} value={cupomForm.discount_value} onChange={(e) => setCupomForm((f) => ({ ...f, discount_value: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#c62737]/30 focus:border-[#c62737]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Compra mínima (R$)</label>
                    <input type="number" step="0.01" min="0" value={cupomForm.min_purchase} onChange={(e) => setCupomForm((f) => ({ ...f, min_purchase: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#c62737]/30 focus:border-[#c62737]" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Válido de</label>
                      <input type="datetime-local" value={cupomForm.valid_from} onChange={(e) => setCupomForm((f) => ({ ...f, valid_from: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Válido até</label>
                      <input type="datetime-local" value={cupomForm.valid_until} onChange={(e) => setCupomForm((f) => ({ ...f, valid_until: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Limite de uso (vazio = ilimitado)</label>
                    <input type="number" min="1" value={cupomForm.usage_limit} onChange={(e) => setCupomForm((f) => ({ ...f, usage_limit: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#c62737]/30 focus:border-[#c62737]" />
                  </div>
                  {editingCupom && (
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={cupomForm.active} onChange={(e) => setCupomForm((f) => ({ ...f, active: e.target.checked }))} className="rounded border-slate-300" />
                      <span className="text-sm text-slate-700">Cupom ativo</span>
                    </label>
                  )}
                </div>
                <div className="flex gap-2 justify-end mt-6">
                  <Button type="button" variant="secondary" onClick={() => setCupomModalOpen(false)} disabled={cupomSaveLoading}>Cancelar</Button>
                  <Button onClick={handleSaveCupom} loading={cupomSaveLoading} disabled={!cupomForm.code.trim()}>Salvar</Button>
                </div>
              </div>
            </div>
          )}

          <ConfirmDialog
            open={!!deleteTarget}
            title="Excluir cupom"
            message={deleteTarget ? `Excluir o cupom "${deleteTarget.code}"? Esta ação não pode ser desfeita.` : ''}
            onConfirm={handleDeleteCupom}
            onCancel={() => setDeleteTarget(null)}
            loading={deleteLoading}
            confirmLabel="Excluir"
            variant="danger"
          />
        </>
      )}
    </div>
  )
}

//  Wrapper com PageAccessGuard e Suspense 

export default function LivrariaLojaCaixaPage() {
  return (
    <PageAccessGuard pageKey={['livraria_pdv', 'livraria_cupons']}>
      <Suspense fallback={<div className="flex justify-center py-12"><Spinner /></div>}>
        <LivrariaLojaCaixaInner />
      </Suspense>
    </PageAccessGuard>
  )
}
