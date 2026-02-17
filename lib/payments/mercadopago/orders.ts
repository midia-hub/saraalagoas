/**
 * API de Orders do Mercado Pago (pagamentos presenciais com QR).
 * Documentação: POST /v1/orders, GET /v1/orders/{id}, cancel, refund.
 */

const MP_API = 'https://api.mercadopago.com'

function getAccessToken(): string {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim()
  if (!token) throw new Error('MERCADOPAGO_ACCESS_TOKEN não configurado.')
  return token
}

export type QrOrderMode = 'static' | 'dynamic' | 'hybrid'

export type CreateOrderPayload = {
  /** external_id do caixa (ex: LOJ001POS001). Obrigatório. */
  external_pos_id: string
  /** Valor total da order. Obrigatório. */
  total_amount: number
  /** Descrição (máx 150 caracteres). Opcional. */
  description?: string
  /** Referência externa única (máx 64 caracteres, ex: id da venda). Obrigatório. */
  external_reference: string
  /** Tempo de validade em formato ISO 8601 duration (ex: PT15M = 15 min). Opcional, padrão 15 min. */
  expiration_time?: string
  /** Modo do QR: static (padrão), dynamic ou hybrid. */
  mode?: QrOrderMode
  /** Chave de idempotência (UUID ou string única). Obrigatório. */
  idempotency_key: string
  /** Itens da order. Opcional. */
  items?: Array<{
    title: string
    unit_price: number
    quantity: number
    unit_measure?: string
    external_code?: string
    external_categories?: Array<{ id: string }>
  }>
  /** Descontos por meio de pagamento. Opcional. */
  discounts?: {
    payment_methods?: Array<{ type: string; new_total_amount: number }>
  }
}

export type OrderPayment = {
  id: string
  amount: string
  status: string
  status_detail?: string
}

export type OrderResponse = {
  id: string
  type: string
  status: string
  status_detail?: string
  external_reference: string
  description?: string
  total_amount: string
  expiration_time?: string
  currency: string
  created_date?: string
  last_updated_date?: string
  config?: {
    qr?: {
      external_pos_id: string
      mode: string
    }
  }
  transactions?: {
    payments?: OrderPayment[]
    refunds?: Array<{
      id: string
      transaction_id: string
      amount: string
      status: string
    }>
  }
  /** Presente quando mode é dynamic ou hybrid: string EMVCo para gerar QR. */
  type_response?: {
    qr_data?: string
  }
  items?: unknown[]
  discounts?: unknown
}

function parseError(data: unknown): string {
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>
    const msg = (o.message ?? o.error ?? o.description) as string | undefined
    if (typeof msg === 'string') return msg
    if (Array.isArray(o.cause)) {
      const parts = o.cause
        .map((c: unknown) => {
          if (c && typeof c === 'object' && typeof (c as { description?: string }).description === 'string')
            return (c as { description: string }).description
          return null
        })
        .filter(Boolean)
      if (parts.length) return parts.join('; ')
    }
  }
  return 'Erro na API do Mercado Pago.'
}

/**
 * Cria uma order de pagamento com QR (presencial).
 * Retorna a order com status created; em mode dynamic/hybrid inclui type_response.qr_data para exibir QR.
 */
export async function createOrder(payload: CreateOrderPayload): Promise<OrderResponse> {
  const token = getAccessToken()
  const url = `${MP_API}/v1/orders`
  const body = {
    type: 'qr',
    total_amount: Number(payload.total_amount).toFixed(2),
    ...(payload.description && { description: payload.description.slice(0, 150) }),
    external_reference: payload.external_reference,
    ...(payload.expiration_time && { expiration_time: payload.expiration_time }),
    config: {
      qr: {
        external_pos_id: payload.external_pos_id,
        mode: payload.mode ?? 'static',
      },
    },
    transactions: {
      payments: [
        {
          amount: Number(payload.total_amount).toFixed(2),
        },
      ],
    },
    ...(payload.items?.length && {
      items: payload.items.map((i) => ({
        title: i.title.slice(0, 150),
        unit_price: Number(i.unit_price).toFixed(2),
        quantity: i.quantity,
        ...(i.unit_measure && { unit_measure: i.unit_measure }),
        ...(i.external_code && { external_code: i.external_code }),
        ...(i.external_categories?.length && { external_categories: i.external_categories }),
      })),
    }),
    ...(payload.discounts && Object.keys(payload.discounts).length > 0 && { discounts: payload.discounts }),
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Idempotency-Key': payload.idempotency_key,
    },
    body: JSON.stringify(body),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = parseError(data)
    console.error('[mercadopago createOrder]', res.status, msg, data)
    throw new Error(msg)
  }
  return data as OrderResponse
}

/**
 * Consulta uma order pelo id.
 */
export async function getOrder(orderId: string): Promise<OrderResponse | null> {
  const token = getAccessToken()
  const url = `${MP_API}/v1/orders/${encodeURIComponent(orderId)}`
  const res = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.status === 404) return null
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    console.error('[mercadopago getOrder]', res.status, data)
    throw new Error(parseError(data))
  }
  return data as OrderResponse
}

/**
 * Cancela uma order. Só é possível quando status é "created".
 */
export async function cancelOrder(orderId: string): Promise<OrderResponse> {
  const token = getAccessToken()
  const url = `${MP_API}/v1/orders/${encodeURIComponent(orderId)}/cancel`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({}),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = parseError(data)
    console.error('[mercadopago cancelOrder]', res.status, msg, data)
    throw new Error(msg)
  }
  return data as OrderResponse
}

/**
 * Reembolso total de uma order. Só é possível quando status é "processed".
 */
export async function refundOrder(orderId: string, idempotencyKey: string): Promise<OrderResponse> {
  const token = getAccessToken()
  const url = `${MP_API}/v1/orders/${encodeURIComponent(orderId)}/refund`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({}),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = parseError(data)
    console.error('[mercadopago refundOrder]', res.status, msg, data)
    throw new Error(msg)
  }
  return data as OrderResponse
}
