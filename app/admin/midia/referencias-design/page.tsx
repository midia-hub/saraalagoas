'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  BookOpen,
  Check,
  Image as ImageIcon,
  Loader2,
  Pencil,
  RefreshCw,
  Sparkles,
  Tag,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { AdminPageHeader } from '@/app/admin/AdminPageHeader'
import { adminFetchJson } from '@/lib/admin-client'
import {
  REPO_CATEGORIAS,
  type RepoCategoriaId,
  type RepoMeta,
  type RepoPublico,
} from '@/lib/equipe-ia-repositorio'
import type { RepoItem } from '@/app/admin/midia/demandas/page'

function catLabel(id: string | undefined) {
  if (!id) return '—'
  return REPO_CATEGORIAS.find((c) => c.id === id)?.label ?? id
}

export default function ReferenciasDesignPage() {
  const [items, setItems] = useState<RepoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [filterCat, setFilterCat] = useState<string>('')
  const [filterPublico, setFilterPublico] = useState('')
  const [editing, setEditing] = useState<RepoItem | null>(null)
  const [editForm, setEditForm] = useState<Partial<RepoMeta>>({})
  const [savingEdit, setSavingEdit] = useState(false)
  const [analisandoId, setAnalisandoId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await adminFetchJson<{ items?: RepoItem[] }>('/api/admin/midia/equipe-ia/repositorio')
      setItems(Array.isArray(data) ? data : data.items ?? [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    return items.filter((it) => {
      const m = it.meta
      if (filterCat && (m?.categoria ?? '') !== filterCat) return false
      if (filterPublico === 'diretor_arte' && !(m?.publico ?? ['diretor_arte', 'designer']).includes('diretor_arte')) return false
      if (filterPublico === 'designer' && !(m?.publico ?? ['diretor_arte', 'designer']).includes('designer')) return false
      return true
    })
  }, [items, filterCat, filterPublico])

  const handleUpload = async (file: File) => {
    setUploading(true)
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => resolve(String(e.target?.result ?? ''))
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      await adminFetchJson('/api/admin/midia/equipe-ia/repositorio', {
        method: 'POST',
        body: JSON.stringify({
          nome:     file.name,
          base64,
          mimeType: file.type || 'image/jpeg',
        }),
      })
      await load()
    } catch {
      /* toast opcional */
    } finally {
      setUploading(false)
    }
  }

  const reanalisarComIa = async (item: RepoItem) => {
    setAnalisandoId(item.id)
    try {
      await adminFetchJson('/api/admin/midia/equipe-ia/repositorio', {
        method: 'POST',
        body: JSON.stringify({ action: 'analisar', path: item.path }),
      })
      await load()
    } catch { /* ignore */ } finally {
      setAnalisandoId(null)
    }
  }

  const handleDelete = async (item: RepoItem) => {
    setDeleteId(item.id)
    try {
      await adminFetchJson(
        `/api/admin/midia/equipe-ia/repositorio?path=${encodeURIComponent(item.path)}`,
        { method: 'DELETE' },
      )
      setItems((prev) => prev.filter((r) => r.id !== item.id))
    } catch { /* ignore */ } finally {
      setDeleteId(null)
    }
  }

  const openEdit = (item: RepoItem) => {
    setEditing(item)
    setEditForm({
      descricao:                 item.meta?.descricao ?? '',
      categoria:                 (item.meta?.categoria as RepoCategoriaId) ?? 'geral',
      publico:                   item.meta?.publico ?? ['diretor_arte', 'designer'],
      palavras_chave:            item.meta?.palavras_chave ?? [],
      linha_criativa:            item.meta?.linha_criativa ?? '',
      contexto_proximas_criacoes: item.meta?.contexto_proximas_criacoes ?? '',
      briefing_para_ia:          item.meta?.briefing_para_ia ?? '',
      prompt_sugerido_en:        item.meta?.prompt_sugerido_en ?? '',
      elementos_manter:          item.meta?.elementos_manter ?? [],
      evitar:                    item.meta?.evitar ?? [],
    })
  }

  const saveEdit = async () => {
    if (!editing) return
    setSavingEdit(true)
    try {
      const rawKw: unknown = editForm.palavras_chave
      const kw = Array.isArray(rawKw)
        ? rawKw.map(String)
        : typeof rawKw === 'string'
          ? rawKw.split(',').map((s) => s.trim()).filter(Boolean)
          : []
      await adminFetchJson('/api/admin/midia/equipe-ia/repositorio', {
        method: 'PATCH',
        body: JSON.stringify({
          path: editing.path,
          meta: { ...editForm, palavras_chave: kw },
        }),
      })
      await load()
      setEditing(null)
    } catch { /* ignore */ } finally {
      setSavingEdit(false)
    }
  }

  const togglePublico = (p: RepoPublico) => {
    const cur = (editForm.publico ?? ['diretor_arte', 'designer']) as RepoPublico[]
    setEditForm((prev) => ({
      ...prev,
      publico: cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p],
    }))
  }

  return (
    <PageAccessGuard pageKey="instagram">
      <div className="p-3 sm:p-4 md:p-6 space-y-5 max-w-6xl mx-auto">
        <AdminPageHeader
          icon={BookOpen}
          title="Referências de design"
          subtitle="A IA analisa cada imagem (visão) e preenche descrição, contexto para próximas criações, briefing, elementos a manter/evitar e sugestão de prompt em inglês — tudo salvo em JSON no bucket para a Equipe de IA reutilizar."
          backLink={{ href: '/admin/midia/demandas', label: 'Voltar às Demandas' }}
        />

        <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6 text-violet-300" />
            </div>
            <div className="flex-1 space-y-2">
              <p className="text-sm font-bold tracking-tight">Como usar na Equipe de IA</p>
              <p className="text-xs text-slate-300 leading-relaxed">
                Na página <Link href="/admin/midia/demandas" className="text-violet-300 underline font-medium">Demandas</Link>, ao abrir
                <strong className="font-semibold text-white"> Nova solicitação</strong>, selecione referências no repositório do Designer.
                O <strong className="text-rose-300">Diretor de Arte</strong> recebe o texto das descrições; o <strong className="text-amber-300">Designer</strong> usa
                a mesma linha racional e, quando marcado, a imagem como referência visual para a IA.
              </p>
            </div>
          </div>
        </section>

        {/* Upload + filtros */}
        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-end">
          <div className="flex-1 rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/40 px-4 py-5 flex flex-col items-center justify-center gap-2 min-h-[120px]">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) { handleUpload(f); e.target.value = '' }
              }}
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-bold shadow-md disabled:opacity-50"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? 'Analisando imagem com IA...' : 'Enviar imagem'}
            </button>
            <p className="text-[10px] text-slate-500 text-center max-w-md">
              PNG, JPG ou Webp até 8&nbsp;MB. A IA gera um <code className="text-violet-700 bg-violet-100 px-1 rounded">.json</code> com análise completa e contexto reutilizável nas próximas demandas.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 lg:justify-end">
            <select
              value={filterCat}
              onChange={(e) => setFilterCat(e.target.value)}
              className="text-xs rounded-xl border border-slate-200 bg-white px-3 py-2 font-medium text-slate-700"
            >
              <option value="">Todas as categorias</option>
              {REPO_CATEGORIAS.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
            <select
              value={filterPublico}
              onChange={(e) => setFilterPublico(e.target.value)}
              className="text-xs rounded-xl border border-slate-200 bg-white px-3 py-2 font-medium text-slate-700"
            >
              <option value="">Todo o público</option>
              <option value="diretor_arte">Diretor de Arte</option>
              <option value="designer">Designer (imagem)</option>
            </select>
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex items-center gap-2 text-slate-500 py-16 justify-center">
            <Loader2 className="w-5 h-5 animate-spin" /> Carregando repositório...
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-16 text-center">
            <ImageIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-600">Nenhuma referência neste filtro</p>
            <p className="text-xs text-slate-400 mt-1">Envie uma imagem ou limpe os filtros.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((item) => {
              const m = item.meta
              const pub = m?.publico ?? ['diretor_arte', 'designer']
              return (
                <article
                  key={item.id}
                  className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col"
                >
                  <div className="relative aspect-[4/3] bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.url} alt={item.nome} className="w-full h-full object-cover" />
                    <div className="absolute top-2 left-2 flex flex-wrap gap-1 max-w-[85%]">
                      <span className="text-[9px] font-bold uppercase tracking-wide bg-black/55 text-white px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Tag className="w-2.5 h-2.5" />
                        {catLabel(m?.categoria)}
                      </span>
                    </div>
                    <div className="absolute bottom-2 left-2 flex flex-wrap gap-1">
                      {pub.includes('diretor_arte') && (
                        <span className="text-[9px] font-bold bg-rose-500/90 text-white px-1.5 py-0.5 rounded">Diretor de Arte</span>
                      )}
                      {pub.includes('designer') && (
                        <span className="text-[9px] font-bold bg-amber-500/90 text-white px-1.5 py-0.5 rounded">Designer</span>
                      )}
                    </div>
                  </div>
                  <div className="p-4 flex-1 flex flex-col gap-2">
                    <p className="text-xs font-semibold text-slate-800 line-clamp-2" title={m?.linha_criativa}>
                      {m?.linha_criativa || 'Sem linha criativa — edite o cartão'}
                    </p>
                    <p className="text-[11px] text-slate-500 line-clamp-4 leading-relaxed flex-1">
                      {m?.descricao || 'Sem descrição — use “Reanalisar” ou edite manualmente.'}
                    </p>
                    {m?.contexto_proximas_criacoes && (
                      <p className="text-[10px] text-slate-600 line-clamp-3 leading-snug border-l-2 border-violet-200 pl-2">
                        <span className="font-bold text-violet-700">Próximas criações: </span>
                        {m.contexto_proximas_criacoes}
                      </p>
                    )}
                    {m?.palavras_chave && m.palavras_chave.length > 0 && (
                      <p className="text-[10px] text-violet-600 font-medium line-clamp-2">
                        {m.palavras_chave.map((k) => `#${k}`).join(' ')}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        disabled={analisandoId === item.id}
                        onClick={() => reanalisarComIa(item)}
                        className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 py-2 rounded-xl border border-violet-200 bg-violet-50/80 text-xs font-semibold text-violet-800 hover:bg-violet-100 disabled:opacity-50"
                        title="Regenerar todo o JSON com IA a partir da imagem"
                      >
                        {analisandoId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                        Reanalisar
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(item)}
                        className="flex-1 min-w-[100px] flex items-center justify-center gap-1.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Editar
                      </button>
                      <button
                        type="button"
                        disabled={deleteId === item.id}
                        onClick={() => handleDelete(item)}
                        className="px-3 py-2 rounded-xl border border-red-100 text-red-600 hover:bg-red-50 disabled:opacity-50"
                        title="Remover imagem e JSON"
                      >
                        {deleteId === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}

        {/* Modal edição */}
        {editing && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-6 bg-black/50" role="dialog">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-200">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <p className="text-sm font-bold text-slate-800">Editar referência</p>
                <button type="button" onClick={() => setEditing(null)} className="p-1 rounded-lg hover:bg-slate-100">
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Público (agentes)</p>
                  <div className="flex gap-2">
                    {(['diretor_arte', 'designer'] as const).map((p) => {
                      const active = (editForm.publico ?? ['diretor_arte', 'designer']).includes(p)
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => togglePublico(p)}
                          className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-bold border transition-colors ${
                            active
                              ? 'border-violet-500 bg-violet-50 text-violet-800'
                              : 'border-slate-200 text-slate-400'
                          }`}
                        >
                          {active && <Check className="w-3.5 h-3.5" />}
                          {p === 'diretor_arte' ? 'Diretor de Arte' : 'Designer'}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <label className="block space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Categoria</span>
                  <select
                    value={(editForm.categoria as string) ?? 'geral'}
                    onChange={(e) => setEditForm((f) => ({ ...f, categoria: e.target.value }))}
                    className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2"
                  >
                    {REPO_CATEGORIAS.map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Linha criativa (uma frase)</span>
                  <input
                    type="text"
                    value={editForm.linha_criativa ?? ''}
                    onChange={(e) => setEditForm((f) => ({ ...f, linha_criativa: e.target.value }))}
                    className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Descrição (análise da imagem)</span>
                  <textarea
                    value={editForm.descricao ?? ''}
                    onChange={(e) => setEditForm((f) => ({ ...f, descricao: e.target.value }))}
                    rows={5}
                    className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 resize-none"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Contexto para próximas criações</span>
                  <textarea
                    value={editForm.contexto_proximas_criacoes ?? ''}
                    onChange={(e) => setEditForm((f) => ({ ...f, contexto_proximas_criacoes: e.target.value }))}
                    rows={4}
                    placeholder="O que reutilizar nas próximas peças..."
                    className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 resize-none"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Briefing para IA / equipe</span>
                  <textarea
                    value={editForm.briefing_para_ia ?? ''}
                    onChange={(e) => setEditForm((f) => ({ ...f, briefing_para_ia: e.target.value }))}
                    rows={3}
                    className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 resize-none"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Palavras-chave (vírgula)</span>
                  <input
                    type="text"
                    value={Array.isArray(editForm.palavras_chave) ? editForm.palavras_chave.join(', ') : ''}
                    onChange={(e) => setEditForm((f) => ({ ...f, palavras_chave: e.target.value.split(',').map((s) => s.trim()) }))}
                    className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Elementos a manter (um por linha)</span>
                  <textarea
                    value={Array.isArray(editForm.elementos_manter) ? editForm.elementos_manter.join('\n') : ''}
                    onChange={(e) => setEditForm((f) => ({
                      ...f,
                      elementos_manter: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                    }))}
                    rows={3}
                    className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 resize-none font-mono"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Evitar (um por linha)</span>
                  <textarea
                    value={Array.isArray(editForm.evitar) ? editForm.evitar.join('\n') : ''}
                    onChange={(e) => setEditForm((f) => ({
                      ...f,
                      evitar: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                    }))}
                    rows={2}
                    className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 resize-none font-mono"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Prompt sugerido (inglês, modelos de imagem)</span>
                  <textarea
                    value={editForm.prompt_sugerido_en ?? ''}
                    onChange={(e) => setEditForm((f) => ({ ...f, prompt_sugerido_en: e.target.value }))}
                    rows={4}
                    className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 resize-none font-mono"
                  />
                </label>
              </div>
              <div className="flex gap-2 px-4 py-3 border-t border-slate-100 bg-slate-50/80">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={savingEdit}
                  onClick={saveEdit}
                  className="flex-1 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Salvar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageAccessGuard>
  )
}
