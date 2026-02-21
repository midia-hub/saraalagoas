import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

const WORSHIP_SERVICE_SELECT = 'id, church_id, name, day_of_week, time_of_day, active, created_at, updated_at'

/**
 * GET  /api/admin/consolidacao/worship-services   ?church_id=
 * POST /api/admin/consolidacao/worship-services
 */

export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'consolidacao', action: 'view' })
  if (!access.ok) return access.response

  try {
    const supabase = createSupabaseAdminClient(request)
    const churchId = request.nextUrl.searchParams.get('church_id') ?? ''

    let query = supabase
      .from('worship_services')
      .select(WORSHIP_SERVICE_SELECT)
      .order('day_of_week')
      .order('time_of_day')

    if (churchId) query = query.eq('church_id', churchId)

    const { data, error } = await query
    if (error) {
      console.error('GET worship-services error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        churchId
      })
      return NextResponse.json({ 
        error: 'Erro ao listar cultos',
        details: error.message
      }, { status: 500 })
    }

    return NextResponse.json({ items: data ?? [], services: data ?? [] })
  } catch (err) {
    console.error('GET /api/admin/consolidacao/worship-services exception:', err)
    return NextResponse.json({ 
      error: 'Erro interno',
      details: err instanceof Error ? err.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'consolidacao', action: 'create' })
  if (!access.ok) return access.response

  try {
    const body = await request.json().catch(() => ({}))
    const name = (body.name ?? '').trim()
    if (!name) return NextResponse.json({ error: 'Nome do culto é obrigatório' }, { status: 400 })
    if (!body.church_id) return NextResponse.json({ error: 'Igreja é obrigatória' }, { status: 400 })
    if (body.day_of_week == null) return NextResponse.json({ error: 'Dia da semana é obrigatório' }, { status: 400 })
    if (!body.time_of_day) return NextResponse.json({ error: 'Horário é obrigatório' }, { status: 400 })

    const supabase = createSupabaseAdminClient(request)
    const { data, error } = await supabase
      .from('worship_services')
      .insert({
        name,
        church_id: body.church_id,
        day_of_week: Number(body.day_of_week),
        time_of_day: String(body.time_of_day),
        active: body.active !== false,
      })
      .select(WORSHIP_SERVICE_SELECT)
      .single()

    if (error) {
      console.error('POST worship-services error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        body
      })
      return NextResponse.json({ 
        error: 'Erro ao criar culto',
        details: error.message,
        hint: error.hint
      }, { status: 500 })
    }

    return NextResponse.json({ item: data }, { status: 201 })
  } catch (err) {
    console.error('POST /api/admin/consolidacao/worship-services exception:', err)
    return NextResponse.json({ 
      error: 'Erro interno',
      details: err instanceof Error ? err.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}
