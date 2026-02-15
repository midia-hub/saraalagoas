import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

/** GET - retorna os dois modelos de mensagem (para página de sucesso e tela de cadastro) */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'consolidacao', action: 'view' })
  if (!access.ok) return access.response
  try {
    const supabase = createSupabaseAdminClient(request)
    const { data, error } = await supabase
      .from('conversion_message_templates')
      .select('type, content')
    if (error) {
      console.error('GET conversion-messages:', error)
      return NextResponse.json({ error: 'Erro ao carregar mensagens' }, { status: 500 })
    }
    const rows = (data ?? []) as { type: string; content: string }[]
    const accepted = rows.find((r) => r.type === 'accepted')?.content ?? ''
    const reconciled = rows.find((r) => r.type === 'reconciled')?.content ?? ''
    return NextResponse.json({ accepted, reconciled })
  } catch (err) {
    console.error('GET conversion-messages:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

/** PATCH - atualiza um ou ambos os modelos (body: { accepted?: string, reconciled?: string }) */
export async function PATCH(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'consolidacao', action: 'manage' })
  if (!access.ok) return access.response
  try {
    const body = await request.json().catch(() => ({}))
    const accepted = typeof body.accepted === 'string' ? body.accepted : undefined
    const reconciled = typeof body.reconciled === 'string' ? body.reconciled : undefined
    if (!accepted && !reconciled) {
      return NextResponse.json({ error: 'Envie accepted e/ou reconciled no body' }, { status: 400 })
    }
    const supabase = createSupabaseAdminClient(request)
    const now = new Date().toISOString()
    if (accepted !== undefined) {
      const { error: e1 } = await supabase
        .from('conversion_message_templates')
        .upsert({ type: 'accepted', content: accepted, updated_at: now }, { onConflict: 'type' })
      if (e1) {
        console.error('PATCH conversion-messages accepted:', e1)
        return NextResponse.json({ error: 'Erro ao salvar mensagem (aceitou)' }, { status: 500 })
      }
    }
    if (reconciled !== undefined) {
      const { error: e2 } = await supabase
        .from('conversion_message_templates')
        .upsert({ type: 'reconciled', content: reconciled, updated_at: now }, { onConflict: 'type' })
      if (e2) {
        console.error('PATCH conversion-messages reconciled:', e2)
        return NextResponse.json({ error: 'Erro ao salvar mensagem (reconciliou)' }, { status: 500 })
      }
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('PATCH conversion-messages:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
