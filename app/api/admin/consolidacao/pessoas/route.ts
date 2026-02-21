import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

/**
 * GET /api/admin/consolidacao/pessoas
 * Lista pessoas para seleção em formulários
 */

export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'consolidacao', action: 'view' })
  if (!access.ok) return access.response

  try {
    const supabase = createSupabaseAdminClient(request)
    const sp = request.nextUrl.searchParams
    const limit = Math.min(parseInt(sp.get('limit') || '100'), 500)
    const search = sp.get('search') || ''

    let query = supabase
      .from('people')
      .select('id, full_name, mobile_phone, email')
      .order('full_name', { ascending: true })
      .limit(limit)

    if (search.trim()) {
      // Buscar por nome ou telefone
      query = query.or(
        `full_name_normalized.ilike.%${search.toLowerCase().replace(/[^a-z0-9 ]/g, '')}%,mobile_phone.ilike.%${search}%`
      )
    }

    const { data: pessoas, error } = await query

    if (error) {
      console.error('GET /api/admin/consolidacao/pessoas:', error)
      return NextResponse.json({ error: 'Erro ao listar pessoas' }, { status: 500 })
    }

    return NextResponse.json({ pessoas: pessoas || [] })
  } catch (err) {
    console.error('GET /api/admin/consolidacao/pessoas:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
