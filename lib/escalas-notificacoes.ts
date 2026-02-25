import { SupabaseClient } from '@supabase/supabase-js'
import {
  sendDisparoRaw,
  getNomeExibicao,
  MESSAGE_ID_ESCALA_MES,
} from './disparos-webhook'
import { siteConfig } from '@/config/site'

type Assignment = { funcao: string; person_id: string; person_name: string }
type SlotResult = {
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

/**
 * Envia notificações da escala do mês para todos os voluntários escalados.
 * Utilizado ao publicar/regerar a escala.
 */
export async function triggerScalePublishedNotifications(
  supabase: SupabaseClient,
  linkId: string,
  dados: { slots: SlotResult[] }
) {
  const webhookUrl = process.env.DISPAROS_WEBHOOK_URL
  const webhookBearer = process.env.DISPAROS_WEBHOOK_BEARER
  if (!webhookUrl || !webhookBearer) return { ok: false, error: 'Webhook não configurado.' }

  const slots = dados.slots || []
  if (slots.length === 0) return { ok: true, enviados: 0 }

  // 1. Busca dados do link
  const { data: link } = await supabase
    .from('escalas_links')
    .select('token, ministry, month, year')
    .eq('id', linkId)
    .single()

  if (!link) return { ok: false, error: 'Link não encontrado.' }

  // 2. Coleta voluntários escalados
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

  // 3. Agrupa por voluntário
  const byPerson: Record<string, { date: string; time_of_day: string; label: string; funcao: string }[]> = {}
  for (const slot of slots) {
    for (const a of slot.assignments) {
      if (!byPerson[a.person_id]) byPerson[a.person_id] = []
      byPerson[a.person_id].push({
        date: slot.date, time_of_day: slot.time_of_day,
        label: slot.label, funcao: a.funcao,
      })
    }
  }

  const mesNum = String(link.month).padStart(2, '0')
  const anoStr = String(link.year)
  const linkEscala = `${process.env.NEXT_PUBLIC_SITE_URL ?? siteConfig.url}/escalas/${link.token}/escala`

  let enviados = 0
  let erros = 0

  for (const [personId, assignments] of Object.entries(byPerson)) {
    const person = personMap[personId]
    const phone = person?.phone
    if (!phone) {
      erros++
      continue
    }

    const nomeExib = getNomeExibicao(person?.full_name ?? '')
    const escalaLista = assignments
      .map(a => {
        const dia = getDiaSemana(a.date).slice(0, 3)
        const data = formatDateBr(a.date)
        return `• ${dia}, ${data} — ${a.funcao} (${a.label}, ${a.time_of_day})`
      })
      .join('\n')

    const result = await sendDisparoRaw({
      phone,
      messageId: MESSAGE_ID_ESCALA_MES,
      variables: {
        nome: nomeExib,
        mes: mesNum,
        ano: anoStr,
        ministerio: link.ministry,
        escala_lista: escalaLista,
        link_escala: linkEscala,
      },
    })

    if (result.success) enviados++
    else erros++
  }

  return { ok: true, enviados, erros }
}
