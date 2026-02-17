'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, Building2, CreditCard, DoorOpen, DoorClosed, Plus, Loader2, Search, User, Pencil, Trash2 } from 'lucide-react'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { Toast } from '@/components/Toast'
import { adminFetchJson, getAccessTokenOrThrow } from '@/lib/admin-client'
import { supabase } from '@/lib/supabase'

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

export default function LivrariaLojaCaixaPage() {
  const [stores, setStores] = useState<Store[]>([])
  const [posList, setPosList] = useState<Pos[]>([])
  const [sessoes, setSessoes] = useState<Sessao[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; message: string } | null>(null)
  const [mpConfig, setMpConfig] = useState<{ collector_id_configured: boolean } | null>(null)

  const [currentUserName, setCurrentUserName] = useState<string>('')
  const [showStoreForm, setShowStoreForm] = useState(true)
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null)
  const [storeForm, setStoreForm] = useState({
    name: '',
    address_line: '',
    cep: '',
    street_number: '',
    street_name: '',
    city_name: '',
    state_name: '',
    latitude: '',
    longitude: '',
    reference: '',
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

  const load = useCallback(async () => {
    setLoading(true)
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
      setToast({ type: 'err', message: 'Erro ao carregar dados.' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

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
      name: s.name,
      address_line: s.address_line ?? '',
      cep: '',
      street_number: '',
      street_name: '',
      city_name: '',
      state_name: '',
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
      load()
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
        load()
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
      load()
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
        body: JSON.stringify({
          store_id: posForm.store_id,
          name,
          external_id,
          fixed_amount: true,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao criar caixa')
      setToast({ type: 'ok', message: 'Caixa criado e vinculado ao Mercado Pago.' })
      setPosForm({ store_id: '', name: '' })
      setShowPosForm(false)
      load()
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
        body: JSON.stringify({
          pos_id: posId,
          opening_balance: parseFloat(balance) || 0,
          opened_by_name: currentUserName || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao abrir caixa')
      setToast({ type: 'ok', message: 'Caixa aberto.' })
      setAbrirBalanceByPos((prev) => ({ ...prev, [posId]: '0' }))
      load()
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
      setFecharSessaoId('')
      setFecharBalance('')
      setFecharNotes('')
      load()
    } catch (e) {
      setToast({ type: 'err', message: e instanceof Error ? e.message : 'Erro ao fechar caixa.' })
    } finally {
      setFecharLoading(false)
    }
  }

  const sessoesAbertas = sessoes.filter((s) => s.status === 'OPENED')
  const sessoesFechadas = sessoes.filter((s) => s.status === 'CLOSED')

  return (
    <PageAccessGuard pageKey="livraria_pdv">
      <div className="p-4 sm:p-6 md:p-8 max-w-4xl">
        <div className="mb-6 flex items-center gap-3">
          <Link
            href="/admin/livraria/dashboard"
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
            aria-label="Voltar"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Loja e Caixa (Mercado Pago)</h1>
            <p className="text-slate-500 text-sm">Cadastro da loja, caixas e abertura/fechamento de caixa</p>
          </div>
        </div>

        {mpConfig && !mpConfig.collector_id_configured && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 text-sm">
            <strong>Configure o Mercado Pago no servidor:</strong> adicione no arquivo <code className="bg-amber-100 px-1 rounded">.env</code> a variável{' '}
            <code className="bg-amber-100 px-1 rounded">MERCADOPAGO_COLLECTOR_ID</code> com o <strong>User ID</strong> do vendedor (no painel MP: Suas integrações → Credenciais de teste → Dados das credenciais de teste → Seller Test User → User ID). Depois reinicie o servidor (<code className="bg-amber-100 px-1 rounded">npm run dev</code>).
          </div>
        )}

        {toast && (
          <Toast
            visible
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
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
                    <input
                      type="text"
                      placeholder="Latitude"
                      value={storeForm.latitude}
                      onChange={(e) => setStoreForm((f) => ({ ...f, latitude: e.target.value }))}
                      className="rounded-lg border border-slate-200 px-3 py-2"
                    />
                    <input
                      type="text"
                      placeholder="Longitude"
                      value={storeForm.longitude}
                      onChange={(e) => setStoreForm((f) => ({ ...f, longitude: e.target.value }))}
                      className="rounded-lg border border-slate-200 px-3 py-2"
                    />
                    <input
                      type="text"
                      placeholder="Referência (opcional)"
                      value={storeForm.reference}
                      onChange={(e) => setStoreForm((f) => ({ ...f, reference: e.target.value }))}
                      className="rounded-lg border border-slate-200 px-3 py-2 sm:col-span-2"
                    />
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
                        <span className="ml-1">{cepLoading ? 'Buscando…' : 'Buscar'}</span>
                      </Button>
                    </div>
                    <input
                      type="text"
                      placeholder="Número (rua)"
                      value={storeForm.street_number}
                      onChange={(e) => setStoreForm((f) => ({ ...f, street_number: e.target.value }))}
                      className="rounded-lg border border-slate-200 px-3 py-2"
                    />
                    <input
                      type="text"
                      placeholder="Rua *"
                      value={storeForm.street_name}
                      onChange={(e) => setStoreForm((f) => ({ ...f, street_name: e.target.value }))}
                      className="rounded-lg border border-slate-200 px-3 py-2"
                    />
                    <input
                      type="text"
                      placeholder="Cidade *"
                      value={storeForm.city_name}
                      onChange={(e) => setStoreForm((f) => ({ ...f, city_name: e.target.value }))}
                      className="rounded-lg border border-slate-200 px-3 py-2"
                    />
                    <input
                      type="text"
                      placeholder="Estado *"
                      value={storeForm.state_name}
                      onChange={(e) => setStoreForm((f) => ({ ...f, state_name: e.target.value }))}
                      className="rounded-lg border border-slate-200 px-3 py-2"
                    />
                    <input
                      type="text"
                      placeholder="Latitude *"
                      value={storeForm.latitude}
                      onChange={(e) => setStoreForm((f) => ({ ...f, latitude: e.target.value }))}
                      className="rounded-lg border border-slate-200 px-3 py-2"
                    />
                    <input
                      type="text"
                      placeholder="Longitude *"
                      value={storeForm.longitude}
                      onChange={(e) => setStoreForm((f) => ({ ...f, longitude: e.target.value }))}
                      className="rounded-lg border border-slate-200 px-3 py-2"
                    />
                    <input
                      type="text"
                      placeholder="Referência (opcional)"
                      value={storeForm.reference}
                      onChange={(e) => setStoreForm((f) => ({ ...f, reference: e.target.value }))}
                      className="rounded-lg border border-slate-200 px-3 py-2 sm:col-span-2"
                    />
                  </>
                )}
                <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
                  <Button type="submit" disabled={storeSaving}>
                    {storeSaving ? <Loader2 size={18} className="animate-spin" /> : editingStoreId ? <Pencil size={18} /> : <Plus size={18} />}
                    <span className="ml-1">{storeSaving ? (editingStoreId ? 'Salvando…' : 'Criando…') : (editingStoreId ? 'Salvar alterações' : 'Cadastrar loja no Mercado Pago')}</span>
                  </Button>
                  {(stores.length > 0 || editingStoreId) && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => { setShowStoreForm(false); setEditingStoreId(null); setStoreForm({ name: '', address_line: '', cep: '', street_number: '', street_name: '', city_name: '', state_name: '', latitude: '', longitude: '', reference: '' }) }}
                    >
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
                          <Button type="button" size="sm" variant="secondary" onClick={() => openEditarLoja(s)} title="Editar loja">
                            <Pencil size={16} />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => handleExcluirLoja(s.id)}
                            disabled={storeDeletingId === s.id}
                            title="Excluir loja"
                            className="text-red-600 hover:bg-red-50 hover:text-red-700"
                          >
                            {storeDeletingId === s.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <Button type="button" variant="secondary" onClick={() => { setEditingStoreId(null); setShowStoreForm(true) }}>
                    <Plus size={18} />
                    <span className="ml-1">Cadastrar outra loja</span>
                  </Button>
                </>
              )}
            </section>

            {/* Caixa e sessões (unificado por caixa) */}
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
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={abrirBalanceByPos[pos.id] ?? '0'}
                            onChange={(e) => setAbrirBalanceByPos((prev) => ({ ...prev, [pos.id]: e.target.value }))}
                            className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm"
                          />
                        </div>
                        <Button size="sm" onClick={() => handleAbrirCaixa(pos.id)} disabled={abrirLoading}>
                          {abrirLoading ? <Loader2 size={14} className="animate-spin" /> : <DoorOpen size={14} />}
                          <span className="ml-1">Abrir caixa</span>
                        </Button>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 mb-3">
                        <span className="text-sm text-slate-600">
                          Sessão aberta em {new Date(sessaoAberta.opened_at).toLocaleString('pt-BR')} — Abertura: R$ {Number(sessaoAberta.opening_balance).toFixed(2)}
                          {sessaoAberta.opened_by_name && (
                            <span className="block mt-1 text-slate-500">Operador: {sessaoAberta.opened_by_name}</span>
                          )}
                        </span>
                        {fecharSessaoId === sessaoAberta.id ? (
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <input
                              type="number"
                              step="0.01"
                              placeholder="Valor fechamento (R$)"
                              value={fecharBalance}
                              onChange={(e) => setFecharBalance(e.target.value)}
                              className="w-36 rounded border border-slate-200 px-2 py-1 text-sm"
                            />
                            <input
                              type="text"
                              placeholder="Observações"
                              value={fecharNotes}
                              onChange={(e) => setFecharNotes(e.target.value)}
                              className="w-40 rounded border border-slate-200 px-2 py-1 text-sm"
                            />
                            <Button size="sm" onClick={handleFecharCaixa} disabled={fecharLoading}>
                              {fecharLoading ? <Loader2 size={14} className="animate-spin" /> : <DoorClosed size={14} />}
                              <span className="ml-1">Fechar</span>
                            </Button>
                            <button
                              type="button"
                              onClick={() => { setFecharSessaoId(''); setFecharBalance(''); setFecharNotes('') }}
                              className="text-sm text-slate-500 hover:underline"
                            >
                              Cancelar
                            </button>
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
                              <span>{new Date(s.opened_at).toLocaleString('pt-BR')} → {s.closed_at ? new Date(s.closed_at).toLocaleString('pt-BR') : ''}</span>
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
                      <Plus size={18} />
                      <span className="ml-1">Criar novo caixa</span>
                    </Button>
                  ) : (
                    <form onSubmit={handleCriarCaixa} className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
                      <div className="flex flex-wrap items-end gap-3">
                        <div className="min-w-[200px]">
                          <label className="block text-xs text-slate-500 mb-1">Loja</label>
                          <select
                            value={posForm.store_id}
                            onChange={(e) => setPosForm((f) => ({ ...f, store_id: e.target.value }))}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2"
                          >
                            <option value="">Selecione</option>
                            {stores.map((s) => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="min-w-[200px]">
                          <label className="block text-xs text-slate-500 mb-1">Nome do caixa</label>
                          <input
                            type="text"
                            placeholder={currentUserName ? `Caixa - ${currentUserName}` : 'Caixa'}
                            value={posForm.name}
                            onChange={(e) => setPosForm((f) => ({ ...f, name: e.target.value }))}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2"
                          />
                        </div>
                        <Button type="submit" disabled={posSaving}>
                          {posSaving ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                          <span className="ml-1">{posSaving ? 'Criando…' : 'Criar caixa'}</span>
                        </Button>
                        <Button type="button" variant="secondary" onClick={() => setShowPosForm(false)}>
                          Cancelar
                        </Button>
                      </div>
                      <p className="text-xs text-slate-500">O código do caixa será gerado automaticamente (ex: LOJ001POS001).</p>
                    </form>
                  )}
                </>
              )}
            </section>
          </div>
        )}
      </div>
    </PageAccessGuard>
  )
}
