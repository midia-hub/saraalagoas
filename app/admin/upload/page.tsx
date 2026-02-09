'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Upload, CheckCircle, AlertCircle, ArrowLeft, ArrowRight, X, Image as ImageIcon } from 'lucide-react'
import Link from 'next/link'

type Step = 1 | 2 | 3

interface FormData {
  type: 'culto' | 'evento'
  serviceId?: string
  eventName?: string
  date: string
  description?: string
}

interface WorshipService {
  id: string
  name: string
  slug: string
  active: boolean
}

export default function AdminUploadPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [formData, setFormData] = useState<FormData>({
    type: 'culto',
    date: new Date().toISOString().split('T')[0],
  })
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [services, setServices] = useState<WorshipService[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<{
    success: boolean
    route?: string
    uploaded?: number
    failed?: number
    failedFiles?: Array<{ name: string; error: string }>
    error?: string
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    supabase.auth.getUser().then(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!supabase) return
    supabase
      .from('worship_services')
      .select('*')
      .eq('active', true)
      .order('name')
      .then(({ data, error }) => {
        if (!error && data) setServices(data)
      })
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    if (files.length + selectedFiles.length > 20) {
      alert('Máximo de 20 arquivos permitidos')
      return
    }
    const validFiles = selectedFiles.filter((file) => {
      if (file.size > 10 * 1024 * 1024) {
        alert(`Arquivo ${file.name} é muito grande (máximo 10MB)`)
        return false
      }
      if (!file.type.startsWith('image/')) {
        alert(`Arquivo ${file.name} não é uma imagem`)
        return false
      }
      return true
    })
    setFiles([...files, ...validFiles])
    validFiles.forEach((file) => {
      const reader = new FileReader()
      reader.onloadend = () => setPreviews((prev) => [...prev, reader.result as string])
      reader.readAsDataURL(file)
    })
  }

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index))
    setPreviews(previews.filter((_, i) => i !== index))
  }

  const canProceed = () => {
    if (step === 1) {
      if (formData.type === 'culto' && !formData.serviceId) return false
      if (formData.type === 'evento' && !formData.eventName?.trim()) return false
      if (!formData.date) return false
      return true
    }
    if (step === 2) return files.length > 0
    return false
  }

  const handleSubmit = async () => {
    if (!supabase) return
    setUploading(true)
    setUploadResult(null)
    try {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      if (!token) {
        setUploadResult({ success: false, error: 'Não autenticado' })
        setUploading(false)
        return
      }
      const formDataToSend = new FormData()
      formDataToSend.append('type', formData.type)
      if (formData.type === 'culto' && formData.serviceId) {
        const service = services.find((s) => s.id === formData.serviceId)
        formDataToSend.append('title', service?.name || '')
        formDataToSend.append('serviceId', formData.serviceId)
      } else if (formData.type === 'evento' && formData.eventName) {
        formDataToSend.append('title', formData.eventName)
      }
      formDataToSend.append('date', formData.date)
      if (formData.description) formDataToSend.append('description', formData.description)
      files.forEach((file, index) => formDataToSend.append(`file_${index}`, file))

      const response = await fetch('/api/gallery/create', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formDataToSend,
      })
      const result = await response.json()

      if (response.ok && result.success) {
        setUploadResult({
          success: true,
          route: result.gallery.route,
          uploaded: result.uploaded,
          failed: result.failed,
          failedFiles: result.failedFiles,
        })
        setStep(3)
      } else {
        setUploadResult({ success: false, error: result.error || 'Erro ao fazer upload' })
      }
    } catch (error) {
      console.error('Upload error:', error)
      setUploadResult({ success: false, error: 'Erro ao fazer upload' })
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#c62737]"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <header className="mb-8">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 shrink-0 bg-gradient-to-br from-[#c62737] to-[#a01f2d] rounded-lg flex items-center justify-center shadow-md">
            <Upload className="text-white" size={22} />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900">Upload de Fotos</h1>
            <p className="text-gray-600 text-sm mt-0.5">Adicione fotos de cultos ou eventos à galeria</p>
          </div>
        </div>
      </header>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-6 py-5 mb-8">
        <div className="flex">
          {([1, 2, 3] as const).map((s) => {
            const labels = ['Informações', 'Upload', 'Confirmação'] as const
            return (
              <div key={s} className="flex-1 flex flex-col items-center min-w-0">
                <div className="flex items-center w-full">
                  <div className="flex-1 min-w-0 flex justify-end pr-1">
                    {s > 1 && <div className={`h-1 w-full max-w-[999px] rounded-full transition-all ${step >= s ? 'bg-[#c62737]' : 'bg-gray-200'}`} />}
                  </div>
                  <div className={`flex items-center justify-center w-9 h-9 rounded-full text-sm font-semibold transition-all shrink-0 ${step >= s ? 'bg-[#c62737] text-white shadow-sm' : 'bg-gray-100 text-gray-400'}`}>
                    {step > s ? <CheckCircle size={18} /> : s}
                  </div>
                  <div className="flex-1 min-w-0 flex justify-start pl-1">
                    {s < 3 && <div className={`h-1 w-full max-w-[999px] rounded-full transition-all ${step > s ? 'bg-[#c62737]' : 'bg-gray-200'}`} />}
                  </div>
                </div>
                <span className={`mt-3 text-xs font-medium text-center ${step >= s ? 'text-[#c62737]' : 'text-gray-500'}`}>
                  {labels[s - 1]}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {step === 1 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Informações do Culto/Evento</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Tipo *</label>
                <div className="flex gap-3">
                  <label className="flex-1 flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50 has-[:checked]:border-[#c62737] has-[:checked]:bg-red-50">
                    <input type="radio" name="type" value="culto" checked={formData.type === 'culto'} onChange={(e) => setFormData({ ...formData, type: e.target.value as 'culto' })} className="w-4 h-4 text-[#c62737]" />
                    <span className="font-medium">Culto</span>
                  </label>
                  <label className="flex-1 flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50 has-[:checked]:border-[#c62737] has-[:checked]:bg-red-50">
                    <input type="radio" name="type" value="evento" checked={formData.type === 'evento'} onChange={(e) => setFormData({ ...formData, type: e.target.value as 'evento' })} className="w-4 h-4 text-[#c62737]" />
                    <span className="font-medium">Evento</span>
                  </label>
                </div>
              </div>
              {formData.type === 'culto' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Culto *</label>
                  <select value={formData.serviceId || ''} onChange={(e) => setFormData({ ...formData, serviceId: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#c62737] focus:border-[#c62737] transition-all">
                    <option value="">Selecione um culto</option>
                    {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}
              {formData.type === 'evento' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Nome do Evento *</label>
                  <input type="text" value={formData.eventName || ''} onChange={(e) => setFormData({ ...formData, eventName: e.target.value })} placeholder="Ex: Encontro de Jovens 2024" className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#c62737] focus:border-[#c62737] transition-all" />
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Data *</label>
                <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#c62737] focus:border-[#c62737] transition-all" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Descrição (opcional)</label>
                <textarea value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} placeholder="Adicione observações ou detalhes" className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#c62737] focus:border-[#c62737] transition-all resize-none" />
              </div>
            </div>
          <div className="mt-8 flex justify-end">
            <button onClick={() => setStep(2)} disabled={!canProceed()} className="flex items-center gap-2 px-8 py-3.5 bg-[#c62737] text-white font-semibold rounded-xl hover:bg-[#a01f2d] disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg">
              Próximo <ArrowRight size={20} />
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Upload de Imagens</h2>
          <label className="block w-full p-12 border-2 border-dashed border-gray-300 rounded-xl text-center cursor-pointer hover:border-[#c62737] hover:bg-red-50/30 transition-all">
            <input type="file" multiple accept="image/*" onChange={handleFileChange} className="hidden" />
            <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <ImageIcon className="text-gray-400" size={32} />
            </div>
            <p className="text-gray-900 font-semibold mb-2">Clique ou arraste para adicionar imagens</p>
            <p className="text-sm text-gray-500">Máximo 20 arquivos • 10MB cada • JPG, PNG, GIF, WEBP</p>
          </label>
          {files.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-gray-700">{files.length} {files.length === 1 ? 'arquivo selecionado' : 'arquivos selecionados'}</p>
                <button 
                  type="button" 
                  onClick={() => { setFiles([]); setPreviews([]); }}
                  className="text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  Remover todos
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {previews.map((preview, index) => (
                  <div key={index} className="relative group">
                    <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border-2 border-gray-200">
                      <img src={preview} alt={files[index].name} className="w-full h-full object-cover" />
                    </div>
                    <button type="button" onClick={() => removeFile(index)} className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600">
                      <X size={16} />
                    </button>
                    <p className="mt-2 text-xs text-gray-600 truncate font-medium" title={files[index].name}>{files[index].name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {uploadResult && !uploadResult.success && (
            <div className="mt-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={22} />
              <div>
                <p className="font-semibold text-red-900">Erro no upload</p>
                <p className="text-sm text-red-700 mt-1">{uploadResult.error}</p>
              </div>
            </div>
          )}
          <div className="mt-8 flex justify-between gap-4">
            <button onClick={() => setStep(1)} disabled={uploading} className="flex items-center gap-2 px-6 py-3.5 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed transition-all">
              <ArrowLeft size={20} /> Voltar
            </button>
            <button onClick={handleSubmit} disabled={!canProceed() || uploading} className="flex items-center gap-2 px-8 py-3.5 bg-[#c62737] text-white font-semibold rounded-xl hover:bg-[#a01f2d] disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg">
              {uploading ? <><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" /> Enviando...</> : <><Upload size={20} /> Fazer Upload</>}
            </button>
          </div>
        </div>
      )}

      {step === 3 && uploadResult?.success && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <div className="text-center max-w-md mx-auto">
            <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="text-green-600" size={40} />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Upload Concluído!</h2>
            <p className="text-gray-600 text-lg mb-3">
              {uploadResult.uploaded} {uploadResult.uploaded === 1 ? 'foto foi enviada' : 'fotos foram enviadas'} com sucesso.
            </p>
            {uploadResult.failed && uploadResult.failed > 0 && (
              <div className="mb-4 p-3 bg-yellow-50 border-2 border-yellow-200 rounded-xl">
                <p className="text-yellow-800 font-medium">
                  {uploadResult.failed} {uploadResult.failed === 1 ? 'arquivo falhou' : 'arquivos falharam'}
                </p>
              </div>
            )}
            {uploadResult.failedFiles && uploadResult.failedFiles.length > 0 && (
              <div className="mb-6 text-left p-4 bg-red-50 border-2 border-red-200 rounded-xl">
                <p className="text-sm font-semibold text-red-900 mb-3">Detalhes dos erros:</p>
                <ul className="text-sm text-red-800 space-y-2">
                  {uploadResult.failedFiles.map((f, i) => (
                    <li key={i} className="flex gap-2"><span className="font-semibold">{f.name}:</span> <span>{f.error}</span></li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
              <Link href="/admin/galeria" className="px-8 py-3.5 bg-[#c62737] text-white font-semibold rounded-xl hover:bg-[#a01f2d] transition-all shadow-md hover:shadow-lg">
                Ver Galeria
              </Link>
              <button
                type="button"
                onClick={() => {
                  setStep(1)
                  setFiles([])
                  setPreviews([])
                  setUploadResult(null)
                  setFormData({ type: 'culto', date: new Date().toISOString().split('T')[0] })
                }}
                className="px-6 py-3.5 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all"
              >
                Fazer Novo Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
