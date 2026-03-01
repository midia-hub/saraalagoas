import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  sendDisparoRaw,
  getNomeExibicao,
  MESSAGE_ID_ESCALA_LEMBRETE_3,
  MESSAGE_ID_ESCALA_LEMBRETE_1,
  MESSAGE_ID_ESCALA_DIA,
} from '@/lib/disparos-webhook'
import { siteConfig } from '@/config/site'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const TIPOS_VALIDOS = ['lembrete_3dias', 'lembrete_1dia', 'dia_da_escala'] as const
type TipoLembrete = typeof TIPOS_VALIDOS[number]

const OFFSETS: Record<TipoLembrete, number> = {
  lembrete_3dias: 3,
  lembrete_1dia: 1,
  dia_da_escala: 0,
}

const MESSAGE_IDS: Record<TipoLembrete, string> = {
  lembrete_3dias: MESSAGE_ID_ESCALA_LEMBRETE_3,
  lembrete_1dia: MESSAGE_ID_ESCALA_LEMBRETE_1,
  dia_da_escala: MESSAGE_ID_ESCALA_DIA,
}

const WEEKDAYS_PT = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']

function getDiaSemana(d: string) {
  const [y, m, day] = d.split('-').map(Number)
  return WEEKDAYS_PT[new Date(y, m - 1, day).getDay()]
}

function formatDateFullBr(d: string) {
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

/** Calcula a data alvo em BRT (UTC-3) com offset em dias */
function localDateBRT(offsetDays = 0) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  const brt = new Date(d.getTime() - 3 * 60 * 60 * 1000)
  return brt.toISOString().split('T')[0]
}

/**
 * Processa um tipo de lembrete para a data alvo.
 *
 * Para cada escala do mês, busca os slots na data alvo e,
 * para cada slot, envia UMA mensagem para cada volunt�rio escalado naquele slot,
 * informando o culto/evento espec�fico e as fun��es dele naquele culto.
 *
 * Se o volunt�rio est� em 2 cultos no mesmo dia, recebe 2 mensagens separadas.
 */
