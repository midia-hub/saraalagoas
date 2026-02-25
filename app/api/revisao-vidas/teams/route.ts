import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

/**
 * GET /api/revisao-vidas/teams
 * Público – lista equipes de consolidação para uso no formulário de inscrição.
 * Opcional: ?church_id= para filtrar pela igreja do evento.
 */
export async function GET(request: NextRequest) {
  const supabase = createSupabaseAdminClient()
  const churchId = request.nextUrl.searchParams.get('church_id') ?? ''

  let query = supabase
    .from('teams')
    .select('id, name, church_id')
    .order('name', { ascending: true })

  if (churchId) {
    query = query.eq('church_id', churchId)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ teams: [] })
  }

  return NextResponse.json({ teams: data ?? [] })
}
