import { createSupabaseAdminClient } from '@/lib/supabase-server'

type PromotionArgs = {
  supabase: ReturnType<typeof createSupabaseAdminClient>
  cellId: string
  cellPersonIds: string[]
}

/**
 * Rule-based automatic promotion of cell visitors to members.
 * Rule A: 3 consecutive attendances marked as 'V' (Present).
 * Rule B: 4 attendances marked as 'V' out of the last 5 realizations.
 */
export async function maybePromoteCellPeople({ supabase, cellId, cellPersonIds }: PromotionArgs) {
  const { data: recentRels, error: relError } = await supabase
    .from('cell_realizations')
    .select('id, realization_date')
    .eq('cell_id', cellId)
    .order('realization_date', { ascending: false })
    .limit(5)

  if (relError || !recentRels || recentRels.length === 0) {
    return
  }

  for (const cellPersonId of cellPersonIds) {
    const { data: cellPerson, error: cpError } = await supabase
      .from('cell_people')
      .select('id, type, person_id, full_name, phone')
      .eq('id', cellPersonId)
      .maybeSingle()

    // Só promove quem é VISITANTE
    if (cpError || !cellPerson || cellPerson.type !== 'visitor') {
      continue
    }

    const { data: attRows } = await supabase
      .from('cell_attendances')
      .select('realization_id, status')
      .eq('cell_person_id', cellPersonId)
      .in('realization_id', recentRels.map((r) => r.id))

    const statusByRel = new Map<string, string>()
    for (const att of attRows || []) {
      statusByRel.set(att.realization_id, att.status)
    }

    // Mapear status para os mais recentes (se faltar, assumimos X ou vazio)
    const statuses = recentRels.map((rel) => statusByRel.get(rel.id) || 'X')

    const last3 = statuses.slice(0, 3)
    const last5 = statuses.slice(0, 5)

    // Regra A: 3 últimas presenças seguidas
    const ruleA = last3.length >= 3 && last3.slice(0, 3).every((s) => s === 'V')
    
    // Regra B: 4 de 5 presenças
    const vCount = last5.filter((s) => s === 'V').length
    const ruleB = last5.length >= 5 && vCount >= 4

    if (!ruleA && !ruleB) {
      continue
    }

    let personId = cellPerson.person_id
    
    // Se não tiver person_id vinculado, cria um registro na tabela 'people' (igreja)
    if (!personId) {
      const { data: newPerson, error: personError } = await supabase
        .from('people')
        .insert({
          full_name: cellPerson.full_name || 'Visitante',
          phone: cellPerson.phone || null
        })
        .select('id')
        .single()

      if (personError || !newPerson) {
        console.error('Erro ao criar pessoa na igreja durante promoção:', personError)
        continue
      }
      personId = newPerson.id
    }

    // Promove para MEMBRO
    await supabase
      .from('cell_people')
      .update({
        type: 'member',
        person_id: personId,
        updated_at: new Date().toISOString()
      })
      .eq('id', cellPersonId)
  }
}
