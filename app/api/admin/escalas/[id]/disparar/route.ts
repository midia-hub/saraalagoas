import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { getBackgroundJob, startBackgroundJob } from '@/lib/background-jobs'
import {
  sendDisparoRaw,
  getNomeExibicao,
  MESSAGE_ID_ESCALA_MES,
  MESSAGE_ID_ESCALA_LEMBRETE_3,
  MESSAGE_ID_ESCALA_LEMBRETE_1,
  MESSAGE_ID_ESCALA_DIA,
} from '@/lib/disparos-webhook'
import { siteConfig } from '@/config/site'

type Params = { params: { id: string } }

export type DisparaTipo = 'mes' | 'lembrete_3dias' | 'lembrete_1dia' | 'dia_da_escala'

type Assignment = { funcao: string; person_id: string; person_name: string }
type SlotResult  = {
  slot_id: string; type: string; label: string; date: string
  time_of_day: string; sort_order: number
  assignments: Assignment[]; faltando: string[]
}

const WEEKDAYS_PT = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
  'Quinta-feira', 'Sexta-feira', 'Sábado',
]

function getDiaSemana(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return WEEKDAYS_PT[new Date(y, m - 1, d).getDay()]
}

function formatDateBr(dateStr: string) {
  const [, m, d] = dateStr.split('-')
  return `${d}/${m}`
}

function formatDateFullBr(dateStr: string) {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

/** Data local no formato YYYY-MM-DD com offset em dias */
function localDateStr(offsetDays = 0) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  // Usa fuso de Brasília (UTC-3) para não errar a data
  const brt = new Date(d.getTime() - 3 * 60 * 60 * 1000)
  return brt.toISOString().split('T')[0]
}

type DisparoJobParams = {
  escalaId: string
  tipo: DisparaTipo
  teste: boolean
  phoneTeste?: string
  nomeTeste?: string
}

type DisparoJobResult = {
  ok: true
  enviados: number
  erros: number
  aviso?: string
}

