/**
 * Nome reduzido para exibição (mesma lógica da página de sucesso da consolidação).
 * Primeiro nome; para nomes comuns (Maria, João, etc.) usa primeiro + segundo.
 */
const PRIMEIRO_NOME_COM_SEGUNDO = new Set([
  'maria', 'ana', 'sofia', 'laura', 'isabel',
  'joão', 'joao', 'josé', 'jose', 'antônio', 'antonio', 'miguel', 'luiz', 'carlos',
])

export function getNomeExibicao(nome: string): string {
  const parts = nome.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return nome
  const primeiro = parts[0] ?? nome
  const primeiroNorm = primeiro.toLowerCase().normalize('NFD').replace(/\u0300/g, '')
  const precisaSegundo = PRIMEIRO_NOME_COM_SEGUNDO.has(primeiroNorm)
  if (precisaSegundo && parts.length >= 2) return `${parts[0]} ${parts[1]}`
  return primeiro
}

const CHANNEL_ID = '06bbe7a9-642b-46d0-97cd-d77b6aff9d94'
const MESSAGE_ID_ACEITOU = 'd3d770e5-6c68-4c91-b985-ceb920768a61'
const MESSAGE_ID_RECONCILIOU = '8f32bd0d-ae13-4261-af91-4845284ab1fe'

export type ConversionTypeDisparos = 'accepted' | 'reconciled'

/**
 * Chama o webhook de disparos após conversão (se configurado).
 * Não propaga erro para não falhar o fluxo principal; apenas loga.
 */
export async function callDisparosWebhook(params: {
  phone: string
  nome: string
  conversionType: ConversionTypeDisparos
}): Promise<void> {
  const url = process.env.DISPAROS_WEBHOOK_URL
  const bearer = process.env.DISPAROS_WEBHOOK_BEARER
  if (!url || !bearer) {
    console.warn('Disparos webhook: DISPAROS_WEBHOOK_URL ou DISPAROS_WEBHOOK_BEARER não configurados.')
    return
  }

  const digits = params.phone.replace(/\D/g, '')
  const sem55 = digits.startsWith('55') ? digits.slice(2) : digits
  const phoneE164 = `55${sem55}`.slice(0, 13)
  const messageId = params.conversionType === 'accepted' ? MESSAGE_ID_ACEITOU : MESSAGE_ID_RECONCILIOU
  const nomeReduzido = getNomeExibicao(params.nome)

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${bearer}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: phoneE164,
        channel_id: CHANNEL_ID,
        message_id: messageId,
        variables: { nome: nomeReduzido },
      }),
    })
    if (!res.ok) {
      const text = await res.text()
      console.error('Disparos webhook falhou:', res.status, text)
    }
  } catch (err) {
    console.error('Disparos webhook erro:', err)
  }
}
