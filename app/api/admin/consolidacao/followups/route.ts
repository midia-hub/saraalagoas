import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { getRealizedWorshipCount } from '@/lib/worship-utils'

const FOLLOWUP_SELECT = 'id, person_id, conversion_id, consolidator_person_id, leader_person_id, contacted, contacted_at, contacted_channel, contacted_notes, fono_visit_done, fono_visit_date, visit_done, visit_date, status, next_review_event_id, next_review_date, notes, created_at, updated_at'

/**
 * GET /api/admin/consolidacao/followups
 * Lista followups enriquecidos com dados da pessoa, conversão, líder e frequência.
 * Filtros: status, church_id, cell_id, q (nome/email/telefone), from, to
 *
 * POST /api/admin/consolidacao/followups
 * Cria ou retorna followup existente para um person_id.
 */

export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'consolidacao', action: 'view' })
  if (!access.ok) return access.response

  try {
    const supabase = createSupabaseAdminClient(request)
    const sp = request.nextUrl.searchParams
    const status = sp.get('status') ?? ''
    const churchId = sp.get('church_id') ?? ''
    const cellId = sp.get('cell_id') ?? ''
    const q = sp.get('q')?.trim() ?? ''
    const from = sp.get('from') ?? ''
    const to = sp.get('to') ?? ''

    // 1) Busca followups com filtros
    let followupQuery = supabase
      .from('consolidation_followups')
      .select(FOLLOWUP_SELECT)
      .order('created_at', { ascending: false })

    if (status) followupQuery = followupQuery.eq('status', status)

    const { data: followups, error: followupError } = await followupQuery
    if (followupError) {
      console.error('GET followups:', followupError)
      return NextResponse.json({ error: 'Erro ao listar acompanhamentos' }, { status: 500 })
    }

    // 2) Se não há status filtrado ou status é 'em_acompanhamento'/'direcionado_revisao', buscar conversões pendentes
    let pendingConversions: any[] = []
    const statuses = ['em_acompanhamento', 'direcionado_revisao', '']
    const shouldIncludePending = !status || statuses.includes(status)

    if (shouldIncludePending) {
      // IDs de pessoas que já têm followup
      const followupPersonIds = new Set((followups ?? []).map((f: any) => f.person_id).filter(Boolean))

      // Buscar conversões que NÃO têm followup ou cujos followups não estão em status "concluído"
      let convQuery = supabase
        .from('conversoes')
        .select('id, person_id, data_conversao, conversion_type, culto, church_id, cell_id, team_id, nome, email, telefone')

      const { data: allConversions, error: convError } = await convQuery
      if (!convError && allConversions) {
        // Filtrar apenas conversões cujas pessoas NÃO têm followup ainda
        pendingConversions = (allConversions as any[]).filter(conv => !followupPersonIds.has(conv.person_id))
      }
    }

    // Combinar followups + conversões pendentes
    const allData = [...(followups ?? []), ...pendingConversions]

    if (!allData || allData.length === 0) {
      return NextResponse.json({ followups: [], items: [] })
    }

    const personIds = [...new Set(allData
      .map((item: any) => item.person_id || (item.nome ? 'virtual' : null))
      .filter(Boolean))]
    const conversionIds = [...new Set(allData
      .map((item: any) => item.id || item.conversion_id)
      .filter(Boolean))]
    const leaderIds = [...new Set(allData
      .map((item: any) => item.leader_person_id || item.consolidator_person_id)
      .filter(Boolean))]

    // 3) Buscar pessoas
    const { data: people } = await supabase
      .from('people')
      .select('id, full_name, mobile_phone, email')
      .in('id', personIds)

    // 4) Buscar conversões (necessário para followups com conversion_id)
    const conversionMap = new Map<string, any>()
    if (conversionIds.length > 0) {
      const { data: conversions, error: conversionsError } = await supabase
        .from('conversoes')
        .select('id, person_id, data_conversao, conversion_type, culto, church_id, cell_id')
        .in('id', conversionIds)

      if (conversionsError) {
        console.error('GET conversions for followups:', conversionsError)
      }

      for (const conv of conversions ?? []) {
        conversionMap.set(conv.id, conv)
      }
    }

    // Também mapear conversões que já vieram no allData (pendentes)
    for (const item of allData) {
      if (item.id && item.data_conversao) {
        conversionMap.set(item.id, item)
      }
    }

    // 5) Buscar líderes/consolidadores
    const { data: leaders } = leaderIds.length > 0
      ? await supabase.from('people').select('id, full_name').in('id', leaderIds)
      : { data: [] }

    // 6) Frequência desde data de conversão até hoje
    // Primeiro, coletar todas as datas de conversão
    const conversionDateMap = new Map<string, string>() // person_id -> data_conversao
    for (const item of allData) {
      const personId = item.person_id
      if (personId && item.data_conversao) {
        conversionDateMap.set(personId, item.data_conversao)
      }
    }

    // Encontrar a data mais antiga para buscar presenças desde lá
    let minDate = new Date().toISOString().slice(0, 10)
    for (const date of conversionDateMap.values()) {
      if (date < minDate) minDate = date
    }

    // Buscar todas as presenças desde a data mais antiga até hoje
    const { data: attendances } = await supabase
      .from('worship_attendance')
      .select('person_id, attended_on, attended')
      .in('person_id', personIds)
      .gte('attended_on', minDate)
      .eq('attended', true)
      .order('attended_on', { ascending: false })

    // Maps
    const peopleMap = new Map((people ?? []).map((p: any) => [p.id, p]))
    const leaderMap = new Map((leaders ?? []).map((l: any) => [l.id, l]))
    const attendanceByPerson = new Map<string, string[]>()
    
    // Contar presenças apenas dentro do período de cada pessoa (desde sua conversão)
    for (const att of attendances ?? []) {
      const pid = att.person_id as string
      const convDate = conversionDateMap.get(pid)
      
      // Só contar presenças após a data de conversão
      if (convDate && att.attended_on >= convDate) {
        if (!attendanceByPerson.has(pid)) attendanceByPerson.set(pid, [])
        attendanceByPerson.get(pid)!.push(att.attended_on as string)
      }
    }

    // Cálculo centralizado de totais por igreja + data
    const todayStr = new Date().toISOString().slice(0, 10)
    const frequencyCache = new Map<string, number>() // "churchId|startDate" -> total

    // 7) Enriquecer e aplicar filtros extras
    const enrichedItems = []
    for (const item of allData) {
      const isFollowup = !!item.status
      const personId = item.person_id
      const conversion = isFollowup 
        ? (item.conversion_id ? conversionMap.get(item.conversion_id) : null)
        : { id: item.id, data_conversao: item.data_conversao, church_id: item.church_id, cell_id: item.cell_id }

      const churchIdForFreq = conversion?.church_id
      const convDate = conversion?.data_conversao || item.created_at?.slice(0, 10)
      
      let totalExpected = 0
      if (churchIdForFreq && convDate) {
        const cacheKey = `${churchIdForFreq}|${convDate}`
        if (frequencyCache.has(cacheKey)) {
          totalExpected = frequencyCache.get(cacheKey)!
        } else {
          totalExpected = await getRealizedWorshipCount(supabase, churchIdForFreq, convDate, todayStr)
          frequencyCache.set(cacheKey, totalExpected)
        }
      }

      if (!isFollowup) {
        enrichedItems.push({
          id: `pending-${item.id}`,
          person_id: personId,
          conversion_id: item.id,
          status: 'em_acompanhamento',
          contacted: false,
          fono_visit_done: false,
          visit_done: false,
          leader_person_id: null,
          consolidator_person_id: null,
          contacted_at: null,
          contacted_channel: null,
          contacted_notes: null,
          fono_visit_date: null,
          visit_date: null,
          next_review_event_id: null,
          next_review_date: null,
          notes: null,
          created_at: item.created_at || new Date().toISOString(),
          updated_at: item.updated_at || new Date().toISOString(),
          _isPending: true,
          person: {
            id: personId,
            full_name: item.nome || 'Desconhecido',
            mobile_phone: item.telefone || null,
            email: item.email || null,
          },
          conversion: {
            id: item.id,
            data_conversao: item.data_conversao,
            conversion_type: item.conversion_type,
            culto: item.culto,
            church_id: item.church_id,
            cell_id: item.cell_id,
          },
          leader: null,
          consolidator: null,
          attendance_summary: {
            total_attended: 0,
            total_expected: totalExpected,
            last_dates: [],
          },
        })
        continue
      }

      const person = personId ? peopleMap.get(personId) : null
      const leader = item.leader_person_id ? leaderMap.get(item.leader_person_id) : null
      const lastDates = personId ? (attendanceByPerson.get(personId) ?? []) : []

      enrichedItems.push({
        ...item,
        person,
        conversion,
        leader,
        consolidator: item.consolidator_person_id ? leaderMap.get(item.consolidator_person_id) : null,
        attendance_summary: {
          total_attended: lastDates.length,
          total_expected: totalExpected,
          last_dates: lastDates.slice(0, 5),
        },
      })
    }

    const items = enrichedItems.filter((item: any) => {
        // Filtro de busca textual
        if (q) {
          const person = item.person as any
          const name = (person?.full_name ?? '').toLowerCase()
          const phone = (person?.mobile_phone ?? '').toLowerCase()
          const email = (person?.email ?? '').toLowerCase()
          const search = q.toLowerCase()
          if (!name.includes(search) && !phone.includes(search) && !email.includes(search)) return false
        }
        // Filtro por igreja (via conversão)
        if (churchId) {
          const conv = item.conversion as any
          if (!conv || conv.church_id !== churchId) return false
        }
        // Filtro por célula
        if (cellId) {
          const conv = item.conversion as any
          if (!conv || conv.cell_id !== cellId) return false
        }
        // Filtro por período (data_conversao)
        if (from) {
          const conv = item.conversion as any
          if (!conv?.data_conversao || conv.data_conversao < from) return false
        }
        if (to) {
          const conv = item.conversion as any
          if (!conv?.data_conversao || conv.data_conversao > to) return false
        }
        // Se um status específico foi selecionado, só trazer daquele status
        if (status && item.status !== status) return false

        return true
      })

    return NextResponse.json({ followups: items, items })
  } catch (err) {
    console.error('GET /api/admin/consolidacao/followups:', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'consolidacao', action: 'create' })
  if (!access.ok) return access.response

  try {
    const body = await request.json().catch(() => ({}))
    const personId = body.person_id
    if (!personId) return NextResponse.json({ error: 'person_id é obrigatório' }, { status: 400 })

    const supabase = createSupabaseAdminClient(request)

    // Verificar se já existe
    const { data: existing } = await supabase
      .from('consolidation_followups')
      .select(FOLLOWUP_SELECT)
      .eq('person_id', personId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existing) return NextResponse.json({ item: existing, created: false })

    const payload: Record<string, unknown> = {
      person_id: personId,
      status: 'em_acompanhamento',
    }
    if (body.conversion_id) payload.conversion_id = body.conversion_id
    if (body.leader_person_id) payload.leader_person_id = body.leader_person_id
    if (body.consolidator_person_id) payload.consolidator_person_id = body.consolidator_person_id

    const { data: created, error } = await supabase
      .from('consolidation_followups')
      .insert(payload)
      .select(FOLLOWUP_SELECT)
      .single()

    if (error) {
      console.error('POST followups:', error)
      return NextResponse.json({ error: 'Erro ao criar acompanhamento' }, { status: 500 })
    }

    return NextResponse.json({ item: created, created: true }, { status: 201 })
  } catch (err) {
    console.error('POST /api/admin/consolidacao/followups:', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
