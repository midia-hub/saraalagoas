import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

/**
 * GET /api/admin/consolidacao/conversoes
 * Lista conversões; quando existir person_id, enriquece com dados da pessoa (nome, telefone, email)
 */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'consolidacao', action: 'view' })
  if (!access.ok) return access.response

  try {
    const supabase = createSupabaseAdminClient(request)
    const { data: conversoes, error } = await supabase
      .from('conversoes')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao listar conversões:', error)
      return NextResponse.json({ error: 'Erro ao listar conversões' }, { status: 500 })
    }

    const list = (conversoes || []).map((c: Record<string, unknown>) => ({
      ...c,
      nome: c.nome ?? '',
      email: c.email ?? null,
      telefone: c.telefone ?? '',
      cidade: c.cidade ?? null,
      estado: c.estado ?? null,
    }))

    return NextResponse.json({ conversoes: list })
  } catch (err) {
    console.error('Erro em GET /api/admin/consolidacao/conversoes:', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
