// lib/consolidacao-scope.ts
// Utilitário server-side para determinar o escopo de discípulos visíveis para um líder.
// Usa os vínculos existentes (células, equipes, pastores) até o módulo formal de liderança estar pronto.

import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Retorna os person_ids visíveis pelo líder dado (myPersonId),
 * usando vínculos de:
 *  - cells.leader_person_id / cells.co_leader_person_id
 *  - cell_lt_members (tabela de LT membros da célula, se existir)
 *  - teams.leader_person_id
 *  - church_pastors (pastores veem a igreja inteira)
 *
 * @returns string[] de person_ids (inclui conversion_followups.person_id)
 */
export async function getVisiblePeopleIdsForLeader(
  supabase: SupabaseClient,
  myPersonId: string
): Promise<string[]> {
  const personIds = new Set<string>()

  try {
    // 1) Células onde sou líder ou co-líder
    let leadCells: Array<{ id: string }> | null = null

    try {
      const { data } = await supabase
        .from('cells')
        .select('id')
        .or(`leader_person_id.eq.${myPersonId},co_leader_person_id.eq.${myPersonId}`)
      leadCells = data as Array<{ id: string }> | null
    } catch {
      const { data } = await supabase
        .from('cells')
        .select('id')
        .or(`leader_person_id.eq.${myPersonId},coleader_person_id.eq.${myPersonId}`)
      leadCells = data as Array<{ id: string }> | null
    }

    const leadCellIds = (leadCells ?? []).map((c: { id: string }) => c.id)

    if (leadCellIds.length > 0) {
      // Membros das células que lidero
      const { data: cellMembers } = await supabase
        .from('cell_members')
        .select('person_id')
        .in('cell_id', leadCellIds)
        .eq('is_active', true)

      for (const m of cellMembers ?? []) {
        if (m.person_id) personIds.add(m.person_id)
      }

      // LT membros (cell_lt_members), se tabela existir
      try {
        const { data: ltMembers } = await supabase
          .from('cell_lt_members')
          .select('person_id')
          .in('cell_id', leadCellIds)

        for (const m of ltMembers ?? []) {
          if (m.person_id) personIds.add(m.person_id)
        }
      } catch {
        // tabela pode não existir ainda, ignorar silenciosamente
      }
    }

    // 2) Equipes onde sou líder
    const { data: leadTeams } = await supabase
      .from('teams')
      .select('id')
      .eq('leader_person_id', myPersonId)

    const leadTeamIds = (leadTeams ?? []).map((t: { id: string }) => t.id)

    if (leadTeamIds.length > 0) {
      // Followups com team_id via conversoes
      const { data: teamConversions } = await supabase
        .from('conversoes')
        .select('person_id')
        .in('team_id', leadTeamIds)
        .not('person_id', 'is', null)

      for (const c of teamConversions ?? []) {
        if (c.person_id) personIds.add(c.person_id)
      }
    }

    // 3) Se sou pastor de alguma igreja: ver todas as conversões da igreja
    try {
      const { data: pastorOf } = await supabase
        .from('church_pastors')
        .select('church_id')
        .eq('person_id', myPersonId)

      const pastorChurchIds = (pastorOf ?? []).map((p: { church_id: string }) => p.church_id)

      if (pastorChurchIds.length > 0) {
        const { data: churchConversions } = await supabase
          .from('conversoes')
          .select('person_id')
          .in('church_id', pastorChurchIds)
          .not('person_id', 'is', null)

        for (const c of churchConversions ?? []) {
          if (c.person_id) personIds.add(c.person_id)
        }
      }
    } catch {
      // tabela church_pastors pode não existir, ignorar
    }
  } catch (err) {
    console.error('getVisiblePeopleIdsForLeader error:', err)
  }

  return Array.from(personIds)
}

/**
 * Retorna os church_ids que este líder tem vínculo (como pastor).
 */
export async function getChurchIdsForPastor(
  supabase: SupabaseClient,
  myPersonId: string
): Promise<string[]> {
  try {
    const { data } = await supabase
      .from('church_pastors')
      .select('church_id')
      .eq('person_id', myPersonId)
    return (data ?? []).map((r: { church_id: string }) => r.church_id)
  } catch {
    return []
  }
}
