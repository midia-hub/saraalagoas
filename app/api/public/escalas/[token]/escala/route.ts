import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

type Params = { params: { token: string } }

/**
 * GET /api/public/escalas/[token]/escala
 * Retorna a escala publicada para exibição pública.
 * Eventos especiais (type='evento') adicionados após a publicação são
 * mesclados automaticamente para garantir que sempre apareçam na listagem.
 */
export async function GET(request: NextRequest, { params }: Params) {
  const supabase = createSupabaseAdminClient(request)

  const { data: link } = await supabase
    .from('escalas_links')
    .select('id, ministry, month, year, label, church:churches(name)')
    .eq('token', params.token)
    .single()

  if (!link) return NextResponse.json({ error: 'Escala não encontrada.' }, { status: 404 })

  const [{ data: pub }, { data: liveEventos }] = await Promise.all([
    supabase
      .from('escalas_publicadas')
      .select('status, dados, alertas, publicada_em')
      .eq('link_id', link.id)
      .single(),
    // Busca eventos especiais vivos (type='evento') para mesclar com dados publicados.
    // Isso garante que eventos adicionados após a publicação também apareçam na listagem.
    supabase
      .from('escalas_slots')
      .select('id, type, label, date, time_of_day, sort_order, funcoes')
      .eq('link_id', link.id)
      .eq('type', 'evento')
      .order('date', { ascending: true })
      .order('time_of_day', { ascending: true }),
  ])

  if (!pub || pub.status !== 'publicada') {
    return NextResponse.json({ error: 'Escala ainda não publicada.' }, { status: 404 })
  }

  // ── Mescla eventos vivos no dados publicado ──────────────────────────────
  // Se um evento existe em escalas_slots mas não está no dados (foi adicionado após publicação),
  // ele é inserido na listagem com assignments/faltando vazios para ser visível na tabela.
  let dados = pub.dados as { slots: any[]; alertas?: string[] }
  const publishedSlotIds = new Set((dados?.slots ?? []).map((s: any) => s.id || s.slot_id))

  const missingEventos = (liveEventos ?? []).filter(ev => !publishedSlotIds.has(ev.id))

  if (missingEventos.length > 0) {
    const extraSlots = missingEventos.map(ev => ({
      slot_id: ev.id,
      type: 'evento',
      label: ev.label,
      date: ev.date,
      time_of_day: ev.time_of_day,
      sort_order: ev.sort_order,
      assignments: [],
      // Se o evento tem funções definidas, coloca elas como faltando para aparecerem na escala
      faltando: Array.isArray(ev.funcoes) ? ev.funcoes : [],
    }))

    // Merge e re-ordena cronologicamente
    const mergedSlots = [...(dados?.slots ?? []), ...extraSlots].sort(
      (a, b) => a.date.localeCompare(b.date) || a.time_of_day.localeCompare(b.time_of_day)
    )
    dados = { ...dados, slots: mergedSlots }
  }

  return NextResponse.json({
    link: {
      ministry: link.ministry,
      month: link.month,
      year: link.year,
      label: link.label,
      church: link.church,
    },
    dados,
    publicada_em: pub.publicada_em,
  })
}

