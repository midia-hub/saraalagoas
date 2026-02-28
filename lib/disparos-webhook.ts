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

// Mensagens de Reservas de Sala (usando os IDs fornecidos)
const MESSAGE_ID_RESERVA_RECEBIDA = '589eb419-039e-479b-8def-13c99b63055d'
const MESSAGE_ID_RESERVA_PENDENTE_APROVACAO = 'ec0fba84-6657-405f-ad19-1c978e254c9c'
const MESSAGE_ID_RESERVA_APROVADA = '6532739c-c972-481f-bdf3-c707dfabe3e5'
const MESSAGE_ID_RESERVA_REPROVADA = '0d9a3be9-a8d4-4eb1-b6f0-c6aa7b37ca93'
const MESSAGE_ID_RESERVA_CANCELADA = 'd03afd1c-ccd7-4907-a2a3-97353dea71a4'

export type ConversionTypeDisparos = 'accepted' | 'reconciled' | 'reserva_recebida' | 'reserva_pendente_aprovacao' | 'reserva_aprovada' | 'reserva_reprovada' | 'reserva_cancelada'

export type DisparosWebhookResult = { success: boolean; statusCode?: number; phone: string; nome: string }

// ── Message IDs do módulo de Escalas ─────────────────────────────────────
export const MESSAGE_ID_ESCALA_MES        = '4519f7f2-f890-42be-a660-69baec1b1dc5'
export const MESSAGE_ID_ESCALA_LEMBRETE_3 = '91915ca1-0419-43b5-a70c-df0c0b92379f'
export const MESSAGE_ID_ESCALA_LEMBRETE_1 = '96a161e3-087c-4755-b31e-0c127c36d6b9'
export const MESSAGE_ID_ESCALA_DIA        = '27eb5277-f8d8-45b3-98cc-15f9e0b55d0c'

// ── Message IDs do módulo de Demandas de Mídia ───────────────────────────
// ⚠️ Configurar os IDs reais após criar os templates no painel Disparos
export const MESSAGE_ID_DEMANDA_ARTE       = process.env.MESSAGE_ID_DEMANDA_ARTE       ?? 'CONFIGURAR_MESSAGE_ID_ARTE'
export const MESSAGE_ID_DEMANDA_VIDEO      = process.env.MESSAGE_ID_DEMANDA_VIDEO      ?? 'CONFIGURAR_MESSAGE_ID_VIDEO'

// ── Message IDs do módulo Sara Kids ──────────────────────────────────────
export const MESSAGE_ID_KIDS_CHECKIN      = '7f9fb081-bb8f-4db7-9b9c-25df8c3b110a'
export const MESSAGE_ID_KIDS_CHECKOUT     = '02b7e040-2655-4547-942e-a9814ad96bf5'
export const MESSAGE_ID_KIDS_ALERTA       = '0db51837-8f01-4b69-a6c6-d369bd4801b4'
export const MESSAGE_ID_KIDS_ENCERRAMENTO = '851978a9-e0d2-4202-b332-4b144476a247'

/**
 * Envia disparo diretamente com message_id e variáveis arbitrárias.
 * Usado pelo módulo de escalas (sem necessidade de ConversionType).
 */
export async function sendDisparoRaw(params: {
  phone: string
  messageId: string
  variables: Record<string, string>
}): Promise<{ success: boolean; statusCode?: number }> {
  const url = process.env.DISPAROS_WEBHOOK_URL
  const bearer = process.env.DISPAROS_WEBHOOK_BEARER
  if (!url || !bearer) return { success: false }

  const digits = params.phone.replace(/\D/g, '')
  const sem55 = digits.startsWith('55') ? digits.slice(2) : digits
  const phoneE164 = `55${sem55}`.slice(0, 13)

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
        message_id: params.messageId,
        variables: params.variables,
      }),
    })
    return { success: res.ok, statusCode: res.status }
  } catch {
    return { success: false }
  }
}

/**
 * Chama o webhook de disparos após conversão ou reserva (se configurado).
 * Retorna resultado para registro em disparos_log; não propaga erro.
 */
export async function callDisparosWebhook(params: {
  phone: string
  nome: string
  conversionType: ConversionTypeDisparos
  variables?: Record<string, string>  // Variáveis adicionais para templates de reserva
}): Promise<DisparosWebhookResult | null> {
  const url = process.env.DISPAROS_WEBHOOK_URL
  const bearer = process.env.DISPAROS_WEBHOOK_BEARER
  if (!url || !bearer) {
    console.warn('Disparos webhook: DISPAROS_WEBHOOK_URL ou DISPAROS_WEBHOOK_BEARER não configurados. URL=', !!url, 'Bearer=', !!bearer)
    return null
  }

  const digits = params.phone.replace(/\D/g, '')
  const sem55 = digits.startsWith('55') ? digits.slice(2) : digits
  const phoneE164 = `55${sem55}`.slice(0, 13)
  
  // Selecionar message_id baseado no tipo
  let messageId: string
  switch (params.conversionType) {
    case 'accepted':
      messageId = MESSAGE_ID_ACEITOU
      break
    case 'reconciled':
      messageId = MESSAGE_ID_RECONCILIOU
      break
    case 'reserva_recebida':
      messageId = MESSAGE_ID_RESERVA_RECEBIDA
      break
    case 'reserva_pendente_aprovacao':
      messageId = MESSAGE_ID_RESERVA_PENDENTE_APROVACAO
      break
    case 'reserva_aprovada':
      messageId = MESSAGE_ID_RESERVA_APROVADA
      break
    case 'reserva_reprovada':
      messageId = MESSAGE_ID_RESERVA_REPROVADA
      break
    case 'reserva_cancelada':
      messageId = MESSAGE_ID_RESERVA_CANCELADA
      break
    default:
      messageId = MESSAGE_ID_ACEITOU
  }
  
  const nomeReduzido = getNomeExibicao(params.nome)
  
  // Para conversões: usa apenas o nome
  // Para reservas: usa as variáveis fornecidas
  const variables = params.variables ? { ...params.variables, nome: nomeReduzido } : { nome: nomeReduzido }

  try {
    const body = {
      phone: phoneE164,
      channel_id: CHANNEL_ID,
      message_id: messageId,
      variables,
    }
    if (process.env.NODE_ENV === 'development') {
      console.log('Disparos webhook chamando:', url, body)
    }
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${bearer}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const text = await res.text()
      console.error('Disparos webhook falhou:', res.status, text)
    }
    return { success: res.ok, statusCode: res.status, phone: phoneE164, nome: nomeReduzido }
  } catch (err) {
    console.error('Disparos webhook erro:', err)
    return { success: false, phone: phoneE164, nome: nomeReduzido }
  }
}
