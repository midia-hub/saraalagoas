import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/consolidacao/revisao/inscricao-logs
 * Somente administradores.
 * Query params:
 * - event_id?: UUID
 * - limit?: number (default 40, max 200)
 */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'consolidacao', action: 'view' })
  if (!access.ok) return access.response

  if (!access.snapshot.isAdmin) {
    return NextResponse.json({ error: 'Acesso permitido apenas para administradores.' }, { status: 403 })
  }

  try {
    const sp = request.nextUrl.searchParams
    const eventId = sp.get('event_id') ?? ''
    const limitRaw = Number(sp.get('limit') ?? 40)
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.floor(limitRaw), 1), 200) : 40

    const supabase = createSupabaseAdminClient(request)

    let query = supabase
      .from('revisao_vidas_inscricao_logs')
      .select('id, event_id, registration_id, person_id, person_name, phone_masked, action, payload, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (eventId) query = query.eq('event_id', eventId)

    const { data: logs, error } = await query
    if (error) {
      console.error('GET revisao/inscricao-logs:', error)
      return NextResponse.json({ error: 'Erro ao listar logs de inscrição' }, { status: 500 })
    }

    const eventIds = [...new Set((logs ?? []).map((l: any) => l.event_id).filter(Boolean))] as string[]

    const { data: events } = eventIds.length > 0
      ? await supabase.from('revisao_vidas_events').select('id, name').in('id', eventIds)
      : { data: [] }

    const eventMap = new Map((events ?? []).map((ev: any) => [ev.id as string, ev.name as string]))

    const items = (logs ?? []).map((log: any) => ({
      ...log,
      event_name: log.event_id ? eventMap.get(log.event_id as string) ?? null : null,
    }))

    return NextResponse.json({ items })
  } catch (err) {
    console.error('GET /api/admin/consolidacao/revisao/inscricao-logs:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
