import { MercadoPagoConfig, Preference, Payment } from 'mercadopago'

const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN ?? ''

/** Public Key tem formato APP_USR- + um UUID. Access Token é bem mais longo (TEST-... ou APP_USR-...). */
const LOOKS_LIKE_PUBLIC_KEY = /^APP_USR-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i

let client: MercadoPagoConfig | null = null
let preferenceClient: Preference | null = null
let paymentClient: Payment | null = null

function getConfig(): MercadoPagoConfig {
  if (!accessToken) {
    throw new Error('MERCADOPAGO_ACCESS_TOKEN não configurado.')
  }
  if (LOOKS_LIKE_PUBLIC_KEY.test(accessToken.trim())) {
    throw new Error(
      'MERCADOPAGO_ACCESS_TOKEN parece ser a Public Key. Use o Access Token: no painel, aba "Credenciais de teste", clique no ícone de olho ao lado de "Access Token" e copie o valor (começa com TEST-).'
    )
  }
  if (!client) {
    client = new MercadoPagoConfig({
      accessToken,
      options: { timeout: 15000 },
    })
  }
  return client
}

function getPreference(): Preference {
  if (!preferenceClient) {
    preferenceClient = new Preference(getConfig())
  }
  return preferenceClient
}

function getPaymentClient(): Payment {
  if (!paymentClient) {
    paymentClient = new Payment(getConfig())
  }
  return paymentClient
}

export type CreatePreferencePayload = {
  items: Array<{ id: string; title: string; quantity: number; unit_price: number }>
  external_reference: string
  back_urls: { success: string; failure: string; pending: string }
  notification_url: string
  idempotencyKey?: string
}

export type PreferenceResult = {
  id: string
  init_point: string
  sandbox_init_point?: string
}

/**
 * Cria uma preferência (Checkout Pro) e retorna o link de pagamento (init_point).
 */
export async function createPreference(payload: CreatePreferencePayload): Promise<PreferenceResult> {
  const preference = getPreference()
  const idempotencyKey = payload.idempotencyKey ?? `pref-${payload.external_reference}-${Date.now()}`
  const body = {
    items: payload.items.map((item) => ({
      id: item.id,
      title: item.title,
      quantity: item.quantity,
      unit_price: item.unit_price,
    })),
    external_reference: payload.external_reference,
    back_urls: payload.back_urls,
    notification_url: payload.notification_url,
    auto_return: 'approved' as const,
  }
  const response = await preference.create({
    body,
    requestOptions: { idempotencyKey },
  })
  const result = response as unknown as { id?: string; init_point?: string; sandbox_init_point?: string }
  if (!result?.id || !result?.init_point) {
    throw new Error('Resposta inválida do Mercado Pago ao criar preferência.')
  }
  return {
    id: result.id,
    init_point: result.init_point,
    sandbox_init_point: result.sandbox_init_point,
  }
}

export type PaymentStatus =
  | 'pending'
  | 'approved'
  | 'authorized'
  | 'in_process'
  | 'in_mediation'
  | 'rejected'
  | 'cancelled'
  | 'refunded'
  | 'charged_back'

export type PaymentResult = {
  id: number
  status: PaymentStatus
  status_detail?: string
  external_reference?: string
  transaction_amount?: number
  date_approved?: string
  [key: string]: unknown
}

/**
 * Busca um pagamento por ID na API do Mercado Pago (usar após webhook para validar status real).
 */
export async function getPayment(paymentId: string): Promise<PaymentResult | null> {
  try {
    const payment = getPaymentClient()
    const response = await payment.get({ id: paymentId })
    return response as unknown as PaymentResult
  } catch (err) {
    console.error('mercadopago getPayment error:', err)
    return null
  }
}

export type CreatePixPaymentPayload = {
  transaction_amount: number
  description: string
  external_reference: string
  payer_email: string
  notification_url?: string
  idempotencyKey?: string
}

export type PixPaymentResult = {
  payment_id: number
  status: string
  qr_code_base64: string | null
  qr_code: string | null
}

/**
 * Cria um pagamento Pix direto. Retorna o QR code em base64 para exibir na tela
 * (o cliente escaneia com o app do banco e paga na hora).
 */
export async function createPixPayment(payload: CreatePixPaymentPayload): Promise<PixPaymentResult> {
  const payment = getPaymentClient()
  const idempotencyKey = payload.idempotencyKey ?? `pix-${payload.external_reference}-${Date.now()}`
  const notificationUrl =
    payload.notification_url && payload.notification_url.startsWith('https://')
      ? payload.notification_url
      : undefined
  const body: Record<string, unknown> = {
    transaction_amount: payload.transaction_amount,
    payment_method_id: 'pix',
    description: payload.description,
    external_reference: payload.external_reference,
    payer: {
      email: payload.payer_email || 'cliente@livraria.com.br',
    },
  }
  if (notificationUrl) body.notification_url = notificationUrl

  try {
    const response = await payment.create({
      body,
      requestOptions: { idempotencyKey },
    })
    const res = response as unknown as {
      id?: number
      status?: string
      point_of_interaction?: {
        transaction_data?: {
          qr_code_base64?: string
          qr_code?: string
        }
      }
    }
    const transactionData = res?.point_of_interaction?.transaction_data
    return {
      payment_id: res?.id ?? 0,
      status: res?.status ?? 'pending',
      qr_code_base64: transactionData?.qr_code_base64 ?? null,
      qr_code: transactionData?.qr_code ?? null,
    }
  } catch (err: unknown) {
    const msg = toReadableMessage(err)
    console.error('createPixPayment error:', err)
    throw new Error(msg || 'Falha ao criar pagamento Pix no Mercado Pago.')
  }
}

function toReadableMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const o = err as Record<string, unknown>
    if (typeof o.message === 'string') return o.message
    const cause = o.cause
    if (cause && typeof cause === 'object') {
      const c = cause as Record<string, unknown>
      if (typeof c.message === 'string') return c.message
      if (Array.isArray(c.cause) && c.cause.length > 0) {
        const first = c.cause[0]
        if (first && typeof first === 'object' && typeof (first as { description?: string }).description === 'string') {
          return (first as { description: string }).description
        }
      }
    }
    try {
      return JSON.stringify(o)
    } catch {
      return ''
    }
  }
  return typeof err === 'string' ? err : ''
}

/**
 * Verifica se o SDK está configurado (access token presente).
 */
export function isMercadoPagoConfigured(): boolean {
  return !!accessToken
}
