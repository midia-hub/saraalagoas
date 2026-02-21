import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { canAccessPerson } from '@/lib/people-access'

const MERGE_FIELDS = [
  'leader_person_id',
  'spouse_person_id',
  'full_name',
  'church_profile',
  'church_situation',
  'church_role',
  'sex',
  'birth_date',
  'marital_status',
  'marriage_date',
  'rg',
  'cpf',
  'special_needs',
  'cep',
  'city',
  'state',
  'neighborhood',
  'address_line',
  'address_number',
  'address_complement',
  'email',
  'mobile_phone',
  'phone',
  'entry_by',
  'entry_date',
  'status_in_church',
  'conversion_date',
  'is_baptized',
  'baptism_date',
  'is_leader',
  'is_pastor',
  'education_level',
  'profession',
  'nationality',
  'birthplace',
  'interviewed_by',
  'registered_by',
  'blood_type',
  'avatar_url',
]

const MISSING_TABLE_CODES = new Set(['42P01', '42703', 'PGRST204', 'PGRST205'])

function isMissingTable(err: any): boolean {
  if (!err) return false
  if (err.code && MISSING_TABLE_CODES.has(err.code)) return true
  if (typeof err.message === 'string' && err.message.includes('does not exist')) return true
  if (typeof err.message === 'string' && err.message.includes('schema cache')) return true
  return false
}

async function safeUpdate(
  supabase: any,
  table: string,
  column: string,
  sourceId: string,
  targetId: string
) {
  const { error } = await supabase
    .from(table)
    .update({ [column]: targetId })
    .eq(column, sourceId)

  if (error && !isMissingTable(error)) throw error
}

function formatErrorMessage(err: any): string {
  if (!err) return 'Erro interno do servidor'
  if (err instanceof Error) return err.message
  if (typeof err.message === 'string') return err.message
  return 'Erro interno do servidor'
}

async function dedupeAndUpdate(
  supabase: any,
  table: string,
  keyColumn: string,
  personColumn: string,
  sourceId: string,
  targetId: string
) {
  const { data, error } = await supabase
    .from(table)
    .select(`${keyColumn}, ${personColumn}`)
    .in(personColumn, [sourceId, targetId])

  if (error) {
    if (isMissingTable(error)) return
    throw error
  }

  const targetKeys = new Set(
    (data ?? []).filter((r: any) => r[personColumn] === targetId).map((r: any) => r[keyColumn])
  )
  const dupKeys = (data ?? [])
    .filter((r: any) => r[personColumn] === sourceId && targetKeys.has(r[keyColumn]))
    .map((r: any) => r[keyColumn])

  if (dupKeys.length > 0) {
    const { error: delError } = await supabase
      .from(table)
      .delete()
      .eq(personColumn, sourceId)
      .in(keyColumn, dupKeys)
    if (delError && !isMissingTable(delError)) throw delError
  }

  const { error: updError } = await supabase
    .from(table)
    .update({ [personColumn]: targetId })
    .eq(personColumn, sourceId)

  if (updError && !isMissingTable(updError)) throw updError
}

