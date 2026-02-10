import { createClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || (!serviceKey && !anonKey)) {
  throw new Error('Supabase server não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.')
}

const fallbackKey = serviceKey || anonKey || ''

export const supabaseServer = createClient(supabaseUrl, fallbackKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function getAccessTokenFromRequest(request: NextRequest): string {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
  if (!authHeader) return ''
  const [scheme, token] = authHeader.split(' ')
  if (scheme?.toLowerCase() !== 'bearer') return ''
  return token || ''
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

