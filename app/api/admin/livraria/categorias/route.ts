import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

/** GET - lista categorias para dropdowns */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'livraria_produtos', action: 'view' })
  if (!access.ok) return access.response
  try {
    const supabase = createSupabaseAdminClient(request)
    const { data, error } = await supabase
      .from('bookstore_categories')
      .select('id, name, description')
      .order('name')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ items: data ?? [] })
  } catch (err) {
    console.error('GET livraria/categorias:', err)
    return NextResponse.json({ error: 'Erro ao carregar categorias' }, { status: 500 })
  }
}

/** POST - cria nova categoria (name obrigatório) */
export async function POST(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'livraria_produtos', action: 'edit' })
  if (!access.ok) return access.response
  try {
    const body = await request.json().catch(() => ({}))
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name) return NextResponse.json({ error: 'Nome da categoria é obrigatório' }, { status: 400 })
    const supabase = createSupabaseAdminClient(request)
    const { data, error } = await supabase
      .from('bookstore_categories')
      .insert({ name, description: typeof body.description === 'string' ? body.description.trim() || null : null })
      .select('id, name, description')
      .single()
    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'Já existe uma categoria com esse nome' }, { status: 400 })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data)
  } catch (err) {
    console.error('POST livraria/categorias:', err)
    return NextResponse.json({ error: 'Erro ao criar categoria' }, { status: 500 })
  }
}