async function processarTipo(
  supabase: ReturnType<typeof createClient>,
  tipo: TipoLembrete,
  targetDate: string,
): Promise<{ tipo: TipoLembrete; targetDate: string; enviados: number; erros: number; aviso?: string }> {
  const [targetYear, targetMonth] = targetDate.split('-').map(Number)

  const { data: links } = await supabase
    .from('escalas_links')
    .select('id, ministry, month, year, church:churches(id, name)')
    .eq('month', targetMonth)
    .eq('year', targetYear)

  if (!links?.length) {
    return { tipo, targetDate, enviados: 0, erros: 0, aviso: `Nenhuma escala para ${targetDate}` }
  }

  // Dedup cross-run: carrega phones que j� receberam este tipo hoje (evita reenvio se cron rodar 2x)
  const todayStart = `${targetDate}T00:00:00.000Z`
  const todayEnd = `${targetDate}T23:59:59.999Z`
  const { data: jaSentRows } = await supabase
    .from('disparos_log')
    .select('phone')
    .eq('conversion_type', `escala_${tipo}`)
    .gte('created_at', todayStart)
    .lte('created_at', todayEnd)
  const jaSentPhones = new Set((jaSentRows ?? []).map((r: { phone: string }) => r.phone))

  const MESSAGE_ID = MESSAGE_IDS[tipo]
  const whatsLider = process.env.WHATS_LIDER || siteConfig.whatsappNumber

  let totalEnviados = 0
  let totalErros = 0
  const logEntries: { phone: string; nome: string; status_code: number | null; source: string; conversion_type: string }[] = []

  for (const link of links) {
    // Assignments filtrados pelo slot.date = targetDate
    const { data: assignments, error: assignErr } = await supabase
      .from('escalas_assignments')
      .select('person_id, funcao, slot:escalas_slots!inner(id, type, label, date, time_of_day)')
      .eq('link_id', link.id)
      .eq('slot.date', targetDate)

    if (assignErr) {
      console.error(`[cron] erro assignments link_id=${link.id}:`, assignErr)
      continue
    }
    if (!assignments?.length) continue

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

  // Agrupa por (slot -> pessoa -> [funções]) para UMA mensagem por voluntário por culto/evento
    const slotMap: Record<string, { slot: any; byPerson: Record<string, string[]> }> = {}
    for (const a of assignments as any[]) {
      const slot = a.slot as any
      if (!slotMap[slot.id]) slotMap[slot.id] = { slot, byPerson: {} }
      if (!slotMap[slot.id].byPerson[a.person_id]) slotMap[slot.id].byPerson[a.person_id] = []
      if (!slotMap[slot.id].byPerson[a.person_id].includes(a.funcao))
        slotMap[slot.id].byPerson[a.person_id].push(a.funcao)
    }

    // Dedup intra-run por phone:slotId
    const sentKeys = new Set<string>()

    for (const { slot, byPerson } of Object.values(slotMap)) {
      for (const [pId, funcoes] of Object.entries(byPerson)) {
        const p = personMap[pId]
        if (!p?.phone) { totalErros++; continue }

        const sentKey = `${p.phone}:${slot.id}`
        if (sentKeys.has(sentKey) || jaSentPhones.has(p.phone)) continue

        const functionsStr = funcoes.join(', ')
        const nomeExib = getNomeExibicao(p.full_name)

        const variables: Record<string, string> =
          tipo === 'lembrete_3dias' || tipo === 'lembrete_1dia'
            ? {
                nome: nomeExib,
                dia_semana: getDiaSemana(targetDate),
                data: formatDateFullBr(targetDate),
                funcao: functionsStr,
                hora: slot.time_of_day,
                local: `${slot.label} — ${churchName}`,
              }
            : {
                nome: nomeExib,
                funcao: functionsStr,
                hora: slot.time_of_day,
                local: `${slot.label} — ${churchName}`,
                whats_lider: whatsLider,
              }

        const result = await sendDisparoRaw({ phone: p.phone, messageId: MESSAGE_ID, variables })

        if (result.success) {
          totalEnviados++
          sentKeys.add(sentKey)
        } else {
          totalErros++
        }

        logEntries.push({
          phone: p.phone,
          nome: nomeExib,
          status_code: result.statusCode ?? null,
          source: 'cron_escalas',
          conversion_type: `escala_${tipo}`,
        })
      }
    }
  }

  if (logEntries.length > 0) {
    await supabase
      .from('disparos_log')
      .insert(logEntries)
      .then(({ error }: any) => { if (error) console.error('disparos_log cron batch:', error) })
  }

  console.log(`[cron/escalas-lembretes] tipo=${tipo} data=${targetDate} enviados=${totalEnviados} erros=${totalErros}`)
  return { tipo, targetDate, enviados: totalEnviados, erros: totalErros }
}

/**
 * GET /api/cron/escalas-lembretes
 *
 * Chamada via Supabase pg_cron (diariamente às 14:30 BRT).
 *
 * Query params:
 *   tipo  : 'lembrete_3dias' | 'lembrete_1dia' | 'dia_da_escala' | 'automatico'
 *   token : valor de CRON_SECRET env var
 *
 * Modo autom�tico (padr�o � sem tipo): processa os 3 tipos em paralelo.
 *   - lembrete_3dias ? volunt�rios escalados daqui a 3 dias
 *   - lembrete_1dia  ? volunt�rios escalados amanh�
 *   - dia_da_escala  ? volunt�rios escalados hoje
 *
 * Regra por volunt�rio: UMA mensagem por culto/evento em que est� escalado na data.
 * Se est� em 2 cultos, recebe 2 mensagens � cada uma com o culto e fun��es corretos.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const querySecret = searchParams.get('secret') || searchParams.get('token')
  const headerSecret = request.headers.get('authorization')?.replace('Bearer ', '')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && querySecret !== cronSecret && headerSecret !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tipo = searchParams.get('tipo') as string | null

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Modo autom�tico: processa os 3 tipos em paralelo na mesma invoca��o (sem self-HTTP calls)
  if (!tipo || tipo === 'automatico') {
    const results = await Promise.all(
      TIPOS_VALIDOS.map((t) => processarTipo(supabase, t, localDateBRT(OFFSETS[t])))
    )
    return NextResponse.json({ ok: true, results })
  }

  if (!TIPOS_VALIDOS.includes(tipo as TipoLembrete)) {
    return NextResponse.json({ error: 'Par�metro tipo inv�lido.' }, { status: 400 })
  }

  const targetDate = localDateBRT(OFFSETS[tipo as TipoLembrete])
  const result = await processarTipo(supabase, tipo as TipoLembrete, targetDate)
  return NextResponse.json({ ok: true, ...result })
}
