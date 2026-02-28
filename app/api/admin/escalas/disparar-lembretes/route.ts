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
    const { data: publicada } = await supabase
      .from('escalas_publicadas')
      .select('status, dados')
      .eq('link_id', link.id)
      .maybeSingle()

    if (!publicada || publicada.status !== 'publicada') continue

    const slots: any[] = (publicada.dados as any)?.slots ?? []
    const slotsForDate = slots.filter((s: any) => s.date === targetDate)

    // Nota: o filtro de janela de 6h do dia_da_escala é desativado no disparo manual
    // para permitir reprocessar qualquer horário do dia.

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

        // Pula se já foi enviado hoje (a menos que force=true)
        if (jaSentPhones.has(person.phone)) continue

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

        const result = await sendDisparoRaw({ phone: person.phone, messageId: MESSAGE_ID!, variables })
        if (result.success) totalEnviados++; else totalErros++

        if (person.phone) {
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
  }

  if (disparosLogEntries.length > 0) {
    await supabase.from('disparos_log').insert(disparosLogEntries)
      .then(({ error }) => { if (error) console.error('disparos_log manual batch:', error) })
  }

  return NextResponse.json({ ok: true, tipo, targetDate, enviados: totalEnviados, erros: totalErros })
}
