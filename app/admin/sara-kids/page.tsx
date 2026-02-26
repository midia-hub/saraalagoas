'use client'

import { useState, useEffect } from 'react'
import { Baby, Link2, Copy, Check, ExternalLink, Users, ArrowRight, QrCode, Heart } from 'lucide-react'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { adminFetchJson } from '@/lib/admin-client'
import Link from 'next/link'

interface KidsEntry {
  adult_id: string
  adult_name: string
  child_id: string
  child_name: string
  child_birth_date: string | null
  relationship_type: string
  created_at: string
}

export default function SaraKidsAdminPage() {
  const [copied, setCopied] = useState(false)
  const [entries, setEntries] = useState<KidsEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [publicUrl, setPublicUrl] = useState('')

  useEffect(() => {
    setPublicUrl(`${window.location.origin}/sara-kids`)
  }, [])

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const data = await adminFetchJson<{ entries: KidsEntry[] }>('/api/admin/sara-kids/list')
        setEntries(data.entries ?? [])
      } catch {
        // silently fail — the list is informative only
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function copyLink() {
    navigator.clipboard.writeText(publicUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function formatAge(birthDate: string | null): string {
    if (!birthDate) return '—'
    const [y, m, d] = birthDate.split('-').map(Number)
    const today = new Date()
    let age = today.getFullYear() - y
    if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age--
    if (age === 0) {
      const months = (today.getFullYear() - y) * 12 + (today.getMonth() + 1 - m)
      return `${months}m`
    }
    return `${age} anos`
  }

  function formatDate(iso: string) {
    const [y, m, d] = iso.substring(0, 10).split('-')
    return `${d}/${m}/${y}`
  }

  return (
    <PageAccessGuard pageKey="pessoas">
      <div className="p-6 md:p-8">
        {/* ── Cabeçalho ─────────────────────────────────────────── */}
        <div className="mb-8 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
            <Baby className="text-indigo-600" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Sara Kids</h1>
            <p className="text-slate-500">Cadastro de crianças e responsáveis</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* ── Link da ficha pública ──────────────────────────────── */}
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-6">
            <div className="flex items-center gap-2 mb-3">
              <Link2 size={18} className="text-indigo-600" />
              <h2 className="font-semibold text-slate-800">Ficha de Cadastro Pública</h2>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Compartilhe este link com os responsáveis para que preencham a ficha de cadastro das crianças.
            </p>
            {publicUrl && (
              <div className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-white px-3 py-2 mb-3">
                <span className="flex-1 truncate text-xs text-slate-700 font-mono">{publicUrl}</span>
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={copyLink}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
              >
                {copied ? <><Check size={14} /> Copiado!</> : <><Copy size={14} /> Copiar link</>}
              </button>
              {publicUrl && (
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-indigo-300 px-4 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
                >
                  <ExternalLink size={14} /> Abrir
                </a>
              )}
            </div>
          </div>

          {/* ── Acesso rápido ─────────────────────────────────────── */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 flex flex-col gap-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Users size={18} className="text-slate-600" />
                <h2 className="font-semibold text-slate-800">Gerenciar Cadastros</h2>
              </div>
              <p className="text-sm text-slate-600 mb-4">
                Visualize e edite os cadastros completos das crianças e responsáveis na seção de Pessoas.
              </p>
              <Link
                href="/admin/pessoas"
                className="flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition-colors w-fit"
              >
                Ir para Pessoas <ArrowRight size={14} />
              </Link>
            </div>
            <div className="border-t border-slate-100 pt-4">
              <div className="flex items-center gap-2 mb-3">
                <QrCode size={18} className="text-indigo-600" />
                <h2 className="font-semibold text-slate-800">Check-in de Culto</h2>
              </div>
              <p className="text-sm text-slate-600 mb-4">
                Registre a presença das crianças nos cultos do Sara Kids com hora de entrada e saída.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/admin/sara-kids/checkin"
                  className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors w-fit"
                >
                  <QrCode size={14} /> Fazer Check-in
                </Link>
                <Link
                  href="/admin/sara-kids/presentes"
                  className="flex items-center gap-2 rounded-lg bg-[#c62737] px-4 py-2 text-xs font-semibold text-white hover:bg-[#9e1f2e] transition-colors w-fit"
                >
                  <Heart size={14} /> Crianças no Culto
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ── Últimos cadastros ───────────────────────────────────── */}
        <div className="mt-8">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Cadastros Recentes</h2>

          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
              Carregando…
            </div>
          ) : entries.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <Baby size={32} className="text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Nenhum cadastro encontrado ainda.</p>
              <p className="text-xs text-slate-400 mt-1">Compartilhe o link da ficha pública para começar.</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Criança</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Idade</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Responsável</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Parentesco</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Data</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e, i) => (
                    <tr key={`${e.adult_id}-${e.child_id}`} className={i % 2 === 0 ? '' : 'bg-slate-50/50'}>
                      <td className="px-4 py-3 font-medium text-slate-800">{e.child_name}</td>
                      <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{formatAge(e.child_birth_date)}</td>
                      <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{e.adult_name}</td>
                      <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">{e.relationship_type}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{formatDate(e.created_at)}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/pessoas/${e.child_id}`}
                          className="text-xs text-indigo-600 hover:underline"
                        >
                          Ver
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PageAccessGuard>
  )
}
