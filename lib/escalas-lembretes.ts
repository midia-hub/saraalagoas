/**
 * lib/escalas-lembretes.ts
 *
 * Helper central para envio de lembretes de escalas.
 *
 * Lógica:
 *  - D3: lembrete enviado quando o evento está a 3 dias (lembrete_3dias)
 *  - D1: lembrete enviado quando o evento está a 1 dia (lembrete_1dia)
 *  - D0: lembrete enviado no dia do evento (dia_da_escala)
 *
 * Idempotência: usa escalas_lembretes_log para garantir que o mesmo
 * lembrete (slot + pessoa + kind) não seja reenviado.
 * Retry: linhas com status 'failed' podem ser retentadas após 30 min.
 *
 * Múltiplos eventos no mesmo dia: processa cada slot separadamente;
 * se a pessoa está em 2 cultos/slots, recebe 2 mensagens distintas.
 *
 * NÃO altera o fluxo de disparo ao publicar/gerar a escala.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  sendDisparoRaw,
  getNomeExibicao,
  MESSAGE_ID_ESCALA_LEMBRETE_3,
  MESSAGE_ID_ESCALA_LEMBRETE_1,
  MESSAGE_ID_ESCALA_DIA,
} from '@/lib/disparos-webhook'
import { siteConfig } from '@/config/site'

// ── Template Kinds ────────────────────────────────────────────────────────────

/** D3 = 3 dias antes | D1 = 1 dia antes | D0 = dia do evento */
export type TemplateKind = 'D3' | 'D1' | 'D0'

/** Offset em dias a partir de hoje para a data alvo do evento */
export const KIND_TO_OFFSET: Record<TemplateKind, number> = {
  D3: 3,
  D1: 1,
  D0: 0,
}

export const KIND_TO_MESSAGE_ID: Record<TemplateKind, string> = {
  D3: MESSAGE_ID_ESCALA_LEMBRETE_3,
  D1: MESSAGE_ID_ESCALA_LEMBRETE_1,
  D0: MESSAGE_ID_ESCALA_DIA,
}

/** Valor gravado em disparos_log.conversion_type */
export const KIND_TO_CONVERSION_TYPE: Record<TemplateKind, string> = {
  D3: 'escala_lembrete_D3',
  D1: 'escala_lembrete_D1',
  D0: 'escala_dia',
}

// ── Backward-compat: mapeamento dos nomes antigos ────────────────────────────
export const TIPO_LEGADO_TO_KIND: Record<string, TemplateKind> = {
  lembrete_3dias: 'D3',
  lembrete_1dia: 'D1',
  dia_da_escala: 'D0',
}

// ── Date Utils ────────────────────────────────────────────────────────────────

const WEEKDAYS_PT = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
  'Quinta-feira', 'Sexta-feira', 'Sábado',
]

/**
 * Retorna a data local em America/Maceio (UTC-3, sem horário de verão)
 * no formato YYYY-MM-DD, com offset em dias.
 */
