import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

/**
 * GET /api/revisao-vidas/ministries
 * Público – lista ministérios/equipes para uso no formulário de inscrição.
 */
export async function GET() {
  const supabase = createSupabaseAdminClient()

  const { data, error } = await supabase
    .from('ministries')
    .select('id, name')
    .order('name', { ascending: true })

  if (error) {
    return NextResponse.json({ ministries: [] })
  }

  return NextResponse.json({ ministries: data ?? [] })
}
