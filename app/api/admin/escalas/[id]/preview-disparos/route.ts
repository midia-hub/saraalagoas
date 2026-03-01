import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

type Params = { params: { id: string } }

type SlotPreview = {
  slot_id: string
  label: string
  date: string
  time_of_day: string
  type: string
  funcao: string
}

export type RecipientPreview = {
  person_id: string
  person_name: string
  /** undefined = não buscado ainda */
  phone: string | null
  /** 4 últimos dígitos do telefone, null se sem telefone */
  phone_last4: string | null
  has_phone: boolean
  slots: SlotPreview[]
}

export type PreviewDisparosResponse = {
  ok: true
  recipients: RecipientPreview[]
  sem_telefone: number
  com_telefone: number
  total: number
}

/**
 * GET /api/admin/escalas/[id]/preview-disparos
 *
 * Retorna a lista completa de destinatários da escala publicada,
 * com status de telefone para cada um.
 * Usado para pré-visualização antes de disparar.
 */
export async function GET(request: NextRequest, { params }: Params) {
  const access = await requireAccess(request, { pageKey: 'escalas', action: 'view' })
  if (!access.ok) return access.response

  const supabase = createSupabaseAdminClient(request)

  // Busca a escala publicada (ou rascunho — mostramos de qualquer forma)
  const { data: publicada } = await supabase
    .from('escalas_publicadas')
    .select('status, dados')
    .eq('link_id', params.id)
    .maybeSingle()

  if (!publicada?.dados) {
    return NextResponse.json({ ok: true, recipients: [], sem_telefone: 0, com_telefone: 0, total: 0 })
  }

  const slots = ((publicada.dados as any)?.slots ?? []) as Array<{
    slot_id: string; label: string; date: string; time_of_day: string; type: string
    assignments: Array<{ person_id: string; person_name: string; funcao: string }>
  }>

  // Agrupa por pessoa → lista de slots com funcão
  const byPerson: Record<string, { name: string; slots: SlotPreview[] }> = {}

  for (const slot of slots) {
    for (const a of slot.assignments ?? []) {
      if (!a.person_id) continue
      if (!byPerson[a.person_id]) {
        byPerson[a.person_id] = { name: a.person_name, slots: [] }
      }
      byPerson[a.person_id].slots.push({
        slot_id: slot.slot_id,
        label: slot.label,
        date: slot.date,
        time_of_day: slot.time_of_day,
        type: slot.type,
        funcao: a.funcao,
      })
    }
  }

  const personIds = Object.keys(byPerson)
  if (personIds.length === 0) {
    return NextResponse.json({ ok: true, recipients: [], sem_telefone: 0, com_telefone: 0, total: 0 })
  }

  // Busca telefones
  const { data: people } = await supabase
    .from('people')
    .select('id, full_name, mobile_phone, phone')
    .in('id', personIds)

  const phoneMap: Record<string, { full_name: string; phone: string | null }> = {}
  for (const p of people ?? []) {
    phoneMap[p.id] = { full_name: p.full_name, phone: p.mobile_phone || p.phone || null }
  }

  // Monta lista final ordenada por nome
  const recipients: RecipientPreview[] = Object.entries(byPerson)
    .map(([personId, { name, slots: pSlots }]) => {
      const person = phoneMap[personId]
      const phone = person?.phone ?? null
      return {
        person_id: personId,
        person_name: person?.full_name ?? name,
        phone,
        phone_last4: phone ? phone.slice(-4) : null,
        has_phone: !!phone,
        slots: pSlots.sort((a, b) => a.date.localeCompare(b.date) || a.time_of_day.localeCompare(b.time_of_day)),
      }
    })
    .sort((a, b) => a.person_name.localeCompare(b.person_name, 'pt-BR'))

  const com_telefone = recipients.filter(r => r.has_phone).length
  const sem_telefone = recipients.filter(r => !r.has_phone).length

  return NextResponse.json({
    ok: true,
    recipients,
    com_telefone,
    sem_telefone,
    total: recipients.length,
  } satisfies PreviewDisparosResponse)
}