export function getLocalDateMaceio(offsetDays = 0): string {
  const now = new Date()
  now.setDate(now.getDate() + offsetDays)
  try {
    const s = now.toLocaleDateString('en-CA', { timeZone: 'America/Maceio' })
    if (s && /^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  } catch {
    // fallback: America/Fortaleza = UTC-3 sem DST
  }
  // Fallback manual UTC-3
  const brt = new Date(now.getTime() - 3 * 60 * 60 * 1000)
  return brt.toISOString().split('T')[0]
}

function getDiaSemana(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return WEEKDAYS_PT[new Date(y, m - 1, d).getDay()]
}

function formatDateBr(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

// ── AssignmentItem ────────────────────────────────────────────────────────────

export interface AssignmentItem {
  slotId: string
  slotLabel: string
  slotDate: string   // YYYY-MM-DD
  slotTime: string   // HH:MM  (time_of_day)
  personId: string
  phone: string
  fullName: string
  /** Funções do voluntário NESTE slot/evento (agregadas) */
  funcoes: string[]
  churchName: string
}

// ── Fetch assignments for a given date ───────────────────────────────────────

/**
 * Busca todos os voluntários escalados na data alvo, agrupando por
 * (slot, pessoa) e agregando funções duplicadas.
 *
 * Retorna one AssignmentItem por (slot, pessoa), com funcoes[] agregados.
 * Se a pessoa está em 2 slots no mesmo dia, retorna 2 itens distintos.
 */
export async function fetchAssignmentsByDate(
  supabase: SupabaseClient,
  targetDate: string,
): Promise<AssignmentItem[]> {
  const [year, month] = targetDate.split('-').map(Number)

  const { data: links, error: linksErr } = await supabase
    .from('escalas_links')
    .select('id, ministry, church:churches(id, name)')
    .eq('month', month)
    .eq('year', year)

  if (linksErr) {
    console.error('[escalas-lembretes] erro ao buscar links:', linksErr)
    return []
  }
  if (!links?.length) return []

  const result: AssignmentItem[] = []

  for (const link of links) {
    const { data: assignments, error: assignErr } = await supabase
      .from('escalas_assignments')
      .select('person_id, funcao, slot:escalas_slots!inner(id, type, label, date, time_of_day)')
      .eq('link_id', link.id)
      .eq('escalas_slots.date', targetDate)

    if (assignErr) {
      console.error(`[escalas-lembretes] erro assignments link_id=${link.id}:`, assignErr)
      continue
    }
    if (!assignments?.length) continue

    // Carrega dados das pessoas escaladas neste link
    const personIds = [...new Set(assignments.map((a: any) => a.person_id))]
    const { data: people } = await supabase
      .from('people')
      .select('id, full_name, mobile_phone, phone')
      .in('id', personIds)

    const personMap: Record<string, { full_name: string; phone: string | null }> = {}
    for (const p of people ?? []) {
      personMap[p.id] = {
        full_name: p.full_name,
        phone: p.mobile_phone || p.phone || null,
      }
    }

    const churchName = (link.church as any)?.name ?? link.ministry

    // Agrupa por (slot → pessoa → funcoes[]), para 1 item por (slot, pessoa)
    const grouped: Record<string, { slot: any; byPerson: Record<string, string[]> }> = {}
    for (const a of assignments as any[]) {
      const slot = a.slot as any
      if (!grouped[slot.id]) grouped[slot.id] = { slot, byPerson: {} }
      if (!grouped[slot.id].byPerson[a.person_id]) grouped[slot.id].byPerson[a.person_id] = []
      if (!grouped[slot.id].byPerson[a.person_id].includes(a.funcao))
        grouped[slot.id].byPerson[a.person_id].push(a.funcao)
    }

    for (const { slot, byPerson } of Object.values(grouped)) {
      for (const [pId, funcoes] of Object.entries(byPerson)) {
        const p = personMap[pId]
        if (!p?.phone) continue
        result.push({
          slotId: slot.id,
          slotLabel: slot.label,
          slotDate: slot.date,
          slotTime: slot.time_of_day,
          personId: pId,
          phone: p.phone,
          fullName: p.full_name,
          funcoes,
          churchName,
        })
      }
    }
  }

  return result
}

// ── Blocked-keys (idempotência batch) ────────────────────────────────────────

/** Janela de retry: linhas 'failed' mais antigas que isso podem ser retentadas */
const RETRY_WINDOW_MS = 30 * 60 * 1000 // 30 min

/**
 * Retorna um Set de chaves `${slotId}:${personId}:${kind}` que NÃO devem
 * ser disparadas nesta execução:
 *  - 'sent'   → nunca reenviar
 *  - 'failed' → bloquear se falha < 30 min atrás (aguardar janela de retry)
 */
export async function getBlockedKeys(
  supabase: SupabaseClient,
  items: AssignmentItem[],
  kind: TemplateKind,
): Promise<Set<string>> {
  if (!items.length) return new Set()

  const slotIds = [...new Set(items.map(i => i.slotId))]
  const personIds = [...new Set(items.map(i => i.personId))]

  const { data: rows, error } = await supabase
    .from('escalas_lembretes_log')
    .select('evento_id, person_id, status, sent_at')
    .in('evento_id', slotIds)
    .in('person_id', personIds)
    .eq('template_kind', kind)

  if (error) {
    console.error('[escalas-lembretes] erro ao checar blocked keys:', error)
    return new Set()
  }

  const blocked = new Set<string>()
  const now = Date.now()

  for (const row of rows ?? []) {
    const key = `${row.evento_id}:${row.person_id}:${kind}`
    if (row.status === 'sent') {
      blocked.add(key)
    } else if (row.status === 'failed') {
      const sentAt = new Date(row.sent_at).getTime()
      if ((now - sentAt) < RETRY_WINDOW_MS) {
        blocked.add(key) // ainda na janela de retry → bloquear
      }
      // caso contrário (> 30 min) → não bloquear → será retentado
    }
  }

  return blocked
}

// ── Send one reminder ─────────────────────────────────────────────────────────

/**
 * Envia um lembrete para um voluntário em um slot específico.
 * Registra em escalas_lembretes_log (upsert por onConflict) e disparos_log.
 *
 * NÃO verifica idempotência — use getBlockedKeys antes para filtrar.
 */
export async function sendReminder(
  supabase: SupabaseClient,
  item: AssignmentItem,
  kind: TemplateKind,
  source = 'escalas-lembretes',
): Promise<{ success: boolean; statusCode?: number }> {
  const messageId = KIND_TO_MESSAGE_ID[kind]
  const nomeExib = getNomeExibicao(item.fullName)
  const funcao = item.funcoes.join(', ')
  const whatsLider = process.env.WHATS_LIDER ?? siteConfig.whatsappNumber

  const variables: Record<string, string> =
    kind === 'D3' || kind === 'D1'
      ? {
          nome:       nomeExib,
          dia_semana: getDiaSemana(item.slotDate),
          data:       formatDateBr(item.slotDate),
          funcao,
          hora:       item.slotTime,
          local:      `${item.slotLabel} — ${item.churchName}`,
        }
      : {
          nome:        nomeExib,
          funcao,
          hora:        item.slotTime,
          local:       `${item.slotLabel} — ${item.churchName}`,
          whats_lider: whatsLider,
        }

  const result = await sendDisparoRaw({ phone: item.phone, messageId, variables })
  const status: 'sent' | 'failed' = result.success ? 'sent' : 'failed'

  // Upsert em escalas_lembretes_log — garante idempotência
  await supabase
    .from('escalas_lembretes_log')
    .upsert(
      {
        evento_id:    item.slotId,
        evento_data:  item.slotDate,
        person_id:    item.personId,
        phone:        item.phone,
        template_kind: kind,
        message_id:   messageId,
        status,
        status_code:  result.statusCode ?? null,
        sent_at:      new Date().toISOString(),
      },
      { onConflict: 'evento_id,evento_data,person_id,template_kind' },
    )
    .then(({ error }: any) => {
      if (error) console.error('[escalas-lembretes] lembretes_log upsert:', error)
    })

  // Insere também em disparos_log (log unificado da plataforma)
  await supabase
    .from('disparos_log')
    .insert({
      phone:           item.phone,
      nome:            nomeExib,
      status_code:     result.statusCode ?? null,
      source,
      conversion_type: KIND_TO_CONVERSION_TYPE[kind],
    })
    .then(({ error }: any) => {
      if (error) console.error('[escalas-lembretes] disparos_log insert:', error)
    })

  return { success: result.success, statusCode: result.statusCode }
}

// ── Run Scale Reminders ───────────────────────────────────────────────────────

export interface RunRemindersOptions {
  /** Quais kinds processar. Padrão: todos ['D3', 'D1', 'D0'] */
  kinds?: TemplateKind[]
  /** Override de data alvo por kind (YYYY-MM-DD). Padrão: hoje + offset. */
  targetDates?: Partial<Record<TemplateKind, string>>
  /** Source gravado em disparos_log. */
  source?: string
}

export interface RunRemindersResult {
  kind: TemplateKind
  targetDate: string
  total: number
  enviados: number
  pulados: number
  erros: number
}

/**
 * Função central: orquestra fetchAssignmentsByDate + getBlockedKeys + sendReminder
 * para cada kind solicitado.
 *
 * Usada tanto pelo cron (/api/cron/escalas-lembretes) quanto pelo
 * disparo manual (/api/admin/escalas/disparar-lembretes).
 */
export async function runScaleReminders(
  supabase: SupabaseClient,
  options: RunRemindersOptions = {},
): Promise<RunRemindersResult[]> {
  const kinds = options.kinds ?? (['D3', 'D1', 'D0'] as TemplateKind[])
  const source = options.source ?? 'escalas-lembretes'

  const results: RunRemindersResult[] = []

  for (const kind of kinds) {
    const targetDate =
      options.targetDates?.[kind] ?? getLocalDateMaceio(KIND_TO_OFFSET[kind])

    const items = await fetchAssignmentsByDate(supabase, targetDate)
    const blocked = await getBlockedKeys(supabase, items, kind)

    let enviados = 0
    let pulados = 0
    let erros = 0

    for (const item of items) {
      const key = `${item.slotId}:${item.personId}:${kind}`
      if (blocked.has(key)) {
        pulados++
        continue
      }
      const r = await sendReminder(supabase, item, kind, source)
      if (r.success) enviados++
      else erros++
    }

    console.log(
      `[escalas-lembretes] kind=${kind} date=${targetDate}` +
      ` total=${items.length} enviados=${enviados} pulados=${pulados} erros=${erros}`,
    )

    results.push({ kind, targetDate, total: items.length, enviados, pulados, erros })
  }

  return results
}
