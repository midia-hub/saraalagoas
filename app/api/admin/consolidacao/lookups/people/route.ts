import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { normalizeForSearch } from '@/lib/normalize-text'

const LIMIT = 50

/**
 * GET /api/admin/consolidacao/lookups/people?q=&sex=&excludeId=
 * Lista pessoas ativas para dropdown (Líder/Consolidador/Cônjuge). Retorna id, full_name.
 */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'consolidacao', action: 'view' })
  if (!access.ok) return access.response

  try {
    const q = (request.nextUrl.searchParams.get('q') ?? '').trim()
    const sex = request.nextUrl.searchParams.get('sex') ?? undefined
    const excludeId = request.nextUrl.searchParams.get('excludeId') ?? undefined
    const supabase = createSupabaseAdminClient(request)

    let query = supabase
      .from('people')
      .select('id, full_name')
      .eq('church_situation', 'Ativo')
      .order('full_name', { ascending: true })
      .limit(LIMIT)

    // Filtro por sexo (para busca de cônjuge)
    if (sex) {
      query = query.eq('sex', sex)
    }

    // Excluir a mesma pessoa (para evitar auto-referência)
    if (excludeId) {
      query = query.neq('id', excludeId)
    }

    // Buscar apenas quando houver texto digitado
    if (q) {
      // Busca case-insensitive no campo full_name
      query = query.ilike('full_name', `%${q}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Lookup people:', error)
      return NextResponse.json({ error: 'Erro ao buscar pessoas' }, { status: 500 })
    }

    const items = (data ?? []).map((r: { id: string; full_name: string }) => ({
      id: r.id,
      label: r.full_name,
      full_name: r.full_name,
    }))

    return NextResponse.json({ items })
  } catch (err) {
    console.error('GET lookups/people:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
