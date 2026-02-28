'use client'

import { useState, useEffect, useRef } from 'react'
import { adminFetchJson } from '@/lib/admin-client'

interface StepFile {
  id:          string
  file_name:   string
  file_url:    string
  mime_type:   string
  file_size:   number
  source_type: string
  approved:    boolean | null
  created_at:  string
}

interface MaterialPanelProps {
  stepId:   string
  demandId: string
}

const ACCEPT = 'image/*,video/*,application/pdf,application/zip,audio/*'

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function isImage(mime: string) { return mime.startsWith('image/') }

export default function MaterialPanel({ stepId, demandId }: MaterialPanelProps) {
  const [files,    setFiles]    = useState<StepFile[]>([])
  const [loading,  setLoading]  = useState(true)
  const [uploading,setUploading]= useState(false)
  const [error,    setError]    = useState('')
  const [drag,     setDrag]     = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    setLoading(true)
    try {
      const data = await adminFetchJson<{ files?: StepFile[] }>(`/api/admin/midia/demandas/${demandId}/steps/${stepId}/files`)
      setFiles(data.files ?? [])
    } catch {
      setError('Erro ao carregar arquivos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [stepId, demandId]) // eslint-disable-line react-hooks/exhaustive-deps

  const upload = async (fileList: FileList | File[]) => {
    const arr = Array.from(fileList)
    if (!arr.length) return
    setUploading(true)
    setError('')
    try {
      for (const file of arr) {
        const form = new FormData()
        form.append('file', file)
        form.append('source_type', 'upload')
        await adminFetchJson(
          `/api/admin/midia/demandas/${demandId}/steps/${stepId}/files`,
          { method: 'POST', body: form },
        )
      }
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro no upload.')
    } finally {
      setUploading(false)
    }
  }

  const remove = async (fileId: string) => {
    try {
      await adminFetchJson(
        `/api/admin/midia/demandas/${demandId}/steps/${stepId}/files?file_id=${fileId}`,
        { method: 'DELETE' },
      )
      setFiles((prev) => prev.filter((f) => f.id !== fileId))
    } catch {
      setError('Erro ao remover arquivo.')
    }
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDrag(false)
    if (e.dataTransfer.files) upload(e.dataTransfer.files)
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors ${
          drag
            ? 'border-[#c62737] bg-red-50'
            : 'border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-white'
        }`}
      >
        <div className="text-2xl mb-2">📁</div>
        <p className="text-sm font-medium text-slate-600">
          {uploading ? 'Enviando...' : 'Clique ou arraste arquivos aqui'}
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Imagens, vídeos, PDF, ZIP — até 50 MB por arquivo
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => e.target.files && upload(e.target.files)}
        />
      </div>

      {error && (
        <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}

      {/* Lista de arquivos */}
      {loading ? (
        <p className="text-xs text-slate-400 text-center py-4">Carregando arquivos...</p>
      ) : files.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-4">Nenhum arquivo enviado ainda.</p>
      ) : (
        <ul className="space-y-2">
          {files.map((f) => (
            <li
              key={f.id}
              className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white"
            >
              {/* thumbnail ou ícone */}
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0 flex items-center justify-center">
                {isImage(f.mime_type) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.file_url} alt={f.file_name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl">
                    {f.mime_type.includes('video') ? '🎬' : f.mime_type.includes('pdf') ? '📄' : '📦'}
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">{f.file_name}</p>
                <p className="text-xs text-slate-400">
                  {humanSize(f.file_size)} · {f.source_type === 'dalle' ? 'IA' : 'Upload'} ·{' '}
                  {new Date(f.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <a
                  href={f.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
                >
                  ↗
                </a>
                <button
                  type="button"
                  onClick={() => remove(f.id)}
                  className="text-xs px-2 py-1 rounded-lg border border-red-100 hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
