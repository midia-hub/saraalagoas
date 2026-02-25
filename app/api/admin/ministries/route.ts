import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

interface MinistryRow {
  id: string
  name: string
  created_at: string
}

/**
 * GET /api/admin/ministries
 * Retorna lista de todos os ministérios cadastrados
 */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'pessoas', action: 'view' })
  if (!access.ok) return access.response

  const supabase = createSupabaseAdminClient(request)

  try {
    const { data, error } = await supabase
      .from('ministries')
      .select('id, name, created_at')
      .order('name', { ascending: true })

    if (error) {
      console.error('GET ministries error:', error)
      return NextResponse.json({ error: 'Erro ao buscar ministérios' }, { status: 500 })
    }

    return NextResponse.json({
      ministries: (data as MinistryRow[]) ?? []
    })
  } catch (err) {
    console.error('GET ministries exception:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

/**
 * POST /api/admin/ministries
 * Cria um novo ministério
 */
export async function POST(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'pessoas', action: 'create' })
  if (!access.ok) return access.response

  const supabase = createSupabaseAdminClient(request)

  try {
    const body = await request.json()
    const { name } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Nome do ministério é obrigatório' }, { status: 400 })
    }

    const trimmedName = name.trim()

    // Verificar se já existe
    const { data: existing } = await supabase
      .from('ministries')
      .select('id')
      .eq('name', trimmedName)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({
        ministry: { id: existing.id, name: trimmedName }
      })
    }

    // Criar novo
    const { data, error } = await supabase
      .from('ministries')
      .insert({ name: trimmedName })
      .select('id, name, created_at')
      .single()

    if (error) {
      console.error('POST ministries insert error:', error)
      return NextResponse.json({ error: 'Erro ao criar ministério' }, { status: 500 })
    }

    return NextResponse.json({
      ministry: data as MinistryRow
    })
  } catch (err) {
    console.error('POST ministries exception:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
