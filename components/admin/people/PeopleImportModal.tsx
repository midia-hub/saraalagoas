'use client'

import { useState } from 'react'
import { Loader2, Upload, X } from 'lucide-react'
import { getAccessTokenOrThrow } from '@/lib/admin-client'

type PreviewField = { field: string; sourceHeader: string; required: boolean }
type PreviewError = { row: number; message: string }
type PreviewRow = {
  row: number
  full_name: string
  sex: string | null
  church_profile: string
  email: string | null
  mobile_phone: string | null
  cpf: string | null
}

type Props = {
  onClose: () => void
  onImported: () => void
}

export function PeopleImportModal({ onClose, onImported }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [loadingImport, setLoadingImport] = useState(false)
  const [preview, setPreview] = useState<{
    valid: boolean
    errors: PreviewError[]
    matchedFields: PreviewField[]
    totalRows: number
    preview: PreviewRow[]
  } | null>(null)
  const [result, setResult] = useState<{
    created: number;
    updated: number;
    failed: number;
    results?: Array<{ row: number; full_name: string; success: boolean; action?: 'created' | 'updated'; error?: string }>;
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function requestWithFile(url: string) {
    if (!file) throw new Error('Selecione um arquivo XLSX.')
    const token = await getAccessTokenOrThrow()
    const formData = new FormData()
    formData.append('file', file)
    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(typeof payload?.error === 'string' ? payload.error : 'Falha na importação.')
    }
    return payload
  }

  async function handlePreview() {
    setError(null)
    setResult(null)
    setLoadingPreview(true)
    try {
      const data = await requestWithFile('/api/admin/people/importacao/preview')
      setPreview(data)
    } catch (err) {
      setPreview(null)
      setError(err instanceof Error ? err.message : 'Erro ao pré-visualizar arquivo.')
    } finally {
      setLoadingPreview(false)
    }
  }

  async function handleImport() {
    setError(null)
    setLoadingImport(true)
    try {
      const data = await requestWithFile('/api/admin/people/importacao/processar')
      setResult({
        created: data.created ?? 0,
        updated: data.updated ?? 0,
        failed: data.failed ?? 0,
        results: data.results ?? [],
      })
      onImported()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao importar arquivo.')
    } finally {
      setLoadingImport(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Importação em massa de pessoas (XLSX)</h2>
            <p className="text-sm text-slate-500">Disponível somente para administrador</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100" type="button">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-auto">
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null)
                setPreview(null)
                setResult(null)
                setError(null)
              }}
              className="text-sm w-full"
            />
            <button
              type="button"
              onClick={handlePreview}
              disabled={!file || loadingPreview}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-50"
            >
              {loadingPreview ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              Pré-visualizar
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={!file || !preview || !preview.valid || loadingImport}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#c62737] text-white font-medium hover:bg-[#a62030] disabled:opacity-50"
            >
              {loadingImport ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              Confirmar importação
            </button>
          </div>

          {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}

          {preview && (
            <div className="space-y-4">
              <div className={`p-3 rounded-lg border text-sm ${preview.valid ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                {preview.valid
                  ? `Arquivo válido. ${preview.totalRows} linhas prontas para importar.`
                  : 'Prévia concluída com inconsistências. Ajuste o arquivo antes de importar.'}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Mapeamento de campos detectados</h3>
                <div className="flex flex-wrap gap-2">
                  {preview.matchedFields.map((field) => (
                    <span key={`${field.field}-${field.sourceHeader}`} className="px-2 py-1 rounded border border-slate-200 bg-slate-50 text-xs text-slate-700">
                      {field.field} ← {field.sourceHeader}
                    </span>
                  ))}
                </div>
              </div>

              {preview.errors.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Erros encontrados</h3>
                  <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                    {preview.errors.slice(0, 20).map((item, index) => (
                      <li key={`${item.row}-${index}`}>Linha {item.row}: {item.message}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Pré-visualização de dados (até 20 linhas)</h3>
                <div className="overflow-auto border border-slate-200 rounded-lg">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="text-left px-3 py-2">Linha</th>
                        <th className="text-left px-3 py-2">Nome</th>
                        <th className="text-left px-3 py-2">Sexo</th>
                        <th className="text-left px-3 py-2">Tipo</th>
                        <th className="text-left px-3 py-2">E-mail</th>
                        <th className="text-left px-3 py-2">Celular</th>
                        <th className="text-left px-3 py-2">CPF</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.preview.map((item) => (
                        <tr key={item.row} className="border-t border-slate-100">
                          <td className="px-3 py-2">{item.row}</td>
                          <td className="px-3 py-2">{item.full_name}</td>
                          <td className="px-3 py-2">{item.sex || '—'}</td>
                          <td className="px-3 py-2">{item.church_profile}</td>
                          <td className="px-3 py-2">{item.email || '—'}</td>
                          <td className="px-3 py-2">{item.mobile_phone || '—'}</td>
                          <td className="px-3 py-2">{item.cpf || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {result && (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-sm">
                Importação concluída. Criados: {result.created} | Atualizados: {result.updated} | Falhas: {result.failed}
              </div>
              {result.results && result.results.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Log detalhado da importação</h3>
                  <div className="overflow-auto border border-slate-200 rounded-lg max-h-64">
                    <table className="min-w-full text-xs">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="text-left px-2 py-1">Linha</th>
                          <th className="text-left px-2 py-1">Nome</th>
                          <th className="text-left px-2 py-1">Status</th>
                          <th className="text-left px-2 py-1">Ação</th>
                          <th className="text-left px-2 py-1">Erro</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.results.map((item, idx) => (
                          <tr key={idx} className="border-t border-slate-100">
                            <td className="px-2 py-1">{item.row}</td>
                            <td className="px-2 py-1">{item.full_name}</td>
                            <td className="px-2 py-1">{item.success ? 'Sucesso' : 'Falha'}</td>
                            <td className="px-2 py-1">{item.action || '—'}</td>
                            <td className="px-2 py-1 text-red-700">{item.error || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