async function dedupeDiscipulados(
  supabase: any,
  sourceId: string,
  targetId: string
) {
  const { data: rows, error } = await supabase
    .from('discipulados')
    .select('discipulador_person_id, discipulo_person_id')
    .or(`discipulador_person_id.eq.${sourceId},discipulador_person_id.eq.${targetId},discipulo_person_id.eq.${sourceId},discipulo_person_id.eq.${targetId}`)

  if (error) {
    if (isMissingTable(error)) return
    throw error
  }

  const targetAsLeader = new Set(
    (rows ?? [])
      .filter((r: any) => r.discipulador_person_id === targetId)
      .map((r: any) => r.discipulo_person_id)
  )
  const dupLeaderRows = (rows ?? [])
    .filter((r: any) => r.discipulador_person_id === sourceId && targetAsLeader.has(r.discipulo_person_id))

  if (dupLeaderRows.length > 0) {
    await supabase
      .from('discipulados')
      .delete()
      .eq('discipulador_person_id', sourceId)
      .in('discipulo_person_id', dupLeaderRows.map((r: any) => r.discipulo_person_id))
  }

  const { error: updLeaderErr } = await supabase
    .from('discipulados')
    .update({ discipulador_person_id: targetId })
    .eq('discipulador_person_id', sourceId)
  if (updLeaderErr && !isMissingTable(updLeaderErr)) throw updLeaderErr

  const targetAsDisciple = new Set(
    (rows ?? [])
      .filter((r: any) => r.discipulo_person_id === targetId)
      .map((r: any) => r.discipulador_person_id)
  )
  const dupDiscipleRows = (rows ?? [])
    .filter((r: any) => r.discipulo_person_id === sourceId && targetAsDisciple.has(r.discipulador_person_id))

  if (dupDiscipleRows.length > 0) {
    await supabase
      .from('discipulados')
      .delete()
      .eq('discipulo_person_id', sourceId)
      .in('discipulador_person_id', dupDiscipleRows.map((r: any) => r.discipulador_person_id))
  }

  const { error: updDiscErr } = await supabase
    .from('discipulados')
    .update({ discipulo_person_id: targetId })
    .eq('discipulo_person_id', sourceId)
  if (updDiscErr && !isMissingTable(updDiscErr)) throw updDiscErr
}

async function mergeProfiles(
  supabase: any,
  sourceId: string,
  targetId: string
) {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, person_id')
    .in('person_id', [sourceId, targetId])

  if (error) {
    if (isMissingTable(error)) return
    throw error
  }

  const hasTarget = (profiles ?? []).some((p: any) => p.person_id === targetId)
  const sourceProfiles = (profiles ?? []).filter((p: any) => p.person_id === sourceId)

  if (hasTarget && sourceProfiles.length > 0) {
    const sourceIds = sourceProfiles.map((p: any) => p.id)
    const { error: delError } = await supabase
      .from('profiles')
      .delete()
      .in('id', sourceIds)
    if (delError && !isMissingTable(delError)) throw delError
    return
  }

  if (!hasTarget) {
    const { error: updError } = await supabase
      .from('profiles')
      .update({ person_id: targetId })
      .eq('person_id', sourceId)
    if (updError && !isMissingTable(updError)) throw updError
  }
}

