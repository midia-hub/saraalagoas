import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

const LIMIT = 50

/**
 * GET /api/admin/consolidacao/lookups/children?q=&excludeAdultId=
 * Lista pessoas para vínculo Sara Kids no cadastro do adulto.
 */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'pessoas', action: 'view' })
  if (!access.ok) return access.response

  try {
    const q = (request.nextUrl.searchParams.get('q') ?? '').trim()
    const excludeAdultId = request.nextUrl.searchParams.get('excludeAdultId') ?? undefined
    const supabase = createSupabaseAdminClient(request)

    let query = supabase
      .from('people')
      .select('id, full_name, birth_date')
      .order('full_name', { ascending: true })
      .limit(LIMIT)

    if (q.length >= 2) {
      query = query.ilike('full_name', `%${q}%`)
    }

    // Exclui crianças já vinculadas a este adulto
    if (excludeAdultId) {
      const { data: linked } = await supabase
        .from('people_kids_links')
        .select('child_id')
        .eq('adult_id', excludeAdultId)

      const linkedIds = (linked ?? []).map((r: { child_id: string }) => r.child_id)
      if (linkedIds.length > 0) {
        query = query.not('id', 'in', `(${linkedIds.join(',')})`)
      }
    }

    const { data, error } = await query

    if (error) {
      console.error('Lookup children:', error)
      return NextResponse.json({ error: 'Erro ao buscar crianças' }, { status: 500 })
    }

    const items = (data ?? []).map((r: { id: string; full_name: string; birth_date: string | null }) => ({
      id: r.id,
      label: r.full_name,
      full_name: r.full_name,
      birth_date: r.birth_date,
    }))

    return NextResponse.json({ items })
  } catch (err) {
    console.error('GET lookups/children:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
