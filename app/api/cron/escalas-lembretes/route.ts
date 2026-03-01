/**
 * GET /api/cron/escalas-lembretes
 *
 * Endpoint de cron para envio de lembretes de escalas.
 * Deve ser chamado diariamente às 17h05 (America/Maceio).
 * Configurado via Vercel Cron Jobs (vercel.json).
 *
 * Autenticação: CRON_SECRET via query param ?secret= ou header Authorization Bearer.
 *
 * Query params:
 *   secret / token : CRON_SECRET
 *   tipo           : 'lembrete_3dias' | 'lembrete_1dia' | 'dia_da_escala' | 'automatico'
 *                    (retrocompatibilidade — padrão: processa D3+D1+D0)
 *
 * Os lembretes são enviados por SLOT/EVENTO: cada voluntário recebe UMA mensagem
 * por culto/arena em que está escalado na data alvo.
 * Se está em 2 eventos no mesmo dia, recebe 2 mensagens separadas.
 *
 * Idempotência: escalas_lembretes_log garante que o mesmo lembrete
 * (slot + pessoa + kind) não seja reenviado. Linhas 'failed' podem ser
 * retentadas após 30 min.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  runScaleReminders,
  TIPO_LEGADO_TO_KIND,
  type TemplateKind,
} from '@/lib/escalas-lembretes'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const querySecret = searchParams.get('secret') || searchParams.get('token')
  const headerSecret = request.headers.get('authorization')?.replace('Bearer ', '')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && querySecret !== cronSecret && headerSecret !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const tipoParam = searchParams.get('tipo') as string | null

  // Retrocompatibilidade: aceita nomes antigos (lembrete_3dias, lembrete_1dia, dia_da_escala)
  if (tipoParam && tipoParam !== 'automatico') {
    const kind = TIPO_LEGADO_TO_KIND[tipoParam] as TemplateKind | undefined
    if (!kind) {
      return NextResponse.json(
        { error: 'Parâmetro tipo inválido. Use: lembrete_3dias | lembrete_1dia | dia_da_escala | automatico' },
        { status: 400 },
      )
    }
    const results = await runScaleReminders(supabase, {
      kinds: [kind],
      source: 'cron-escalas-lembretes',
    })
    return NextResponse.json({ ok: true, results })
  }

  // Modo automático (padrão): processa D3 + D1 + D0 em sequência
  const results = await runScaleReminders(supabase, {
    source: 'cron-escalas-lembretes',
  })

  return NextResponse.json({ ok: true, results })
}
