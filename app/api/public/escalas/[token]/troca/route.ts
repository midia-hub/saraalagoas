import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

type Params = { params: { token: string } }

/**
 * POST /api/public/escalas/[token]/troca
 * Registra uma solicitação de troca de um voluntário.
 * Body: { slot_id, funcao, solicitante_id, substituto_id?, mensagem? }
 */
export async function POST(request: NextRequest, { params }: Params) {
  const supabase = createSupabaseAdminClient(request)

  const { data: link } = await supabase
    .from('escalas_links')
    .select('id')
    .eq('token', params.token)
    .single()

  if (!link) return NextResponse.json({ error: 'Escala não encontrada.' }, { status: 404 })

  // Verifica se a escala está publicada
  const { data: pub } = await supabase
    .from('escalas_publicadas')
    .select('status, dados')
    .eq('link_id', link.id)
    .single()

  if (!pub || pub.status !== 'publicada') {
    return NextResponse.json({ error: 'Escala não está publicada.' }, { status: 400 })
  }

  const body = await request.json().catch(() => ({}))
  const { slot_id, funcao, solicitante_id, substituto_id, mensagem } = body

  if (!slot_id || !funcao || !solicitante_id) {
    return NextResponse.json({ error: 'slot_id, funcao e solicitante_id são obrigatórios.' }, { status: 400 })
  }

  // Valida que o solicitante está de fato neste slot+função da escala
  const dados = pub.dados as any
  const slot = (dados?.slots ?? []).find((s: any) => s.slot_id === slot_id)
  const assignment = slot?.assignments?.find(
    (a: any) => a.person_id === solicitante_id && a.funcao === funcao
  )

  if (!assignment) {
    return NextResponse.json({ error: 'Você não está escalado neste culto/função.' }, { status: 403 })
  }

  // Não permite duplicar solicitação pendente
  const { data: existing } = await supabase
    .from('escalas_trocas')
    .select('id')
    .eq('link_id', link.id)
    .eq('slot_id', slot_id)
    .eq('funcao', funcao)
    .eq('solicitante_id', solicitante_id)
    .eq('status', 'pendente')
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Já existe uma solicitação pendente para este slot.' }, { status: 409 })
  }

  const { error } = await supabase
    .from('escalas_trocas')
    .insert({
      link_id: link.id,
      slot_id,
      funcao,
      solicitante_id,
      substituto_id: substituto_id ?? null,
      mensagem: mensagem ?? null,
    })

  if (error) {
    console.error('Erro ao registrar troca:', error)
    return NextResponse.json({ error: 'Erro ao registrar solicitação.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
