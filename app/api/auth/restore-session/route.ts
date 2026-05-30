import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAccessSnapshotByToken } from '@/lib/rbac'
import {
  ADMIN_REFRESH_COOKIE,
  clearAdminAuthCookies,
  setAdminAuthCookies,
} from '@/lib/admin-auth-cookies'

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get(ADMIN_REFRESH_COOKIE)?.value
    if (!refreshToken) {
      return NextResponse.json({ error: 'Sessão ausente.' }, { status: 401 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Serviço indisponível.' }, { status: 503 })
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data, error } = await authClient.auth.refreshSession({ refresh_token: refreshToken })
    if (error || !data.session?.access_token || !data.session.refresh_token) {
      const response = NextResponse.json({ error: 'Sessão inválida.' }, { status: 401 })
      clearAdminAuthCookies(response, request)
      return response
    }

    const snapshot = await getAccessSnapshotByToken(data.session.access_token)
    if (!snapshot.canAccessAdmin) {
      const response = NextResponse.json({ error: 'Acesso negado ao painel.' }, { status: 403 })
      clearAdminAuthCookies(response, request)
      return response
    }

    const response = NextResponse.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    })
    setAdminAuthCookies(response, request, data.session.refresh_token)
    return response
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erro interno.'
    const status = message === 'Sessão inválida.' ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
