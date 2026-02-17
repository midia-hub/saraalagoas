'use client'

import { supabase } from '@/lib/supabase'

export async function getAccessTokenOrThrow(): Promise<string> {
  if (!supabase) {
    throw new Error('A configuração do serviço não está concluída. Tente novamente.')
  }
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) {
    throw new Error('Sessão expirada. Faça login novamente.')
  }
  return token
}

export async function adminFetchJson<T = unknown>(
  input: string,
  init: RequestInit = {}
): Promise<T> {
  const token = await getAccessTokenOrThrow()
  const headers = new Headers(init.headers || {})
  if (!headers.has('Content-Type') && init.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  headers.set('Authorization', `Bearer ${token}`)
  // Evita 308 do ngrok (plano gratuito): página intersticial não é retornada quando o header está presente
  headers.set('ngrok-skip-browser-warning', 'true')
  const response = await fetch(input, { ...init, headers })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = typeof payload?.error === 'string' ? payload.error : `Erro ${response.status}`
    throw new Error(message)
  }
  return payload as T
}
