'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { createPortal } from 'react-dom'
import { useParams } from 'next/navigation'
import { adminFetchJson } from '@/lib/admin-client'
import { ANAMNESE_QUESTION_DEFS, normalizeAnamneseData, type RevisaoAnamneseFormData } from '@/lib/revisao-anamnese'
import {
  Loader2, RefreshCw, Search, X, FileText, User, Phone, Droplet, Users,
  UserCheck, Calendar, CheckCircle2, XCircle, AlertTriangle, ChevronRight,
  ClipboardList, BookOpen, BarChart2, Percent, Printer, ListChecks,
} from 'lucide-react'
import Link from 'next/link'
import { AdminPageHeader } from '@/app/admin/AdminPageHeader'
import Image from 'next/image'

/* ── Types ────────────────────────────────────────────── */

type AnamneseItem = {
  id: string
  registration_id: string
  event_id: string | null
  person_id: string | null
  form_data: RevisaoAnamneseFormData
  photo_url: string | null
  liability_accepted: boolean
  submitted_at: string | null
  created_at: string
  person: { id: string; full_name: string; mobile_phone: string | null; blood_type: string | null } | null
  event: { id: string; name: string; start_date: string } | null
}

/* ── Drawer ───────────────────────────────────────────── */

function AnamneseDrawer({ item, onClose }: { item: AnamneseItem; onClose: () => void }) {
  const data = normalizeAnamneseData(item.form_data)
  const displayName = data.name || item.person?.full_name || '—'
  const displayPhone = data.phone || item.person?.mobile_phone || '—'
  const displayBlood = data.bloodType || item.person?.blood_type || '—'
  const displayDate = item.submitted_at ? new Date(item.submitted_at).toLocaleString('pt-BR') : '—'
  const alertQuestions = ANAMNESE_QUESTION_DEFS.filter(q => data.questions[q.key]?.answer === 'sim')

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-2xl bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
        <div className="sticky top-0 z-10 bg-white border-b border-slate-100 flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
              <FileText className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">{displayName}</h2>
              <p className="text-xs text-slate-400">{displayDate}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {(data.photoUrl || item.photo_url) && (
            <div className="flex justify-center">
              <div className="relative w-32 h-32 rounded-2xl overflow-hidden border-4 border-purple-100 shadow-md">
                <Image src={data.photoUrl || item.photo_url!} alt={displayName} fill className="object-cover" />
              </div>
            </div>
          )}

          {alertQuestions.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-800 mb-1">Atenção — respostas positivas</p>
                <ul className="space-y-0.5">
                  {alertQuestions.map(q => (
                    <li key={q.key} className="text-xs text-amber-700">
                      • {q.title.replace(/^\d+\)\s*/, '')}
                      {data.questions[q.key]?.detail && <span> – {data.questions[q.key].detail}</span>}
                      {'scheduleLabel' in q && data.questions[q.key]?.schedule && (
                        <span> (horário: {data.questions[q.key].schedule})</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <section className="space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-1">Dados Pessoais</h3>
            <div className="grid grid-cols-2 gap-3">
              <InfoRow icon={User} label="Nome" value={displayName} />
              <InfoRow icon={Phone} label="Telefone" value={displayPhone} />
              <InfoRow icon={Droplet} label="Tipo Sanguíneo" value={displayBlood} />
              <InfoRow icon={Users} label="Equipe" value={data.team || '—'} />
              <InfoRow icon={UserCheck} label="Líder" value={data.leader || '—'} />
              <InfoRow
                icon={BookOpen}
                label="Pré-Revisão"
                value={data.preReviewCompleted === 'sim' ? 'Concluiu' : data.preReviewCompleted === 'nao' ? 'Não concluiu' : '—'}
                valueClassName={data.preReviewCompleted === 'sim' ? 'text-emerald-600 font-semibold' : data.preReviewCompleted === 'nao' ? 'text-rose-600 font-semibold' : ''}
              />
            </div>
            {data.observacoes && (
              <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
                <p className="text-xs font-semibold text-slate-500 mb-1">Observações</p>
                <p className="text-sm text-slate-700 whitespace-pre-line">{data.observacoes}</p>
              </div>
            )}
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-1">Questionário Clínico</h3>
            <div className="space-y-1.5">
              {ANAMNESE_QUESTION_DEFS.map(q => {
                const ans = data.questions[q.key]
                const isSim = ans?.answer === 'sim'
                return (
                  <div key={q.key} className={`rounded-xl border px-4 py-3 ${isSim ? 'border-amber-200 bg-amber-50' : 'border-slate-100 bg-white'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-slate-700 flex-1">{q.title}</p>
                      <span className={`shrink-0 text-xs font-bold px-2.5 py-0.5 rounded-full ${isSim ? 'bg-amber-100 text-amber-700' : ans?.answer === 'nao' ? 'bg-slate-100 text-slate-500' : 'bg-slate-50 text-slate-400'}`}>
                        {ans?.answer === 'sim' ? 'Sim' : ans?.answer === 'nao' ? 'Não' : '—'}
                      </span>
                    </div>
                    {isSim && ans?.detail && (
                      <p className="mt-1.5 text-xs text-amber-700 bg-amber-100 rounded-lg px-2.5 py-1.5">
                        {'detailLabel' in q && q.detailLabel ? `${q.detailLabel} ` : ''}{ans.detail}
                      </p>
                    )}
                    {isSim && 'scheduleLabel' in q && ans?.schedule && (
                      <p className="mt-1 text-xs text-amber-700">⏰ Horário: {ans.schedule}</p>
                    )}
                  </div>
                )
              })}
            </div>
          </section>

          <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />Enviado em {displayDate}</div>
            {item.liability_accepted && (
              <div className="flex items-center gap-1 text-emerald-500">
                <CheckCircle2 className="w-3.5 h-3.5" />Responsabilidade confirmada
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ icon: Icon, label, value, valueClassName = '' }: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  valueClassName?: string
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider leading-none mb-0.5">{label}</p>
        <p className={`text-sm text-slate-700 ${valueClassName}`}>{value}</p>
      </div>
    </div>
  )
}

/* ── Report ───────────────────────────────────────────── */

function ReportSection({ anamneses, totalRegs }: { anamneses: AnamneseItem[]; totalRegs: number }) {
  const total = anamneses.length
  if (total === 0) return null

  // Blood type distribution
  const bloodMap: Record<string, number> = {}
  anamneses.forEach(a => {
    const bt = normalizeAnamneseData(a.form_data).bloodType || a.person?.blood_type || 'Não informado'
    bloodMap[bt] = (bloodMap[bt] ?? 0) + 1
  })
  const bloodEntries = Object.entries(bloodMap).sort((a, b) => b[1] - a[1])
  const maxBlood = bloodEntries[0]?.[1] ?? 1

  // Pre-revisão
  const preRevisaoSim = anamneses.filter(a => normalizeAnamneseData(a.form_data).preReviewCompleted === 'sim').length
  const preRevisaoNao = anamneses.filter(a => normalizeAnamneseData(a.form_data).preReviewCompleted === 'nao').length

  // Questions summary — sorted by most "sim"
  const questionCounts = ANAMNESE_QUESTION_DEFS.map(q => ({
    key: q.key,
    title: q.title,
    simCount: anamneses.filter(a => normalizeAnamneseData(a.form_data).questions[q.key]?.answer === 'sim').length,
  })).filter(q => q.simCount > 0).sort((a, b) => b.simCount - a.simCount)

  // Participants with alerts
  const withAlerts = anamneses.filter(a =>
    ANAMNESE_QUESTION_DEFS.some(q => normalizeAnamneseData(a.form_data).questions[q.key]?.answer === 'sim')
  )

  const completionPct = totalRegs > 0 ? Math.round((total / totalRegs) * 100) : 0

  return (
    <div className="space-y-4 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
        <BarChart2 className="w-4 h-4 text-purple-500" />
        <h2 className="text-sm font-bold text-slate-700">Relatório Consolidado</h2>
      </div>

      <div className="px-5 pb-5 space-y-6">
        {/* Resumo */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Inscrições" value={totalRegs} color="text-slate-700" bg="bg-slate-50" border="border-slate-200" />
          <StatCard
            label={`Anamneses (${completionPct}%)`}
            value={total}
            color="text-purple-700"
            bg="bg-purple-50"
            border="border-purple-200"
          />
          <StatCard
            label="Pré-Revisão ✓"
            value={preRevisaoSim}
            color="text-emerald-700"
            bg="bg-emerald-50"
            border="border-emerald-200"
          />
          <StatCard
            label="Com alertas"
            value={withAlerts.length}
            color="text-amber-700"
            bg="bg-amber-50"
            border="border-amber-200"
          />
        </div>

        {/* Pré-revisão barra */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pré-Revisão</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden flex">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: total > 0 ? `${(preRevisaoSim / total) * 100}%` : '0%' }}
              />
              <div
                className="h-full bg-rose-400 transition-all"
                style={{ width: total > 0 ? `${(preRevisaoNao / total) * 100}%` : '0%' }}
              />
            </div>
            <div className="text-xs text-slate-500 shrink-0 flex gap-3">
              <span className="text-emerald-600 font-semibold">{preRevisaoSim} ✓</span>
              <span className="text-rose-500 font-semibold">{preRevisaoNao} ✗</span>
            </div>
          </div>
        </div>

        {/* Tipos sanguíneos */}
        {bloodEntries.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tipos Sanguíneos</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {bloodEntries.map(([bt, count]) => (
                <div key={bt} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 font-semibold text-slate-700">
                      <Droplet className="w-3 h-3 text-red-400" />{bt}
                    </span>
                    <span className="text-slate-400">{count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-red-400 transition-all"
                      style={{ width: `${(count / maxBlood) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Perguntas com mais "Sim" */}
        {questionCounts.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Questões com respostas "Sim" ({questionCounts.length} de {ANAMNESE_QUESTION_DEFS.length})
            </p>
            <div className="space-y-1.5">
              {questionCounts.map(q => (
                <div key={q.key} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-600 truncate">{q.title.replace(/^\d+\)\s*/, '')}</p>
                    <div className="h-1.5 rounded-full bg-slate-100 mt-1 overflow-hidden">
                      <div
                        className="h-full bg-amber-400 transition-all"
                        style={{ width: `${(q.simCount / total) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="shrink-0 text-xs font-bold text-amber-700 w-8 text-right">{q.simCount}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Participantes com alertas */}
        {withAlerts.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Participantes com atenção ({withAlerts.length})
            </p>
            <div className="space-y-1.5">
              {withAlerts.map(a => {
                const fd = normalizeAnamneseData(a.form_data)
                const name = fd.name || a.person?.full_name || '—'
                const positives = ANAMNESE_QUESTION_DEFS
                  .filter(q => fd.questions[q.key]?.answer === 'sim')
                  .map(q => q.title.replace(/^\d+\)\s*/, ''))
                return (
                  <div key={a.id} className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <p className="text-sm font-semibold text-amber-900">{name}</p>
                      {(fd.bloodType || a.person?.blood_type) && (
                        <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-bold rounded-full px-2 py-0.5 bg-red-50 text-red-600 border border-red-100">
                          <Droplet className="w-2.5 h-2.5" />
                          {fd.bloodType || a.person?.blood_type}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-amber-700">{positives.join(' • ')}</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, color, bg, border }: {
  label: string; value: number; color: string; bg: string; border: string
}) {
  return (
    <div className={`rounded-xl border ${border} ${bg} p-3 text-center`}>
      <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
      <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-tight">{label}</p>
    </div>
  )
}

/* ── PDF Print Views ──────────────────────────────────── */

function PrintConsolidatedReport({ anamneses, totalRegs, eventName }: {
  anamneses: AnamneseItem[]; totalRegs: number; eventName: string
}) {
  const total = anamneses.length
  const completionPct = totalRegs > 0 ? Math.round((total / totalRegs) * 100) : 0

  const bloodMap: Record<string, number> = {}
  anamneses.forEach(a => {
    const bt = normalizeAnamneseData(a.form_data).bloodType || a.person?.blood_type || 'Não informado'
    bloodMap[bt] = (bloodMap[bt] ?? 0) + 1
  })
  const bloodEntries = Object.entries(bloodMap).sort((a, b) => b[1] - a[1])

  const preRevisaoSim = anamneses.filter(a => normalizeAnamneseData(a.form_data).preReviewCompleted === 'sim').length
  const preRevisaoNao = anamneses.filter(a => normalizeAnamneseData(a.form_data).preReviewCompleted === 'nao').length

  const questionCounts = ANAMNESE_QUESTION_DEFS.map(q => ({
    key: q.key,
    title: q.title,
    simCount: anamneses.filter(a => normalizeAnamneseData(a.form_data).questions[q.key]?.answer === 'sim').length,
  })).sort((a, b) => b.simCount - a.simCount)

  const withAlerts = anamneses.filter(a =>
    ANAMNESE_QUESTION_DEFS.some(q => normalizeAnamneseData(a.form_data).questions[q.key]?.answer === 'sim')
  )

  const genDate = new Date().toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'short' })

  return (
    <div className="font-sans text-slate-800 text-sm">
      {/* Cabeçalho */}
      <div className="text-center border-b-2 border-slate-800 pb-5 mb-6">
        <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">Sara Sede Alagoas — Revisão de Vidas</p>
        <h1 className="text-xl font-extrabold text-slate-900">Relatório Consolidado de Anamneses</h1>
        <p className="text-base font-semibold text-slate-600 mt-1">{eventName}</p>
        <p className="text-[11px] text-slate-400 mt-1">Gerado em {genDate}</p>
      </div>

      {/* Resumo estatístico */}
      <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 border-b border-slate-200 pb-1">Resumo Estatístico</h2>
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total de Inscrições', value: totalRegs, hex: '#475569' },
          { label: `Anamneses Preenchidas (${completionPct}%)`, value: total, hex: '#7c3aed' },
          { label: 'Pré-Revisão Concluída', value: preRevisaoSim, hex: '#059669' },
          { label: 'Participantes c/ Alertas', value: withAlerts.length, hex: '#d97706' },
        ].map(s => (
          <div key={s.label} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 8px', textAlign: 'center' }}>
            <p style={{ fontSize: 24, fontWeight: 800, color: s.hex, lineHeight: 1.1 }}>{s.value}</p>
            <p style={{ fontSize: 10, color: '#64748b', marginTop: 3 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Pré-Revisão */}
      <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 border-b border-slate-200 pb-1">Análise Pré-Revisão</h2>
      <div className="mb-5">
        <div className="flex gap-4 mb-2">
          <span className="text-xs font-semibold text-emerald-700">✓ Concluiu: {preRevisaoSim}</span>
          <span className="text-xs font-semibold text-rose-600">✗ Não concluiu: {preRevisaoNao}</span>
          <span className="text-xs text-slate-400">Sem resposta: {total - preRevisaoSim - preRevisaoNao}</span>
        </div>
        {total > 0 && (
          <div style={{ height: 10, borderRadius: 99, backgroundColor: '#f1f5f9', overflow: 'hidden', display: 'flex' }}>
            <div style={{ height: '100%', width: `${(preRevisaoSim / total) * 100}%`, backgroundColor: '#10b981' }} />
            <div style={{ height: '100%', width: `${(preRevisaoNao / total) * 100}%`, backgroundColor: '#f43f5e' }} />
          </div>
        )}
      </div>

      {/* Tipos sanguíneos */}
      {bloodEntries.length > 0 && (
        <>
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 border-b border-slate-200 pb-1">Distribuição de Tipos Sanguíneos</h2>
          <div className="grid grid-cols-4 gap-2 mb-5">
            {bloodEntries.map(([bt, count]) => (
              <div key={bt} style={{ border: '1px solid #fecaca', borderRadius: 8, padding: '6px 10px', backgroundColor: '#fff1f2' }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#b91c1c' }}>{bt}</p>
                <p style={{ fontSize: 11, color: '#64748b' }}>{count} participante{count !== 1 ? 's' : ''}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Questões */}
      <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 border-b border-slate-200 pb-1">Questionário Clínico — Frequência de Respostas "Sim"</h2>
      <div className="mb-5 space-y-1.5">
        {questionCounts.map(q => (
          <div key={q.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <p style={{ flex: 1, fontSize: 11, color: '#334155', minWidth: 0 }}>{q.title.replace(/^\d+\)\s*/, '')}</p>
            <div style={{ width: 80, height: 6, borderRadius: 99, backgroundColor: '#f1f5f9', overflow: 'hidden', flexShrink: 0 }}>
              {total > 0 && (
                <div style={{ height: '100%', width: `${(q.simCount / total) * 100}%`, backgroundColor: q.simCount > 0 ? '#f59e0b' : '#e2e8f0' }} />
              )}
            </div>
            <span style={{ width: 28, textAlign: 'right', fontSize: 11, fontWeight: 700, color: q.simCount > 0 ? '#b45309' : '#94a3b8', flexShrink: 0 }}>
              {q.simCount}
            </span>
            <span style={{ width: 28, textAlign: 'right', fontSize: 10, color: '#94a3b8', flexShrink: 0 }}>
              {total > 0 ? `${Math.round((q.simCount / total) * 100)}%` : '—'}
            </span>
          </div>
        ))}
      </div>

      {/* Participantes com alertas */}
      {withAlerts.length > 0 && (
        <>
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 border-b border-slate-200 pb-1">
            Participantes que Requerem Atenção ({withAlerts.length})
          </h2>
          <div className="space-y-2">
            {withAlerts.map(a => {
              const fd = normalizeAnamneseData(a.form_data)
              const name = fd.name || a.person?.full_name || '—'
              const blood = fd.bloodType || a.person?.blood_type
              const positives = ANAMNESE_QUESTION_DEFS.filter(q => fd.questions[q.key]?.answer === 'sim')
              return (
                <div key={a.id} style={{ border: '1px solid #fcd34d', borderRadius: 8, backgroundColor: '#fffbeb', padding: '8px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#92400e' }}>{name}</span>
                    {blood && <span style={{ fontSize: 10, fontWeight: 700, color: '#b91c1c', backgroundColor: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 99, padding: '1px 7px' }}>{blood}</span>}
                    <span style={{ fontSize: 10, color: '#b45309', marginLeft: 'auto' }}>{fd.team || ''} {fd.leader ? `· Líder: ${fd.leader}` : ''}</span>
                  </div>
                  <div className="space-y-0.5">
                    {positives.map(q => (
                      <p key={q.key} style={{ fontSize: 10, color: '#92400e' }}>
                        • {q.title.replace(/^\d+\)\s*/, '')}
                        {fd.questions[q.key]?.detail && <span style={{ color: '#b45309' }}> — {fd.questions[q.key].detail}</span>}
                        {'scheduleLabel' in q && fd.questions[q.key]?.schedule && <span style={{ color: '#b45309' }}> (horário: {fd.questions[q.key].schedule})</span>}
                      </p>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Rodapé */}
      <div style={{ borderTop: '1px solid #e2e8f0', marginTop: 24, paddingTop: 12, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, color: '#94a3b8' }}>Sara Sede Alagoas — Plataforma de Gestão</span>
        <span style={{ fontSize: 10, color: '#94a3b8' }}>Total de anamneses: {total} / {totalRegs}</span>
      </div>
    </div>
  )
}

function PrintDetailedReport({ anamneses, eventName }: {
  anamneses: AnamneseItem[]; eventName: string
}) {
  const genDate = new Date().toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'short' })

  return (
    <div className="font-sans text-slate-800 text-sm">
      {/* Cabeçalho */}
      <div className="text-center border-b-2 border-slate-800 pb-5 mb-6">
        <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">Sara Sede Alagoas — Revisão de Vidas</p>
        <h1 className="text-xl font-extrabold text-slate-900">Registros Detalhados de Anamneses</h1>
        <p className="text-base font-semibold text-slate-600 mt-1">{eventName}</p>
        <p className="text-[11px] text-slate-400 mt-1">Gerado em {genDate} · {anamneses.length} registros</p>
      </div>

      {/* Registros */}
      <div className="space-y-6">
        {anamneses.map((item, idx) => {
          const data = normalizeAnamneseData(item.form_data)
          const name = data.name || item.person?.full_name || '—'
          const phone = data.phone || item.person?.mobile_phone || '—'
          const blood = data.bloodType || item.person?.blood_type || '—'
          const alertQuestions = ANAMNESE_QUESTION_DEFS.filter(q => data.questions[q.key]?.answer === 'sim')
          const submittedAt = item.submitted_at ? new Date(item.submitted_at).toLocaleString('pt-BR') : '—'

          return (
            <div key={item.id} style={{ border: '1px solid #cbd5e1', borderRadius: 10, overflow: 'hidden', pageBreakInside: 'avoid' }}>
              {/* Header do card */}
              <div style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', backgroundColor: '#e2e8f0', borderRadius: 99, padding: '2px 8px' }}>#{idx + 1}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{name}</span>
                  {alertQuestions.length > 0 && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#b45309', backgroundColor: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 99, padding: '2px 8px' }}>
                      ⚠ {alertQuestions.length} alerta{alertQuestions.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: 10, color: '#94a3b8' }}>Enviado: {submittedAt}</span>
              </div>

              <div style={{ padding: '10px 14px' }}>
                {/* Dados pessoais */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 10 }}>
                  <div>
                    <p style={{ fontSize: 9, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Telefone</p>
                    <p style={{ fontSize: 12, color: '#334155' }}>{phone}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 9, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Tipo Sanguíneo</p>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#b91c1c' }}>{blood}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 9, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Pré-Revisão</p>
                    <p style={{ fontSize: 12, fontWeight: 600, color: data.preReviewCompleted === 'sim' ? '#059669' : data.preReviewCompleted === 'nao' ? '#e11d48' : '#94a3b8' }}>
                      {data.preReviewCompleted === 'sim' ? '✓ Concluiu' : data.preReviewCompleted === 'nao' ? '✗ Não concluiu' : '—'}
                    </p>
                  </div>
                  {data.team && (
                    <div>
                      <p style={{ fontSize: 9, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Equipe</p>
                      <p style={{ fontSize: 12, color: '#334155' }}>{data.team}</p>
                    </div>
                  )}
                  {data.leader && (
                    <div>
                      <p style={{ fontSize: 9, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Líder</p>
                      <p style={{ fontSize: 12, color: '#334155' }}>{data.leader}</p>
                    </div>
                  )}
                </div>

                {/* Questionário */}
                <p style={{ fontSize: 9, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, borderBottom: '1px solid #f1f5f9', paddingBottom: 3 }}>Questionário Clínico</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 3, marginBottom: 8 }}>
                  {ANAMNESE_QUESTION_DEFS.map(q => {
                    const ans = data.questions[q.key]
                    const isSim = ans?.answer === 'sim'
                    return (
                      <div key={q.key} style={{ border: `1px solid ${isSim ? '#fcd34d' : '#f1f5f9'}`, borderRadius: 6, padding: '4px 8px', backgroundColor: isSim ? '#fffbeb' : '#fafafa' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4 }}>
                          <p style={{ fontSize: 10, color: '#475569', flex: 1, lineHeight: 1.3 }}>{q.title.replace(/^\d+\)\s*/, '')}</p>
                          <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 99, backgroundColor: isSim ? '#fef3c7' : '#f1f5f9', color: isSim ? '#b45309' : '#94a3b8', flexShrink: 0, whiteSpace: 'nowrap' }}>
                            {ans?.answer === 'sim' ? 'Sim' : ans?.answer === 'nao' ? 'Não' : '—'}
                          </span>
                        </div>
                        {isSim && ans?.detail && (
                          <p style={{ fontSize: 9, color: '#b45309', marginTop: 2 }}>{'detailLabel' in q && q.detailLabel ? `${q.detailLabel} ` : ''}{ans.detail}</p>
                        )}
                        {isSim && 'scheduleLabel' in q && ans?.schedule && (
                          <p style={{ fontSize: 9, color: '#b45309', marginTop: 1 }}>⏰ {ans.schedule}</p>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Observações */}
                {data.observacoes && (
                  <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '6px 10px' }}>
                    <p style={{ fontSize: 9, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Observações</p>
                    <p style={{ fontSize: 11, color: '#475569', whiteSpace: 'pre-line' }}>{data.observacoes}</p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Rodapé */}
      <div style={{ borderTop: '1px solid #e2e8f0', marginTop: 24, paddingTop: 12, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, color: '#94a3b8' }}>Sara Sede Alagoas — Plataforma de Gestão</span>
        <span style={{ fontSize: 10, color: '#94a3b8' }}>{anamneses.length} registro{anamneses.length !== 1 ? 's' : ''}</span>
      </div>
    </div>
  )
}

/* ── Page ─────────────────────────────────────────────── */

export default function EventAnamnesePage() {
  return (
    <Suspense fallback={null}>
      <EventAnamneseInner />
    </Suspense>
  )
}

function EventAnamneseInner() {
  const params = useParams<{ id: string }>()
  const eventId = params?.id ?? ''

  const [anamneses, setAnamneses] = useState<AnamneseItem[]>([])
  const [totalRegs, setTotalRegs] = useState(0)
  const [eventName, setEventName] = useState('')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'lista' | 'relatorio'>('relatorio')
  const [selected, setSelected] = useState<AnamneseItem | null>(null)
  const [printView, setPrintView] = useState<'none' | 'consolidated' | 'detailed'>('none')

  function handlePrint() {
    setTimeout(() => window.print(), 300)
  }

  const [debouncedSearch, setDebouncedSearch] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const load = useCallback(async () => {
    if (!eventId) return
    setLoading(true)
    try {
      const [aData, rData, evData] = await Promise.all([
        adminFetchJson<{ anamneses: AnamneseItem[] }>(`/api/admin/consolidacao/revisao/anamneses?event_id=${eventId}`),
        adminFetchJson<{ registrations: any[] }>(`/api/admin/consolidacao/revisao/registrations?event_id=${eventId}`),
        adminFetchJson<{ event: { name: string } }>(`/api/admin/consolidacao/revisao/events/${eventId}`),
      ])
      setAnamneses(aData.anamneses ?? [])
      setTotalRegs((rData.registrations ?? []).length)
      setEventName(evData.event?.name ?? 'Revisão de Vidas')
    } catch {
      setAnamneses([])
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => { load() }, [load])

  const hasAlerts = (item: AnamneseItem) =>
    ANAMNESE_QUESTION_DEFS.some(q => normalizeAnamneseData(item.form_data).questions[q.key]?.answer === 'sim')

  const filtered = debouncedSearch
    ? anamneses.filter(a => {
        const name = normalizeAnamneseData(a.form_data).name || a.person?.full_name || ''
        return name.toLowerCase().includes(debouncedSearch.toLowerCase())
      })
    : anamneses

  return (
    <div className="p-6 md:p-8 space-y-6">
      <AdminPageHeader
        icon={ClipboardList}
        title="Anamneses"
        subtitle={eventName}
        backLink={{ href: `/admin/revisao-vidas/${eventId}`, label: 'Voltar ao evento' }}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setPrintView('consolidated'); handlePrint() }}
              disabled={loading || anamneses.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:text-[#c62737] hover:border-[#c62737]/30 hover:bg-red-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              title="Relatório consolidado em PDF (A4)"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">PDF Relatório</span>
            </button>
            <button
              onClick={() => { setPrintView('detailed'); handlePrint() }}
              disabled={loading || anamneses.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:text-[#c62737] hover:border-[#c62737]/30 hover:bg-red-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              title="Todos os registros detalhados em PDF (A4)"
            >
              <ListChecks className="w-4 h-4" />
              <span className="hidden sm:inline">PDF Detalhado</span>
            </button>
            <button
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:text-purple-600 hover:border-purple-200 hover:bg-purple-50 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex bg-slate-100 rounded-xl p-1 w-fit gap-1">
        {([
          { key: 'relatorio', label: 'Relatório', icon: BarChart2 },
          { key: 'lista', label: 'Lista', icon: FileText },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === key
                ? 'bg-white text-purple-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 gap-2 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Carregando…</span>
        </div>
      ) : (
        <>
          {/* Relatório */}
          {tab === 'relatorio' && (
            <ReportSection anamneses={anamneses} totalRegs={totalRegs} />
          )}

          {/* Lista */}
          {tab === 'lista' && (
            <>
              {/* Busca */}
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar por nome…"
                  className="w-full rounded-xl border-2 border-slate-200 bg-white pl-9 pr-9 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-purple-400 transition-colors"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
                  <FileText className="w-12 h-12 text-purple-200" />
                  <p className="text-sm font-medium text-slate-500">
                    {anamneses.length === 0 ? 'Nenhuma anamnese preenchida ainda.' : 'Nenhum resultado encontrado.'}
                  </p>
                  {search && (
                    <button onClick={() => setSearch('')} className="text-xs text-purple-600 font-semibold hover:underline">
                      Limpar busca
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* Mobile */}
                  <div className="md:hidden space-y-3">
                    {filtered.map(a => {
                      const data = normalizeAnamneseData(a.form_data)
                      const name = data.name || a.person?.full_name || '—'
                      const alert = hasAlerts(a)
                      return (
                        <button
                          key={a.id}
                          onClick={() => setSelected(a)}
                          className="w-full text-left bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-start gap-3 hover:border-purple-200 hover:shadow-md transition-all active:scale-[0.99]"
                        >
                          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center shrink-0 overflow-hidden">
                            {(data.photoUrl || a.photo_url) ? (
                              <div className="relative w-10 h-10">
                                <Image src={data.photoUrl || a.photo_url!} alt={name} fill className="object-cover" />
                              </div>
                            ) : (
                              <User className="w-5 h-5 text-purple-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-slate-800 text-sm truncate">{name}</p>
                              {alert && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                            </div>
                            <p className="text-xs text-slate-500">{a.person?.mobile_phone ?? data.phone ?? '—'}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {(data.bloodType || a.person?.blood_type) && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold rounded-full px-2 py-0.5 bg-red-50 text-red-600 border border-red-100">
                                  <Droplet className="w-2.5 h-2.5" />{data.bloodType || a.person?.blood_type}
                                </span>
                              )}
                              {data.preReviewCompleted === 'sim' && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold rounded-full px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100">
                                  <CheckCircle2 className="w-2.5 h-2.5" /> Pré-revisão ✓
                                </span>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 mt-1" />
                        </button>
                      )
                    })}
                  </div>

                  {/* Desktop */}
                  <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/60 text-xs font-semibold uppercase tracking-wider text-slate-500">
                          <th className="px-5 py-3 text-left">Participante</th>
                          <th className="px-5 py-3 text-center">Tipo Sang.</th>
                          <th className="px-5 py-3 text-center">Pré-Revisão</th>
                          <th className="px-5 py-3 text-center">Alertas</th>
                          <th className="px-5 py-3 text-left">Enviado em</th>
                          <th className="px-5 py-3 text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filtered.map(a => {
                          const data = normalizeAnamneseData(a.form_data)
                          const name = data.name || a.person?.full_name || '—'
                          const phone = data.phone || a.person?.mobile_phone || null
                          const blood = data.bloodType || a.person?.blood_type || null
                          const alert = hasAlerts(a)
                          const alertCount = ANAMNESE_QUESTION_DEFS.filter(q => data.questions[q.key]?.answer === 'sim').length
                          return (
                            <tr
                              key={a.id}
                              className="hover:bg-purple-50/30 transition-colors cursor-pointer"
                              onClick={() => setSelected(a)}
                            >
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-lg bg-purple-50 overflow-hidden flex items-center justify-center shrink-0">
                                    {(data.photoUrl || a.photo_url) ? (
                                      <div className="relative w-8 h-8">
                                        <Image src={data.photoUrl || a.photo_url!} alt={name} fill className="object-cover" />
                                      </div>
                                    ) : (
                                      <User className="w-4 h-4 text-purple-300" />
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-slate-800">{name}</p>
                                    {phone && <p className="text-xs text-slate-400">{phone}</p>}
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-3.5 text-center">
                                {blood ? (
                                  <span className="inline-flex items-center gap-1 text-xs font-bold rounded-full px-2.5 py-1 bg-red-50 text-red-600 border border-red-100">
                                    <Droplet className="w-3 h-3" />{blood}
                                  </span>
                                ) : <span className="text-slate-300">—</span>}
                              </td>
                              <td className="px-5 py-3.5 text-center">
                                {data.preReviewCompleted === 'sim' ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                                ) : data.preReviewCompleted === 'nao' ? (
                                  <XCircle className="w-4 h-4 text-rose-400 mx-auto" />
                                ) : (
                                  <span className="text-slate-300">—</span>
                                )}
                              </td>
                              <td className="px-5 py-3.5 text-center">
                                {alert ? (
                                  <span className="inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2.5 py-1 bg-amber-50 text-amber-600 border border-amber-200">
                                    <AlertTriangle className="w-3 h-3" />{alertCount}
                                  </span>
                                ) : (
                                  <CheckCircle2 className="w-4 h-4 text-slate-200 mx-auto" />
                                )}
                              </td>
                              <td className="px-5 py-3.5 text-slate-500 text-xs">
                                {a.submitted_at
                                  ? new Date(a.submitted_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
                                  : '—'}
                              </td>
                              <td className="px-5 py-3.5 text-right">
                                <button
                                  onClick={e => { e.stopPropagation(); setSelected(a) }}
                                  className="inline-flex items-center gap-1 text-xs font-semibold rounded-xl px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition-colors"
                                >
                                  Ver <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}

      {selected && <AnamneseDrawer item={selected} onClose={() => setSelected(null)} />}

      {/* ── Overlay de impressão PDF ─────────────────────── */}
      {printView !== 'none' && createPortal(
        <div className="fixed inset-0 z-[200] bg-white overflow-auto" id="pdf-print-overlay">
          {/* Toolbar — oculta ao imprimir */}
          <div className="print-toolbar sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              {printView === 'consolidated' ? (
                <><Printer className="w-5 h-5 text-[#c62737]" /><span className="font-semibold text-slate-700 text-sm">PDF — Relatório Consolidado</span></>
              ) : (
                <><ListChecks className="w-5 h-5 text-[#c62737]" /><span className="font-semibold text-slate-700 text-sm">PDF — Registros Detalhados ({anamneses.length} registros)</span></>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2 bg-[#c62737] text-white text-sm font-semibold hover:bg-[#a81e2d] transition-colors shadow-sm"
              >
                <Printer className="w-4 h-4" />
                Imprimir / Salvar PDF
              </button>
              <button
                onClick={() => setPrintView('none')}
                className="inline-flex items-center gap-2 rounded-xl px-3 py-2 border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <X className="w-4 h-4" /> Fechar
              </button>
            </div>
          </div>

          {/* Conteúdo A4 */}
          <div className="mx-auto max-w-[210mm] min-h-[297mm] bg-white p-[15mm] print:max-w-none">
            {printView === 'consolidated' ? (
              <PrintConsolidatedReport anamneses={anamneses} totalRegs={totalRegs} eventName={eventName} />
            ) : (
              <PrintDetailedReport anamneses={anamneses} eventName={eventName} />
            )}
          </div>

          <style>{`
            @media print {
              @page { size: A4; margin: 0; }
              body > *:not(#pdf-print-overlay) { display: none !important; }
              #pdf-print-overlay {
                position: static !important;
                width: 100% !important;
                height: auto !important;
                overflow: visible !important;
                background: white;
              }
              #pdf-print-overlay .print-toolbar { display: none !important; }
            }
          `}</style>
        </div>,
        document.body
      )}
    </div>
  )
}
