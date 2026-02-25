import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

/**
 * GET /api/revisao-vidas/teams
 * Público – lista equipes de consolidação para uso no formulário de inscrição.
 */
export async function GET() {
  const supabase = createSupabaseAdminClient()

  const { data, error } = await supabase
    .from('teams')
    .select('id, name')
    .order('name', { ascending: true })

  if (error) {
    return NextResponse.json({ teams: [] })
  }

  return NextResponse.json({ teams: data ?? [] })
}
