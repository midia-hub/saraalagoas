export type EvolutionSendResult = {
  success: boolean
  statusCode?: number
  phone: string
}

export function isEvolutionConfigured() {
  return Boolean(
    process.env.EVOLUTION_API_URL &&
      process.env.EVOLUTION_API_KEY &&
      process.env.EVOLUTION_INSTANCE,
  )
}

export function normalizeBrazilPhone(phone: string) {
  const digits = phone.replace(/\D/g, '')
  if (!digits) return ''

  const withoutCountry = digits.startsWith('55') ? digits.slice(2) : digits
  return `55${withoutCountry}`
}

export async function sendEvolutionText(params: {
  phone: string
  text: string
}): Promise<EvolutionSendResult> {
  const baseUrl = process.env.EVOLUTION_API_URL?.replace(/\/$/, '')
  const apiKey = process.env.EVOLUTION_API_KEY
  const instance = process.env.EVOLUTION_INSTANCE
  const phone = normalizeBrazilPhone(params.phone)

  if (!baseUrl || !apiKey || !instance || !phone || !params.text.trim()) {
    return { success: false, statusCode: 400, phone }
  }

  try {
    const res = await fetch(`${baseUrl}/message/sendText/${instance}`, {
      method: 'POST',
      headers: {
        apikey: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        number: phone,
        text: params.text,
      }),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.error('[Evolution API] Falha ao enviar mensagem:', res.status, text.slice(0, 500))
    }

    return { success: res.ok, statusCode: res.status, phone }
  } catch (err) {
    console.error('[Evolution API] Erro na requisicao:', err)
    return { success: false, phone }
  }
}
