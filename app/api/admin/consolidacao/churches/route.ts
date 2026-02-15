import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

/** GET /api/admin/consolidacao/churches - lista igrejas */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'consolidacao', action: 'view' })
  if (!access.ok) return access.response
  try {
    const q = (request.nextUrl.searchParams.get('q') ?? '').trim()
    const supabase = createSupabaseAdminClient(request)
    let query = supabase.from('churches').select('id, name, created_at').order('name')
    if (q) query = query.ilike('name', `%${q}%`)
    const { data, error } = await query
    if (error) {
      console.error('GET consolidacao/churches:', error)
      return NextResponse.json({ error: 'Erro ao listar igrejas' }, { status: 500 })
    }
    return NextResponse.json({ items: data ?? [] })
  } catch (err) {
    console.error('GET consolidacao/churches:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

/** POST /api/admin/consolidacao/churches - cria igreja (opcional: pastor_ids[]) */
export async function POST(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'consolidacao', action: 'manage' })
  if (!access.ok) return access.response
  try {
    const body = await request.json().catch(() => ({}))
    const name = (body.name ?? '').trim()
    if (!name) return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
    const supabase = createSupabaseAdminClient(request)
    const { data, error } = await supabase.from('churches').insert({ name }).select().single()
    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'Igreja com este nome já existe' }, { status: 409 })
      return NextResponse.json({ error: 'Erro ao criar igreja' }, { status: 500 })
    }
    const churchId = (data as { id: string }).id
    const pastorIds = Array.isArray(body.pastor_ids) ? body.pastor_ids.filter((id: unknown) => typeof id === 'string') : []
    if (pastorIds.length > 0) {
      await supabase.from('church_pastors').insert(pastorIds.map((person_id: string) => ({ church_id: churchId, person_id })))
    }
    return NextResponse.json({ item: data })
  } catch (err) {
    console.error('POST consolidacao/churches:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
