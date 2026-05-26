import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAccess } from '@/lib/admin-api'
import {
  sendDisparoRaw,
  MESSAGE_ID_DEMANDA_ARTE,
  MESSAGE_ID_DEMANDA_VIDEO,
} from '@/lib/disparos-webhook'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

/**
 * POST /api/admin/midia/demandas/[id]/steps/[stepId]/disparo
 *
 * Envia notificação WhatsApp para o responsável de arte ou vídeo.
 *
 * Body:
 * {
 *   personId:    string   — uuid da pessoa em `people`
 *   personName:  string
 *   phone:       string   — número DDD+número (somente dígitos)
 *   stepType:    'arte_responsavel' | 'producao_video'
 *   taskBody:    string   — descrição da tarefa (exibida na mensagem)
 *   demandTitle: string   — título da demanda
 *   dueDate?:    string   — prazo formatado
 * }
 *
 * GET — lista disparos do step
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; stepId: string } },
) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'view' })
  if (!access.ok) return access.response

  const { data, error } = await supabaseAdmin
    .from('media_demand_disparos')
    .select('*')
    .eq('step_id', params.stepId)
    .eq('demand_id', params.id)
    .order('sent_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ disparos: data ?? [] })
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; stepId: string } },
) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'create' })
  if (!access.ok) return access.response

  const body = await request.json().catch(() => ({}))
  const { personId, personName, phone, stepType, taskBody, demandTitle, dueDate } = body

  if (!phone || !stepType || !taskBody || !demandTitle) {
    return NextResponse.json(
      { error: 'Campos obrigatórios: phone, stepType, taskBody, demandTitle.' },
      { status: 400 },
    )
  }

  // Sanitiza telefone
  const cleanPhone = String(phone).replace(/\D/g, '')
  if (cleanPhone.length < 10) {
    return NextResponse.json({ error: 'Número de telefone inválido.' }, { status: 400 })
  }

  const isVideo = stepType === 'producao_video'
  const messageId = isVideo ? MESSAGE_ID_DEMANDA_VIDEO : MESSAGE_ID_DEMANDA_ARTE

  // Monta variáveis da mensagem WhatsApp
  const labelTipo  = isVideo ? '🎬 Produção de Vídeo' : '🎨 Arte'
  const prazoLine  = dueDate ? `*Prazo:* ${dueDate}` : ''
  const variables: Record<string, string> = {
    demanda_titulo: demandTitle,
    tipo_tarefa:    labelTipo,
    descricao:      taskBody,
    prazo:          prazoLine,
    nome:           personName ?? 'Responsável',
  }

  let sendSuccess = false
  let sendError   = ''

  const isConfigured = true

  if (isConfigured) {
    try {
      const sendResult = await sendDisparoRaw({ phone: cleanPhone, messageId, variables })
      sendSuccess = sendResult.success
      if (!sendSuccess) {
        sendError = `Falha ao enviar mensagem (HTTP ${sendResult.statusCode ?? 'timeout'})`
      }
      // Registra no log unificado de disparos
      supabaseAdmin.from('disparos_log').insert({
        phone: cleanPhone,
        nome: personName ?? 'Responsável',
        status_code: sendResult?.statusCode ?? null,
        source: 'midia',
        conversion_type: `midia_${stepType}`,
      }).then(({ error }) => { if (error) console.error('disparos_log midia:', error) })
    } catch (err) {
      sendError = err instanceof Error ? err.message : String(err)
      console.error('[disparo] Erro WhatsApp:', sendError)
    }
  } else {
    // Salva como pendente — sem envio real (template não configurado)
    sendSuccess = false
    sendError   = 'MESSAGE_ID não configurado — disparo salvo sem envio.'
  }

  // Gera corpo legível para histórico
  const messageBody = [
    `*${labelTipo}* — ${demandTitle}`,
    `Tarefa: ${taskBody}`,
    prazoLine,
  ]
    .filter(Boolean)
    .join('\n')

  const { data: row, error: dbErr } = await supabaseAdmin
    .from('media_demand_disparos')
    .insert({
      step_id:      params.stepId,
      demand_id:    params.id,
      person_id:    personId ?? null,
      person_name:  personName ?? null,
      phone:        cleanPhone,
      message_body: messageBody,
      status:       sendSuccess ? 'sent' : 'failed',
      sent_at:      new Date().toISOString(),
    })
    .select()
    .single()

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })

  return NextResponse.json({
    success:    sendSuccess,
    warning:    sendError || undefined,
    isConfigured,
    disparo:    row,
    // Texto para cópia manual caso o template não esteja configurado
    manualText: isConfigured ? undefined : messageBody,
  })
}
