import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

type Params = { params: { token: string } }

/**
 * GET /api/public/escalas/[token]/escala
 * Retorna a escala publicada para exibição pública.
 */
export async function GET(request: NextRequest, { params }: Params) {
  const supabase = createSupabaseAdminClient(request)

  const { data: link } = await supabase
    .from('escalas_links')
    .select('id, ministry, month, year, label, church:churches(name)')
    .eq('token', params.token)
    .single()

  if (!link) return NextResponse.json({ error: 'Escala não encontrada.' }, { status: 404 })

  const { data: pub } = await supabase
    .from('escalas_publicadas')
    .select('status, dados, alertas, publicada_em')
    .eq('link_id', link.id)
    .single()

  if (!pub || pub.status !== 'publicada') {
    return NextResponse.json({ error: 'Escala ainda não publicada.' }, { status: 404 })
  }

  return NextResponse.json({
    link: {
      ministry: link.ministry,
      month: link.month,
      year: link.year,
      label: link.label,
      church: link.church,
    },
    dados: pub.dados,
    publicada_em: pub.publicada_em,
  })
}
