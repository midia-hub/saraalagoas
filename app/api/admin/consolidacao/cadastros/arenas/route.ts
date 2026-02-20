import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

/**
 * GET /api/admin/consolidacao/cadastros/arenas
 */

export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'pessoas', action: 'view' })
  if (!access.ok) return access.response

  try {
    const supabase = createSupabaseAdminClient(request)
    
    // First, try to fetch all arenas regardless of active status for debugging
    const { data, error } = await supabase
      .from('arenas')
      .select('id, name, is_active, sort_order')
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('GET arenas error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      })
      return NextResponse.json({ 
        error: 'Erro ao listar arenas',
        details: error.message
      }, { status: 500 })
    }

    // Filter to active ones if we got results
    const activeArenas = data?.filter(a => a.is_active !== false) ?? []

    return NextResponse.json({ 
      items: activeArenas.map(a => ({ id: a.id, name: a.name })),
      arenas: activeArenas.map(a => ({ id: a.id, name: a.name })),
      debug: {
        total: data?.length ?? 0,
        active: activeArenas.length
      }
    })
  } catch (err) {
    console.error('GET /api/admin/consolidacao/cadastros/arenas exception:', err)
    return NextResponse.json({ 
      error: 'Erro interno',
      details: err instanceof Error ? err.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}
