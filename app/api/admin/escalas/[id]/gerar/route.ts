import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

type Params = { params: { id: string } }

export type AssignmentRow = {
  funcao: string
  person_id: string
  person_name: string
}

export type SlotResult = {
  slot_id: string
  type: string
  label: string
  date: string
  time_of_day: string
  sort_order: number
  assignments: AssignmentRow[]
  faltando: string[]   // funções que não foram preenchidas
}

export type GerarResult = {
  slots: SlotResult[]
  alertas: string[]    // mensagens de warning
}

/** Embaralha array (Fisher-Yates) */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * POST /api/admin/escalas/[id]/gerar
 * Gera a escala (sem salvar) e retorna o resultado para preview.
 * O frontend pode chamar N vezes para "gerar novamente".
 */
export async function POST(request: NextRequest, { params }: Params) {
  const access = await requireAccess(request, { pageKey: 'escalas', action: 'edit' })
  if (!access.ok) return access.response

  const supabase = createSupabaseAdminClient(request)

  // ── 1. Busca slots ordenados cronologicamente ───────────────────────────
  const { data: slotsData, error: slotsErr } = await supabase
    .from('escalas_slots')
    .select('id, type, label, date, time_of_day, sort_order, funcoes')
    .eq('link_id', params.id)
    .order('date', { ascending: true })
    .order('time_of_day', { ascending: true })

  if (slotsErr || !slotsData?.length) {
    return NextResponse.json({ error: 'Nenhum culto/evento encontrado na escala.' }, { status: 400 })
  }

  // ── 1.1 Limpeza/Deduplicação de slots ────────────────────────────────────
  // Algumas bases podem ter duplicidade (ex: 'Arena' cadastrado como Culto e como Arena no mesmo horário).
  // ATENÇÃO: slots do tipo 'evento' nunca são deduplicados — são eventos especiais adicionados
  // manualmente pelo admin e devem sempre ser preservados na escala.
  const filteredSlotsData = slotsData.reduce((acc: any[], current) => {
    // Normaliza tipo se nome contiver "Arena" E o slot veio como culto (provavelmente cadastro duplo)
    if (current.label.toLowerCase().includes('arena') && current.type === 'culto') {
      current.type = 'arena'
    }

    // Eventos especiais nunca são deduplicados
    if (current.type === 'evento') {
      acc.push(current)
      return acc
    }

    const duplicateIndex = acc.findIndex(s => 
      s.type !== 'evento' &&
      s.date === current.date && 
      s.time_of_day === current.time_of_day && 
      s.label.toLowerCase() === current.label.toLowerCase()
    )

    if (duplicateIndex === -1) {
      acc.push(current)
    } else {
      // Se houver duplicata entre cultos/arenas, preferimos o tipo 'arena' ou o que tem mais funções
      const existing = acc[duplicateIndex]
      const currentIsPref = current.type === 'arena' || (current.funcoes?.length ?? 0) > (existing.funcoes?.length ?? 0)
      if (currentIsPref) acc[duplicateIndex] = current
    }
    return acc
  }, [])

  // ── 2. Busca voluntários (vai_servir = true) ─────────────────────────────
  const { data: evData } = await supabase
    .from('escalas_voluntarios')
    .select('person_id, vai_servir, funcoes')
    .eq('link_id', params.id)
    .eq('vai_servir', true)      // só quem confirmou que vai servir

  const eligibleIds = (evData ?? [])
    .filter(ev => ev.funcoes && ev.funcoes.length > 0)  // deve ter ao menos 1 função
    .map(ev => ({ person_id: ev.person_id, funcoes: ev.funcoes as string[] }))

  if (eligibleIds.length === 0) {
    return NextResponse.json({
      error: 'Nenhum voluntário confirmado com funções definidas. Configure "vai servir" e as funções antes de gerar.',
    }, { status: 400 })
  }

  // ── 3. Busca nomes dos voluntários ───────────────────────────────────────
  const { data: peopleData } = await supabase
    .from('people')
    .select('id, full_name')
    .in('id', eligibleIds.map(e => e.person_id))

  const nameMap: Record<string, string> = {}
  for (const p of peopleData ?? []) nameMap[p.id] = p.full_name

  // ── 4. Busca respostas de disponibilidade ────────────────────────────────
  const { data: respostas } = await supabase
    .from('escalas_respostas')
    .select('person_id, slot_id, disponivel')
    .eq('link_id', params.id)

  // Mapa: person_id → slot_id → disponivel
  const respMap: Record<string, Record<string, boolean>> = {}
  for (const r of respostas ?? []) {
    if (!respMap[r.person_id]) respMap[r.person_id] = {}
    respMap[r.person_id][r.slot_id] = r.disponivel
  }

  // ── 5. Embaralha voluntários (ordem diferente a cada geração) ────────────
  const volunteers = shuffle(eligibleIds)

  // ── 6. Algoritmo de alocação ─────────────────────────────────────────────
  // Controle de quais slots cada voluntário já foi alocado
  const assignedSlots: Record<string, Set<string>> = {}
  for (const v of volunteers) assignedSlots[v.person_id] = new Set()

  const results: SlotResult[] = []

  for (let si = 0; si < filteredSlotsData.length; si++) {
    const slot = filteredSlotsData[si]
    const prevSlotId = si > 0 ? filteredSlotsData[si - 1].id : null

    const assignments: AssignmentRow[] = []
    const faltando: string[] = []
    const usedInThisSlot = new Set<string>() // person_ids já alocados neste slot

    const funcoes: string[] = slot.funcoes ?? []

    if (funcoes.length === 0) {
      // Slot sem funções definidas → sem alocação
      results.push({ slot_id: slot.id, type: slot.type, label: slot.label, date: slot.date, time_of_day: slot.time_of_day, sort_order: slot.sort_order, assignments: [], faltando: [] })
      continue
    }

    for (const funcao of funcoes) {
      let assigned = false

      // Busca candidatos que possuem a função e respeitam as regras
      const candidates = volunteers.filter(v => {
        // Regra: deve ter esta função
        if (!v.funcoes.includes(funcao)) return false

        // Regra: não pode estar em duas funções no mesmo slot
        if (usedInThisSlot.has(v.person_id)) return false

        // Regra: não colocar em slots sequenciais (slot anterior)
        if (prevSlotId && assignedSlots[v.person_id].has(prevSlotId)) return false

        // Regra: verificar disponibilidade
        const resp = respMap[v.person_id]?.[slot.id]
        if (resp === false) return false

        return true
      })

      // Ordena candidatos pelo número de alocações já recebidas (para rotatividade/balanceamento)
      // Como a lista original 'volunteers' já está embaralhada, pessoas com o mesmo
      // número de alocações manterão uma ordem aleatória estável entre si.
      candidates.sort((a, b) => assignedSlots[a.person_id].size - assignedSlots[b.person_id].size)

      if (candidates.length > 0) {
        const v = candidates[0]
        // Aloca!
        assignments.push({
          funcao,
          person_id: v.person_id,
          person_name: nameMap[v.person_id] ?? v.person_id,
        })
        usedInThisSlot.add(v.person_id)
        assignedSlots[v.person_id].add(slot.id)
        assigned = true
      }

      if (!assigned) faltando.push(funcao)
    }

    results.push({
      slot_id: slot.id,
      type: slot.type,
      label: slot.label,
      date: slot.date,
      time_of_day: slot.time_of_day,
      sort_order: slot.sort_order,
      assignments,
      faltando,
    })
  }

  // ── 7. Monta alertas ─────────────────────────────────────────────────────
  const alertas: string[] = []
  const slotsComFalta = results.filter(r => r.faltando.length > 0)
  if (slotsComFalta.length > 0) {
    for (const s of slotsComFalta) {
      const dataFmt = new Date(s.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      alertas.push(`${s.label} (${dataFmt}): faltam "${s.faltando.join('", "')}"`)
    }
  }

  // ── 8. Revisão das regras (double-check) ─────────────────────────────────
  for (const r of results) {
    // Sem duplicações de pessoa no mesmo slot?
    const seen = new Set<string>()
    for (const a of r.assignments) {
      if (seen.has(a.person_id)) {
        alertas.push(`⚠ Duplicação detectada em "${r.label}": ${a.person_name} — corrigido.`)
      }
      seen.add(a.person_id)
    }
  }

  const response: GerarResult = { slots: results, alertas }

  return NextResponse.json(response)
}
