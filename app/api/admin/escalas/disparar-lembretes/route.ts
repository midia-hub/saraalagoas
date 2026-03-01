import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import {
  sendDisparoRaw,
  getNomeExibicao,
  MESSAGE_ID_ESCALA_LEMBRETE_3,
  MESSAGE_ID_ESCALA_LEMBRETE_1,
  MESSAGE_ID_ESCALA_DIA,
} from '@/lib/disparos-webhook'
import { siteConfig } from '@/config/site'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

export type DisparoLembreteTipo = 'lembrete_3dias' | 'lembrete_1dia' | 'dia_da_escala'

/**
 * POST /api/admin/escalas/disparar-lembretes
 *
 * Dispara manualmente os lembretes de escala para a data alvo.
 * Body:
 *   tipo       : 'lembrete_3dias' | 'lembrete_1dia' | 'dia_da_escala'
 *   targetDate?: YYYY-MM-DD (padrão: data calculada pelo offset do tipo)
 */
export async function POST(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'escalas', action: 'edit' })
  if (!access.ok) return access.response

  const body = await request.json().catch(() => ({}))
  const { tipo, targetDate: bodyDate, force } = body as { tipo?: string; targetDate?: string; force?: boolean }

  if (!tipo || !['lembrete_3dias', 'lembrete_1dia', 'dia_da_escala'].includes(tipo)) {
    return NextResponse.json(
      { error: 'tipo inválido. Use: lembrete_3dias | lembrete_1dia | dia_da_escala' },
      { status: 400 },
    )
  }

  const webhookUrl = process.env.DISPAROS_WEBHOOK_URL
  const webhookBearer = process.env.DISPAROS_WEBHOOK_BEARER
  if (!webhookUrl || !webhookBearer) {
    return NextResponse.json({ error: 'Webhook não configurado.' }, { status: 503 })
  }

  // Data alvo (BRT = UTC-3), com offset por tipo
  function localDateStr(offsetDays = 0) {
    const d = new Date()
    d.setDate(d.getDate() + offsetDays)
    const brt = new Date(d.getTime() - 3 * 60 * 60 * 1000)
    return brt.toISOString().split('T')[0]
  }

  const offsets: Record<string, number> = { lembrete_3dias: 3, lembrete_1dia: 1, dia_da_escala: 0 }
  const targetDate = bodyDate ?? localDateStr(offsets[tipo])

  const MESSAGE_ID = {
    lembrete_3dias: MESSAGE_ID_ESCALA_LEMBRETE_3,
    lembrete_1dia:  MESSAGE_ID_ESCALA_LEMBRETE_1,
    dia_da_escala:  MESSAGE_ID_ESCALA_DIA,
  }[tipo]

  const supabase = createSupabaseAdminClient(request)

  const [targetYear, targetMonth] = targetDate.split('-').map(Number)
  const { data: links } = await supabase
    .from('escalas_links')
    .select('id, token, ministry, month, year, church:churches(id, name)')
    .eq('month', targetMonth)
    .eq('year', targetYear)

  if (!links?.length) {
    return NextResponse.json({ ok: true, tipo, targetDate, enviados: 0, erros: 0, aviso: `Nenhuma escala publicada para ${targetDate}` })
  }

  // Deduplicação: pula quem já recebeu este tipo hoje (a menos que force=true)
  const todayStart = `${targetDate}T00:00:00.000Z`
  const todayEnd   = `${targetDate}T23:59:59.999Z`
  let jaSentPhones = new Set<string>()
  if (!force) {
    const { data: jaSentRows } = await supabase
      .from('disparos_log')
      .select('phone')
      .eq('conversion_type', `escala_${tipo}`)
      .gte('created_at', todayStart)
      .lte('created_at', todayEnd)
    jaSentPhones = new Set((jaSentRows ?? []).map((r: { phone: string }) => r.phone))
  }

  const WEEKDAYS_PT = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
  function getDiaSemana(d: string) {
    const [y, m, day] = d.split('-').map(Number)
    return WEEKDAYS_PT[new Date(y, m - 1, day).getDay()]
  }
  function formatDateFullBr(d: string) {
    const [, m, day] = d.split('-')
    const [y] = d.split('-')
    return `${day}/${m}/${y}`
  }

  let totalEnviados = 0
  let totalErros = 0
  const disparosLogEntries: { phone: string; nome: string; status_code: number | null; source: string; conversion_type: string }[] = []

  for (const link of links) {
    // Busca assignments diretamente da tabela escalas_assignments (fonte de verdade)
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
      console.error(`[disparar-lembretes] erro ao buscar assignments link_id=${link.id}:`, assignErr)
      continue
    }

    if (!assignments || assignments.length === 0) continue

    // Carrega dados das pessoas escaladas
    const personIds = Array.from(new Set(assignments.map((a: any) => a.person_id)))

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

    // Agrupar por (slot, pessoa) — uma mensagem por slot por pessoa
    const slotMap: Record<string, { slot: any; byPerson: Record<string, string[]> }> = {}
    for (const a of assignments as any[]) {
      const slot = a.slot as any
      if (!slotMap[slot.id]) slotMap[slot.id] = { slot, byPerson: {} }
      if (!slotMap[slot.id].byPerson[a.person_id]) slotMap[slot.id].byPerson[a.person_id] = []
      if (!slotMap[slot.id].byPerson[a.person_id].includes(a.funcao))
        slotMap[slot.id].byPerson[a.person_id].push(a.funcao)
    }

    // Dedup por phone:slotId (evita reenvio em caso de re-disparo)
    const sentKeys = new Set<string>()

    for (const { slot, byPerson } of Object.values(slotMap)) {
      for (const [pId, funcoes] of Object.entries(byPerson)) {
        const person = personMap[pId]
        if (!person?.phone) { totalErros++; continue }

        const sentKey = `${person.phone}:${slot.id}`
        if (sentKeys.has(sentKey) || (!force && jaSentPhones.has(person.phone))) continue

        const functionsStr = funcoes.join(', ')
        const nomeExib = getNomeExibicao(person.full_name)

        const variables: Record<string, string> =
          tipo === 'lembrete_3dias' || tipo === 'lembrete_1dia'
            ? {
                nome:       nomeExib,
                dia_semana: getDiaSemana(targetDate),
                data:       formatDateFullBr(targetDate),
                funcao:     functionsStr,
                hora:       slot.time_of_day,
                local:      `${slot.label} — ${churchName}`,
              }
            : {
                nome:        nomeExib,
                funcao:      functionsStr,
                hora:        slot.time_of_day,
                local:       `${slot.label} — ${churchName}`,
                whats_lider: whatsLider,
              }

        const result = await sendDisparoRaw({ phone: person.phone, messageId: MESSAGE_ID!, variables })
        if (result.success) {
          totalEnviados++
          sentKeys.add(sentKey)
        } else {
          totalErros++
        }

        disparosLogEntries.push({
          phone: person.phone,
          nome: nomeExib,
          status_code: result.statusCode ?? null,
          source: 'escala',
          conversion_type: `escala_${tipo}`,
        })
      }
    }
  }

  if (disparosLogEntries.length > 0) {
    await supabase.from('disparos_log').insert(disparosLogEntries)
      .then(({ error }) => { if (error) console.error('disparos_log manual batch:', error) })
  }

  return NextResponse.json({ ok: true, tipo, targetDate, enviados: totalEnviados, erros: totalErros })
}
