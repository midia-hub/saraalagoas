import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { triggerScalePublishedNotifications } from '@/lib/escalas-notificacoes'

type Params = { params: { id: string } }

/**
 * GET /api/admin/escalas/[id]/publicada
 * Retorna o rascunho/publicação mais recente desta escala.
 */
export async function GET(request: NextRequest, { params }: Params) {
  const access = await requireAccess(request, { pageKey: 'escalas', action: 'view' })
  if (!access.ok) return access.response

  const supabase = createSupabaseAdminClient(request)

  const { data, error } = await supabase
    .from('escalas_publicadas')
    .select('id, status, dados, alertas, gerada_em, publicada_em')
    .eq('link_id', params.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: 'Erro ao buscar.' }, { status: 500 })
  if (!data) return NextResponse.json({ publicada: null })

  return NextResponse.json({ publicada: data })
}

/**
 * POST /api/admin/escalas/[id]/publicada
 * Salva como rascunho ou publica a escala gerada.
 * Body: { status: 'rascunho' | 'publicada', dados, alertas }
 */
export async function POST(request: NextRequest, { params }: Params) {
  const access = await requireAccess(request, { pageKey: 'escalas', action: 'edit' })
  if (!access.ok) return access.response

  const body = await request.json().catch(() => ({}))
  const { status, dados, alertas } = body

  if (!status || !dados) {
    return NextResponse.json({ error: 'status e dados são obrigatórios.' }, { status: 400 })
  }

  const supabase = createSupabaseAdminClient(request)

  // Pega usuário atual
  const { data: { user } } = await supabase.auth.getUser()

  const now = new Date().toISOString()

  const { error } = await supabase
    .from('escalas_publicadas')
    .upsert(
      {
        link_id: params.id,
        status,
        dados,
        alertas: alertas ?? [],
        gerada_em: now,
        gerada_por: user?.id ?? null,
        publicada_em: status === 'publicada' ? now : null,
      },
      { onConflict: 'link_id' }
    )

  if (error) {
    console.error('Erro ao salvar escala publicada:', error)
    return NextResponse.json({ error: 'Erro ao salvar.' }, { status: 500 })
  }

  // ── 2.5 Atualizar escalas_assignments (Tabela Unificada) ──────────────────
  if (status === 'publicada') {
    // 1. Limpa assignments anteriores deste link
    await supabase.from('escalas_assignments').delete().eq('link_id', params.id)

    // 2. Extrai novos assignments dos dados publicados
    const slots = (dados as any)?.slots || []
    const newAssignments: any[] = []

    for (const slot of slots) {
      if (!slot.assignments) continue
      for (const ass of slot.assignments) {
        if (!ass.person_id) continue
        newAssignments.push({
          link_id: params.id,
          slot_id: slot.slot_id,
          person_id: ass.person_id,
          funcao: ass.funcao
        })
      }
    }

    if (newAssignments.length > 0) {
      const { error: insErr } = await supabase.from('escalas_assignments').insert(newAssignments)
      if (insErr) console.error('Erro ao atualizar escalas_assignments:', insErr)
    }
  }

  // Se for publicação final, fechamos o link de disponibilidade para novas respostas
  if (status === 'publicada') {
    await supabase
      .from('escalas_links')
      .update({ status: 'closed' })
      .eq('id', params.id)
  }

  // ── 3. Disparar notificações automáticas se for publicada ─────────────────
  if (status === 'publicada') {
    // Executa em segundo plano para não demorar no HTTP response
    // (Em Next.js/Vercel, se não usamos "waitUntil" em Edge Runtime, a função pode ser encerrada se o response terminar logo.
    // Mas no Node Runtime em Vercel no plano Pro ou Hobby, ela segue por alguns ms. 
    // Para ser seguro e dar feedback visual de sucesso logo, podemos apenas disparar e depois ver logs, 
    // ou apenas aguardar se o número de pessoas for pequeno.)
    try {
      await triggerScalePublishedNotifications(supabase, params.id, dados)
    } catch (e) {
      console.error('Erro ao enviar disparos automáticos:', e)
      // Não retorna erro no HTTP para não dar "falso negativo" na publicação
    }
  }

  return NextResponse.json({ ok: true })
}
