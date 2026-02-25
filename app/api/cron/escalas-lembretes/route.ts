import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import {
  sendDisparoRaw,
  getNomeExibicao,
  MESSAGE_ID_ESCALA_LEMBRETE_3,
  MESSAGE_ID_ESCALA_LEMBRETE_1,
  MESSAGE_ID_ESCALA_DIA,
} from '@/lib/disparos-webhook'
import { siteConfig } from '@/config/site'

/**
 * GET /api/cron/escalas-lembretes
 *
 * Deve ser chamada automaticamente via Vercel Cron ou agendador externo.
 * Sugestão de agenda (vercel.json):
 *   lembrete_3dias → todo dia às 08:30 BRT (11:30 UTC)
 *   lembrete_1dia  → todo dia às 08:00 BRT (11:00 UTC)
 *   dia_da_escala  → de hora em hora ou a cada 30 min (ex: 0 10-22 * * *)
 *                   para avisar 6h antes do início do culto.
 *
 * Query params:
 *   tipo  : 'lembrete_3dias' | 'lembrete_1dia' | 'dia_da_escala'  (obrigatório)
 *   secret: valor de CRON_SECRET env var         (proteção básica)
 */
export async function GET(request: NextRequest) {
  // Proteção: Vercel envia Authorization: Bearer <CRON_SECRET>
  // Também aceita ?secret= para testes manuais
  const { searchParams } = new URL(request.url)
  const querySecret  = searchParams.get('secret')
  const headerSecret = request.headers.get('authorization')?.replace('Bearer ', '')
  const cronSecret   = process.env.CRON_SECRET

  if (cronSecret && querySecret !== cronSecret && headerSecret !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tipo = searchParams.get('tipo') as 'lembrete_3dias' | 'lembrete_1dia' | 'dia_da_escala' | null

  if (!tipo || !['lembrete_3dias', 'lembrete_1dia', 'dia_da_escala'].includes(tipo)) {
    return NextResponse.json({ error: 'Parâmetro tipo inválido.' }, { status: 400 })
  }

  const webhookUrl    = process.env.DISPAROS_WEBHOOK_URL
  const webhookBearer = process.env.DISPAROS_WEBHOOK_BEARER
  if (!webhookUrl || !webhookBearer) {
    return NextResponse.json({ error: 'Webhook não configurado.' }, { status: 503 })
  }

  // Data alvo (BRT = UTC-3)
  function localDateStr(offsetDays = 0) {
    const d = new Date()
    d.setDate(d.getDate() + offsetDays)
    const brt = new Date(d.getTime() - 3 * 60 * 60 * 1000)
    return brt.toISOString().split('T')[0]
  }

  const offsets = {
    'lembrete_3dias': 3,
    'lembrete_1dia': 1,
    'dia_da_escala': 0
  }
  const targetDate = localDateStr(offsets[tipo])

  const MESSAGE_ID = {
    'lembrete_3dias': MESSAGE_ID_ESCALA_LEMBRETE_3,
    'lembrete_1dia': MESSAGE_ID_ESCALA_LEMBRETE_1,
    'dia_da_escala': MESSAGE_ID_ESCALA_DIA
  }[tipo]

  // Supabase: evita depender de cookies (cron não tem sessão)
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Todas as escalas publicadas cujo mês/ano contém o targetDate
  const [targetYear, targetMonth] = targetDate.split('-').map(Number)
  const { data: links } = await supabase
    .from('escalas_links')
    .select('id, token, ministry, month, year, church:churches(id, name)')
    .eq('month', targetMonth)
    .eq('year', targetYear)

  if (!links?.length) {
    return NextResponse.json({ ok: true, enviados: 0, aviso: `Nenhuma escala para ${targetDate}` })
  }

  const WEEKDAYS_PT = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado']
  function getDiaSemana(d: string) {
    const [y, m, day] = d.split('-').map(Number)
    return WEEKDAYS_PT[new Date(y, m - 1, day).getDay()]
  }
  function formatDateFullBr(d: string) {
    const [y, m, day] = d.split('-')
    return `${day}/${m}/${y}`
  }

  let totalEnviados = 0
  let totalErros    = 0

  for (const link of links) {
    const { data: publicada } = await supabase
      .from('escalas_publicadas')
      .select('status, dados')
      .eq('link_id', link.id)
      .maybeSingle()

    if (!publicada || publicada.status !== 'publicada') continue

    const slots: any[] = (publicada.dados as any)?.slots ?? []
    let slotsForDate = slots.filter((s: any) => s.date === targetDate)
    
    // Filtro JIT para 'dia_da_escala': apenas slots que começam daqui a aprox 6 horas
    if (tipo === 'dia_da_escala' && slotsForDate.length > 0) {
      const d = new Date()
      const brt = new Date(d.getTime() - 3 * 60 * 60 * 1000)
      const nowMin = brt.getUTCHours() * 60 + brt.getUTCMinutes()
      console.log(`[cron:dia_da_escala] nowBRT=${brt.getUTCHours()}:${brt.getUTCMinutes()} (${nowMin}m)`)

      slotsForDate = slotsForDate.filter((s: any) => {
        const [h, m] = s.time_of_day?.split(':').map(Number) ?? []
        if (isNaN(h) || isNaN(m)) return false
        const slotMin = h * 60 + m
        const diff = slotMin - nowMin
        const isMatched = diff >= 330 && diff <= 390
        if (isMatched) console.log(`[match] slot=${s.label} time=${s.time_of_day} diff=${diff}m (target 360m)`)
        return isMatched
      })
    }

    if (!slotsForDate.length) continue

    const allPersonIds: string[] = Array.from(new Set(
      slotsForDate.flatMap((s: any) => s.assignments.map((a: any) => a.person_id))
    ))

    const { data: people } = await supabase
      .from('people')
      .select('id, full_name, mobile_phone, phone')
      .in('id', allPersonIds)

    const personMap: Record<string, { full_name: string; phone: string | null }> = {}
    for (const p of people ?? []) {
      personMap[p.id] = { full_name: p.full_name, phone: p.mobile_phone || p.phone || null }
    }

    const churchName = (link.church as any)?.name ?? link.ministry
    const whatsLider = process.env.WHATS_LIDER || siteConfig.whatsappNumber

    for (const slot of slotsForDate) {
      for (const a of slot.assignments ?? []) {
        const person = personMap[a.person_id]
        if (!person?.phone) { totalErros++; continue }

        const nomeExib = getNomeExibicao(person.full_name)
        const variables: Record<string, string> =
          tipo === 'lembrete_3dias' || tipo === 'lembrete_1dia'
            ? {
                nome:       nomeExib,
                dia_semana: getDiaSemana(slot.date),
                data:       formatDateFullBr(slot.date),
                funcao:     a.funcao,
                hora:       slot.time_of_day,
                local:      `${slot.label} — ${churchName}`,
              }
            : {
                nome:        nomeExib,
                funcao:      a.funcao,
                hora:        slot.time_of_day,
                local:       `${slot.label} — ${churchName}`,
                whats_lider: whatsLider,
              }

        const result = await sendDisparoRaw({ phone: person.phone, messageId: MESSAGE_ID, variables })
        if (result.success) totalEnviados++; else totalErros++
      }
    }
  }

  console.log(`[cron/escalas-lembretes] tipo=${tipo} data=${targetDate} enviados=${totalEnviados} erros=${totalErros}`)
  return NextResponse.json({ ok: true, tipo, targetDate, enviados: totalEnviados, erros: totalErros })
}
