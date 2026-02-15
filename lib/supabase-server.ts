import { createClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

// Não lançar na carga do módulo para que rotas API possam responder com JSON em caso de config ausente
const hasValidConfig = !!supabaseUrl && !!(serviceKey || anonKey)
const fallbackKey = serviceKey || anonKey || ''

export const supabaseServer = hasValidConfig
  ? createClient(supabaseUrl, fallbackKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : createClient(
      supabaseUrl || 'https://placeholder.supabase.co',
      fallbackKey || 'placeholder',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

function getAccessTokenFromRequest(request: NextRequest): string {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
  if (!authHeader) return ''
  const [scheme, token] = authHeader.split(' ')
  if (scheme?.toLowerCase() !== 'bearer') return ''
  return token || ''
}

/**
 * Cliente com service role (ignora RLS).
 * Usar apenas em rotas de backend onde o usuário já foi validado (ex.: callback OAuth).
 * Exige SUPABASE_SERVICE_ROLE_KEY.
 */
export function createSupabaseServiceClient() {
  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      'Callback OAuth precisa de SUPABASE_SERVICE_ROLE_KEY. Defina em Vercel (Settings → Environment Variables).'
    )
  }

  // Evita configuração incorreta comum: colar anon key no lugar da service_role key.
  try {
    const payloadPart = serviceKey.split('.')[1]
    const payloadJson = Buffer.from(payloadPart, 'base64url').toString('utf8')
    const payload = JSON.parse(payloadJson) as { role?: string }
    if (payload.role !== 'service_role') {
      throw new Error(
        `SUPABASE_SERVICE_ROLE_KEY inválida: role=${payload.role || 'desconhecida'}. Use a chave service_role do Supabase.`
      )
    }
  } catch (err) {
    if (err instanceof Error) throw err
    throw new Error('SUPABASE_SERVICE_ROLE_KEY inválida: não foi possível validar o token JWT.')
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export function createSupabaseServerClient(request?: NextRequest) {
  const token = request ? getAccessTokenFromRequest(request) : ''
  if (token && anonKey) {
    return createClient(supabaseUrl as string, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    })
  }

  if (serviceKey) {
    return createClient(supabaseUrl as string, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }

  const headers = token ? { Authorization: `Bearer ${token}` } : undefined

  return createClient(supabaseUrl as string, anonKey as string, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: headers ? { headers } : undefined,
  })
}

/**
 * Cliente para rotas admin já autorizadas: usa service role se disponível (ignora RLS),
 * senão usa o token do request (RLS aplicado). Evita 500 quando SUPABASE_SERVICE_ROLE_KEY não está definida.
 */
export function createSupabaseAdminClient(request?: NextRequest) {
  try {
    return createSupabaseServiceClient()
  } catch {
    return createSupabaseServerClient(request)
  }
}

