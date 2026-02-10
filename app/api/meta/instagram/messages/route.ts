import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'

/**
 * Gerencia mensagens do Instagram (inbox) via Meta API
 * 
 * GET /api/meta/instagram/messages?integration_id=xxx
 * Lista conversas/threads recentes
 * 
 * POST /api/meta/instagram/messages
 * Envia mensagem para um thread
 * Body: {
 *   integration_id: string
 *   thread_id: string
 *   message: string
 * }
 * 
 * NOTA: Esta rota é um placeholder. Implementação completa virá nos próximos passos.
 */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'view' })
  if (!access.ok) return access.response

  return NextResponse.json(
    {
      error: 'Funcionalidade não implementada',
      message: 'A leitura de mensagens do Instagram via Meta API será implementada em breve.',
      status: 'not_implemented',
    },
    { status: 501 }
  )
}

export async function POST(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'create' })
  if (!access.ok) return access.response

  return NextResponse.json(
    {
      error: 'Funcionalidade não implementada',
      message: 'O envio de mensagens do Instagram via Meta API será implementada em breve.',
      status: 'not_implemented',
    },
    { status: 501 }
  )
}

/**
 * Exemplo de implementação futura:
 * 
 * Para listar conversas:
 * 1. Buscar integração ativa com instagram_business_account_id
 * 2. Fazer request para /{ig_business_account_id}/conversations
 * 3. Para cada conversa, buscar mensagens recentes
 * 4. Retornar lista de threads com preview da última mensagem
 * 
 * Para enviar mensagem:
 * 1. Validar integration_id, thread_id e message
 * 2. Fazer POST para /{ig_business_account_id}/messages
 * 3. Body: { recipient: { thread_key: thread_id }, message: { text: message } }
 * 4. Retornar confirmação
 * 
 * IMPORTANTE:
 * - Permissões necessárias: instagram_manage_messages, pages_manage_metadata
 * - Apenas contas Instagram Business/Creator conectadas a Página
 * - Limitações de rate limit e horários comerciais podem se aplicar
 */
