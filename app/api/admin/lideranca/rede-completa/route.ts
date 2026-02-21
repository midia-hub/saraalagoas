import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { getLeadershipTree } from '@/lib/people-access'
import { getTodayBrasilia } from '@/lib/date-utils'
import { getRealizedWorshipCount } from '@/lib/worship-utils'

function normalizeArenaDay(day: string | null | undefined): number {
  const value = (day ?? '').toLowerCase()
  if (value === 'sun') return 0
  if (value === 'mon') return 1
  if (value === 'tue') return 2
  if (value === 'wed') return 3
  if (value === 'thu') return 4
  if (value === 'fri') return 5
  if (value === 'sat') return 6
  return 0
}

function parseYmd(ymd: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null
  const [year, month, day] = ymd.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return Number.isNaN(date.getTime()) ? null : date
}

function countWeekdayOccurrences(start: Date, end: Date, weekday: number): number {
  if (weekday < 0 || weekday > 6 || end < start) return 0
  const first = new Date(start)
  const diff = (weekday - first.getDay() + 7) % 7
  first.setDate(first.getDate() + diff)
  if (first > end) return 0
  const msPerDay = 24 * 60 * 60 * 1000
  const days = Math.floor((end.getTime() - first.getTime()) / msPerDay)
  return Math.floor(days / 7) + 1
}

function listWeekdayDates(start: Date, end: Date, weekday: number): string[] {
  const dates: string[] = []
  if (weekday < 0 || weekday > 6 || end < start) return dates
  const current = new Date(start)
  const diff = (weekday - current.getDay() + 7) % 7
  current.setDate(current.getDate() + diff)
  
  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10))
    current.setDate(current.getDate() + 7)
  }
  return dates
}

