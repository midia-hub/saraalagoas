/**
 * POST /api/admin/escalas/disparar-lembretes
 *
 * Disparo manual de lembretes de escala. Requer acesso admin à página 'escalas'.
 *
 * Body (JSON):
 *   kind?       : 'D3' | 'D1' | 'D0' | 'ALL'          (padrão: 'ALL')
 *   tipo?       : 'lembrete_3dias' | 'lembrete_1dia' | 'dia_da_escala'  (retrocompat.)
 *   targetDate? : 'YYYY-MM-DD'  — override da data alvo (aplica a todos os kinds)
 *   force?      : boolean       — limpa escalas_lembretes_log para reenviar
 *
 * Usa a mesma função central do cron (runScaleReminders), garantindo
 * idempotência por escalas_lembretes_log.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import {
  runScaleReminders,
  getLocalDateMaceio,
  KIND_TO_OFFSET,
  TIPO_LEGADO_TO_KIND,
  type TemplateKind,
} from '@/lib/escalas-lembretes'

export async function POST(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'escalas', action: 'edit' })
  if (!access.ok) return access.response

  const webhookUrl = process.env.DISPAROS_WEBHOOK_URL
  const webhookBearer = process.env.DISPAROS_WEBHOOK_BEARER
  if (!webhookUrl || !webhookBearer) {
    return NextResponse.json({ error: 'Webhook não configurado.' }, { status: 503 })
  }

  const body = await request.json().catch(() => ({}))
  const {
    kind: kindParam,
    tipo,           // retrocompat
    targetDate: bodyDate,
    force,
  } = body as {
    kind?: string
    tipo?: string
    targetDate?: string
    force?: boolean
  }

  // Determina quais kinds processar
  const rawKind = kindParam ?? (tipo ? TIPO_LEGADO_TO_KIND[tipo] : undefined)
  let kinds: TemplateKind[]

  if (!rawKind || rawKind === 'ALL') {
    kinds = ['D3', 'D1', 'D0']
  } else if (['D3', 'D1', 'D0'].includes(rawKind)) {
    kinds = [rawKind as TemplateKind]
  } else if (TIPO_LEGADO_TO_KIND[rawKind]) {
    kinds = [TIPO_LEGADO_TO_KIND[rawKind]]
  } else {
    return NextResponse.json(
      {
        error:
          'kind inválido. Use: D3 | D1 | D0 | ALL' +
          '  (ou tipo: lembrete_3dias | lembrete_1dia | dia_da_escala)',
      },
      { status: 400 },
    )
  }

  // Override de data por kind
  const targetDates: Partial<Record<TemplateKind, string>> = {}
  if (bodyDate) {
    for (const k of kinds) targetDates[k] = bodyDate
  }

  const supabase = createSupabaseAdminClient(request)

  // force=true: remove entradas existentes em escalas_lembretes_log para esses kinds/datas
  // permitindo reenvio mesmo que o lembrete já tenha sido enviado
  if (force) {
    for (const k of kinds) {
      const td = targetDates[k] ?? getLocalDateMaceio(KIND_TO_OFFSET[k])
      await supabase
        .from('escalas_lembretes_log')
        .delete()
        .eq('evento_data', td)
        .eq('template_kind', k)
        .then(({ error }: any) => {
          if (error) console.error(`[disparar-lembretes] clear force kind=${k} date=${td}:`, error)
        })
    }
  }

  const results = await runScaleReminders(supabase, {
    kinds,
    targetDates: Object.keys(targetDates).length ? targetDates : undefined,
    source: 'escala-manual',
  })

  const totalEnviados = results.reduce((s, r) => s + r.enviados, 0)
  const totalErros = results.reduce((s, r) => s + r.erros, 0)
  const totalPulados = results.reduce((s, r) => s + r.pulados, 0)

  return NextResponse.json({
    ok: true,
    results,
    totalEnviados,
    totalErros,
    totalPulados,
  })
}

