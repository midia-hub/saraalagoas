'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { ShoppingCart, ArrowLeft, Search, LayoutGrid, List, Camera } from 'lucide-react'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { CustomSelect } from '@/components/ui/CustomSelect'
import { Spinner } from '@/components/ui/Spinner'
import { Toast } from '@/components/Toast'
import { adminFetchJson, getAccessTokenOrThrow } from '@/lib/admin-client'
import { PdvProductCard, type PdvProduct } from '@/components/admin/bookstore/PdvProductCard'
import { PdvProductListRow } from '@/components/admin/bookstore/PdvProductListRow'
import { QuantityModal } from '@/components/admin/bookstore/QuantityModal'
import { CartPanel, type CartItem } from '@/components/admin/bookstore/CartPanel'
import { BarcodeScannerModal } from '@/components/admin/bookstore/BarcodeScannerModal'
import { FinalizeSaleModal } from '@/components/admin/bookstore/FinalizeSaleModal'
import { MercadoPagoCheckoutModal } from '@/components/admin/bookstore/MercadoPagoCheckoutModal'
import { MercadoPagoOrderModal } from '@/components/admin/bookstore/MercadoPagoOrderModal'

export default function PdvPage() {
  const [products, setProducts] = useState<PdvProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards')
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([])

  const [cart, setCart] = useState<CartItem[]>([])
  const [quantityModal, setQuantityModal] = useState<{ product: PdvProduct; mode: 'SALE' | 'RESERVE' } | null>(null)
  const [barcodeOpen, setBarcodeOpen] = useState(false)
  const [finalizeOpen, setFinalizeOpen] = useState(false)
  const [finalizeLoading, setFinalizeLoading] = useState(false)
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false)
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; message: string } | null>(null)
  const [mercadopagoModal, setMercadopagoModal] = useState<{
    saleId: string
    qrCodeBase64: string | null
    qrCode: string | null
  } | null>(null)
  const [orderModal, setOrderModal] = useState<{
    saleId: string
    saleNumber: string
    qrData: string | null
    orderId: string | null
  } | null>(null)
  const [posList, setPosList] = useState<Array<{ id: string; name: string; external_id: string }>>([])
  const [sessaoAberta, setSessaoAberta] = useState<{
    id: string
    pos_id: string
    pos?: { id: string; name: string; external_id: string }
  } | null>(null)
  const [enabledPaymentMethods, setEnabledPaymentMethods] = useState<string[] | undefined>(undefined)
  const tokenRef = useRef<string | null>(null)

  const loadProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (category) params.set('category', category)
      params.set('active', 'true')
      const data = await adminFetchJson<{ items: PdvProduct[] }>(`/api/admin/livraria/pdv/produtos/?${params}`)
      setProducts(data.items ?? [])
    } catch {
      setToast({ type: 'err', message: 'Erro ao carregar produtos.' })
    } finally {
      setLoading(false)
    }
  }, [search, category])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  useEffect(() => {
    adminFetchJson<{ items: Array<{ id: string; name: string }> }>('/api/admin/livraria/categorias/')
      .then((d) => setCategories(d.items ?? []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    adminFetchJson<Array<{ id: string; name: string; external_id: string }>>('/api/admin/livraria/mercadopago/caixas/')
      .then((list) => setPosList(Array.isArray(list) ? list : []))
      .catch(() => setPosList([]))
  }, [])

  useEffect(() => {
    adminFetchJson<{ id: string; pos_id: string; pos?: { id: string; name: string; external_id: string } } | null>(
      '/api/admin/livraria/mercadopago/sessoes/?aberta_por_mim=1'
    )
      .then((s) => setSessaoAberta(s && typeof s === 'object' && s.id ? s : null))
      .catch(() => setSessaoAberta(null))
  }, [])

  useEffect(() => {
    adminFetchJson<{ enabled: string[] }>('/api/admin/livraria/config/payment-methods/')
      .then((d) => setEnabledPaymentMethods(d.enabled))
      .catch(() => setEnabledPaymentMethods(undefined))
  }, [])

  useEffect(() => {
    getAccessTokenOrThrow()
      .then((t) => { tokenRef.current = t })
      .catch(() => { tokenRef.current = null })
  }, [])

  useEffect(() => {
    const closeMinhaSessao = () => {
      const t = tokenRef.current
      if (t)
        fetch('/api/admin/livraria/mercadopago/sessoes/close-mine/', {
          method: 'POST',
          keepalive: true,
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
          body: JSON.stringify({ notes: 'Fechamento automático ao sair da plataforma.' }),
        }).catch(() => {})
    }
    window.addEventListener('beforeunload', closeMinhaSessao)
    return () => window.removeEventListener('beforeunload', closeMinhaSessao)
  }, [])

  const saleItems = cart.filter((i) => i.mode === 'SALE')
  const hasReserveInCart = cart.some((i) => i.mode === 'RESERVE')
  const subtotal = saleItems.reduce((s, i) => s + i.unit_price * i.quantity, 0)

  function addToCart(product: PdvProduct, quantity: number, mode: 'SALE' | 'RESERVE') {
    setCart((prev) => {
      const key = `${product.id}-${mode}`
      const existing = prev.find((i) => i.product_id === product.id && i.mode === mode)
      const rest = prev.filter((i) => !(i.product_id === product.id && i.mode === mode))
      const q = existing ? existing.quantity + quantity : quantity
      const maxQ = mode === 'SALE' ? Math.min(q, product.current_stock) : q
      if (maxQ <= 0) return rest
      return [
        ...rest,
        {
          product_id: product.id,
          name: product.name,
          image_url: product.image_url,
          unit_price: product.effective_price,
          quantity: maxQ,
          current_stock: product.current_stock,
          mode,
        },
      ]
    })
    setQuantityModal(null)
  }

  function openQuantity(product: PdvProduct, mode: 'SALE' | 'RESERVE') {
    setQuantityModal({ product, mode })
  }

  function changeQuantity(productId: string, mode: 'SALE' | 'RESERVE', delta: number) {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.product_id !== productId || i.mode !== mode) return i
          const q = Math.max(0, i.quantity + delta)
          const maxQ = mode === 'SALE' ? Math.min(q, i.current_stock) : q
          return { ...i, quantity: maxQ }
        })
        .filter((i) => i.quantity > 0)
    )
  }

  function removeItem(productId: string, mode: 'SALE' | 'RESERVE') {
    setCart((prev) => prev.filter((i) => !(i.product_id === productId && i.mode === mode)))
  }

  function handleBarcodeDetected(code: string) {
    setBarcodeOpen(false)
    adminFetchJson<PdvProduct>(`/api/admin/livraria/pdv/barcode/?code=${encodeURIComponent(code)}`)
      .then((product) => {
        if (product.current_stock > 0) {
          openQuantity(product, 'SALE')
        } else {
          openQuantity(product, 'RESERVE')
        }
      })
      .catch(() => {
        setToast({
          type: 'err',
          message: 'Não encontramos esse código. Você pode buscar pelo nome ou SKU.',
        })
      })
  }

  function handleFinalize() {
    if (saleItems.length === 0) return
    setFinalizeOpen(true)
  }

  function confirmFinalize(payload: {
    payment_method: string
    customer_id: string | null
    customer_name: string
    customer_phone: string
    sale_type: 'PAID' | 'CREDIT'
    notes: string
    discount_amount: number
    discount_type?: 'value' | 'percent'
    discount_value?: number
    coupon_code?: string | null
    paid_amount?: number
  }) {
    if (!sessaoAberta) {
      setToast({
        type: 'err',
        message: 'Abra um caixa em Livraria → Loja e Caixa (MP) para realizar vendas.',
      })
      return
    }
    setFinalizeLoading(true)
    const body: Record<string, unknown> = {
      customer_id: payload.customer_id || null,
      customer_name: payload.customer_name || null,
      customer_phone: payload.customer_phone || null,
      payment_method: payload.payment_method,
      sale_type: payload.sale_type,
      discount_amount: payload.discount_amount,
      notes: payload.notes || null,
      paid_amount: payload.paid_amount ?? 0,
      caixa_sessao_id: sessaoAberta.id,
      items: saleItems.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
    }
    if (payload.coupon_code) body.coupon_code = payload.coupon_code
    if (payload.discount_type) body.discount_type = payload.discount_type
    if (payload.discount_value != null) body.discount_value = payload.discount_value
    getAccessTokenOrThrow().then((token) =>
      fetch('/api/admin/livraria/pdv/vendas/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
        .then((r) => r.json())
        .then(async (data) => {
          if (data.error) throw new Error(data.error)
          setCart((prev) => prev.filter((i) => i.mode !== 'SALE'))
          setFinalizeOpen(false)

          const deveAbrirMercadoPago =
            data.sale_id &&
            (data.needs_mercadopago_checkout === true || payload.payment_method === 'Mercado Pago')
          const deveAbrirQrNoCaixa =
            data.sale_id &&
            (data.needs_qr_order === true || payload.payment_method === 'QR no caixa')

          if (deveAbrirQrNoCaixa) {
            const posIdParaOrder = sessaoAberta?.pos_id ?? posList[0]?.id
            if (!posIdParaOrder) {
              setToast({ type: 'err', message: 'Nenhum caixa vinculado à sessão. Cadastre em Loja e Caixa (MP).' })
              window.location.href = `/admin/livraria/vendas/${data.sale_id}/recibo`
              return
            }
            try {
              const token = await getAccessTokenOrThrow()
              const res = await fetch('/api/admin/livraria/mercadopago/orders/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                  pos_id: posIdParaOrder,
                  total_amount: data.total_amount ?? 0,
                  external_reference: data.sale_id,
                  description: `Venda ${data.sale_number ?? data.sale_id}`,
                  mode: 'hybrid',
                  idempotency_key: crypto.randomUUID(),
                }),
              })
              const text = await res.text()
              let resData: { error?: string; message?: string; type_response?: { qr_data?: string }; id?: string } = {}
              try {
                resData = text ? JSON.parse(text) : {}
              } catch {
                resData = { error: res.status === 308 ? 'Redirecionamento (308). Verifique a URL da API.' : `Resposta inválida (${res.status}).` }
              }
              if (!res.ok || resData.error) {
                const msg = resData.error || resData.message || `Erro ${res.status} ao criar order no caixa.`
                throw new Error(msg)
              }
              if (typeof sessionStorage !== 'undefined') {
                sessionStorage.setItem('mercadopago_pending_sale_id', data.sale_id)
              }
              setOrderModal({
                saleId: data.sale_id,
                saleNumber: data.sale_number ?? undefined,
                qrData: resData.type_response?.qr_data ?? null,
                orderId: resData.id ?? null,
              })
              setToast({ type: 'ok', message: 'Order criada. O cliente pode escanear o QR do caixa ou o QR exibido.' })
            } catch (err) {
              const message = err instanceof Error ? err.message : 'Não foi possível criar pagamento no caixa.'
              setToast({
                type: 'err',
                message: `${message} A venda foi registrada; você pode abrir o recibo pelo histórico.`,
              })
              // Não redireciona: usuário permanece no PDV para ver o erro e tentar de novo ou abrir o recibo manualmente
            }
          } else if (deveAbrirMercadoPago) {
            try {
              const token = await getAccessTokenOrThrow()
              const res = await fetch('/api/admin/livraria/pdv/pagamentos/mercadopago/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ sale_id: data.sale_id }),
              })
              const resData = await res.json()
              if (!res.ok || resData.error) throw new Error(resData.error || 'Erro ao gerar pagamento Mercado Pago')
              if (!resData.sale_id) throw new Error('Resposta da API sem identificação da venda.')
              setMercadopagoModal({
                saleId: data.sale_id,
                qrCodeBase64: resData.qr_code_base64 ?? null,
                qrCode: resData.qr_code ?? null,
              })
              setToast({ type: 'ok', message: 'QR Code Pix gerado. Escaneie ou use o código copia e cola.' })
            } catch (err) {
              setToast({
                type: 'err',
                message: err instanceof Error ? err.message : 'Não foi possível gerar o link de pagamento. Verifique a venda no histórico.',
              })
            }
          } else {
            setToast({ type: 'ok', message: 'Venda registrada com sucesso.' })
            window.location.href = `/admin/livraria/vendas/${data.sale_id}/recibo`
          }
        })
        .catch((e) => {
          setToast({ type: 'err', message: e instanceof Error ? e.message : 'Erro ao registrar venda.' })
        })
        .finally(() => setFinalizeLoading(false))
    )
  }

  return (
    <PageAccessGuard pageKey="livraria_pdv">
      {!sessaoAberta && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <p className="text-sm text-amber-900">
            <strong>Caixa fechado.</strong> Abra um caixa em Loja e Caixa (MP) para realizar vendas.
          </p>
          <Link
            href="/admin/livraria/loja-caixa"
            className="inline-flex items-center text-sm font-semibold text-amber-900 underline hover:no-underline"
          >
            Abrir caixa →
          </Link>
        </div>
      )}
      <div className="flex flex-col h-full md:flex-row">
        {/* Coluna esquerda: busca + produtos */}
        <div className="flex-1 min-w-0 flex flex-col p-3 md:p-4 lg:w-[65%]">
          {/* Barra de busca */}
          <div className="flex items-center gap-2 mb-3">
            <Link
              href="/admin/livraria/produtos"
              className="flex-shrink-0 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
              aria-label="Voltar"
            >
              <ArrowLeft size={20} />
            </Link>
            <div className="flex-1 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="search"
                placeholder="Nome, SKU ou código de barras"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800
                           focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20 outline-none transition-all
                           placeholder:text-slate-400"
              />
            </div>
            <button
              type="button"
              onClick={() => setBarcodeOpen(true)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
              aria-label="Ler código de barras"
            >
              <Camera size={17} />
              <span className="hidden sm:inline">Ler código</span>
            </button>
            <button
              type="button"
              onClick={() => setCartDrawerOpen(true)}
              className="lg:hidden flex-shrink-0 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 relative transition-colors"
              aria-label="Abrir sacola"
            >
              <ShoppingCart size={22} />
              {cart.filter((i) => i.mode === 'SALE').length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-[#c62737] text-white text-[10px] font-bold flex items-center justify-center px-1">
                  {cart.filter((i) => i.mode === 'SALE').length}
                </span>
              )}
            </button>
          </div>

          {/* Filtros: categoria + toggle de visão */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 min-w-0">
              <CustomSelect
                value={category}
                onChange={setCategory}
                options={[
                  { value: '', label: 'Todas as categorias' },
                  ...categories.map((c) => ({ value: c.id, label: c.name })),
                ]}
                placeholder="Todas as categorias"
                allowEmpty={false}
              />
            </div>
            <div className="flex-shrink-0 flex rounded-xl border border-slate-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`p-2.5 transition-colors ${
                  viewMode === 'cards'
                    ? 'bg-[#c62737] text-white'
                    : 'bg-white text-slate-500 hover:bg-slate-50'
                }`}
                aria-label="Ver em grade"
                title="Grade"
              >
                <LayoutGrid size={18} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-2.5 border-l border-slate-200 transition-colors ${
                  viewMode === 'list'
                    ? 'bg-[#c62737] text-white'
                    : 'bg-white text-slate-500 hover:bg-slate-50'
                }`}
                aria-label="Ver em lista"
                title="Lista"
              >
                <List size={18} />
              </button>
            </div>
          </div>
          {loading ? (
            <div className="flex-1 flex items-center justify-center py-12">
              <Spinner size="lg" text="Carregando produtos..." />
            </div>
          ) : viewMode === 'list' ? (
            <div className="overflow-auto rounded-xl border border-slate-200 bg-white pb-24 lg:pb-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-3 py-3 w-14"></th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Produto</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">SKU</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Preço</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Estoque</th>
                    <th className="px-3 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <PdvProductListRow
                      key={p.id}
                      product={p}
                      onAdd={() => openQuantity(p, 'SALE')}
                      onReserve={() => openQuantity(p, 'RESERVE')}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 overflow-auto pb-24 lg:pb-4">
              {products.map((p) => (
                <PdvProductCard
                  key={p.id}
                  product={p}
                  onAdd={() => openQuantity(p, 'SALE')}
                  onReserve={() => openQuantity(p, 'RESERVE')}
                />
              ))}
            </div>
          )}
        </div>

        {/* Coluna direita: sacola (desktop) */}
        <div className="hidden lg:flex lg:w-[35%] lg:min-h-0 lg:sticky lg:top-0 lg:self-start lg:max-h-[calc(100vh-8rem)] p-4 border-l border-slate-200 bg-slate-50/50">
          <div className="w-full min-h-[320px]">
            <CartPanel
              items={cart}
              discountAmount={0}
              onQuantityChange={changeQuantity}
              onRemove={removeItem}
              onFinalize={handleFinalize}
              finalizeLoading={finalizeLoading}
              hasReserveItems={hasReserveInCart}
              caixaAberto={!!sessaoAberta}
            />
          </div>
        </div>

        {/* Mobile: drawer da sacola */}
        {cartDrawerOpen && (
          <div className="lg:hidden fixed inset-0 z-40" aria-modal="true" aria-label="Sacola">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCartDrawerOpen(false)} aria-hidden />
            <div className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-white shadow-2xl flex flex-col">
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-200 bg-white">
                <div className="flex items-center gap-2">
                  <ShoppingCart size={18} className="text-[#c62737]" />
                  <h3 className="font-bold text-slate-900">Sacola</h3>
                  {cart.filter((i) => i.mode === 'SALE').length > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-[#c62737]/10 text-[#c62737] text-xs font-bold px-1">
                      {cart.filter((i) => i.mode === 'SALE').length}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setCartDrawerOpen(false)}
                  className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                  aria-label="Fechar sacola"
                >
                  ✕
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-auto">
                <CartPanel
                  items={cart}
                  discountAmount={0}
                  onQuantityChange={changeQuantity}
                  onRemove={removeItem}
                  onFinalize={() => {
                    setCartDrawerOpen(false)
                    handleFinalize()
                  }}
                  finalizeLoading={finalizeLoading}
                  hasReserveItems={hasReserveInCart}
                  caixaAberto={!!sessaoAberta}
                />
              </div>
            </div>
          </div>
        )}

        {/* Mobile: botão sacola flutuante */}
        <div className="lg:hidden fixed bottom-5 right-4 z-30">
          <button
            type="button"
            onClick={() => setCartDrawerOpen(true)}
            className="relative flex items-center justify-center w-14 h-14 rounded-full bg-[#c62737] text-white shadow-xl active:scale-95 transition-transform"
            aria-label="Abrir sacola"
          >
            <ShoppingCart size={24} />
            {saleItems.length > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[20px] h-5 rounded-full bg-white text-[#c62737] text-xs font-bold flex items-center justify-center px-1">
                {saleItems.length}
              </span>
            )}
          </button>
        </div>
      </div>

      <QuantityModal
        open={!!quantityModal}
        product={quantityModal?.product ?? null}
        mode={quantityModal?.mode ?? 'SALE'}
        onConfirm={(q) => quantityModal && addToCart(quantityModal.product, q, quantityModal.mode)}
        onCancel={() => setQuantityModal(null)}
      />
      <BarcodeScannerModal
        open={barcodeOpen}
        onClose={() => setBarcodeOpen(false)}
        onDetected={handleBarcodeDetected}
      />
      <FinalizeSaleModal
        open={finalizeOpen}
        total={subtotal}
        onConfirm={confirmFinalize}
        onCancel={() => setFinalizeOpen(false)}
        loading={finalizeLoading}
        enabledMethods={enabledPaymentMethods}
      />
      {mercadopagoModal && (
        <MercadoPagoCheckoutModal
          open
          saleId={mercadopagoModal.saleId}
          qrCodeBase64={mercadopagoModal.qrCodeBase64}
          qrCode={mercadopagoModal.qrCode}
          onClose={() => setMercadopagoModal(null)}
        />
      )}
      {orderModal && (
        <MercadoPagoOrderModal
          open
          saleId={orderModal.saleId}
          saleNumber={orderModal.saleNumber}
          qrData={orderModal.qrData}
          orderId={orderModal.orderId}
          onClose={() => setOrderModal(null)}
        />
      )}
      {toast && (
        <Toast
          visible
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </PageAccessGuard>
  )
}