/**
 * GET /api/admin/lideranca/rede-completa
 * Retorna tabela agregada de frequência de TODOS os discípulos na árvore de liderança do líder logado.
 * Inclui: diretos (12), indiretos (144), etc - toda a rede completa.
 * Query params: start (YYYY-MM-DD), end (YYYY-MM-DD), service_id (uuid | 'all')
 */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'cultos', action: 'view' })
  if (!access.ok) return access.response

  try {
    const personId = access.snapshot.personId
    if (!personId) {
      return NextResponse.json({
        error: 'Perfil do usuário não possui vínculo com pessoa. Contate o administrador.'
      }, { status: 400 })
    }

    const { searchParams } = request.nextUrl
    const todayYmd = getTodayBrasilia()
    const [year, month] = todayYmd.split('-').map(Number)
    const firstDayOfMonth = `${year}-${String(month).padStart(2, '0')}-01`
    
    const startDate = searchParams.get('start') || firstDayOfMonth
    const endDate   = searchParams.get('end')   || todayYmd
    const effectiveEndDate = endDate > todayYmd ? todayYmd : endDate
    const supabase = createSupabaseAdminClient(request)

    // 1. Árvore de Liderança Completa
    let leadershipTree: Array<{ id: string; full_name?: string }> = []
    try {
      leadershipTree = await getLeadershipTree(personId)
    } catch (err) {
      console.error('rede-completa: tree error:', err)
      return NextResponse.json({ error: 'Erro ao carregar rede de liderança' }, { status: 500 })
    }

    const discipleIds = leadershipTree.map(n => n.id).filter(id => id !== personId)
    if (discipleIds.length === 0) return NextResponse.json({ items: [] })

    // 2. Dados das Pessoas em Chunks
    const CHUNK_SIZE = 200
    const peopleMap: Record<string, { full_name: string; mobile_phone?: string; email?: string; completed_review_date?: string | null }> = {}
    
    // Inicia com nomes da árvore
    for (const node of leadershipTree) {
      if (node.id !== personId) peopleMap[node.id] = { full_name: node.full_name || 'Desconhecido' }
    }

    for (let i = 0; i < discipleIds.length; i += CHUNK_SIZE) {
      const chunk = discipleIds.slice(i, i + CHUNK_SIZE)
      const { data } = await supabase.from('people').select('id, full_name, mobile_phone, email, completed_review_date').in('id', chunk)
      for (const p of data ?? []) {
        peopleMap[p.id] = { ...peopleMap[p.id], ...p }
      }
    }

    // 3. Mapeamento de Igreja (Vínculo do Líder)
    // O usuário deseja considerar os cultos da igreja do LÍDER para todos os discípulos da rede.
    let leaderChurchId: string | null = null
    const { data: leaderCellAtt } = await supabase.from('cell_people').select('cell_id, cells(church_id)').eq('person_id', personId).maybeSingle()
    leaderChurchId = (leaderCellAtt?.cells as any)?.church_id || null

    if (!leaderChurchId) {
      const { data: p } = await supabase.from('church_pastors').select('church_id').eq('person_id', personId).limit(1).maybeSingle()
      leaderChurchId = p?.church_id || null
    }

    const discipleChurchMap: Record<string, string> = {}
    if (leaderChurchId) {
      for (const id of discipleIds) {
        discipleChurchMap[id] = leaderChurchId
      }
    }

    // 4. Presenças no Período
    const attMap: Record<string, { count: number; lastDate: string | null; total: number }> = {}
    for (const id of discipleIds) attMap[id] = { count: 0, lastDate: null, total: 0 }

    for (let i = 0; i < discipleIds.length; i += CHUNK_SIZE) {
      const chunk = discipleIds.slice(i, i + CHUNK_SIZE)
      const { data: attendance } = await supabase
        .from('worship_attendance')
        .select('person_id, attended_on')
        .in('person_id', chunk)
        .gte('attended_on', startDate)
        .lte('attended_on', effectiveEndDate)
        .eq('attended', true)
      
      for (const a of attendance ?? []) {
        const personId = a.person_id
        if (!personId || !attMap[personId]) continue

        attMap[personId].count++
        if (!attMap[personId].lastDate || a.attended_on > attMap[personId].lastDate) {
          attMap[personId].lastDate = a.attended_on
        }
      }
    }

    // 5. Contagem de Cultos Totais (O Denominador com base na Igreja do Líder)
    const churchTotalCache = new Map<string, number>()
    const conversionDateMap = new Map<string, string>()

    // Buscar datas de conversão
    for (let i = 0; i < discipleIds.length; i += CHUNK_SIZE) {
      const chunk = discipleIds.slice(i, i + CHUNK_SIZE)
      const { data: convData } = await supabase
        .from('conversoes')
        .select('person_id, data_conversao')
        .in('person_id', chunk)
      
      for (const c of convData ?? []) {
        conversionDateMap.set(c.person_id, c.data_conversao)
      }
    }

    for (const dId of discipleIds) {
      const cid = discipleChurchMap[dId]
      if (!cid) continue
      
      const convDate = conversionDateMap.get(dId)
      const effectiveStart = convDate && convDate > startDate ? convDate : startDate
      
      if (convDate && convDate > effectiveEndDate) {
        attMap[dId].total = 0
        continue
      }

      const cacheKey = `${cid}|${effectiveStart}`
      if (!churchTotalCache.has(cacheKey)) {
        const t = await getRealizedWorshipCount(supabase, cid, effectiveStart, effectiveEndDate)
        churchTotalCache.set(cacheKey, t)
      }
      attMap[dId].total = churchTotalCache.get(cacheKey)!
    }

    // 6. Resposta Final
    const items = discipleIds.map(id => {
      const p = peopleMap[id]
      const a = attMap[id]
      const percent = a.total > 0 ? Math.round((a.count / a.total) * 100) : 0
      return {
        disciple_id: id,
        disciple_name: p.full_name,
        phone: p.mobile_phone || null,
        email: p.email || null,
        attended: a.count,
        total: a.total,
        percent,
        last_date: a.lastDate,
        completed_review_date: p.completed_review_date ?? null
      }
    })

    items.sort((a, b) => a.percent - b.percent)
    return NextResponse.json({ items })

  } catch (err) {
    console.error('rede-completa full catch:', err)
    return NextResponse.json({ error: 'Erro interno', message: String(err) }, { status: 500 })
  }
}
