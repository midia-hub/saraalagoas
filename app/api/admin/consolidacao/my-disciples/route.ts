import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { requireAccess } from '@/lib/admin-api'
import { getVisiblePeopleIdsForLeader } from '@/lib/consolidacao-scope'

export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'consolidacao', action: 'view' })
  if (!access.ok) return access.response

  const myUserId = access.snapshot.userId
  if (!myUserId) return NextResponse.json({ followups: [] })

  const supabase = createSupabaseAdminClient(request)

  // Resolve person_id for the logged user
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, person_id')
    .eq('id', myUserId)
    .single()

  if (!profile?.person_id) {
    return NextResponse.json({ followups: [], message: 'Perfil sem person_id vinculado' })
  }

  const personIds = await getVisiblePeopleIdsForLeader(supabase, profile.person_id)

  if (personIds.length === 0) {
    return NextResponse.json({ followups: [] })
  }

  const { data: followups, error } = await supabase
    .from('consolidation_followups')
    .select(`
      *,
      person:people!consolidation_followups_person_id_fkey(
        id, full_name, mobile_phone, email
      ),
      conversion:conversoes!consolidation_followups_conversion_id_fkey(
        id, data_conversao, culto
      ),
      leader:people!consolidation_followups_leader_person_id_fkey(
        id, full_name
      )
    `)
    .in('person_id', personIds)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[my-disciples] error', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Aggregate attendance summary per person
  const { data: attRows } = await supabase
    .from('worship_attendance')
    .select('person_id, attended_on')
    .in('person_id', personIds)
    .eq('attended', true)
    .gte('attended_on', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))

  const summaryMap: Record<string, { total_last30: number; last_dates: string[] }> = {}
  for (const row of attRows ?? []) {
    if (!summaryMap[row.person_id]) summaryMap[row.person_id] = { total_last30: 0, last_dates: [] }
    summaryMap[row.person_id].total_last30++
    summaryMap[row.person_id].last_dates.push(row.attended_on)
  }

  const enriched = (followups ?? []).map((f: Record<string, unknown>) => ({ ...f, attendance_summary: summaryMap[f.person_id as string] ?? { total_last30: 0, last_dates: [] } }))

  return NextResponse.json({ items: enriched, followups: enriched, my_person_id: profile.person_id })
}
