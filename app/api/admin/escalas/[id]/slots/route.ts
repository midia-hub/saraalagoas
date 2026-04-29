import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

type Params = { params: { id: string } }

const VALID_TYPES = ['culto', 'arena', 'evento'] as const
type SlotType = (typeof VALID_TYPES)[number]

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function normalizeTimeOfDay(raw: unknown): string {
  if (raw == null || raw === '') return '19:00'
  const s = String(raw).trim()
  const m = s.match(/^(\d{1,2}):(\d{2})/)
  if (!m) return '19:00'
  const h = Math.min(23, Math.max(0, parseInt(m[1], 10) || 0))
  const min = Math.min(59, Math.max(0, parseInt(m[2], 10) || 0))
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

type IncomingSlot = { id?: string; type: string; label: string; date: string; time_of_day: string }

/** GET /api/admin/escalas/[id]/slots — lista slots com flag de quais já têm respostas */
export async function GET(request: NextRequest, { params }: Params) {
  const access = await requireAccess(request, { pageKey: 'escalas', action: 'view' })
  if (!access.ok) return access.response

  if (!UUID_RE.test(params.id)) {
    return NextResponse.json({ error: 'Identificador da escala inválido.' }, { status: 400 })
  }

  const supabase = createSupabaseAdminClient(request)

  const { data: slots, error } = await supabase
    .from('escalas_slots')
    .select('id, type, label, date, time_of_day, sort_order, funcoes')
    .eq('link_id', params.id)
    .order('date', { ascending: true })
    .order('time_of_day', { ascending: true })

  if (error) return NextResponse.json({ error: 'Erro ao buscar slots.' }, { status: 500 })

  const slotIds = (slots ?? []).map(s => s.id)
  let respondedSlotIds = new Set<string>()

  if (slotIds.length > 0) {
    const { data: respostas } = await supabase
      .from('escalas_respostas')
      .select('slot_id')
      .eq('link_id', params.id)
      .in('slot_id', slotIds)
    respondedSlotIds = new Set((respostas ?? []).map((r: { slot_id: string }) => r.slot_id))
  }

  const funcoes: string[] = slots && slots.length > 0 ? (slots[0].funcoes ?? []) : []

  return NextResponse.json({
    slots: (slots ?? []).map(s => ({ ...s, has_responses: respondedSlotIds.has(s.id) })),
    funcoes,
  })
}

/**
 * PUT /api/admin/escalas/[id]/slots
 * Body: { slots: { id?: string, type, label, date, time_of_day }[], funcoes: string[] }
 *
 * - Slots enviados COM id → atualizados no DB (label, data, hora, tipo)
 * - Slots no DB mas ausentes do payload → deletados APENAS SE não tiverem respostas
 * - Slots enviados SEM id → inseridos como novos
 * - Funcoes atualizada em todos os slots (existentes + novos)
 */
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const access = await requireAccess(request, { pageKey: 'escalas', action: 'edit' })
    if (!access.ok) return access.response

    if (!UUID_RE.test(params.id)) {
      return NextResponse.json({ error: 'Identificador da escala inválido.' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const { slots, funcoes } = body as {
      slots: unknown
      funcoes: unknown
    }

    if (!Array.isArray(slots)) {
      return NextResponse.json({ error: 'slots é obrigatório.' }, { status: 400 })
    }

    const funcoesArr = Array.isArray(funcoes)
      ? funcoes.filter((f): f is string => typeof f === 'string' && f.trim().length > 0)
      : []

    const supabase = createSupabaseAdminClient(request)

    const { data: linkRow, error: linkErr } = await supabase
      .from('escalas_links')
      .select('id')
      .eq('id', params.id)
      .maybeSingle()

    if (linkErr) {
      console.error('[slots PUT] link lookup:', linkErr)
      return NextResponse.json({ error: 'Erro ao verificar escala.' }, { status: 500 })
    }
    if (!linkRow) {
      return NextResponse.json({ error: 'Escala não encontrada.' }, { status: 404 })
    }

    const { data: existingSlots, error: exErr } = await supabase
      .from('escalas_slots')
      .select('id')
      .eq('link_id', params.id)

    if (exErr) {
      console.error('[slots PUT] existing slots:', exErr)
      return NextResponse.json({ error: 'Erro ao ler cultos/eventos atuais.' }, { status: 500 })
    }

    const existingIds = new Set((existingSlots ?? []).map((s: { id: string }) => s.id))

    const normalized: IncomingSlot[] = []
    for (let i = 0; i < slots.length; i++) {
      const raw = slots[i]
      if (!raw || typeof raw !== 'object') {
        return NextResponse.json({ error: `Item inválido na lista de datas (posição ${i + 1}).` }, { status: 400 })
      }
      const o = raw as Record<string, unknown>
      const idRaw = o.id
      const id =
        idRaw != null && String(idRaw).trim() !== '' ? String(idRaw).trim() : undefined

      if (id && !UUID_RE.test(id)) {
        return NextResponse.json({ error: 'Identificador de culto/evento inválido.' }, { status: 400 })
      }

      const typeStr = typeof o.type === 'string' && o.type.trim() ? o.type.trim() : 'culto'
      if (!VALID_TYPES.includes(typeStr as SlotType)) {
        return NextResponse.json({ error: `Tipo inválido: ${typeStr}` }, { status: 400 })
      }

      const label = typeof o.label === 'string' ? o.label.trim() : ''
      if (!label) {
        return NextResponse.json({ error: 'Nome é obrigatório em todos os cultos/eventos.' }, { status: 400 })
      }

      const date = typeof o.date === 'string' ? o.date.trim() : ''
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return NextResponse.json({ error: 'Data inválida em um dos cultos/eventos.' }, { status: 400 })
      }

      if (id && !existingIds.has(id)) {
        return NextResponse.json(
          {
            error:
              'A lista de cultos está desatualizada (recarregue o modal de edição e tente de novo).',
          },
          { status: 409 }
        )
      }

      normalized.push({
        id,
        type: typeStr,
        label,
        date,
        time_of_day: normalizeTimeOfDay(o.time_of_day),
      })
    }

    const submittedIds = new Set(normalized.filter(s => s.id).map(s => s.id!))
    const candidatesToDelete = [...existingIds].filter(id => !submittedIds.has(id))

    if (candidatesToDelete.length > 0) {
      const { data: respostas, error: respErr } = await supabase
        .from('escalas_respostas')
        .select('slot_id')
        .eq('link_id', params.id)
        .in('slot_id', candidatesToDelete)

      if (respErr) {
        console.error('[slots PUT] respostas check:', respErr)
        return NextResponse.json({ error: 'Erro ao verificar respostas dos voluntários.' }, { status: 500 })
      }

      const protectedIds = new Set((respostas ?? []).map((r: { slot_id: string }) => r.slot_id))
      const safeToDelete = candidatesToDelete.filter(id => !protectedIds.has(id))

      if (safeToDelete.length > 0) {
        const { error: delErr } = await supabase.from('escalas_slots').delete().in('id', safeToDelete)
        if (delErr) {
          console.error('[slots PUT] delete:', delErr)
          return NextResponse.json({ error: 'Erro ao remover cultos/eventos.' }, { status: 500 })
        }
      }
    }

    const toUpdate = normalized.filter(s => s.id && existingIds.has(s.id))
    for (const s of toUpdate) {
      const { error: upErr } = await supabase
        .from('escalas_slots')
        .update({
          type: s.type,
          label: s.label,
          date: s.date,
          time_of_day: s.time_of_day,
        })
        .eq('id', s.id!)
        .eq('link_id', params.id)

      if (upErr) {
        console.error('[slots PUT] update:', upErr)
        return NextResponse.json({ error: 'Erro ao atualizar culto/evento.' }, { status: 500 })
      }
    }

    const newSlots = normalized.filter(s => !s.id)
    if (newSlots.length > 0) {
      const { data: maxRow } = await supabase
        .from('escalas_slots')
        .select('sort_order')
        .eq('link_id', params.id)
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle()

      const baseOrder = (maxRow?.sort_order ?? -1) + 1

      const toInsert = newSlots.map((s, i) => ({
        link_id: params.id,
        type: s.type,
        label: s.label,
        date: s.date,
        time_of_day: s.time_of_day,
        source_id: null,
        sort_order: baseOrder + i,
        funcoes: funcoesArr,
      }))

      const { error: insertErr } = await supabase.from('escalas_slots').insert(toInsert)
      if (insertErr) {
        console.error('[slots PUT] insert:', insertErr)
        return NextResponse.json({ error: 'Erro ao salvar novos eventos.' }, { status: 500 })
      }
    }

    const { data: remaining } = await supabase
      .from('escalas_slots')
      .select('id')
      .eq('link_id', params.id)

    if ((remaining ?? []).length > 0) {
      const { error: updateErr } = await supabase
        .from('escalas_slots')
        .update({ funcoes: funcoesArr })
        .eq('link_id', params.id)

      if (updateErr) {
        console.error('[slots PUT] funcoes:', updateErr)
        return NextResponse.json({ error: 'Erro ao atualizar funções.' }, { status: 500 })
      }
    }

    const { data: updatedSlots, error: finalErr } = await supabase
      .from('escalas_slots')
      .select('id, type, label, date, time_of_day, sort_order, funcoes')
      .eq('link_id', params.id)
      .order('date', { ascending: true })
      .order('time_of_day', { ascending: true })

    if (finalErr) {
      console.error('[slots PUT] final select:', finalErr)
      return NextResponse.json({ ok: true, slots: [], funcoes: funcoesArr })
    }

    return NextResponse.json({ ok: true, slots: updatedSlots ?? [], funcoes: funcoesArr })
  } catch (e) {
    console.error('[slots PUT] unexpected:', e)
    return NextResponse.json({ error: 'Erro inesperado ao salvar a escala.' }, { status: 500 })
  }
}
