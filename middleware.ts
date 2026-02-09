/**
 * Middleware do Next.js para proteção de rotas
 *
 * Rotas /admin/*: não bloqueamos aqui. A sessão fica em localStorage (cliente);
 * o layout do admin (app/admin/layout.tsx) verifica getSession() e redireciona
 * para /admin/login/ se não houver usuário. Assim o login funciona.
 *
 * Rotas /api/admin/*: protegidas por token no header Authorization (Bearer).
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Proteger rotas de API /api/admin/*
  if (pathname.startsWith('/api/admin')) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
        },
      })

      const { data: { user }, error: authError } = await supabase.auth.getUser(token)

      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      // GET /api/admin/services: qualquer usuário autenticado pode listar cultos (ex.: dropdown no upload)
      const isGetServicesList = pathname === '/api/admin/services' && request.method === 'GET'
      if (isGetServicesList) {
        return NextResponse.next()
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profileError || !profile || profile.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      return NextResponse.next()
    } catch (error) {
      console.error('API middleware error:', error)
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/admin/:path*'],
}
