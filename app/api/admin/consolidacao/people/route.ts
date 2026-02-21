import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

const PERSON_SELECT = 'id, full_name, email, mobile_phone, phone'

const LIMIT = 100

/** GET - lista pessoas (cadastro consolidação: para líderes, pastores, etc.) - usa tabela public.people */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'consolidacao', action: 'view' })
  if (!access.ok) return access.response
  try {
    const q = (request.nextUrl.searchParams.get('q') ?? '').trim()
    const supabase = createSupabaseAdminClient(request)
    let query = supabase
      .from('people')
      .select('id, full_name, email, mobile_phone')
      .order('full_name')
      .limit(LIMIT)
    if (q) query = query.or(`full_name.ilike.%${q}%`)
    const { data, error } = await query
    if (error) return NextResponse.json({ error: 'Erro ao listar pessoas' }, { status: 500 })
    return NextResponse.json({ items: data ?? [] })
  } catch (err) {
    console.error('GET consolidacao/people:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

/** POST - cria pessoa mínima (para vínculos em consolidação) */
export async function POST(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'consolidacao', action: 'manage' })
  if (!access.ok) return access.response
  try {
    const body = await request.json().catch(() => ({}))
    const fullName = (body.full_name ?? body.name ?? '').trim()
    if (!fullName) return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
    const payload = {
      full_name: fullName,
      church_profile: body.church_profile ?? 'Visitante',
      church_situation: body.church_situation ?? 'Ativo',
      email: (body.email ?? '').trim() || null,
      mobile_phone: (body.mobile_phone ?? body.phone ?? '').trim() || null,
      phone: (body.phone ?? '').trim() || null,
    }
    const supabase = createSupabaseAdminClient(request)
    const { data, error } = await supabase.from('people').insert(payload).select(PERSON_SELECT).single()
    if (error) return NextResponse.json({ error: 'Erro ao criar pessoa' }, { status: 500 })
    return NextResponse.json({ item: data })
  } catch (err) {
    console.error('POST consolidacao/people:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
