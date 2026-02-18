import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

/**
 * GET /api/admin/xp26-feedback
 * Lista todas as respostas da pesquisa XP26 (admin). Ordenado por created_at desc.
 */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'dashboard', action: 'view' })
  if (!access.ok) return access.response

  try {
    const supabase = createSupabaseAdminClient(request)
    const { data, error } = await supabase
      .from('xp26_feedback')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('xp26_feedback list:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ items: data ?? [] })
  } catch (err) {
    console.error('GET /api/admin/xp26-feedback:', err)
    const message = err instanceof Error ? err.message : 'Erro ao carregar pesquisa.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
