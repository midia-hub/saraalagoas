export type TemplateDisparoResult = { success: boolean; statusCode?: number; phone: string }

export async function callTemplateDisparosWebhook(params: {
  phone: string
  message_id: string
  variables?: Record<string, string>
}) : Promise<TemplateDisparoResult | null> {
  const url = process.env.DISPAROS_WEBHOOK_URL
  const bearer = process.env.DISPAROS_WEBHOOK_BEARER

  if (!url || !bearer) {
    return { success: false, statusCode: 400, phone: params.phone }
  }

  const digits = params.phone.replace(/\D/g, '')
  const sem55 = digits.startsWith('55') ? digits.slice(2) : digits
  const phoneE164 = `55${sem55}`.slice(0, 13)

  const body: Record<string, unknown> = {
    phone: phoneE164,
    channel_id: process.env.DISPAROS_WEBHOOK_CHANNEL_ID || undefined,
    message_id: params.message_id,
    variables: params.variables || {},
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${bearer}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return { success: res.ok, statusCode: res.status, phone: phoneE164 }
  } catch (err) {
    console.error('[Disparos Webhook] Erro na requisição:', err)
    return { success: false, phone: phoneE164 }
  }
}