export async function POST(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'pessoas', action: 'edit' })
  if (!access.ok) return access.response

  try {
    const body = await request.json().catch(() => ({}))
    const sourceId = String(body.source_id || '')
    const targetId = String(body.target_id || '')
    const choices = (body.field_choices ?? {}) as Record<string, 'left' | 'right' | 'source' | 'target'>

    if (!sourceId || !targetId) {
      return NextResponse.json({ error: 'source_id e target_id sao obrigatorios.' }, { status: 400 })
    }
    if (sourceId === targetId) {
      return NextResponse.json({ error: 'source_id e target_id devem ser diferentes.' }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient(request)

    if (!access.snapshot.isAdmin) {
      const [canSource, canTarget] = await Promise.all([
        canAccessPerson(access.snapshot, sourceId),
        canAccessPerson(access.snapshot, targetId),
      ])
      if (!canSource || !canTarget) {
        return NextResponse.json({ error: 'Acesso negado para mesclar estas pessoas.' }, { status: 403 })
      }
    }

    const { data: people, error: peopleError } = await supabase
      .from('people')
      .select('*')
      .in('id', [sourceId, targetId])

    if (peopleError) {
      console.error('merge people fetch:', peopleError)
      return NextResponse.json({ error: 'Erro ao buscar pessoas.' }, { status: 500 })
    }

    const source = (people ?? []).find((p: any) => p.id === sourceId)
    const target = (people ?? []).find((p: any) => p.id === targetId)
    if (!source || !target) {
      return NextResponse.json({ error: 'Pessoa nao encontrada.' }, { status: 404 })
    }

    const payload: Record<string, unknown> = {}
    for (const field of MERGE_FIELDS) {
      const choice = choices[field]
      if (choice === 'source') {
        payload[field] = source[field]
      } else if (choice === 'target') {
        payload[field] = target[field]
      } else if (choice === 'right') {
        payload[field] = source[field]
      } else {
        payload[field] = target[field]
      }
    }
    payload.updated_at = new Date().toISOString()

    const { error: updateError } = await supabase
      .from('people')
      .update(payload)
      .eq('id', targetId)

    if (updateError) {
      console.error('merge people update target:', updateError)
      return NextResponse.json({ error: 'Erro ao atualizar pessoa destino.' }, { status: 500 })
    }

    // Dedupe + move references with unique constraints
    await dedupeAndUpdate(supabase, 'revisao_vidas_registrations', 'event_id', 'person_id', sourceId, targetId)
    await dedupeAndUpdate(supabase, 'cell_lt_members', 'cell_id', 'person_id', sourceId, targetId)
    await dedupeAndUpdate(supabase, 'cell_people', 'cell_id', 'person_id', sourceId, targetId)
    await dedupeAndUpdate(supabase, 'cell_attendances', 'cell_realization_id', 'person_id', sourceId, targetId)
    await dedupeAndUpdate(supabase, 'team_leaders', 'team_id', 'person_id', sourceId, targetId)
    await dedupeAndUpdate(supabase, 'arena_leaders', 'arena_id', 'person_id', sourceId, targetId)
    await dedupeAndUpdate(supabase, 'church_pastors', 'church_id', 'person_id', sourceId, targetId)
    await dedupeDiscipulados(supabase, sourceId, targetId)

    // Simple updates
    await safeUpdate(supabase, 'conversoes', 'person_id', sourceId, targetId)
    await safeUpdate(supabase, 'conversoes', 'consolidator_person_id', sourceId, targetId)
    await safeUpdate(supabase, 'conversoes', 'consolidador_id', sourceId, targetId)
    await safeUpdate(supabase, 'consolidation_followups', 'person_id', sourceId, targetId)
    await safeUpdate(supabase, 'consolidation_followups', 'leader_person_id', sourceId, targetId)
    await safeUpdate(supabase, 'consolidation_followups', 'consolidator_person_id', sourceId, targetId)
    await safeUpdate(supabase, 'worship_attendance', 'person_id', sourceId, targetId)
    await safeUpdate(supabase, 'worship_attendance', 'leader_person_id', sourceId, targetId)
    await safeUpdate(supabase, 'offerings', 'person_id', sourceId, targetId)
    await safeUpdate(supabase, 'prayer_requests', 'person_id', sourceId, targetId)
    await safeUpdate(supabase, 'sales', 'customer_person_id', sourceId, targetId)
    await safeUpdate(supabase, 'worship_services', 'person_id', sourceId, targetId)
    await safeUpdate(supabase, 'worship_services', 'leader_person_id', sourceId, targetId)
    await mergeProfiles(supabase, sourceId, targetId)
    await safeUpdate(supabase, 'people', 'leader_person_id', sourceId, targetId)
    await safeUpdate(supabase, 'people', 'spouse_person_id', sourceId, targetId)
    await safeUpdate(supabase, 'cells', 'leader_person_id', sourceId, targetId)
    await safeUpdate(supabase, 'cells', 'coleader_person_id', sourceId, targetId)
    await safeUpdate(supabase, 'cells', 'supervisor_person_id', sourceId, targetId)

    const { error: deleteError } = await supabase
      .from('people')
      .delete()
      .eq('id', sourceId)

    if (deleteError) {
      console.error('merge people delete source:', deleteError)
      return NextResponse.json({
        error: formatErrorMessage(deleteError),
        details: deleteError,
      }, { status: 500 })
    }

    return NextResponse.json({ ok: true, target_id: targetId, source_id: sourceId })
  } catch (err) {
    console.error('POST /api/admin/people/merge:', err)
    return NextResponse.json({
      error: process.env.NODE_ENV === 'development' ? formatErrorMessage(err) : 'Erro interno do servidor',
      details: process.env.NODE_ENV === 'development' ? err : undefined,
    }, { status: 500 })
  }
}
