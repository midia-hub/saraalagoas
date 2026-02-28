'use client'

import { useRef, useState } from 'react'
import { Upload, X } from 'lucide-react'
import { adminFetchJson } from '@/lib/admin-client'
import { CustomSelect } from '@/components/ui/CustomSelect'

interface StepFile {
  id:          string
  file_name:   string
  file_url:    string
  source_type: string
  created_at:  string
}

interface ArteIaPanelProps {
  stepId:   string
  demandId: string
  metadata: Record<string, unknown>
}

const FORMATOS = [
  { label: 'Quadrado (Feed 1:1)',   value: '1024x1024' },
  { label: 'Retrato (Stories 9:16)', value: '1024x1792' },
  { label: 'Paisagem (16:9)',        value: '1792x1024' },
]

const TONS = [
  'Inspirador', 'Evangelístico', 'Comemorativo', 'Informativo', 'Reflexivo', 'Festivo',
]

const TOM_OPTS     = TONS.map((t) => ({ value: t, label: t }))
const FORMATO_OPTS = FORMATOS.map((f) => ({ value: f.value, label: f.label }))

const QUALIDADES = [
  { value: 'standard', label: 'Standard — rápido' },
  { value: 'hd',       label: 'HD — alta qualidade' },
]

export default function ArteIaPanel({ stepId, demandId, metadata }: ArteIaPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [briefing, setBriefing] = useState({
    tema:      String(metadata.titulo_demanda ?? ''),
    descricao: String(metadata.descricao_demanda ?? ''),
    tom:       TONS[0],
    formato:   FORMATOS[0].value,
    qualidade: 'standard',
    detalhes:  '',
  })

  // Arte de referência enviada pelo usuário
  const [referenceDataUrl,  setReferenceDataUrl]  = useState<string | null>(null)
  const [referenceFileName, setReferenceFileName] = useState('')

  const [generatedPrompt, setGeneratedPrompt] = useState('')
  const [images,          setImages]          = useState<{ url: string; revisedPrompt?: string }[]>([])
  const [loading,         setLoading]         = useState<'prompt' | 'image' | 'saving' | null>(null)
  const [error,           setError]           = useState('')
  const [savedFiles,      setSavedFiles]      = useState<StepFile[]>([])

  /* ---- Upload de arte de referência ---- */
  const handleReferenceFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError('Imagem muito grande. Máximo: 5 MB.'); return }
    const reader = new FileReader()
    reader.onload = () => {
      setReferenceDataUrl(reader.result as string)
      setReferenceFileName(file.name)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }
  const gerarPrompt = async () => {
    if (!briefing.tema) { setError('Informe o tema da arte.'); return }
    setLoading('prompt')
    setError('')
    try {
      const payload: Record<string, unknown> = {
        tema:     briefing.tema,
        tom:      briefing.tom,
        formato:  briefing.formato,
        detalhes: [briefing.descricao, briefing.detalhes].filter(Boolean).join(' | '),
      }
      if (referenceDataUrl) payload.reference_image_base64 = referenceDataUrl
      const data = await adminFetchJson<{ prompt: string }>('/api/admin/midia/gerar-prompt-arte', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      setGeneratedPrompt(data.prompt ?? '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar prompt.')
    } finally {
      setLoading(null)
    }
  }

  /* ---- DALL-E gera imagem ---- */
  const gerarArte = async () => {
    const prompt = generatedPrompt.trim()
    if (!prompt) { setError('Gere ou escreva o prompt primeiro.'); return }
    setLoading('image')
    setError('')
    try {
      const data = await adminFetchJson<{ images: { url: string; revisedPrompt?: string }[] }>('/api/admin/midia/gerar-arte', {
        method: 'POST',
        body: JSON.stringify({ prompt, size: briefing.formato, quality: briefing.qualidade }),
      })
      setImages(data.images ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar imagem.')
    } finally {
      setLoading(null)
    }
  }

  /* ---- Salvar imagem no bucket ---- */
  const salvarImagem = async (url: string, index: number) => {
    setLoading('saving')
    setError('')
    try {
      const data = await adminFetchJson<{ file: StepFile }>(
        `/api/admin/midia/demandas/${demandId}/steps/${stepId}/files`,
        {
          method: 'POST',
          body: JSON.stringify({
            url,
            file_name: `arte_ia_${Date.now()}_${index + 1}.png`,
          }),
        },
      )
      setSavedFiles((prev) => [...prev, data.file])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar imagem.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-5">

      {/* Arte de referência */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-slate-700">Arte de referência (opcional)</h4>
        <p className="text-xs text-slate-500 leading-relaxed">
          Envie uma arte no estilo desejado. A IA vai analisar cores, layout e elementos para reproduzir na geração.
        </p>
        {referenceDataUrl ? (
          <div className="relative rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={referenceDataUrl} alt="Arte de referência" className="w-full max-h-52 object-contain" />
            <div className="absolute top-2 right-2">
              <button
                type="button"
                onClick={() => { setReferenceDataUrl(null); setReferenceFileName('') }}
                className="flex items-center gap-1 bg-white/90 hover:bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-medium text-slate-600 shadow-sm transition-colors"
              >
                <X className="w-3 h-3" /> Remover
              </button>
            </div>
            <div className="px-3 py-1.5 border-t border-slate-100">
              <p className="text-[10px] text-slate-400 truncate">{referenceFileName}</p>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-slate-200 hover:border-[#c62737]/40 hover:bg-[#c62737]/5 text-sm font-medium text-slate-500 hover:text-[#c62737] transition-all"
          >
            <Upload className="w-4 h-4" /> Enviar arte de referência
          </button>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleReferenceFile} />
      </div>

      {/* Briefing */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-slate-700">1. Briefing da arte</h4>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Tema / assunto</label>
          <input
            value={briefing.tema}
            onChange={(e) => setBriefing({ ...briefing, tema: e.target.value })}
            placeholder="Ex: Culto de evangelismo — 'Porta Aberta'"
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 hover:border-slate-300 focus:border-[#c62737] focus:ring-1 focus:ring-[#c62737] outline-none transition-colors"
          />
        </div>

        {briefing.descricao && (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Descrição da demanda</label>
            <textarea
              value={briefing.descricao}
              onChange={(e) => setBriefing({ ...briefing, descricao: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 hover:border-slate-300 focus:border-[#c62737] focus:ring-1 focus:ring-[#c62737] outline-none transition-colors resize-none"
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Tom</label>
            <CustomSelect
              value={briefing.tom}
              onChange={(v) => setBriefing({ ...briefing, tom: v })}
              options={TOM_OPTS}
              placeholder="Selecione o tom"
              allowEmpty={false}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Formato</label>
            <CustomSelect
              value={briefing.formato}
              onChange={(v) => setBriefing({ ...briefing, formato: v })}
              options={FORMATO_OPTS}
              placeholder="Selecione o formato"
              allowEmpty={false}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Detalhes adicionais</label>
          <textarea
            value={briefing.detalhes}
            onChange={(e) => setBriefing({ ...briefing, detalhes: e.target.value })}
            rows={2}
            placeholder="Palestrantes, data, cores específicas, elementos obrigatórios..."
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 hover:border-slate-300 focus:border-[#c62737] focus:ring-1 focus:ring-[#c62737] outline-none transition-colors resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Qualidade</label>
          <CustomSelect
            value={briefing.qualidade}
            onChange={(v) => setBriefing({ ...briefing, qualidade: v })}
            options={QUALIDADES}
            allowEmpty={false}
          />
        </div>

        <button
          type="button"
          onClick={gerarPrompt}
          disabled={loading !== null}
          className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold transition-colors disabled:opacity-60"
        >
          {loading === 'prompt'
            ? (referenceDataUrl ? 'Analisando referência...' : 'Gerando prompt...')
            : (referenceDataUrl ? '✨ Gerar prompt baseado na referência' : '✨ Gerar prompt com IA')}
        </button>
      </div>

      {/* Prompt gerado */}
      {generatedPrompt && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-slate-700">2. Prompt gerado (editável)</h4>
          <textarea
            value={generatedPrompt}
            onChange={(e) => setGeneratedPrompt(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 hover:border-slate-300 focus:border-[#c62737] focus:ring-1 focus:ring-[#c62737] outline-none transition-colors resize-none font-mono"
          />
          <button
            type="button"
            onClick={gerarArte}
            disabled={loading !== null}
            className="w-full py-2.5 rounded-xl bg-[#c62737] hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-60"
          >
            {loading === 'image' ? 'Gerando arte...' : '🎨 Gerar arte com DALL-E'}
          </button>
        </div>
      )}

      {/* Imagens geradas */}
      {images.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-slate-700">3. Arte gerada</h4>
          <div className="grid grid-cols-1 gap-3">
            {images.map((img, i) => (
              <div key={i} className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                <div className="relative w-full aspect-square bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={`Arte gerada ${i + 1}`}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="p-3 flex gap-2">
                  <a
                    href={img.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-center py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-600 transition-colors"
                  >
                    ↗ Abrir
                  </a>
                  <button
                    type="button"
                    onClick={() => salvarImagem(img.url, i)}
                    disabled={loading === 'saving'}
                    className="flex-1 py-2 rounded-lg bg-[#c62737] hover:bg-red-700 text-white text-xs font-semibold transition-colors disabled:opacity-60"
                  >
                    {loading === 'saving' ? 'Salvando...' : '💾 Salvar na demanda'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Arquivos salvos */}
      {savedFiles.length > 0 && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
          <p className="text-xs font-semibold text-emerald-700 mb-2">Salvo na demanda:</p>
          {savedFiles.map((f) => (
            <a
              key={f.id}
              href={f.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-xs text-emerald-600 hover:underline truncate"
            >
              {f.file_name}
            </a>
          ))}
        </div>
      )}

      {error && (
        <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}
    </div>
  )
}
