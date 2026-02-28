import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import {
  sendDisparoRaw,
  getNomeExibicao,
  MESSAGE_ID_CULTO,
  MESSAGE_ID_ARENA,
  MESSAGE_ID_MOMENTO_DEUS,
} from '@/lib/disparos-webhook'

type RouteContext = {
  params: Promise<{ id: string }>
}

const ALLOWED_MESSAGE_IDS = new Set([
  MESSAGE_ID_CULTO,
  MESSAGE_ID_ARENA,
  MESSAGE_ID_MOMENTO_DEUS,
])

/**
 * POST /api/admin/pessoas/[id]/disparar
 * Envia uma mensagem direta para uma pessoa via API de disparos.
 *
 * Body:
 *   messageId  : string (ID da mensagem no painel Disparos)
 *   variables  : Record<string, string> (variáveis do template, exceto "nome" que é preenchido automaticamente)
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const access = await requireAccess(request, { pageKey: 'pessoas', action: 'manage' })
  if (!access.ok) return access.response

  try {
    const { id: personId } = await context.params
    if (!personId) {
      return NextResponse.json({ error: 'ID da pessoa obrigatório' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const { messageId, variables = {} } = body as { messageId: string; variables: Record<string, string> }

    if (!messageId || !ALLOWED_MESSAGE_IDS.has(messageId)) {
      return NextResponse.json({ error: 'messageId inválido ou não permitido' }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient(request)

    // Buscar telefone e nome da pessoa
    const { data: person, error: personError } = await supabase
      .from('people')
      .select('id, full_name, mobile_phone, phone')
      .eq('id', personId)
      .single()

    if (personError || !person) {
      return NextResponse.json({ error: 'Pessoa não encontrada' }, { status: 404 })
    }

    const rawPhone = (person.mobile_phone ?? person.phone ?? '').trim()
    if (!rawPhone) {
      return NextResponse.json({ error: 'Pessoa não possui telefone cadastrado' }, { status: 400 })
    }

    const nome = getNomeExibicao(person.full_name ?? '')

    const result = await sendDisparoRaw({
      phone: rawPhone,
      messageId,
      variables: { ...variables, nome },
    })

    if (!result.success) {
      return NextResponse.json(
        { error: `Falha ao enviar mensagem (HTTP ${result.statusCode ?? 'timeout'})` },
        { status: 502 },
      )
    }

    return NextResponse.json({ ok: true, nome, statusCode: result.statusCode })
  } catch (err) {
    console.error('POST pessoas/[id]/disparar:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