async function executeDisparoJob({ escalaId, tipo, teste, phoneTeste, nomeTeste }: DisparoJobParams): Promise<DisparoJobResult> {
  const supabase = createSupabaseAdminClient()

  const { data: link } = await supabase
    .from('escalas_links')
    .select('id, token, ministry, month, year, church:churches(id, name)')
    .eq('id', escalaId)
    .single()

  if (!link) throw new Error('Escala não encontrada.')

  const { data: publicada } = await supabase
    .from('escalas_publicadas')
    .select('status, dados')
    .eq('link_id', escalaId)
    .maybeSingle()

  if (!publicada || publicada.status !== 'publicada') {
    throw new Error('A escala precisa estar publicada para enviar disparos.')
  }

  const slots: SlotResult[] = (publicada.dados as any)?.slots ?? []
  if (slots.length === 0) {
    throw new Error('Nenhum slot encontrado na escala publicada.')
  }

  const allPersonIds = Array.from(new Set(
    slots.flatMap(s => s.assignments.map(a => a.person_id))
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
  const mesNum = String(link.month).padStart(2, '0')
  const anoStr = String(link.year)
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://saraalagoas.com').replace(/\/$/, '')
  const linkEscala = `${baseUrl}/escalas/${link.token}/escala`
  const whatsLider = process.env.WHATS_LIDER || siteConfig.whatsappNumber

  const MESSAGE_ID = {
    mes: MESSAGE_ID_ESCALA_MES,
    lembrete_3dias: MESSAGE_ID_ESCALA_LEMBRETE_3,
    lembrete_1dia: MESSAGE_ID_ESCALA_LEMBRETE_1,
    dia_da_escala: MESSAGE_ID_ESCALA_DIA,
  }[tipo]

  type ResultadoItem = { person_id: string; nome: string; phone_last4: string; phone: string; success: boolean; statusCode?: number }
  const resultados: ResultadoItem[] = []

  if (tipo === 'mes') {
    const byPerson: Record<string, { date: string; time_of_day: string; label: string; funcao: string }[]> = {}
    for (const slot of slots) {
      for (const a of slot.assignments) {
        if (!byPerson[a.person_id]) byPerson[a.person_id] = []
        byPerson[a.person_id].push({
          date: slot.date,
          time_of_day: slot.time_of_day,
          label: slot.label,
          funcao: a.funcao,
        })
      }
    }

    const entries = Object.entries(byPerson)
    if (entries.length === 0) {
      return { ok: true, enviados: 0, erros: 0, aviso: 'Nenhum voluntário com alocação.' }
    }

    const targets = teste ? [entries[0]] : entries

    for (const [personId, assignments] of targets) {
      const person = personMap[personId]
      const phone = teste ? phoneTeste : person?.phone
      if (!phone) {
        resultados.push({ person_id: personId, nome: person?.full_name ?? personId, phone_last4: '????', success: false })
        continue
      }

      const nomeExib = getNomeExibicao((teste && nomeTeste) ? nomeTeste : (person?.full_name ?? ''))
      const escalaLista = assignments
        .map(a => {
          const dia = getDiaSemana(a.date).slice(0, 3)
          const data = formatDateBr(a.date)
          return `• ${dia}, ${data} — ${a.funcao} (${a.label}, ${a.time_of_day})`
        })
        .join('\n')

      const result = await sendDisparoRaw({
        phone,
        messageId: MESSAGE_ID,
        variables: {
          nome: nomeExib,
          mes: mesNum,
          ano: anoStr,
          ministerio: link.ministry,
          escala_lista: escalaLista,
          link_escala: linkEscala,
        },
      })

      resultados.push({
        person_id: personId,
        nome: nomeExib,
        phone_last4: phone.slice(-4),
        phone,
        success: result.success,
        statusCode: result.statusCode,
      })

      if (teste) break
    }
  }

  if (tipo === 'lembrete_3dias' || tipo === 'lembrete_1dia' || tipo === 'dia_da_escala') {
    const offsets = { lembrete_3dias: 3, lembrete_1dia: 1, dia_da_escala: 0 }
    const targetDate = localDateStr(offsets[tipo])
    const slotsForDate = slots.filter(s => s.date === targetDate)

    if (slotsForDate.length === 0 && !teste) {
      return {
        ok: true,
        enviados: 0,
        erros: 0,
        aviso: `Nenhum culto/evento encontrado para ${formatDateFullBr(targetDate)}. Verifique se a data está correta.`,
      }
    }

    let testAssignment: { slot: SlotResult; assignment: Assignment } | null = null

    if (teste) {
      for (const s of slots) {
        if (s.assignments && s.assignments.length > 0) {
          testAssignment = { slot: s, assignment: s.assignments[0] }
          break
        }
      }

      if (!testAssignment) {
        testAssignment = {
          slot: slots[0] || { label: 'Culto de Teste', date: targetDate, time_of_day: '19:00', type: 'culto' },
          assignment: { funcao: 'Voluntário de Teste', person_name: 'Nome de Teste', person_id: 'dummy' },
        } as any
      }
    }

    const processSlots = teste ? [testAssignment!.slot] : slotsForDate

    outer: for (const slot of processSlots) {
      const assignments = teste ? [testAssignment!.assignment] : slot.assignments
      for (const a of assignments) {
        const person = personMap[a.person_id]
        const phone = teste ? phoneTeste : person?.phone
        if (!phone) {
          resultados.push({ person_id: a.person_id, nome: a.person_name, phone_last4: '????', success: false })
          continue
        }

        const nomeExib = getNomeExibicao((teste && nomeTeste) ? nomeTeste : (person?.full_name ?? a.person_name))

        const variables: Record<string, string> =
          tipo === 'lembrete_3dias' || tipo === 'lembrete_1dia'
            ? {
                nome: nomeExib,
                dia_semana: getDiaSemana(slot.date),
                data: formatDateFullBr(slot.date),
                funcao: a.funcao,
                hora: slot.time_of_day,
                local: `${slot.label} — ${churchName}`,
              }
            : {
                nome: nomeExib,
                funcao: a.funcao,
                hora: slot.time_of_day,
                local: `${slot.label} — ${churchName}`,
                whats_lider: whatsLider,
              }

        const result = await sendDisparoRaw({ phone, messageId: MESSAGE_ID, variables })
        resultados.push({
          person_id: a.person_id,
          nome: nomeExib,
          phone_last4: phone.slice(-4),
          phone,
          success: result.success,
          statusCode: result.statusCode,
        })

        if (teste) break outer
      }
    }
  }

  const enviados = resultados.filter(r => r.success).length
  const erros = resultados.filter(r => !r.success).length

  // Registra em lote no log de disparos (apenas entradas com telefone válido)
  const logEntries = resultados.filter(r => !!r.phone).map(r => ({
    phone: r.phone,
    nome: r.nome,
    status_code: r.statusCode ?? null,
    source: 'escala',
    conversion_type: `escala_${tipo}`,
  }))
  if (logEntries.length > 0) {
    await supabase.from('disparos_log').insert(logEntries)
      .then(({ error }) => { if (error) console.error('disparos_log escala batch:', error) })
  }

  return { ok: true, enviados, erros }
}

/**
 * POST /api/admin/escalas/[id]/disparar
 *
 * Body:
 *   tipo          : 'mes' | 'lembrete_1dia' | 'dia_da_escala'
 *   teste         : boolean (se true, usa phone_teste)
 *   phone_teste   : string  (obrigatório quando teste=true)
 *   nome_teste    : string  (opcional — para personalizar o nome na mensagem de teste)
 */
export async function POST(request: NextRequest, { params }: Params) {
  const access = await requireAccess(request, { pageKey: 'escalas', action: 'edit' })
  if (!access.ok) return access.response

  const body = await request.json().catch(() => ({}))
  const { tipo, teste = false, phone_teste, nome_teste } = body

  if (!(['mes', 'lembrete_3dias', 'lembrete_1dia', 'dia_da_escala'] as DisparaTipo[]).includes(tipo)) {
    return NextResponse.json({ error: 'tipo inválido. Use: mes | lembrete_3dias | lembrete_1dia | dia_da_escala' }, { status: 400 })
  }

  if (teste && !phone_teste) {
    return NextResponse.json({ error: 'phone_teste é obrigatório no modo teste.' }, { status: 400 })
  }

  const webhookUrl = process.env.DISPAROS_WEBHOOK_URL
  const webhookBearer = process.env.DISPAROS_WEBHOOK_BEARER
  if (!webhookUrl || !webhookBearer) {
    return NextResponse.json(
      { error: 'Webhook de disparos não configurado (DISPAROS_WEBHOOK_URL / DISPAROS_WEBHOOK_BEARER).' },
      { status: 503 },
    )
  }

  const job = await startBackgroundJob<DisparoJobResult>({
    kind: 'escalas-disparo',
    metadata: { escalaId: params.id, tipo },
    run: () => executeDisparoJob({
      escalaId: params.id,
      tipo,
      teste: teste === true,
      phoneTeste: phone_teste,
      nomeTeste: nome_teste,
    }),
  })

  return NextResponse.json(
    { ok: true, job_id: job.id, status: job.status, message: 'Disparo iniciado em segundo plano.' },
    { status: 202 },
  )
}

export async function GET(request: NextRequest, { params }: Params) {
  const access = await requireAccess(request, { pageKey: 'escalas', action: 'edit' })
  if (!access.ok) return access.response

  const jobId = request.nextUrl.searchParams.get('job_id')
  if (!jobId) return NextResponse.json({ error: 'job_id é obrigatório.' }, { status: 400 })

  const job = await getBackgroundJob<DisparoJobResult>(jobId)
  if (!job || job.kind !== 'escalas-disparo' || job.metadata?.escalaId !== params.id) {
    return NextResponse.json({ error: 'Job não encontrado.' }, { status: 404 })
  }

  return NextResponse.json({
    ok: true,
    job: {
      id: job.id,
      status: job.status,
      created_at: job.createdAt,
      started_at: job.startedAt,
      finished_at: job.finishedAt,
      result: job.result,
      error: job.error,
    },
  })
}
