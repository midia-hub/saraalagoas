import { normalizeBrazilPhone } from './evolution-api'
import { sendDisparoRaw } from './disparos-webhook'

export type TemplateDisparoResult = { success: boolean; statusCode?: number; phone: string }

export async function callTemplateDisparosWebhook(params: {
  phone: string
  message_id: string
  variables?: Record<string, string>
}) : Promise<TemplateDisparoResult | null> {
  const phone = normalizeBrazilPhone(params.phone)
  const result = await sendDisparoRaw({
    phone: params.phone,
    messageId: params.message_id,
    variables: params.variables || {},
  })

  return { success: result.success, statusCode: result.statusCode, phone }
}
