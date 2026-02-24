import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase-server'

/**
 * GET /api/public/lookups/people?q=
 * Busca pessoas pelo nome (mínimo 3 caracteres) para preenchimento automático.
 * Retorna: { items: [{ id, full_name, mobile_phone }] }
 */
export async function GET(request: NextRequest) {
  try {
    const q = (request.nextUrl.searchParams.get('q') ?? '').trim()
    
    if (q.length < 3) {
      return NextResponse.json({ items: [] })
    }

    const supabase = createSupabaseServiceClient()
    
    // Busca na tabela people sem exigir perfil de usuário (qualquer pessoa do cadastro)
    const { data, error } = await supabase
      .from('people')
      .select('id, full_name, mobile_phone')
      .ilike('full_name', `%${q}%`)
      .eq('church_situation', 'Ativo')
      .order('full_name')
      .limit(5)

    if (error) {
      console.error('Public lookup people error:', error)
      return NextResponse.json({ error: 'Erro ao buscar' }, { status: 500 })
    }

    return NextResponse.json({ items: data ?? [] })
  } catch (err) {
    console.error('Public lookup people exception:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
