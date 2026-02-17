/**
 * API de Lojas do Mercado Pago (pagamentos presenciais).
 * Documentação: POST /users/{user_id}/stores
 */

const MP_API = 'https://api.mercadopago.com'

function getAccessToken(): string {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim()
  if (!token) throw new Error('MERCADOPAGO_ACCESS_TOKEN não configurado.')
  return token
}

export type StoreLocation = {
  street_number: string
  street_name: string
  city_name: string
  state_name: string
  latitude: number
  longitude: number
  reference?: string
}

export type StoreBusinessHours = {
  open: string
  close: string
}

export type CreateStorePayload = {
  name: string
  location: StoreLocation
  external_id?: string
  business_hours?: Partial<Record<'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday', StoreBusinessHours[]>>
}

export type StoreResponse = {
  id: number
  name: string
  date_created: string
  business_hours?: CreateStorePayload['business_hours']
  location: {
    address_line: string
    latitude: number
    longitude: number
    reference?: string
  }
  external_id?: string
}

/**
 * Cria uma loja física na conta do Mercado Pago.
 * @param userId - user_id (collector_id) da conta que recebe os pagamentos. Use MERCADOPAGO_COLLECTOR_ID no .env.
 */
export async function createStore(userId: string, payload: CreateStorePayload): Promise<StoreResponse> {
  const token = getAccessToken()
  const url = `${MP_API}/users/${encodeURIComponent(userId)}/stores`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: payload.name,
      location: payload.location,
      ...(payload.external_id && { external_id: payload.external_id }),
      ...(payload.business_hours && Object.keys(payload.business_hours).length > 0 && { business_hours: payload.business_hours }),
    }),
  })

  const data = await res.json().catch(() => ({})) as Record<string, unknown>
  if (!res.ok) {
    const msg = (data?.message ?? data?.error ?? `Erro ${res.status} ao criar loja.`) as string
    let details = ''
    if (data?.cause) {
      const cause = data.cause
      if (Array.isArray(cause)) {
        details = cause
          .map((c: unknown) => {
            if (c && typeof c === 'object') {
              const o = c as Record<string, unknown>
              return (o.description ?? o.message ?? JSON.stringify(o)) as string
            }
            return String(c)
          })
          .filter(Boolean)
          .join('; ')
      } else if (typeof cause === 'object' && cause !== null) {
        details = (cause as { description?: string; message?: string }).description ?? (cause as { message?: string }).message ?? JSON.stringify(cause)
      }
    }
    const full = details ? `${msg}. Detalhes: ${details}` : msg
    console.error('[mercadopago createStore]', res.status, full, data)
    throw new Error(full)
  }
  return data as StoreResponse
}

// --- Caixa (POS - Ponto de venda) ---
// Documentação: POST https://api.mercadopago.com/pos

export type CreatePosPayload = {
  name: string
  fixed_amount: boolean
  store_id: number
  external_store_id: string
  external_id: string
  category?: number
}

export type PosResponse = {
  id: number
  qr?: {
    image: string
    template_document: string
    template_image: string
  }
  status: string
  date_created: string
  date_last_updated: string
  uuid: string
  user_id: number
  name: string
  fixed_amount: boolean
  category?: number
  store_id: number
  external_store_id: string
  external_id: string
}

/**
 * Cria um caixa (ponto de venda) vinculado a uma loja.
 * Para modelos integrados, fixed_amount deve ser true.
 */
export async function createPos(payload: CreatePosPayload): Promise<PosResponse> {
  const token = getAccessToken()
  const url = `${MP_API}/pos`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: payload.name,
      fixed_amount: payload.fixed_amount,
      store_id: payload.store_id,
      external_store_id: payload.external_store_id,
      external_id: payload.external_id,
      ...(payload.category != null && { category: payload.category }),
    }),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data?.message ?? data?.error ?? `Erro ${res.status} ao criar caixa.`
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg))
  }
  return data as PosResponse
}
