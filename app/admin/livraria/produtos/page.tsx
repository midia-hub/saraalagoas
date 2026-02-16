'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { BookOpen, Plus, Pencil, Trash2, ArrowLeft, Download, Camera, Upload, X, ScanBarcode, AlertTriangle } from 'lucide-react'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { adminFetchJson, getAccessTokenOrThrow } from '@/lib/admin-client'
import { getStorageUrl } from '@/lib/storage-url'

type ProductImage = { id: string; image_path: string; sort_order?: number }
type Product = {
  id: string
  sku: string
  barcode: string | null
  name: string
  cost_price: number
  sale_price: number
  min_stock: number
  current_stock: number
  active: boolean
  bookstore_categories?: { name: string } | null
  bookstore_product_images?: ProductImage[] | null
}
type Category = { id: string; name: string }

export default function LivrariaProdutosPage() {
  const [items, setItems] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [activeFilter, setActiveFilter] = useState('')
  const [lowStock, setLowStock] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState({ sku: '', name: '', barcode: '', description: '', category_id: '', category_name: '', cost_price: 0, sale_price: 0, discount_type: '' as '' | 'value' | 'percent', discount_value: 0, min_stock: 0, stock_adjust_to: '', active: true })
  const [saveLoading, setSaveLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [productImages, setProductImages] = useState<ProductImage[]>([])
  const [pendingFiles, setPendingFiles] = useState<Array<{ file: File; preview: string }>>([])
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [barcodeScannerOpen, setBarcodeScannerOpen] = useState(false)
  const [barcodeScannerError, setBarcodeScannerError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const barcodeScannerRef = useRef<HTMLDivElement>(null)
  const quaggaRef = useRef<{ stop: () => void; offDetected: (h: (r: unknown) => void) => void } | null>(null)
  const onDetectedRef = useRef<((r: unknown) => void) | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (category) params.set('category', category)
      if (activeFilter !== '') params.set('active', activeFilter)
      if (lowStock) params.set('low_stock', '1')
      const data = await adminFetchJson<{ items: Product[]; total: number }>(`/api/admin/livraria/produtos?${params}`)
      setItems(data.items ?? [])
      setTotal(data.total ?? 0)
    } catch {
      setItems([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [search, category, activeFilter, lowStock])

  useEffect(() => {
    adminFetchJson<{ items: Category[] }>('/api/admin/livraria/categorias').then((d) => setCategories(d.items ?? [])).catch(() => setCategories([]))
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (!modalOpen) setBarcodeScannerOpen(false)
  }, [modalOpen])

  const openCreate = () => {
    setEditing(null)
    setForm({ sku: '', name: '', barcode: '', description: '', category_id: '', category_name: '', cost_price: 0, sale_price: 0, discount_type: '', discount_value: 0, min_stock: 0, stock_adjust_to: '', active: true })
    setProductImages([])
    setPendingFiles([])
    setCameraOpen(false)
    setCameraError(null)
    setModalOpen(true)
  }
  const openEdit = (row: Product) => {
    setEditing(row)
    const catId = (row as { category_id?: string }).category_id || ''
    const catName = (row as { bookstore_categories?: { name?: string } }).bookstore_categories?.name ?? (catId ? (categories.find((c) => c.id === catId)?.name ?? '') : '')
    setForm({
      sku: row.sku,
      name: row.name,
      barcode: row.barcode || '',
      description: (row as { description?: string }).description || '',
      category_id: catId,
      category_name: catName,
      cost_price: row.cost_price ?? 0,
      sale_price: row.sale_price ?? 0,
      discount_type: (row as { discount_type?: string }).discount_type === 'value' || (row as { discount_type?: string }).discount_type === 'percent' ? (row as { discount_type: 'value' | 'percent' }).discount_type : '',
      discount_value: Number((row as { discount_value?: number }).discount_value) || 0,
      min_stock: row.min_stock ?? 0,
      stock_adjust_to: '',
      active: row.active !== false,
    })
    const imgs = (row.bookstore_product_images ?? []).slice().sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    setProductImages(imgs)
    setPendingFiles([])
    setCameraOpen(false)
    setCameraError(null)
    setModalOpen(true)
  }

  const uploadProductImage = useCallback(async (productId: string, file: File): Promise<{ id: string; image_path: string; sort_order: number }> => {
    const token = await getAccessTokenOrThrow()
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch(`/api/admin/livraria/produtos/${productId}/upload-image`, {
      method: 'POST',
      body: fd,
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data?.error || 'Falha ao enviar foto')
    }
    return res.json()
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f || !f.type.startsWith('image/')) return
    if (editing) {
      setUploadingImage(true)
      uploadProductImage(editing.id, f)
        .then((data) => setProductImages((prev) => [...prev, { id: data.id, image_path: data.image_path, sort_order: data.sort_order }]))
        .catch((err) => console.error(err))
        .finally(() => setUploadingImage(false))
    } else {
      setPendingFiles((prev) => [...prev, { file: f, preview: URL.createObjectURL(f) }])
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }
  const addPendingFromCamera = useCallback((file: File) => {
    if (editing) {
      setUploadingImage(true)
      uploadProductImage(editing.id, file)
        .then((data) => setProductImages((prev) => [...prev, { id: data.id, image_path: data.image_path, sort_order: data.sort_order }]))
        .catch((err) => console.error(err))
        .finally(() => setUploadingImage(false))
    } else {
      setPendingFiles((prev) => [...prev, { file, preview: URL.createObjectURL(file) }])
    }
  }, [editing, uploadProductImage])
  const removeImage = useCallback(async (item: ProductImage | { file: File; preview: string }) => {
    if ('id' in item) {
      if (!editing) return
      try {
        await adminFetchJson(`/api/admin/livraria/produtos/${editing.id}/images/${item.id}`, { method: 'DELETE' })
        setProductImages((prev) => prev.filter((i) => i.id !== item.id))
      } catch (e) {
        console.error(e)
      }
    } else {
      URL.revokeObjectURL(item.preview)
      setPendingFiles((prev) => prev.filter((p) => p.preview !== item.preview))
    }
  }, [editing])
  const startCamera = useCallback(async () => {
    setCameraError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setCameraOpen(true)
    } catch (err) {
      setCameraError('Não foi possível acessar a câmera. Verifique as permissões.')
    }
  }, [])
  const capturePhoto = useCallback(() => {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0)
    canvas.toBlob(
      (blob) => {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop())
          streamRef.current = null
        }
        setCameraOpen(false)
        if (!blob) return
        const f = new File([blob], 'foto.jpg', { type: 'image/jpeg' })
        addPendingFromCamera(f)
      },
      'image/jpeg',
      0.9
    )
  }, [addPendingFromCamera])

  useEffect(() => {
    if (!barcodeScannerOpen || !barcodeScannerRef.current) return
    setBarcodeScannerError(null)
    let Quagga: { init: (c: object, cb: (err: unknown) => void) => void; start: () => void; stop: () => void; onDetected: (h: (r: unknown) => void) => void; offDetected: (h?: (r: unknown) => void) => void }
    const target = barcodeScannerRef.current
    const onDetected = (result: { codeResult?: { code?: string } }) => {
      const code = result?.codeResult?.code
      if (code) {
        setForm((f) => ({ ...f, barcode: code }))
        quaggaRef.current?.stop()
        setBarcodeScannerOpen(false)
      }
    }
    onDetectedRef.current = onDetected
    import('@ericblade/quagga2').then((mod) => {
      Quagga = mod.default
      quaggaRef.current = Quagga
      Quagga.init(
        {
          locate: true,
          inputStream: {
            name: 'Live',
            type: 'LiveStream',
            target,
            constraints: { width: 640, height: 480, facingMode: 'environment' },
            area: { top: '15%', right: '15%', bottom: '15%', left: '15%' },
          },
          decoder: {
            readers: ['ean_reader', 'ean_8_reader', 'code_128_reader', 'upc_reader', 'upc_e_reader', 'code_39_reader'],
          },
        },
        (err: unknown) => {
          if (err) {
            setBarcodeScannerError('Não foi possível acessar a câmera. Verifique as permissões.')
            return
          }
          Quagga.onDetected(onDetected)
          Quagga.start()
        }
      )
    }).catch(() => setBarcodeScannerError('Erro ao carregar o leitor de código de barras.'))
    return () => {
      if (quaggaRef.current && onDetectedRef.current) {
        try {
          quaggaRef.current.offDetected(onDetectedRef.current)
          quaggaRef.current.stop()
        } catch (_) {}
      }
      quaggaRef.current = null
      onDetectedRef.current = null
    }
  }, [barcodeScannerOpen])

  const resolveCategoryId = useCallback(async (): Promise<string | null> => {
    if (form.category_id) return form.category_id
    const name = form.category_name.trim()
    if (!name) return null
    const found = categories.find((c) => c.name.toLowerCase() === name.toLowerCase())
    if (found) return found.id
    const created = await adminFetchJson<{ id: string; name: string }>('/api/admin/livraria/categorias', {
      method: 'POST',
      body: JSON.stringify({ name }),
    })
    if (created?.id) {
      setCategories((prev) => [...prev, { id: created.id, name: created.name }].sort((a, b) => a.name.localeCompare(b.name)))
      return created.id
    }
    return null
  }, [form.category_id, form.category_name, categories])

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaveLoading(true)
    try {
      const categoryId = await resolveCategoryId()
      const { category_name: _cn, stock_adjust_to: _sa, ...rest } = form
      const payload = { ...rest, category_id: categoryId || null }
      let productId: string
      let currentStock: number
      if (editing) {
        await adminFetchJson(`/api/admin/livraria/produtos/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
        productId = editing.id
        currentStock = editing.current_stock ?? 0
      } else {
        const created = await adminFetchJson<{ id: string }>('/api/admin/livraria/produtos', {
          method: 'POST',
          body: JSON.stringify({ ...payload, current_stock: 0 }),
        })
        productId = created!.id
        currentStock = 0
        if (productId && pendingFiles.length > 0) {
          for (const { file } of pendingFiles) {
            await uploadProductImage(productId, file)
          }
          pendingFiles.forEach((p) => URL.revokeObjectURL(p.preview))
        }
      }
      const targetStock = form.stock_adjust_to === '' ? null : Math.max(0, parseInt(String(form.stock_adjust_to), 10) || 0)
      if (targetStock !== null && targetStock !== currentStock) {
        const delta = targetStock - currentStock
        const movementType = delta > 0 ? 'ENTRY_ADJUSTMENT' : 'EXIT_ADJUSTMENT'
        const quantity = Math.abs(delta)
        await adminFetchJson('/api/admin/livraria/estoque/movimentar', {
          method: 'POST',
          body: JSON.stringify({
            product_id: productId,
            movement_type: movementType,
            quantity,
            notes: 'Ajuste pelo cadastro do produto',
          }),
        })
      }
      setModalOpen(false)
      load()
    } finally {
      setSaveLoading(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await adminFetchJson(`/api/admin/livraria/produtos/${deleteTarget.id}`, { method: 'DELETE' })
      setDeleteTarget(null)
      load()
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleExport = () => {
    setExportLoading(true)
    window.open(`/api/admin/livraria/exportacao?type=products&format=xlsx`, '_blank')
    setTimeout(() => setExportLoading(false), 1000)
  }

  return (
    <PageAccessGuard pageKey="livraria_produtos">
      <div className="p-4 sm:p-6 md:p-8 min-h-0">
        <div className="mb-6 sm:mb-8 flex flex-col gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <Link href="/admin" className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 flex-shrink-0 touch-manipulation" aria-label="Voltar">
              <ArrowLeft size={20} />
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#c62737]/10 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="text-[#c62737]" size={22} />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-800 truncate">Produtos</h1>
                  <p className="text-slate-500 text-sm sm:text-base">Cadastro de produtos da livraria</p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-2">
            <Button variant="secondary" onClick={handleExport} loading={exportLoading} className="flex-1 sm:flex-none min-w-[120px] touch-manipulation">
              <Download size={18} />
              Exportar
            </Button>
            <Button onClick={openCreate} className="flex-1 sm:flex-none min-w-[120px] touch-manipulation">
              <Plus size={18} />
              Novo produto
            </Button>
          </div>
        </div>

        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-4">
          <input
            type="text"
            placeholder="Buscar por nome, SKU ou código"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-56 px-3 py-2.5 border border-slate-300 rounded-lg text-base"
          />
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full sm:w-auto min-w-0 px-3 py-2.5 border border-slate-300 rounded-lg">
            <option value="">Todas as categorias</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)} className="w-full sm:w-auto min-w-0 px-3 py-2.5 border border-slate-300 rounded-lg">
            <option value="">Todos</option>
            <option value="true">Ativos</option>
            <option value="false">Inativos</option>
          </select>
          <label className="flex items-center gap-2 py-2 sm:py-0 cursor-pointer touch-manipulation">
            <input type="checkbox" checked={lowStock} onChange={(e) => setLowStock(e.target.checked)} className="rounded w-4 h-4" />
            <span className="text-sm text-slate-600">Estoque baixo</span>
          </label>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-6 sm:p-8 text-center text-slate-500">Carregando...</div>
          ) : (
            <>
              {/* Lista em cards no mobile */}
              <div className="md:hidden divide-y divide-slate-100">
                {items.map((row) => {
                  const imgs = (row.bookstore_product_images ?? []).slice().sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                  const first = imgs[0]
                  return (
                    <div key={row.id} className="p-4 active:bg-slate-50">
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-14 h-14 rounded-lg border border-slate-200 overflow-hidden bg-slate-100">
                          {first ? (
                            <Image src={getStorageUrl(first.image_path)} alt="" width={56} height={56} className="object-cover w-full h-full" unoptimized />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs">—</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-800 truncate">{row.name}</p>
                          <p className="text-xs text-slate-500 font-mono">{row.sku}</p>
                          <p className="text-sm text-slate-600 mt-0.5">{row.bookstore_categories?.name ?? '—'}</p>
                          <div className="flex items-center justify-between mt-2 gap-2">
                            <span className="text-sm font-semibold text-slate-800">R$ {Number(row.sale_price).toFixed(2)}</span>
                            <span className="text-xs text-slate-500">Est: {row.current_stock}</span>
                            <div className="flex gap-1">
                              <button type="button" onClick={() => openEdit(row)} className="p-2.5 text-slate-600 hover:bg-slate-100 rounded-lg touch-manipulation" title="Editar">
                                <Pencil size={18} />
                              </button>
                              {row.active && (
                                <button type="button" onClick={() => setDeleteTarget(row)} className="p-2.5 text-red-600 hover:bg-red-50 rounded-lg touch-manipulation" title="Desativar">
                                  <Trash2 size={18} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              {/* Tabela no desktop */}
              <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-slate-700 w-14">Foto</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">SKU</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">Nome</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">Categoria</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-700">Preço</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-700">Estoque</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-700">Mín.</th>
                    <th className="text-center py-3 px-4 font-medium text-slate-700">Status</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-700">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4">
                        {(() => {
                          const imgs = (row.bookstore_product_images ?? []).slice().sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                          const first = imgs[0]
                          return first ? (
                            <div className="w-10 h-10 rounded border border-slate-200 overflow-hidden bg-slate-100">
                              <Image src={getStorageUrl(first.image_path)} alt="" width={40} height={40} className="object-cover w-full h-full" unoptimized />
                            </div>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )
                        })()}
                      </td>
                      <td className="py-3 px-4 font-mono">{row.sku}</td>
                      <td className="py-3 px-4">{row.name}</td>
                      <td className="py-3 px-4">{row.bookstore_categories?.name ?? '—'}</td>
                      <td className="py-3 px-4 text-right">R$ {Number(row.sale_price).toFixed(2)}</td>
                      <td className="py-3 px-4 text-right">{row.current_stock}</td>
                      <td className="py-3 px-4 text-right">{row.min_stock}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={row.active ? 'text-green-600' : 'text-slate-400'}>{row.active ? 'Ativo' : 'Inativo'}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button type="button" onClick={() => openEdit(row)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg mr-1" title="Editar">
                          <Pencil size={16} />
                        </button>
                        {row.active && (
                          <button type="button" onClick={() => setDeleteTarget(row)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Desativar">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </>
          )}
          {!loading && items.length === 0 && (
            <div className="p-6 sm:p-8 text-center text-slate-500">Nenhum produto encontrado.</div>
          )}
        </div>

        {modalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={() => setModalOpen(false)}>
            <div className="bg-white shadow-xl w-full max-w-4xl h-[95vh] sm:h-auto sm:max-h-[90vh] rounded-t-2xl sm:rounded-xl overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-lg font-semibold text-slate-800 p-4 sm:p-6 pb-0 flex-shrink-0">{editing ? 'Editar produto' : 'Novo produto'}</h2>
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-[1fr,280px] gap-4 sm:gap-6">
              <div className="space-y-3 min-w-0">
                {editing ? (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">SKU</label>
                    <input value={form.sku} readOnly className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-600" />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">SKU</label>
                    <input value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="Opcional — gerado automaticamente se vazio" />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nome *</label>
                  <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="Obrigatório" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Código de barras</label>
                  <div className="flex gap-2">
                    <input value={form.barcode} onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))} className="flex-1 px-3 py-2 border border-slate-300 rounded-lg" placeholder="EAN-13, Code 128, UPC, etc." />
                    <Button type="button" variant="secondary" size="sm" onClick={() => { setBarcodeScannerError(null); setBarcodeScannerOpen(true); }} title="Ler código de barras com a câmera">
                      <ScanBarcode size={18} className="mr-1" /> Ler com câmera
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Preço custo</label>
                    <input type="number" step="0.01" min="0" value={form.cost_price || ''} onChange={(e) => setForm((f) => ({ ...f, cost_price: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Preço venda</label>
                    <input type="number" step="0.01" min="0" value={form.sale_price || ''} onChange={(e) => setForm((f) => ({ ...f, sale_price: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Desconto</label>
                  <div className="flex flex-wrap items-center gap-4">
                    <label className="flex items-center gap-2">
                      <input type="radio" name="discount_type" checked={!form.discount_type} onChange={() => setForm((f) => ({ ...f, discount_type: '', discount_value: 0 }))} className="rounded-full" />
                      <span className="text-sm">Nenhum</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" name="discount_type" checked={form.discount_type === 'value'} onChange={() => setForm((f) => ({ ...f, discount_type: 'value' }))} className="rounded-full" />
                      <span className="text-sm">Por valor (R$)</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" name="discount_type" checked={form.discount_type === 'percent'} onChange={() => setForm((f) => ({ ...f, discount_type: 'percent' }))} className="rounded-full" />
                      <span className="text-sm">Por porcentagem (%)</span>
                    </label>
                    {(form.discount_type === 'value' || form.discount_type === 'percent') && (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max={form.discount_type === 'percent' ? 100 : undefined}
                        value={form.discount_value || ''}
                        onChange={(e) => setForm((f) => ({ ...f, discount_value: parseFloat(e.target.value) || 0 }))}
                        className="w-24 px-2 py-1.5 border border-slate-300 rounded-lg text-sm"
                        placeholder={form.discount_type === 'percent' ? 'Ex: 10' : '0,00'}
                      />
                    )}
                  </div>
                  {(() => {
                    const sale = Number(form.sale_price) || 0
                    const cost = Number(form.cost_price) || 0
                    let finalPrice = sale
                    if (form.discount_type === 'value') finalPrice = Math.max(0, sale - (Number(form.discount_value) || 0))
                    else if (form.discount_type === 'percent') finalPrice = Math.max(0, sale * (1 - (Number(form.discount_value) || 0) / 100))
                    const belowCost = cost > 0 && finalPrice < cost
                    return (
                      <div className="mt-2">
                        <p className="text-sm text-slate-600">
                          Preço final: <strong>R$ {finalPrice.toFixed(2)}</strong>
                        </p>
                        {belowCost && (
                          <p className="mt-1 flex items-center gap-1.5 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
                            <AlertTriangle size={16} className="flex-shrink-0" />
                            O preço final está abaixo do custo (R$ {cost.toFixed(2)}). Verifique os valores.
                          </p>
                        )}
                      </div>
                    )
                  })()}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Estoque mínimo</label>
                  <input type="number" min="0" value={form.min_stock} onChange={(e) => setForm((f) => ({ ...f, min_stock: parseInt(e.target.value, 10) || 0 }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                </div>
                <div>
                  {editing ? (
                    <>
                      <p className="text-sm text-slate-600 mb-1">Estoque atual: <strong>{editing.current_stock ?? 0}</strong></p>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Definir estoque como (opcional)</label>
                      <input type="number" min="0" value={form.stock_adjust_to} onChange={(e) => setForm((f) => ({ ...f, stock_adjust_to: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="Deixe vazio para não alterar" />
                    </>
                  ) : (
                    <>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Estoque inicial (opcional)</label>
                      <input type="number" min="0" value={form.stock_adjust_to} onChange={(e) => setForm((f) => ({ ...f, stock_adjust_to: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="Ex: 10" />
                    </>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
                  <input
                    type="text"
                    list="product-category-list"
                    value={form.category_name}
                    onChange={(e) => {
                      const v = e.target.value
                      const found = categories.find((c) => c.name.toLowerCase() === v.trim().toLowerCase())
                      setForm((f) => ({ ...f, category_name: v, category_id: found ? found.id : '' }))
                    }}
                    onBlur={() => {
                      const v = form.category_name.trim()
                      const found = v ? categories.find((c) => c.name.toLowerCase() === v.toLowerCase()) : null
                      if (found) setForm((f) => ({ ...f, category_id: found.id, category_name: found.name }))
                    }}
                    placeholder="Digite ou selecione uma categoria"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                  <datalist id="product-category-list">
                    {categories.map((c) => (
                      <option key={c.id} value={c.name} />
                    ))}
                  </datalist>
                </div>
                {editing && (
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} className="rounded" />
                    <span className="text-sm">Ativo</span>
                  </label>
                )}
              </div>

              <div className="md:border-l md:border-slate-200 md:pl-6 pt-4 md:pt-0 border-t border-slate-200 md:border-t-0 flex flex-col min-w-0">
                <span className="text-sm font-medium text-slate-700 mb-2 block">Fotos</span>
                <div className="grid grid-cols-3 gap-2 mb-3 max-h-48 overflow-y-auto">
                  {productImages.map((img) => (
                    <div key={img.id} className="relative aspect-square rounded-lg border border-slate-200 overflow-hidden bg-slate-100 group">
                      <Image src={getStorageUrl(img.image_path)} alt="" fill className="object-cover" unoptimized sizes="80px" />
                      <button type="button" onClick={() => removeImage(img)} className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-black/70 rounded-full text-white opacity-0 group-hover:opacity-100 transition" title="Remover"><X size={12} /></button>
                    </div>
                  ))}
                  {pendingFiles.map((p) => (
                    <div key={p.preview} className="relative aspect-square rounded-lg border border-slate-200 overflow-hidden bg-slate-100 group">
                      <img src={p.preview} alt="" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => removeImage(p)} className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-black/70 rounded-full text-white opacity-0 group-hover:opacity-100 transition" title="Remover"><X size={12} /></button>
                    </div>
                  ))}
                </div>
                <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/jpg" className="hidden" onChange={handleFileChange} />
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploadingImage}>
                    <Upload size={14} className="mr-1" /> Enviar
                  </Button>
                  <Button type="button" variant="secondary" size="sm" onClick={startCamera} disabled={uploadingImage}>
                    <Camera size={14} className="mr-1" /> Tirar foto
                  </Button>
                </div>
                {cameraOpen && (
                  <div className="mt-3 p-3 border border-slate-200 rounded-lg bg-slate-50">
                    {cameraError ? (
                      <p className="text-sm text-red-600">{cameraError}</p>
                    ) : (
                      <>
                        <video ref={videoRef} autoPlay playsInline muted className="w-full max-h-32 rounded object-cover" />
                        <div className="flex gap-2 mt-2">
                          <Button type="button" size="sm" onClick={capturePhoto}>Capturar</Button>
                          <Button type="button" variant="secondary" size="sm" onClick={() => { setCameraOpen(false); streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null; }}>Cancelar</Button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
              </div>
              <div className="p-4 sm:p-6 pt-4 border-t border-slate-200 flex flex-col-reverse sm:flex-row justify-end gap-2 flex-shrink-0">
                <Button variant="secondary" onClick={() => setModalOpen(false)} className="w-full sm:w-auto touch-manipulation">Cancelar</Button>
                <Button onClick={handleSave} loading={saveLoading} className="w-full sm:w-auto touch-manipulation">Salvar</Button>
              </div>
            </div>
          </div>
        )}

        {barcodeScannerOpen && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4" onClick={() => setBarcodeScannerOpen(false)}>
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <span className="font-medium text-slate-800">Apontar a câmera para o código de barras</span>
                <button type="button" onClick={() => setBarcodeScannerOpen(false)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg">
                  <X size={20} />
                </button>
              </div>
              <div className="p-4">
                {barcodeScannerError ? (
                  <p className="text-sm text-red-600 mb-3">{barcodeScannerError}</p>
                ) : (
                  <div ref={barcodeScannerRef} className="w-full aspect-video bg-slate-900 rounded-lg overflow-hidden" />
                )}
                <div className="mt-3 flex justify-end">
                  <Button type="button" variant="secondary" size="sm" onClick={() => setBarcodeScannerOpen(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <ConfirmDialog
          open={!!deleteTarget}
          title="Desativar produto"
          message="O produto não aparecerá na listagem. Você pode reativá-lo editando depois."
          confirmLabel="Desativar"
          variant="danger"
          loading={deleteLoading}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      </div>
    </PageAccessGuard>
  )
}
