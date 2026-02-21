import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

/**
 * GET /api/admin/consolidacao/pessoas/[id]
 * Retorna dados de uma pessoa específica
 */

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const access = await requireAccess(request, { pageKey: 'consolidacao', action: 'view' })
  if (!access.ok) return access.response

  try {
    const supabase = createSupabaseAdminClient(request)

    const { data: person, error } = await supabase
      .from('people')
      .select('id, full_name, mobile_phone, email, completed_review_date')
      .eq('id', params.id)
      .single()

    if (error) {
      console.error('GET /api/admin/consolidacao/pessoas/[id]:', error)
      return NextResponse.json({ error: 'Pessoa não encontrada' }, { status: 404 })
    }

    return NextResponse.json({ person })
  } catch (err) {
    console.error('GET /api/admin/consolidacao/pessoas/[id]:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
