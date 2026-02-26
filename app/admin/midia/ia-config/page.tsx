'use client'

import { useEffect, useState } from 'react'
import { Bot, Save, RotateCcw, Loader2, CheckCircle2, AlertCircle, Info } from 'lucide-react'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { AdminPageHeader } from '@/app/admin/AdminPageHeader'
import { adminFetchJson } from '@/lib/admin-client'

// ── Defaults (espelhados do código — são os valores iniciais do banco) ─────────
const DEFAULTS = {
  system_prompt: `Você é um especialista em comunicação digital para igrejas evangélicas brasileiras.
Escreva legendas autênticas, acolhedoras e que conectam fé com o cotidiano das pessoas.
Use linguagem natural do português brasileiro. NUNCA use títulos como "Legenda:" ou "Post:".
Entregue APENAS o texto final da legenda, sem explicações adicionais.

REGRAS OBRIGATÓRIAS — siga sem exceção:
1. DATAS: NUNCA escreva datas no formato "24 de fevereiro", "24/02" ou similares. Use sempre termos relativos fornecidos no contexto: "Ontem", "Domingo", "Sábado", "Na última terça", "No domingo passado" etc.
2. FOTOS/IMAGENS: NUNCA mencione fotos, registros fotográficos, cliques, imagens, álbuns ou galeria. Foque nas pessoas, emoções, no culto e no impacto espiritual. Use expressões como "pudemos ver como foi impactante", "as pessoas viveram um momento incrível", "essa foi a emoção do culto", "que noite de transformações".
3. TRECHO DA PALAVRA: Se o contexto incluir trecho bíblico ou da pregação, incorpore-o naturalmente e fielmente na legenda, sem alterar seu sentido — integre ao texto corrido como parte da narrativa.
4. FORMATAÇÃO: Estruture a legenda com quebras de linha entre frases e parágrafos. NUNCA entregue tudo em um bloco único. Cada ideia principal deve ter seu próprio parágrafo ou linha para facilitar a leitura.`,
  album_instructions: `IMPORTANTE: Este evento JÁ ACONTECEU. Estamos celebrando o que foi vivido.
- Escreva no passado/presente comemorativo ("Foi incrível", "Que momento", "Que noite", "Como foi lindo")
- Foque nas pessoas e no impacto espiritual — NUNCA nas fotos ou registros
- Use a data relativa fornecida no contexto ("No domingo", "Ontem", "Na última sexta") — NUNCA a data por extenso
- NÃO convide para algo futuro, NÃO use "venha", "não perca", "participe"
- Celebre o que aconteceu e agradeça quem esteve presente
- Convide quem vê a marcar quem estava lá`,
  standard_instructions: `- Se fizer sentido, termine com um convite ou chamada para ação
- NUNCA mencione fotos ou registros, foque nas pessoas e no impacto`,
}

type PromptKey = keyof typeof DEFAULTS

const FIELDS: Array<{ key: PromptKey; label: string; description: string; rows: number }> = [
  {
    key: 'system_prompt',
    label: 'Prompt do sistema',
    description: 'Instrução base enviada à IA em todas as requisições. Define o tom geral e as regras da geração.',
    rows: 6,
  },
  {
    key: 'album_instructions',
    label: 'Instruções para posts de álbum',
    description: 'Aplicadas quando a postagem é gerada a partir de fotos de um álbum (evento que já aconteceu).',
    rows: 7,
  },
  {
    key: 'standard_instructions',
    label: 'Instruções para posts avulsos',
    description: 'Aplicadas em postagens sem álbum vinculado (post new, imagem solta).',
    rows: 3,
  },
]

function IaConfigContent() {
  const [values, setValues]   = useState<Record<PromptKey, string>>({ ...DEFAULTS })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [toast, setToast]     = useState<{ type: 'ok' | 'err'; message: string } | null>(null)

  useEffect(() => {
    adminFetchJson<Record<string, string>>('/api/admin/ia-config')
      .then((data) => {
        setValues((prev) => ({
          system_prompt:        data.system_prompt        ?? prev.system_prompt,
          album_instructions:   data.album_instructions   ?? prev.album_instructions,
          standard_instructions: data.standard_instructions ?? prev.standard_instructions,
        }))
      })
      .catch(() => {/* mantém defaults */})
      .finally(() => setLoading(false))
  }, [])

  function handleChange(key: PromptKey, val: string) {
    setValues((prev) => ({ ...prev, [key]: val }))
  }

  function handleReset(key: PromptKey) {
    setValues((prev) => ({ ...prev, [key]: DEFAULTS[key] }))
  }

  async function handleSave() {
    setSaving(true)
    setToast(null)
    try {
      await adminFetchJson('/api/admin/ia-config', {
        method: 'PUT',
        body: JSON.stringify(values),
      })
      setToast({ type: 'ok', message: 'Prompts salvos com sucesso!' })
    } catch (e) {
      setToast({ type: 'err', message: e instanceof Error ? e.message : 'Erro ao salvar.' })
    } finally {
      setSaving(false)
      setTimeout(() => setToast(null), 4000)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Carregando configurações…
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Aviso */}
      <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <Info className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-amber-700 leading-relaxed">
          Estes prompts controlam o comportamento da geração de legendas com IA.
          Alterações entram em vigor imediatamente na próxima geração.
          Use o botão <strong>Restaurar padrão</strong> em cada campo para reverter ao texto original.
        </div>
      </div>

      {/* Campos */}
      {FIELDS.map(({ key, label, description, rows }) => {
        const isDirty = values[key] !== DEFAULTS[key]
        return (
          <div key={key} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-visible">
            {/* Header do card */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  {label}
                  {isDirty && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                      Modificado
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">{description}</p>
              </div>
              <button
                type="button"
                onClick={() => handleReset(key)}
                disabled={!isDirty}
                title="Restaurar padrão"
                className="flex-shrink-0 flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <RotateCcw className="h-3 w-3" />
                Restaurar padrão
              </button>
            </div>

            {/* Textarea */}
            <div className="px-5 py-4">
              <textarea
                value={values[key]}
                onChange={(e) => handleChange(key, e.target.value)}
                rows={rows}
                className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50/40 px-3.5 py-2.5 font-mono text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20 hover:border-slate-300 transition leading-relaxed"
                spellCheck={false}
              />
              <p className="mt-1 text-right text-[11px] text-slate-400">{values[key].length} caracteres</p>
            </div>
          </div>
        )
      })}

      {/* Ações */}
      <div className="flex items-center justify-between pt-2">
        {toast ? (
          <div className={`flex items-center gap-2 text-sm ${
            toast.type === 'ok' ? 'text-emerald-600' : 'text-red-600'
          }`}>
            {toast.type === 'ok'
              ? <CheckCircle2 className="h-4 w-4" />
              : <AlertCircle className="h-4 w-4" />
            }
            {toast.message}
          </div>
        ) : <div />}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-[#c62737] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#a81f2d] disabled:opacity-50 transition-colors shadow-sm"
        >
          {saving
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <Save className="h-4 w-4" />
          }
          {saving ? 'Salvando…' : 'Salvar prompts'}
        </button>
      </div>
    </div>
  )
}

export default function IaConfigPage() {
  return (
    <PageAccessGuard pageKey="instagram">
      <div className="p-6 md:p-8">
        <AdminPageHeader
          icon={Bot}
          title="Configuração de IA"
          subtitle="Edite os prompts usados para geração de legendas com Gemini e GPT."
        />
        <IaConfigContent />
      </div>
    </PageAccessGuard>
  )
}
