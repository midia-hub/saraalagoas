import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

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
 * Chamada via Supabase pg_cron ou Admin UI.
 *
 * Horário Sugerido (BRT): 13:30
 *
 * Query params:
 *   tipo  : 'lembrete_3dias' | 'lembrete_1dia' | 'dia_da_escala' | 'automatico'
 *   secret: valor de CRON_SECRET env var
 */
export async function GET(request: NextRequest) {
  // Proteção: Vercel/Supabase envia Authorization: Bearer <CRON_SECRET>
  // Também aceita ?secret= para compatibilidade
  const { searchParams } = new URL(request.url)
  const querySecret  = searchParams.get('secret') || searchParams.get('token')
  const headerSecret = request.headers.get('authorization')?.replace('Bearer ', '')
  const cronSecret   = process.env.CRON_SECRET || '867b36f7-331e-46cf-8302-6014ba63548f'

  console.log('[cron] Auth Debug:', {
    hasQuery: !!querySecret,
    hasHeader: !!headerSecret,
    matchQuery: querySecret === cronSecret,
    matchHeader: headerSecret === cronSecret,
    cronSecretSet: !!process.env.CRON_SECRET
  })

  if (querySecret === cronSecret || headerSecret === cronSecret) {
    // Authorized
  } else {
    return NextResponse.json({ 
      error: 'Unauthorized', 
      debug: { 
        match: false, 
        received: querySecret?.substring(0, 4) + '...',
        expected: cronSecret.substring(0, 4) + '...'
      } 
    }, { status: 401 })
  }

  let tipo = searchParams.get('tipo') as any

  // Se for automático, dispara todos os tipos relevantes para o momento
  if (tipo === 'automatico' || !tipo) {
    const results = await Promise.all([
      fetch(`${request.nextUrl.origin}/api/cron/escalas-lembretes?tipo=lembrete_3dias&token=${cronSecret}`).then(r => r.json()),
      fetch(`${request.nextUrl.origin}/api/cron/escalas-lembretes?tipo=lembrete_1dia&token=${cronSecret}`).then(r => r.json()),
      fetch(`${request.nextUrl.origin}/api/cron/escalas-lembretes?tipo=dia_da_escala&token=${cronSecret}`).then(r => r.json()),
    ])
    return NextResponse.json({ ok: true, results })
  }

  if (!['lembrete_3dias', 'lembrete_1dia', 'dia_da_escala'].includes(tipo)) {
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

  // Deduplicação: carrega todos os disparos já enviados hoje para este tipo
  // (evita reenvio se o cron rodar mais de uma vez ou em caso de retentativa)
  const todayStart = `${targetDate}T00:00:00.000Z`
  const todayEnd   = `${targetDate}T23:59:59.999Z`
  const { data: jaSentRows } = await supabase
    .from('disparos_log')
    .select('phone')
    .eq('conversion_type', `escala_${tipo}`)
    .gte('created_at', todayStart)
    .lte('created_at', todayEnd)
  const jaSentPhones = new Set((jaSentRows ?? []).map((r: { phone: string }) => r.phone))

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
  const disparosLogEntries: { phone: string; nome: string; status_code: number | null; source: string; conversion_type: string }[] = []

  for (const link of links) {
    // 1. Busca os voluntários escalados diretamente na nova tabela (simplificada/única)
    const { data: assignments, error: assignErr } = await supabase
      .from('escalas_assignments')
      .select(`
        person_id,
        funcao,
        slot:escalas_slots!inner(id, type, label, date, time_of_day)
      `)
      .eq('link_id', link.id)
      .eq('slot.date', targetDate)

    if (assignErr) {
      console.error(`[cron] erro ao buscar assignments link_id=${link.id}:`, assignErr)
      continue
    }

    if (!assignments || assignments.length === 0) {
      console.log(`[cron] no assignments for date ${targetDate} in link_id=${link.id}`)
      continue
    }

    // Agrupar por pessoa para evitar mensagens duplicadas
    const personIds = Array.from(new Set(assignments.map(a => a.person_id)))

    const { data: people } = await supabase
      .from('people')
      .select('id, full_name, mobile_phone, phone')
      .in('id', personIds)

    const personMap: Record<string, { full_name: string; phone: string | null }> = {}
    for (const p of people ?? []) {
      personMap[p.id] = { full_name: p.full_name, phone: p.mobile_phone || p.phone || null }
    }

    const churchName = (link.church as any)?.name ?? link.ministry
    const whatsLider = process.env.WHATS_LIDER || siteConfig.whatsappNumber

    for (const pId of personIds) {
      const p = personMap[pId]
      if (!p || !p.phone) { totalErros++; continue }

      if (jaSentPhones.has(p.phone)) continue

      const myAssignments = assignments.filter(a => a.person_id === pId)
      const firstSlot = myAssignments[0].slot as any
      const functionsStr = myAssignments.map(a => a.funcao).join(', ')
      const nomeExib = getNomeExibicao(p.full_name)

      const variables: Record<string, string> =
        tipo === 'lembrete_3dias' || tipo === 'lembrete_1dia'
          ? {
              nome:       nomeExib,
              dia_semana: getDiaSemana(targetDate),
              data:       formatDateFullBr(targetDate),
              funcao:     functionsStr,
              hora:       firstSlot.time_of_day,
              local:      `${firstSlot.label} — ${churchName}`,
            }
          : {
              nome:        nomeExib,
              funcao:      functionsStr,
              hora:        firstSlot.time_of_day,
              local:       `${firstSlot.label} — ${churchName}`,
              whats_lider: whatsLider,
            }

      const result = await sendDisparoRaw({ phone: p.phone, messageId: MESSAGE_ID, variables })
      
      if (result.success) {
        totalEnviados++
        jaSentPhones.add(p.phone)
      } else {
        totalErros++
      }

      disparosLogEntries.push({
        phone: p.phone,
        nome: nomeExib,
        status_code: result.statusCode ?? null,
        source: 'cron_escalas',
        conversion_type: `escala_${tipo}`
      })
    }
  }

  console.log(`[cron/escalas-lembretes] tipo=${tipo} data=${targetDate} enviados=${totalEnviados} erros=${totalErros}`)

  // Registra em lote no log de disparos
  if (disparosLogEntries.length > 0) {
    await supabase.from('disparos_log').insert(disparosLogEntries)
      .then(({ error }: { error: unknown }) => { if (error) console.error('disparos_log cron batch:', error) })
  }

  return NextResponse.json({ ok: true, tipo, targetDate, enviados: totalEnviados, erros: totalErros })
}
